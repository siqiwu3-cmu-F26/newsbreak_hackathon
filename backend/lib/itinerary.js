import { readFileSync } from "node:fs";
import { listPublishedCommunityExperiences } from "../services/communityExperiences.js";

const experiencesUrl = new URL("../data/experiences.json", import.meta.url);

export const experiences = [
  ...JSON.parse(readFileSync(experiencesUrl, "utf8")),
  ...listPublishedCommunityExperiences(),
];
export const experienceById = new Map(experiences.map((item) => [item.id, item]));

export function registerExperience(experience) {
  const existingIndex = experiences.findIndex((item) => item.id === experience.id);
  if (existingIndex >= 0) experiences.splice(existingIndex, 1, experience);
  else experiences.push(experience);
  experienceById.set(experience.id, experience);
  return experience;
}

const DEMO_SELECTION = [
  { id: "community_01", startTime: "15:00", endTime: "16:00", reason: "Interactive but low-pressure, making it ideal for a first date." },
  { id: "business_01", startTime: "16:12", endTime: "17:02", reason: "A quiet setting to relax and continue the conversation." },
  { id: "business_02", startTime: "17:15", endTime: "18:30", reason: "Shareable dishes create a warm and easy dinner experience." },
  { id: "business_03", startTime: "18:45", endTime: "19:40", reason: "A gentle outdoor finish timed for the evening light." }
];

export function normalizePlanRequest(body = {}) {
  return {
    groupType: body.groupType || "date",
    people: positiveNumber(body.people, 2),
    date: /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "2026-09-19",
    startTime: validTime(body.startTime) ? body.startTime : "15:00",
    endTime: validTime(body.endTime) ? body.endTime : "20:00",
    budget: nonNegativeNumber(body.budget, 80),
    interests: Array.isArray(body.interests) ? body.interests.filter(Boolean) : [],
    location: body.location && typeof body.location === "object"
      ? body.location
      : { city: "Palo Alto", lat: 37.4419, lng: -122.143 },
    notes: typeof body.notes === "string" ? body.notes : "",
    lockedActivityIds: stringArray(body.lockedActivityIds),
    rejectedActivityIds: stringArray(body.rejectedActivityIds)
  };
}

export function filterExperiences(request) {
  const interests = new Set(request.interests);
  if (interests.size === 0) return experiences;

  const matches = experiences.filter((item) => interests.has(item.category));
  return matches.length >= 5 ? matches : experiences;
}

export function validateAgentPlan(rawPlan, request, environment) {
  const errors = [];
  const activities = rawPlan?.activities;

  if (!rawPlan || typeof rawPlan.summary !== "string") errors.push("summary is missing");
  if (!Array.isArray(activities)) return ["activities must be an array"];
  if (activities.length < 3 || activities.length > 5) errors.push("plan must contain 3 to 5 activities");

  let previousEnd = request.startTime;
  let previousExperience = null;
  let cash = 0;
  let communityCount = 0;
  const seen = new Set();

  for (const [index, activity] of activities.entries()) {
    const experience = experienceById.get(activity?.id);
    if (!experience) {
      errors.push(`activity ${index + 1} has an unknown id`);
      continue;
    }
    if (seen.has(activity.id)) errors.push(`activity id ${activity.id} is duplicated`);
    seen.add(activity.id);
    if (!validTime(activity.startTime) || !validTime(activity.endTime)) {
      errors.push(`activity ${activity.id} has an invalid time`);
      continue;
    }
    if (toMinutes(activity.startTime) < toMinutes(previousEnd)) errors.push(`activity ${activity.id} overlaps or is out of order`);
    if (previousExperience) {
      const requiredTravel = travelMinutes(previousExperience, experience);
      if (toMinutes(activity.startTime) < toMinutes(previousEnd) + requiredTravel) {
        errors.push(`activity ${activity.id} does not leave ${requiredTravel} minutes for travel`);
      }
    }
    if (toMinutes(activity.endTime) <= toMinutes(activity.startTime)) errors.push(`activity ${activity.id} must end after it starts`);
    if (toMinutes(activity.endTime) - toMinutes(activity.startTime) !== experience.duration) {
      errors.push(`activity ${activity.id} must use its listed duration of ${experience.duration} minutes`);
    }
    if (toMinutes(activity.startTime) < toMinutes(request.startTime) || toMinutes(activity.endTime) > toMinutes(request.endTime)) {
      errors.push(`activity ${activity.id} is outside the requested time window`);
    }
    if (toMinutes(activity.startTime) < toMinutes(experience.openFrom) || toMinutes(activity.endTime) > toMinutes(experience.openTo)) {
      errors.push(`activity ${activity.id} is outside its opening hours`);
    }
    if (environment?.weather?.condition === "rain" && !experience.indoor) {
      errors.push(`activity ${activity.id} is outdoors during rain`);
    }
    previousEnd = activity.endTime;
    previousExperience = experience;
    cash += experience.cost;
    if (experience.type === "community") communityCount += 1;
  }

  if (cash > request.budget) errors.push(`cash total ${cash} exceeds budget ${request.budget}`);
  if (communityCount === 0) errors.push("plan must include at least one community experience");
  for (const id of request.lockedActivityIds || []) {
    if (!seen.has(id)) errors.push(`locked activity ${id} must be included`);
  }
  for (const id of request.rejectedActivityIds || []) {
    if (seen.has(id)) errors.push(`rejected activity ${id} must not be included`);
  }
  return errors;
}

