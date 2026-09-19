/**
 * Prompt builder for the AI Agent (design doc §5).
 *
 * Owned by: 3号 (AI Agent).
 *
 * The LLM is only ever asked for four fields per activity (id, startTime,
 * endTime, reason) plus a top-level summary. Everything else (name, coords,
 * price, credits, travel time, totals) is backfilled by
 * backend/lib/itinerary.js's hydrateItinerary() — never trust the LLM to
 * invent those.
 */

const SYSTEM_PROMPT = `You are a local experience planning agent for an app called LocalConnect AI.
Given a user's outing request and a list of available local experiences, choose and order a
sequence of experiences into a same-day itinerary.

You must respond with JSON only. No prose, no markdown code fences, no explanation outside the JSON.`;

/**
 * Turn a normalized PlanRequest into a natural-language description for the prompt.
 * @param {object} request - { groupType, people, startTime, endTime, budget, interests, notes }
 */
function describeRequest(request) {
  const { groupType, people, date, startTime, endTime, budget, interests, location, notes } = request;
  const lines = [
    `Group type: ${groupType}`,
    `Number of people: ${people}`,
    `Date: ${date}`,
    `Location: ${location?.city || "Palo Alto"}`,
    `Time window: ${startTime} to ${endTime}`,
    `Budget: $${budget} total`,
    `Interests: ${(interests || []).join(", ") || "none specified"}`,
  ];
  if (notes) lines.push(`Notes from user: ${notes}`);
  return lines.join("\n");
}

/**
 * Trim an experience down to the fields the LLM is allowed to see.
 * Coordinates and long descriptions are deliberately withheld to save tokens
 * and to keep the LLM from having any chance of inventing/echoing bad data.
 * openFrom/openTo are included because validateAgentPlan() in
 * backend/lib/itinerary.js rejects activities scheduled outside the
 * experience's own opening hours.
 */
function trimExperience(exp) {
  const { id, name, type, category, duration, cost, credits, indoor, openFrom, openTo } = exp;
  return { id, name, type, category, duration, cost, credits, indoor, openFrom, openTo };
}

const OUTPUT_FORMAT_SPEC = `Respond with exactly this JSON shape, nothing else:
{
  "summary": "one short sentence describing the plan",
  "activities": [
    { "id": "<experience id>", "startTime": "HH:MM", "endTime": "HH:MM", "reason": "short reason this fits" }
  ]
}`;

const HARD_RULES = `Hard rules (all must hold):
- Only use "id" values that appear in the experience list below. Never invent an id, and never reuse the same id twice.
- Choose between 3 and 5 activities total.
- Activities must not overlap in time, and must be listed in chronological order.
- Each activity's endTime minus startTime must exactly equal its listed duration.
- Leave at least 15 minutes between one activity's endTime and the next activity's startTime for local travel.
- The first activity's startTime must be >= the user's requested startTime, and the last
  activity's endTime must be <= the user's requested endTime.
- Each activity's startTime/endTime must fall within that experience's own openFrom/openTo hours.
- The sum of the "cost" field across chosen activities must not exceed the user's budget.
- At least one chosen activity must have "type": "community".
- Prefer a mix of "community" and "business" experiences over an all-business plan.`;

/**
 * Build the {system, user} messages sent to the LLM.
 *
 * @param {object} params
 * @param {object} params.request - normalized PlanRequest (see lib/itinerary.js normalizePlanRequest)
 * @param {object[]} params.experiences - candidate experiences (already pre-filtered by lib/itinerary.js filterExperiences)
 * @param {string[]} [params.feedback] - validation errors from the previous attempt, if this is a retry
 */
export function buildItineraryPrompt({ request, experiences, feedback = [], environment }) {
  const trimmed = experiences.map(trimExperience);
  const environmentLines = environment
    ? [
        "",
        "Local conditions:",
        `Weather: ${environment.weather?.condition || "unknown"}, ${environment.weather?.temperature ?? "?"}°F`,
        `Sunset: ${environment.sunset || "unknown"}`,
        ...(environment.weather?.condition === "rain"
          ? ["Because it is raining, choose indoor experiences only."]
          : []),
      ]
    : [];

  const parts = [
    describeRequest(request),
    ...environmentLines,
    "",
    "Available experiences (JSON array):",
    JSON.stringify(trimmed),
    "",
    HARD_RULES,
    "",
    OUTPUT_FORMAT_SPEC,
  ];

  if (feedback && feedback.length > 0) {
    parts.push(
      "",
      `Your previous attempt had these problems: ${feedback.join("; ")}. ` +
        `Fix every one of them and respond again, following every rule above.`
    );
  }

  return {
    system: SYSTEM_PROMPT,
    user: parts.join("\n"),
  };
}
