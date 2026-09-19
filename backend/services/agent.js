/**
 * The AI Agent's LLM call for itinerary planning (design doc §5).
 *
 * Owned by: 3号 (AI Agent).
 *
 * Called by backend/routes/plan.js as:
 *   const agent = await import("../services/agent.js");
 *   const generate = agent.generateItinerary || agent.planItinerary || agent.default;
 *   const rawPlan = await generate({ request, experiences, feedback });
 *
 * This function does exactly one thing: build the prompt, call Claude once,
 * and return the parsed raw plan. It does NOT validate the plan or retry —
 * routes/plan.js already owns that loop (up to 2 attempts, feeding
 * validateAgentPlan()'s errors back in as `feedback`), and
 * backend/lib/itinerary.js already owns validateAgentPlan/hydrateItinerary/
 * buildFallback. Duplicating that here would just create two sources of
 * truth for what a "valid" plan is.
 *
 * See backend/services/skillAgent.js for the AI Agent's other LLM call
 * (Offer a Skill listing extraction) — a separate model call with its own
 * prompt, sharing only the Anthropic client setup (anthropicClient.js) and
 * JSON parsing (llmJson.js).
 */

import { getAnthropicClient } from "./anthropicClient.js";
import { parseLLMJson } from "./llmJson.js";
import { buildItineraryPrompt } from "../prompts/itineraryPrompt.js";

const MODEL = "claude-haiku-4-5-20251001";
const TEMPERATURE = 0.7; // design doc §5: 0.7 — low enough to respect constraints, high
// enough that /replace and re-plans don't return an identical result every time.
const MAX_TOKENS = 1024;

/**
 * Generate one raw itinerary plan from the LLM.
 *
 * @param {object} params
 * @param {object} params.request - normalized PlanRequest (see lib/itinerary.js normalizePlanRequest)
 * @param {object[]} params.experiences - pre-filtered candidate experiences (see lib/itinerary.js filterExperiences)
 * @param {string[]} [params.feedback] - validation errors from the previous attempt, if any
 * @param {object} [params.environment] - weather/sunset/location context, if available
 * @returns {Promise<{summary: string, activities: Array<{id: string, startTime: string, endTime: string, reason: string}>}>}
 */
export async function generateItinerary({ request, experiences, feedback = [], environment }) {
  const prompt = buildItineraryPrompt({ request, experiences, feedback, environment });
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) {
    throw new Error("LLM response contained no text block");
  }
  return parseLLMJson(textBlock.text);
}

// Re-exported so existing imports (e.g. backend/test/itinerary.test.js) keep working.
export { parseLLMJson };

/**
 * First step of the collaborative planning flow (PlanTogether.jsx / the
 * "plan-self-choice" feature): instead of a full itinerary, offer 3
 * meaningfully different anchor activities for the user to pick a
 * direction from. Added by another teammate; merged here to share the
 * same Anthropic client / JSON parsing as generateItinerary and
 * skillAgent.js's extractSkillListing, instead of duplicating client setup.
 *
 * @param {object} params
 * @param {object} params.request - normalized PlanRequest
 * @param {object[]} params.experiences - pre-filtered candidate experiences
 * @param {object} [params.environment] - weather/sunset/location context, if available
 */
export async function generateAnchorOptions({ request, experiences, environment }) {
  const weather = environment?.weather;
  const candidates = experiences.map(({ id, name, type, category, duration, cost, credits, indoor }) => ({
    id, name, type, category, duration, cost, credits, indoor,
  }));
  const prompt = `You are the first step of a collaborative local planning agent. Do not make a full itinerary yet.
Choose exactly 3 distinct anchor activities that give the user meaningfully different directions. Rank them best-first.
Use only ids from the candidate list. At least one option should be a community experience when available.
Explain why each fits and one honest tradeoff. Keep every reason and tradeoff under 18 words.
Respond with JSON only in this exact shape:
{"message":"one warm sentence inviting the user to choose","options":[{"id":"candidate id","label":"2-4 word angle","reason":"why it fits","tradeoff":"what the user gives up"}]}

User request:
${JSON.stringify(request)}
Local conditions:
${JSON.stringify({ weather, sunset: environment?.sunset })}
Candidates:
${JSON.stringify(candidates)}`;
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    temperature: TEMPERATURE,
    system: "You are a collaborative planning agent. Return valid JSON only, without markdown.",
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock) throw new Error("LLM response contained no text block");
  return parseLLMJson(textBlock.text);
}

export const AGENT_CONFIG = { MODEL, TEMPERATURE, MAX_TOKENS };