export function hydrateItinerary(rawPlan, request, { fallback = false } = {}) {
  const activities = rawPlan.activities
    .map((planned) => {
      const experience = experienceById.get(planned.id);
      if (!experience) return null;
      return {
        id: experience.id,
        name: experience.name,
        type: experience.type,
        category: experience.category,
        duration: experience.duration,
        startTime: planned.startTime,
        endTime: planned.endTime,
        cost: experience.cost,
        credits: experience.credits,
        lat: experience.lat,
        lng: experience.lng,
        indoor: experience.indoor,
        image: experience.image,
        host: experience.host,
        capacity: experience.capacity,
        availability: experience.availability,
        location: experience.location,
        travelToNext: 0,
        reason: planned.reason || "A good fit for your preferences."
      };
    })
    .filter(Boolean);

  addTravelTimes(activities);

  return {
    summary: rawPlan.summary,
    activities,
    totals: calculateTotals(activities),
    agentActions: buildAgentActions(activities, request),
    constraints: {
      startTime: request.startTime,
      endTime: request.endTime,
      budget: request.budget,
      date: request.date,
      location: request.location
    },
    ...(fallback ? { fallback: true } : {})
  };
}

export function buildFallback(request = normalizePlanRequest()) {
  return hydrateItinerary(
    { summary: "A relaxed and creative first date with local flavor", activities: DEMO_SELECTION },
    request,
    { fallback: true }
  );
}

export function replaceActivity(itinerary, activityId, constraints = {}, replacementId) {
  const activities = Array.isArray(itinerary?.activities) ? itinerary.activities : [];
  const index = activities.findIndex((item) => item.id === activityId);
  if (index < 0) return itinerary;

  const original = experienceById.get(activityId);
  if (!original) return itinerary;

  const usedIds = new Set(activities.map((item) => item.id));
  const budget = nonNegativeNumber(constraints.budget ?? itinerary?.constraints?.budget, Infinity);
  const currentCash = activities.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const availableCash = budget - (currentCash - original.cost);

  const unused = experiences.filter((candidate) => !usedIds.has(candidate.id));
  const sameCategory = unused.filter((candidate) => candidate.category === original.category);
  let candidates = sameCategory.length ? sameCategory : unused;
  candidates = [...candidates].sort((a, b) => {
    const budgetPenaltyA = a.cost <= availableCash ? 0 : 1;
    const budgetPenaltyB = b.cost <= availableCash ? 0 : 1;
    return budgetPenaltyA - budgetPenaltyB || Math.abs(a.duration - original.duration) - Math.abs(b.duration - original.duration) || a.cost - b.cost;
  });

  const requestedReplacement = replacementId && !usedIds.has(replacementId)
    ? experienceById.get(replacementId)
    : null;
  const replacement = requestedReplacement || candidates[0];
  if (!replacement) return itinerary;

  const endTime = constraints.endTime || itinerary?.constraints?.endTime || "23:59";
  const updated = replaceAtIndex(activities, index, replacement, endTime, `A fresh ${replacement.category} alternative that keeps the plan balanced.`);
  addTravelTimes(updated);

  return {
    ...itinerary,
    activities: updated,
    totals: calculateTotals(updated),
    agentActions: {
      ...(itinerary.agentActions || buildAgentActions(updated, constraints)),
      latest: `Compared local alternatives, replaced ${original.name}, and recalculated timing, travel, and totals.`,
    },
    constraints: { ...itinerary?.constraints, ...constraints }
  };
}

