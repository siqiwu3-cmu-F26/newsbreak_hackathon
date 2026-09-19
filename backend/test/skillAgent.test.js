import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSkillListing, fallbackSkillListing, SKILL_AGENT_CONFIG } from "../services/skillAgent.js";
import { buildSkillExtractionPrompt, SKILL_CATEGORIES } from "../prompts/skillExtractionPrompt.js";

test("normalizeSkillListing passes through a well-formed LLM response", () => {
  const listing = normalizeSkillListing(
    { name: "Backyard Pasta Night", category: "food", indoor: true, description: "Learn to make fresh pasta." },
    "I make pasta"
  );
  assert.deepEqual(listing, {
    name: "Backyard Pasta Night",
    category: "food",
    indoor: true,
    description: "Learn to make fresh pasta.",
  });
});

test("normalizeSkillListing coerces an invalid category instead of throwing", () => {
  const listing = normalizeSkillListing({ name: "Test", category: "sports", indoor: true, description: "x" }, "fallback text");
  assert.equal(listing.category, "creative");
  assert.ok(SKILL_CATEGORIES.includes(listing.category));
});

test("normalizeSkillListing falls back to the original description when the LLM omits one", () => {
  const listing = normalizeSkillListing({ name: "Test", category: "food" }, "I bake sourdough bread");
  assert.equal(listing.description, "I bake sourdough bread");
  assert.equal(listing.indoor, true); // safe default when the LLM doesn't say
});

test("normalizeSkillListing handles a completely malformed response", () => {
  const listing = normalizeSkillListing(null, "I teach guitar");
  assert.equal(listing.name, "A community experience");
  assert.equal(listing.category, "creative");
  assert.equal(listing.description, "I teach guitar");
});

test("fallbackSkillListing never throws and always returns a valid category", () => {
  assert.ok(SKILL_CATEGORIES.includes(fallbackSkillListing("I teach basic home repairs").category));
  assert.equal(fallbackSkillListing("").name, "A community experience");
});

test("buildSkillExtractionPrompt never asks the LLM for numbers", () => {
  const prompt = buildSkillExtractionPrompt({ description: "I teach yoga", duration: 45, groupSize: 3 });
  assert.match(prompt.user, /do not include duration, cost, credits, or capacity/i);
  assert.match(prompt.system, /JSON only/i);
});

test("SKILL_AGENT_CONFIG exposes the same six categories the validator accepts", () => {
  assert.deepEqual(SKILL_AGENT_CONFIG.CATEGORIES, SKILL_CATEGORIES);
});
