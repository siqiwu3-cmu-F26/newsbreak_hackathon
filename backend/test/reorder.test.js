import test from 'node:test';
import assert from 'node:assert/strict';
import { reorderItinerary, toMinutes } from '../lib/itinerary.js';

function fixture() {
  return {
    summary: 'A custom day',
    activities: [
      { id: 'test_a', name: 'A', startTime: '10:00', endTime: '10:30', lat: 37.44, lng: -122.14, cost: 10, credits: 1 },
      { id: 'test_b', name: 'B', startTime: '10:45', endTime: '11:45', lat: 37.46, lng: -122.16, cost: 20, credits: 0 },
      { id: 'test_c', name: 'C', startTime: '12:00', endTime: '12:45', lat: 37.48, lng: -122.12, cost: 5, credits: 0 },
    ],
    constraints: { startTime: '10:00', endTime: '17:00', budget: 80 },
  };
}

test('reordering preserves activities and durations, recalculates legs and totals without mutating input', () => {
  const original = fixture(); const before = structuredClone(original);
  const result = reorderItinerary(original, ['test_c', 'test_a', 'test_b']);
  assert.deepEqual(original, before);
  assert.deepEqual(result.activities.map(a => a.id), ['test_c', 'test_a', 'test_b']);
  assert.deepEqual(result.activities.map(a => a.duration), [45, 30, 60]);
  assert.equal(result.activities[0].startTime, '10:00');
  for (let i = 1; i < result.activities.length; i++) {
    assert.equal(toMinutes(result.activities[i].startTime), toMinutes(result.activities[i - 1].endTime) + result.activities[i - 1].travelToNext);
  }
  assert.equal(result.activities.at(-1).travelToNext, 0);
  assert.deepEqual(result.totals, { cash: 35, credits: 1, travelMinutes: result.activities.reduce((sum, a) => sum + a.travelToNext, 0) });
});

test('reordering waits until opening and rejects closing-time conflicts', () => {
  const original = fixture(); original.activities[2].openFrom = '13:00';
  assert.equal(reorderItinerary(original, ['test_c', 'test_a', 'test_b']).activities[0].startTime, '13:00');
  original.activities[0].openTo = '11:00';
  assert.throws(() => reorderItinerary(original, ['test_c', 'test_a', 'test_b']), /after closing/);
});

test('rejects overflowing schedules without dropping activities or wrapping at midnight', () => {
  assert.throws(() => reorderItinerary(fixture(), ['test_c', 'test_a', 'test_b'], { endTime: '11:00' }), /end after/);
  assert.throws(() => reorderItinerary(fixture(), ['test_c', 'test_a', 'test_b'], { startTime: '23:00', endTime: '23:59' }), /end after/);
});

test('rejects missing, duplicated, extra and unknown ids and invalid locations', () => {
  for (const ids of [[], ['test_a'], ['test_a', 'test_a', 'test_c'], ['test_a', 'test_b', 'nope'], ['test_a', 'test_b', 'test_c', 'nope']]) assert.throws(() => reorderItinerary(fixture(), ids));
  const invalid = fixture(); invalid.activities[0].lat = NaN;
  assert.throws(() => reorderItinerary(invalid, ['test_a', 'test_b', 'test_c']), /location/);
});