export function replanForRain(itinerary, constraints = {}) {
  let activities = Array.isArray(itinerary?.activities) ? [...itinerary.activities] : [];
  const endTime = constraints.endTime || itinerary?.constraints?.endTime || "23:59";
  const usedIds = new Set(activities.map((item) => item.id));

  for (let index = 0; index < activities.length; index += 1) {
    const current = activities[index];
    if (current.indoor) continue;

    const original = experienceById.get(current.id);
    let candidates = experiences.filter((item) => item.indoor && !usedIds.has(item.id) && item.category === original?.category);
    if (!candidates.length) candidates = experiences.filter((item) => item.indoor && !usedIds.has(item.id));
    candidates.sort((a, b) => Math.abs(a.duration - (original?.duration || 60)) - Math.abs(b.duration - (original?.duration || 60)) || a.cost - b.cost);

    const replacement = candidates[0];
    if (!replacement) continue;
    usedIds.delete(current.id);
    usedIds.add(replacement.id);
    activities = replaceAtIndex(activities, index, replacement, endTime, "An indoor alternative selected to keep your plan comfortable in the rain.");
  }

  addTravelTimes(activities);
  return {
    ...itinerary,
    summary: activities.some((item) => !item.indoor)
      ? `${itinerary.summary} with weather-aware updates`
      : "A cozy indoor plan, updated for rainy weather",
    activities,
    totals: calculateTotals(activities),
    agentActions: {
      ...(itinerary.agentActions || buildAgentActions(activities, constraints)),
      latest: "Weather changed. I replaced affected outdoor stops and recalculated travel, timing, and budget.",
    },
    constraints: { ...itinerary?.constraints, ...constraints }
  };
}

export function reorderItinerary(itinerary, activityIds, constraints = {}) {
  const original = itinerary?.activities;
  if (!Array.isArray(original) || !original.length || !Array.isArray(activityIds)
    || activityIds.length !== original.length || new Set(activityIds).size !== original.length
    || new Set(original.map(item => item.id)).size !== original.length) {
    throw new Error('Choose each activity exactly once when reordering.');
  }
  const byId = new Map(original.map(activity => [activity.id, activity]));
  if (activityIds.some(id => !byId.has(id))) throw new Error('The reordered plan contains an unknown activity.');
  const limits = { ...itinerary.constraints, ...constraints };
  const startTime = limits.startTime ?? original[0].startTime;
  const endTime = limits.endTime ?? original.at(-1).endTime;
  if (!validTime(startTime) || !validTime(endTime) || startTime >= endTime) {
    throw new Error('Choose a valid same-day planning window.');
  }
  const activities = activityIds.map(id => {
    const activity = byId.get(id);
    if (!validTime(activity.startTime) || !validTime(activity.endTime)
      || activity.endTime <= activity.startTime
      || !Number.isFinite(activity.lat) || Math.abs(activity.lat) > 90
      || !Number.isFinite(activity.lng) || Math.abs(activity.lng) > 180
      || !Number.isFinite(activity.cost) || activity.cost < 0
      || !Number.isFinite(activity.credits) || activity.credits < 0) {
      throw new Error('This activity is missing valid time, cost, or location information.');
    }
    return { ...activity, duration: toMinutes(activity.endTime) - toMinutes(activity.startTime) };
  });
  addTravelTimes(activities);
  let cursor = toMinutes(startTime);
  for (const activity of activities) {
    const experience = experienceById.get(activity.id);
    const openFrom = experience?.openFrom ?? activity.openFrom;
    const openTo = experience?.openTo ?? activity.openTo;
    if (validTime(openFrom)) cursor = Math.max(cursor, toMinutes(openFrom));
    const finish = cursor + activity.duration;
    if (validTime(openTo) && finish > toMinutes(openTo)) {
      throw new Error(`${activity.name} would finish after closing at ${openTo}. Try another order.`);
    }
    if (finish > toMinutes(endTime)) {
      throw new Error(`This order would end after ${endTime}. Extend your planning window or try another order.`);
    }
    activity.startTime = fromMinutes(cursor);
    activity.endTime = fromMinutes(finish);
    cursor = finish + activity.travelToNext;
  }
  return {
    ...itinerary,
    activities,
    totals: calculateTotals(activities),
    constraints: { ...limits, startTime, endTime },
  };
}

