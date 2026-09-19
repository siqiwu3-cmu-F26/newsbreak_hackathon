import { useEffect, useState } from 'react';
import { createDraft, GROUPS, INTERESTS, validateDraft } from '../lib/planRequest.js';
import { isItinerary } from '../lib/itinerary.js';

const STORAGE_KEY = 'localconnect.planner.v1';
const SOURCES = ['api', 'demo', 'backend-fallback', 'timeout', 'offline', 'invalid-response'];

function readSession() {
  const empty = { draft: createDraft(), result: null };
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return empty;
    const draft = { ...empty.draft };
    for (const key of ['people', 'budget', 'startTime', 'endTime', 'notes']) {
      if (typeof saved.draft?.[key] === 'string') draft[key] = saved.draft[key];
    }
    if (GROUPS.some(group => group.value === saved.draft?.groupType)) draft.groupType = saved.draft.groupType;
    if (Array.isArray(saved.draft?.interests)) draft.interests = [...new Set(saved.draft.interests.filter(item => INTERESTS.includes(item)))];
    const candidate = saved.result;
    const result = candidate && isItinerary(candidate.itinerary) && SOURCES.includes(candidate.source)
      && candidate.request && Object.keys(validateDraft(candidate.request)).length === 0
      && typeof candidate.id === 'string' ? candidate : null;
    return { draft, result };
  } catch {
    return empty;
  }
}

export default function usePlannerSession() {
  const [session, setSession] = useState(readSession);
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* In-memory planning still works if storage is unavailable. */ }
  }, [session]);
  return {
    ...session,
    setDraft: draft => setSession(current => ({ ...current, draft })),
    setResult: result => setSession(current => ({ ...current, result })),
  };
}
