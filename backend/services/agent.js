/**
 * The AI Agent's LLM call (design doc §5).
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
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildItineraryPrompt } from "../prompts/itineraryPrompt.js";

const MODEL = "claude-haiku-4-5-20251001";
const TEMPERATURE = 0.7; // design doc §5: 0.7 — low enough to respect constraints, high
// enough that /replace and re-plans don't return an identical result every time.
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 15000; // design doc §4: frontend cuts over to fallback past 15s anyway

let client;
function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env and fill it in."
      );
    }
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
    client = new Anthropic({
      apiKey,
      timeout: TIMEOUT_MS,
      // This key is org-level, not workspace-scoped, so every request must
      // carry the workspace id explicitly.
      defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
    });
  }
  return client;
}

/**
 * Parse the LLM's text response into an object, tolerating stray markdown
 * code fences even though the prompt asks the model not to use them.
 * Throws a descriptive error on invalid JSON — routes/plan.js catches this
 * and skips straight to the fallback itinerary rather than retrying, since
 * a model that can't produce JSON at all is unlikely to fix itself.
 */
function firstJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return text;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return text.slice(start);
}

export function parseLLMJson(text) {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(firstJsonObject(stripped));
  } catch (err) {
    throw new Error(`LLM did not return valid JSON: ${err.message}`);
  }
}

/**
 * Generate one raw itinerary plan from the LLM.
 *
 * @param {object} params
 * @param {object} params.request - normalized PlanRequest (see lib/itinerary.js normalizePlanRequest)
 * @param {object[]} params.experiences - pre-filtered candidate experiences (see lib/itinerary.js filterExperiences)
 * @param {string[]} [params.feedback] - validation errors from the previous attempt, if any
 * @returns {Promise<{summary: string, activities: Array<{id: string, startTime: string, endTime: string, reason: string}>}>}
 */
export async function generateItinerary({ request, experiences, feedback = [], environment }) {
  const prompt = buildItineraryPrompt({ request, experiences, feedback, environment });
  const anthropic = getClient();

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

export const AGENT_CONFIG = { MODEL, TEMPERATURE, MAX_TOKENS, TIMEOUT_MS };