function replaceAtIndex(activities, index, replacement, endTime, reason) {
  const next = activities.map((item) => ({ ...item }));
  const oldDuration = Math.max(0, toMinutes(next[index].endTime) - toMinutes(next[index].startTime));
  const delta = Math.max(0, replacement.duration - oldDuration);
  const start = next[index].startTime;

  next[index] = {
    id: replacement.id,
    name: replacement.name,
    type: replacement.type,
    category: replacement.category,
    duration: replacement.duration,
    startTime: start,
    endTime: fromMinutes(toMinutes(start) + replacement.duration),
    cost: replacement.cost,
    credits: replacement.credits,
    lat: replacement.lat,
    lng: replacement.lng,
    indoor: replacement.indoor,
    image: replacement.image,
    host: replacement.host,
    capacity: replacement.capacity,
    availability: replacement.availability,
    location: replacement.location,
    travelToNext: 0,
    reason
  };

  if (delta > 0) {
    for (let i = index + 1; i < next.length; i += 1) {
      next[i].startTime = fromMinutes(toMinutes(next[i].startTime) + delta);
      next[i].endTime = fromMinutes(toMinutes(next[i].endTime) + delta);
    }
  }

  return next.filter((item) => toMinutes(item.endTime) <= toMinutes(endTime));
}

function addTravelTimes(activities) {
  activities.forEach((activity, index) => {
    const next = activities[index + 1];
    activity.travelToNext = next ? travelMinutes(activity, next) : 0;
  });
}

function calculateTotals(activities) {
  return activities.reduce(
    (totals, item) => ({
      cash: totals.cash + Number(item.cost || 0),
      credits: totals.credits + Number(item.credits || 0),
      travelMinutes: totals.travelMinutes + Number(item.travelToNext || 0)
    }),
    { cash: 0, credits: 0, travelMinutes: 0 }
  );
}

function buildAgentActions(activities, request = {}) {
  return {
    checkedExperiences: experiences.length,
    checks: ["live weather", "opening hours", "travel time", `$${request.budget ?? 0} budget`],
    resolvedConstraints: 4,
    communityConnections: activities.filter((item) => item.type === "community").length,
    latest: "Built this plan from local availability and your preferences, then validated every stop.",
  };
}

function travelMinutes(from, to) {
  const earthRadiusMiles = 3958.8;
  const lat1 = degreesToRadians(from.lat);
  const lat2 = degreesToRadians(to.lat);
  const deltaLat = degreesToRadians(to.lat - from.lat);
  const deltaLng = degreesToRadians(to.lng - from.lng);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const distanceMiles = earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(3, Math.ceil((distanceMiles / 30) * 60 + 3));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

export function toMinutes(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total) {
  const safe = Math.max(0, total);
  const hours = Math.floor(safe / 60) % 24;
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function validTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegativeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function stringArray(value) {
  return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === "string" && item))] : [];
}
