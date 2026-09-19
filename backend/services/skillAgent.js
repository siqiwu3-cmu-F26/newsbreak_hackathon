/**
 * The AI Agent's second LLM call: turning a freeform "Offer a Skill"
 * description into a structured listing preview (general guide's original
 * "Skill Extraction" capability — previously a regex placeholder in
 * frontend/src/pages/OfferSkill.jsx).
 *
 * Owned by: 3号 (AI Agent). Independent of generateItinerary() in agent.js —
 * different prompt, different model settings, no shared state beyond the
 * Anthropic client and JSON parsing.
 *
 * Scope note: this only extracts the *qualitative* fields (name, category,
 * indoor/outdoor, description). It does NOT decide:
 *   - duration / groupSize — collected by the form, passed in as input.
 *   - cost / credits — a fixed app rule (community postings are free;
 *     credits scale with duration), not an LLM guess.
 *   - id / host / lat / lng / image — assigned by whoever persists the
 *     listing (poster identity + location), not the AI Agent's job.
 *   - availableFrom / availableTo (the post's one-off validity window,
 *     e.g. "Sat 3-5pm") — this must be an explicit date/time the poster
 *     picks in the form, never inferred from prose. Once persisted with
 *     that window, a listing merges into the /plan candidate pool the same
 *     way a static experiences.json entry does (same shape, same
 *     category-matching logic in lib/itinerary.js's filterExperiences) —
 *     that data-layer wiring is outside this file's scope; see
 *     backend/routes/skills.js for the handoff point.
 */

import { getAnthropicClient } from "./anthropicClient.js";
import { parseLLMJson } from "./llmJson.js";
import { buildSkillExtractionPrompt, SKILL_CATEGORIES } from "../prompts/skillExtractionPrompt.js";

const MODEL = "claude-haiku-4-5-20251001";
// Lower temperature than itinerary planning: this is closer to
// classification/rewriting than to creative scheduling, so we want it to
// reliably land on one of the six fixed categories rather than vary.
const TEMPERATURE = 0.3;
const MAX_TOKENS = 512;

const VALID_CATEGORIES = new Set(SKILL_CATEGORIES);

/**
 * Extract a structured listing preview from a poster's description.
 *
 * @param {object} params
 * @param {string} params.description - the poster's own freeform text
 * @param {number} params.duration - session length in minutes
 * @param {number} params.groupSize - max guests
 * @returns {Promise<{name: string, category: string, categoryLabel: string, indoor: boolean, description: string}>}
 */
export async function extractSkillListing({ description, duration, groupSize }) {
  if (!description || !description.trim()) {
    throw new Error("description is required");
  }

  const prompt = buildSkillExtractionPrompt({ description, duration, groupSize });
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

  const parsed = parseLLMJson(textBlock.text);
  return normalizeSkillListing(parsed, description);
}

/**
 * Display label for a category, matching the app's existing convention
 * (frontend/src/components/InterestSelector.jsx just capitalizes the first
 * letter) rather than inventing a new label style. Deterministic, not
 * LLM-guessed, so the UI always gets a valid label to show.
 */
function categoryLabel(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Never trust the LLM's shape/category blindly (same philosophy as
 * validateAgentPlan in lib/itinerary.js) — coerce to safe defaults instead
 * of throwing, since this is a single-shot preview and the demo shouldn't
 * break over a malformed field.
 */
export function normalizeSkillListing(parsed, originalDescription) {
  const category = VALID_CATEGORIES.has(parsed?.category) ? parsed.category : "creative";
  const name =
    typeof parsed?.name === "string" && parsed.name.trim() ? parsed.name.trim() : "A community experience";
  const indoor = typeof parsed?.indoor === "boolean" ? parsed.indoor : true;
  const description =
    typeof parsed?.description === "string" && parsed.description.trim()
      ? parsed.description.trim()
      : originalDescription.trim();
  return { name, category, categoryLabel: categoryLabel(category), indoor, description };
}

/** Deterministic fallback if the LLM call fails outright — same
 * "never break the demo" rule as buildFallback() for /plan. */
export function fallbackSkillListing(description) {
  const text = (description || "").trim();
  const firstWords = text.split(/\s+/).slice(0, 5).join(" ");
  return {
    name: firstWords ? `Learn: ${firstWords}` : "A community experience",
    category: "creative",
    categoryLabel: categoryLabel("creative"),
    indoor: true,
    description: text || "A community experience.",
  };
}

export const SKILL_AGENT_CONFIG = { MODEL, TEMPERATURE, MAX_TOKENS, CATEGORIES: SKILL_CATEGORIES };
