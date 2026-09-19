import { API_BASE_URL } from '../config.js';
import { getDemoItinerary } from '../data/demoItinerary.js';
import { isItinerary } from '../lib/itinerary.js';

export const PLAN_TIMEOUT_MS = 15_000;

export async function createAnchorOptions(request, { signal, fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(`${API_BASE_URL}/plan/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) throw new Error('Planning service unavailable');
  const result = await response.json();
  if (!result || typeof result.message !== 'string' || !Array.isArray(result.options) || result.options.length !== 3) {
    throw new Error('Planning service returned invalid options');
  }
  return result;
}

export async function createPlan(request, { mock = false, signal, timeoutMs = PLAN_TIMEOUT_MS, fetchImpl = globalThis.fetch } = {}) {
  signal?.throwIfAborted();
  if (mock) return { itinerary: getDemoItinerary(), source: 'demo' };

  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetchImpl(`${API_BASE_URL}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Planning service unavailable');
    let itinerary;
    try {
      itinerary = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      return { itinerary: getDemoItinerary(), source: 'invalid-response' };
    }
    signal?.throwIfAborted();
    if (!isItinerary(itinerary)) return { itinerary: getDemoItinerary(), source: 'invalid-response' };
    return { itinerary, source: itinerary.fallback === true ? 'backend-fallback' : 'api' };
  } catch (error) {
    // Navigating away cancels the request; it must not trigger a late redirect.
    if (signal?.aborted) throw error;
    return { itinerary: getDemoItinerary(), source: timedOut ? 'timeout' : 'offline' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

async function postItinerary(path, body, { fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Planning service returned ${response.status}`);
  const itinerary = await response.json();
  if (!isItinerary(itinerary)) throw new Error('Planning service returned an invalid itinerary');
  return itinerary;
}

export function replaceItinerary(itinerary, activityId, constraints, replacementId, options) {
  if (replacementId && typeof replacementId === 'object') {
    options = replacementId;
    replacementId = undefined;
  }
  return postItinerary('/replace', { itinerary, activityId, constraints, replacementId }, options);
}

export function replanItinerary(itinerary, condition, constraints, options) {
  return postItinerary('/replan', { itinerary, condition, constraints }, options);
}

export async function getEnvironmentContext({ location = 'Palo Alto, CA', lat, lng, date } = {}, { fetchImpl = globalThis.fetch } = {}) {
  const params = new URLSearchParams({ location });
  if (Number.isFinite(Number(lat))) params.set('lat', String(lat));
  if (Number.isFinite(Number(lng))) params.set('lng', String(lng));
  if (date) params.set('date', date);
  const response = await fetchImpl(`${API_BASE_URL}/context?${params}`);
  if (!response.ok) throw new Error(`Context service returned ${response.status}`);
  return response.json();
}

export async function getExperiences({ fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(`${API_BASE_URL}/experiences`);
  if (!response.ok) throw new Error(`Experience service returned ${response.status}`);
  const result = await response.json();
  if (!Array.isArray(result)) throw new Error('Experience service returned invalid data');
  return result;
}
