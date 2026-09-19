export const GROUPS = [
  { value: 'date', label: 'Date', description: 'A little time for two' },
  { value: 'family', label: 'Family', description: 'Make memories together' },
  { value: 'friends', label: 'Friends', description: 'Get the group together' },
  { value: 'solo', label: 'Solo', description: 'A day at your own pace' },
];

export const INTERESTS = ['creative', 'food', 'outdoors', 'relaxing', 'active', 'culture'];
export const DEMO_REQUEST = {
  groupType: 'date', people: 2, startTime: '15:00', endTime: '20:00', budget: 80,
  interests: ['creative', 'food', 'relaxing'],
  notes: 'First date, likes flowers and quiet places',
};

export function createDraft(request = { ...DEMO_REQUEST, interests: [], notes: '' }) {
  return { ...request, people: String(request.people), budget: String(request.budget), interests: [...request.interests] };
}

export function validateDraft(draft) {
  const errors = {};
  if (!GROUPS.some(({ value }) => value === draft.groupType)) errors.groupType = 'Choose who you are going with.';
  if (String(draft.people).trim() === '' || !Number.isSafeInteger(Number(draft.people)) || Number(draft.people) < 1) {
    errors.people = 'Enter a whole number of people, at least 1.';
  } else if (draft.groupType === 'solo' && Number(draft.people) !== 1) {
    errors.people = 'Solo plans are for 1 person.';
  }
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(draft.startTime)) errors.startTime = 'Choose a start time.';
  if (!timePattern.test(draft.endTime)) errors.endTime = 'Choose an end time.';
  if (!errors.startTime && !errors.endTime && draft.endTime <= draft.startTime) {
    errors.endTime = 'End time must be after start time on the same day.';
  }
  const budget = Number(draft.budget);
  if (String(draft.budget).trim() === '' || !Number.isFinite(budget) || budget < 0 || budget > Number.MAX_SAFE_INTEGER / 100) {
    errors.budget = 'Enter a budget of $0 or more.';
  } else if (Math.abs(budget * 100 - Math.round(budget * 100)) > 0.000001) {
    errors.budget = 'Use no more than two decimal places.';
  }
  if (!Array.isArray(draft.interests) || draft.interests.length === 0 || draft.interests.some(value => !INTERESTS.includes(value))) {
    errors.interests = 'Choose at least one interest.';
  }
  if (typeof draft.notes !== 'string' || draft.notes.length > 1000) errors.notes = 'Keep notes to 1,000 characters or fewer.';
  return errors;
}

export function toPlanRequest(draft) {
  return {
    groupType: draft.groupType,
    people: Number(draft.people),
    startTime: draft.startTime,
    endTime: draft.endTime,
    budget: Number(draft.budget),
    interests: [...new Set(draft.interests)],
    notes: draft.notes.trim(),
  };
}
