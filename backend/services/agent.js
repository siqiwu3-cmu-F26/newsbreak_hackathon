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

export const AGENT_CONFIG = { MODEL, TEMPERATURE, MAX_TOKENS };
