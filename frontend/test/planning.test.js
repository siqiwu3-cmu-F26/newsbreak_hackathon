import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraft, DEMO_REQUEST, toPlanRequest, validateDraft } from '../src/lib/planRequest.js';
import { getDemoItinerary } from '../src/data/demoItinerary.js';
import { isItinerary, toDisplayPlan } from '../src/lib/itinerary.js';
import { createPlan, getEnvironmentContext, replaceItinerary, replanItinerary } from '../src/services/api.js';

test('form emits exactly the PlanRequest contract, with numbers and trimmed notes', () => {
  const draft = createDraft(DEMO_REQUEST);
  draft.notes = '  Quiet places  ';
  draft.date = '2026-09-19';
  draft.interests.push('creative');
  const request = toPlanRequest(draft);
  assert.deepEqual(request, { ...DEMO_REQUEST, notes: 'Quiet places' });
  assert.deepEqual(validateDraft(draft), {});
});

test('invalid numbers, missing interests and reversed/overnight times are rejected', () => {
  for (const people of ['', '0', '-1', '1.5', 'Infinity', '9007199254740992']) {
    assert.ok(validateDraft({ ...createDraft(DEMO_REQUEST), people }).people, people);
  }
  for (const budget of ['', '-1', 'Infinity', '1.001']) {
    assert.ok(validateDraft({ ...createDraft(DEMO_REQUEST), budget }).budget, budget);
  }
  for (const endTime of ['', '15:00', '14:00', '01:00', '25:00']) {
    assert.ok(validateDraft({ ...createDraft(DEMO_REQUEST), endTime }).endTime, endTime);
  }
  assert.ok(validateDraft(createDraft()).interests);
  assert.ok(validateDraft({ ...createDraft(DEMO_REQUEST), interests: ['unknown'] }).interests);
  assert.ok(validateDraft({ ...createDraft(DEMO_REQUEST), groupType: 'solo', people: '2' }).people);
  assert.ok(validateDraft({ ...createDraft(DEMO_REQUEST), notes: 'a'.repeat(1001) }).notes);
  assert.deepEqual(validateDraft({ ...createDraft(DEMO_REQUEST), budget: '0', notes: '' }), {});
  assert.deepEqual(validateDraft({ ...createDraft(DEMO_REQUEST), budget: '12.34' }), {});
});

test('display adapter shifts travelToNext to the following card and preserves server totals', () => {
  const itinerary = getDemoItinerary();
  itinerary.totals.cash = 77;
  const display = toDisplayPlan(itinerary, DEMO_REQUEST);
  assert.deepEqual(display.activities.map(a => a.travelMinutes), [0, 8, 10, 6]);
  assert.equal(display.activities[0].experienceId, 'community_01');
  assert.equal(display.activities[3].duration, 30);
  assert.equal(display.totals.cash, 77);
  assert.equal(itinerary.activities[1].travelMinutes, undefined);
});

test('transport guard rejects malformed, duplicate and incomplete activity data', () => {
  assert.equal(isItinerary(getDemoItinerary()), true);
  for (const mutate of [
    plan => { plan.activities = []; },
    plan => { plan.activities[0].startTime = 'tomorrow'; },
    plan => { plan.activities[1].id = plan.activities[0].id; },
    plan => { plan.totals.cash = '60'; },
    plan => { plan.activities[0].cost = null; },
    plan => { plan.activities[0].reason = {}; },
  ]) {
    const plan = getDemoItinerary(); mutate(plan); assert.equal(isItinerary(plan), false);
  }
});

test('live request posts JSON to /api/plan and preserves the returned itinerary', async () => {
  const response = getDemoItinerary(); delete response.fallback;
  const result = await createPlan(DEMO_REQUEST, { fetchImpl: async (url, options) => {
    assert.equal(url, '/api/plan');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), DEMO_REQUEST);
    return { ok: true, json: async () => response };
  } });
  assert.equal(result.source, 'api');
  assert.equal(result.itinerary, response);
});

test('explicit mock mode does not contact the backend', async () => {
  const result = await createPlan(DEMO_REQUEST, { mock: true, fetchImpl: () => assert.fail('unexpected fetch') });
  assert.equal(result.source, 'demo');
  assert.equal(isItinerary(result.itinerary), true);
});

test('backend fallback stays distinguishable from live AI output', async () => {
  const result = await createPlan(DEMO_REQUEST, { fetchImpl: async () => ({ ok: true, json: async () => getDemoItinerary() }) });
  assert.equal(result.source, 'backend-fallback');
});

test('offline, HTTP failure, and invalid response each return renderable examples', async () => {
  for (const [fetchImpl, expected] of [
    [async () => { throw new TypeError('Failed to fetch'); }, 'offline'],
    [async () => ({ ok: false }), 'offline'],
    [async () => ({ ok: true, json: async () => ({ activities: [] }) }), 'invalid-response'],
    [async () => ({ ok: true, json: async () => { throw new SyntaxError('Bad JSON'); } }), 'invalid-response'],
  ]) {
    const result = await createPlan(DEMO_REQUEST, { fetchImpl });
    assert.equal(result.source, expected);
    assert.equal(isItinerary(result.itinerary), true);
  }
});

const waitForAbort = (_url, { signal }) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => reject(signal.reason), { once: true });
});

test('timeout aborts the network request and returns a labelled fallback', async () => {
  const result = await createPlan(DEMO_REQUEST, { fetchImpl: waitForAbort, timeoutMs: 10 });
  assert.equal(result.source, 'timeout');
  assert.equal(isItinerary(result.itinerary), true);
});

test('user cancellation rejects instead of delivering a fallback and redirecting later', async () => {
  const controller = new AbortController();
  const promise = createPlan(DEMO_REQUEST, { fetchImpl: waitForAbort, signal: controller.signal });
  controller.abort();
  await assert.rejects(promise, { name: 'AbortError' });
  await assert.rejects(createPlan(DEMO_REQUEST, { mock: true, signal: controller.signal }), { name: 'AbortError' });
});

test('replace, rain replan, and local context use their integration endpoints', async () => {
  const itinerary = getDemoItinerary();
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, body: options.body && JSON.parse(options.body) });
    if (String(url).startsWith('/api/context')) {
      return { ok: true, json: async () => ({ location: { city: 'Palo Alto' }, weather: { condition: 'clear' }, sunset: '7:09 PM' }) };
    }
    return { ok: true, json: async () => itinerary };
  };

  await replaceItinerary(itinerary, 'community_01', DEMO_REQUEST, { fetchImpl });
  await replanItinerary(itinerary, 'rain', DEMO_REQUEST, { fetchImpl });
  const context = await getEnvironmentContext({ location: 'Palo Alto, CA', date: '2026-09-19' }, { fetchImpl });

  assert.equal(calls[0].url, '/api/replace');
  assert.equal(calls[0].body.activityId, 'community_01');
  assert.equal(calls[1].url, '/api/replan');
  assert.equal(calls[1].body.condition, 'rain');
  assert.match(calls[2].url, /^\/api\/context\?/);
  assert.equal(context.weather.condition, 'clear');
});
