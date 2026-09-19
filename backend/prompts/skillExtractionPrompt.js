/**
 * Prompt builder for Offer a Skill listing extraction.
 *
 * Owned by: 3号 (AI Agent).
 *
 * Same philosophy as itineraryPrompt.js: the LLM only produces the fields
 * that are genuinely a judgment call (title, category, indoor/outdoor,
 * a clean description). It is never asked for numbers — duration, cost,
 * credits, and capacity come from the form or from fixed app rules, so a
 * bad guess here can't silently break a price or a schedule downstream.
 */

const SYSTEM_PROMPT = `You are a listing assistant for LocalConnect AI, a local experience-sharing app.
A community member has described, in their own words, a skill or activity they're willing to share
with neighbors. Turn their description into a clean, structured experience listing.

You must respond with JSON only. No prose, no markdown code fences, no explanation outside the JSON.`;

const CATEGORIES = ["creative", "food", "outdoors", "relaxing", "active", "culture"];

const OUTPUT_FORMAT_SPEC = `Respond with exactly this JSON shape, nothing else:
{
  "name": "short, appealing listing title (roughly 4-8 words)",
  "category": "one of: ${CATEGORIES.join(", ")}",
  "indoor": true or false,
  "description": "a clean 1-2 sentence rewrite of what they offer, in third person"
}`;

const HARD_RULES = `Hard rules:
- "category" must be exactly one of: ${CATEGORIES.join(", ")}. Never invent a new category.
- Do not include duration, cost, credits, or capacity in your response — the app fills those in from
  the form, not from your guess.
- Keep "description" faithful to what the person actually said. Don't invent skills, credentials, or
  claims they didn't make.`;

/**
 * Build the {system, user} messages sent to the LLM.
 *
 * @param {object} params
 * @param {string} params.description - the poster's own freeform text
 * @param {number} params.duration - session length in minutes (form field, not extracted)
 * @param {number} params.groupSize - max guests (form field, not extracted)
 */
export function buildSkillExtractionPrompt({ description, duration, groupSize }) {
  const parts = [
    `Person's own description: "${description}"`,
    `They are offering a session lasting ${duration} minutes for up to ${groupSize} people.`,
    "",
    HARD_RULES,
    "",
    OUTPUT_FORMAT_SPEC,
  ];

  return {
    system: SYSTEM_PROMPT,
    user: parts.join("\n"),
  };
}

export const SKILL_CATEGORIES = CATEGORIES;
