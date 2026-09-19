import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFallback,
  experiences,
  normalizePlanRequest,
  replaceActivity,
  replanForRain,
  validateAgentPlan
} from "../lib/itinerary.js";
import { parseLLMJson } from "../services/agent.js";

test("experience catalog satisfies MVP requirements", () => {
  assert.ok(experiences.length >= 12);
  assert.ok(experiences.some((item) => item.type === "community"));
  assert.ok(experiences.some((item) => item.type === "business"));
  assert.ok(experiences.some((item) => item.indoor));
  assert.ok(experiences.some((item) => !item.indoor));
});

test("fallback is complete and stays within the demo budget", () => {
  const itinerary = buildFallback(normalizePlanRequest());
  assert.equal(itinerary.activities.length, 4);
  assert.ok(itinerary.activities.some((item) => item.type === "community"));
  assert.ok(itinerary.totals.cash <= 80);
  assert.equal(itinerary.activities.at(-1).travelToNext, 0);
  assert.ok(itinerary.agentActions.checkedExperiences >= 12);
  assert.ok(itinerary.agentActions.communityConnections >= 1);
});

test("agent plan validator rejects unknown ids", () => {
  const errors = validateAgentPlan(
    {
      summary: "Invalid",
      activities: [
        { id: "missing", startTime: "15:00", endTime: "16:00" },
        { id: "business_01", startTime: "16:10", endTime: "17:00" },
        { id: "business_02", startTime: "17:10", endTime: "18:25" }
      ]
    },
    normalizePlanRequest()
  );
  assert.ok(errors.some((error) => error.includes("unknown id")));
});

test("replace swaps exactly one activity and recalculates totals", () => {
  const original = buildFallback(normalizePlanRequest());
  const replaced = replaceActivity(original, "community_01");
  assert.notEqual(replaced.activities[0].id, "community_01");
  assert.equal(replaced.activities.length, original.activities.length);
  assert.equal(replaced.activities.at(-1).travelToNext, 0);
});

test("replace honors an explicitly selected alternative", () => {
  const original = buildFallback(normalizePlanRequest());
  const replaced = replaceActivity(original, "community_01", {}, "community_03");
  assert.equal(replaced.activities[0].id, "community_03");
});

test("agent validator enforces locked and rejected choices", () => {
  const request = normalizePlanRequest({
    lockedActivityIds: ["community_02"],
    rejectedActivityIds: ["community_01"],
  });
  const errors = validateAgentPlan({
    summary: "Wrong choices",
    activities: [
      { id: "community_01", startTime: "15:00", endTime: "16:00" },
      { id: "business_01", startTime: "16:12", endTime: "17:02" },
      { id: "business_02", startTime: "17:15", endTime: "18:30" },
    ],
  }, request);
  assert.ok(errors.some((error) => error.includes("locked activity community_02")));
  assert.ok(errors.some((error) => error.includes("rejected activity community_01")));
});

test("rain replan removes outdoor activities", () => {
  const original = buildFallback(normalizePlanRequest());
  const replanned = replanForRain(original);
  assert.ok(replanned.activities.every((item) => item.indoor));
  assert.match(replanned.summary, /indoor|weather/i);
});

test("agent parser accepts fenced JSON followed by stray prose", () => {
  const parsed = parseLLMJson('```json\n{"summary":"Good","activities":[]}\n```\nExtra note');
  assert.equal(parsed.summary, "Good");
});

test("agent validator enforces listed duration and travel gaps", () => {
  const request = normalizePlanRequest();
  const errors = validateAgentPlan({
    summary: "Too tight",
    activities: [
      { id: "community_01", startTime: "15:00", endTime: "15:30" },
      { id: "business_01", startTime: "15:30", endTime: "16:20" },
      { id: "business_02", startTime: "17:00", endTime: "18:15" }
    ]
  }, request);
  assert.ok(errors.some((error) => error.includes("listed duration")));
  assert.ok(errors.some((error) => error.includes("minutes for travel")));
});
