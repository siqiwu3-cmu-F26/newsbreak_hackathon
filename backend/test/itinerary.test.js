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

test("rain replan removes outdoor activities", () => {
  const original = buildFallback(normalizePlanRequest());
  const replanned = replanForRain(original);
  assert.ok(replanned.activities.every((item) => item.indoor));
  assert.match(replanned.summary, /indoor|weather/i);
});
