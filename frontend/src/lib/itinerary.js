const isAmount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

// Check the transport shape before handing data to the result UI. Scheduling and
// budget constraints remain the backend's responsibility.
export function isItinerary(plan) {
  if (!plan || typeof plan.summary !== 'string' || !Array.isArray(plan.activities) || !plan.activities.length) return false;
  if (!plan.totals || !['cash', 'credits', 'travelMinutes'].every(key => isAmount(plan.totals[key]))) return false;
  const ids = new Set();
  return plan.activities.every(activity => {
    if (!activity || typeof activity.id !== 'string' || !activity.id || ids.has(activity.id)) return false;
    ids.add(activity.id);
    return typeof activity.name === 'string' && ['community', 'business'].includes(activity.type)
      && isTime(activity.startTime) && isTime(activity.endTime) && activity.endTime > activity.startTime
      && ['cost', 'credits', 'travelToNext'].every(key => isAmount(activity[key]))
      && typeof activity.indoor === 'boolean' && typeof activity.reason === 'string'
      && Number.isFinite(activity.lat) && Number.isFinite(activity.lng);
  });
}

const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

// Member 2's current UI uses experienceId and travel time FROM the previous stop.
// Preserve the canonical backend fields and totals alongside these display aliases.
export function toDisplayPlan(itinerary, request) {
  return {
    ...itinerary,
    groupType: request.groupType,
    people: request.people,
    date: request.date,
    budget: request.budget,
    activities: itinerary.activities.map((activity, index) => ({
      ...activity,
      experienceId: activity.id,
      duration: minutes(activity.endTime) - minutes(activity.startTime),
      travelMinutes: index === 0 ? 0 : itinerary.activities[index - 1].travelToNext,
      location: typeof activity.location === 'string' ? activity.location : 'Palo Alto area',
      host: typeof activity.host === 'string' ? activity.host : undefined,
      tags: Array.isArray(activity.tags) ? activity.tags.filter(tag => typeof tag === 'string') : [],
      note: typeof activity.note === 'string' ? activity.note : undefined,
    })),
  };
}
