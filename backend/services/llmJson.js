/**
 * Tolerant JSON parsing for LLM text responses, shared by every LLM call
 * (agent.js, skillAgent.js). Models sometimes wrap JSON in markdown fences
 * or add stray prose after it even when told not to — this strips fences
 * and extracts the first balanced {...} object rather than failing outright.
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

/**
 * Parse the LLM's text response into an object. Throws a descriptive error
 * on invalid JSON — callers decide whether that means retry or fallback.
 */
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
