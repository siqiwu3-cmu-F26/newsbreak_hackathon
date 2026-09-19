import { API_BASE_URL } from '../config.js';
import { getDemoItinerary } from '../data/demoItinerary.js';
import { isItinerary } from '../lib/itinerary.js';

export const PLAN_TIMEOUT_MS = 15_000;

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
