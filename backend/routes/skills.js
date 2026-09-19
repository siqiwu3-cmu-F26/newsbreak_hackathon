/**
 * Offer a Skill: turns a poster's freeform description into a structured
 * listing preview, using the AI Agent's skill-extraction LLM call.
 *
 * This route only does extraction/preview — it does not persist anything.
 * Whoever wires up storage (MongoDB) for published listings should, after
 * the poster confirms this preview:
 *   1. Merge in the fields this route deliberately leaves out: an id, the
 *      poster as `host`, `lat`/`lng` from their location, `cost` (0 for
 *      community listings, per the existing convention in
 *      experiences.json), `credits` (existing rule: duration > 60 -> 2,
 *      else 1), `type: "community"`, and an `image` placeholder.
 *   2. Add the poster-chosen validity window (`availableFrom`/`availableTo`,
 *      explicit date + start/end time — never inferred from text) so the
 *      listing is a one-off event, not a standing daily-hours entry.
 *   3. Store the result in the same shape as an Experience
 *      (backend/data/experiences.json), so it can merge straight into
 *      lib/itinerary.js's filterExperiences() candidate pool for /plan
 *      without any change to the AI Agent's prompt/validation code.
 */

import { Router } from "express";
import { extractSkillListing, fallbackSkillListing } from "../services/skillAgent.js";

const router = Router();

router.post("/extract", async (req, res) => {
  const { description, duration, groupSize } = req.body || {};

  if (typeof description !== "string" || !description.trim()) {
    return res.status(400).json({ error: "description is required" });
  }

  try {
    const listing = await extractSkillListing({
      description,
      duration: Number(duration) > 0 ? Number(duration) : 60,
      groupSize: Number(groupSize) > 0 ? Number(groupSize) : 4,
    });
    return res.json(listing);
  } catch (error) {
    console.error("Skill extraction failed; using fallback:", error.message);
    // Same "never break the demo" rule as /plan's buildFallback.
    return res.json(fallbackSkillListing(description));
  }
});

export default router;
