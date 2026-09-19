/**
 * Manual smoke test for the AI Agent (3号's part).
 *
 * Exercises the exact same flow as backend/routes/plan.js — normalize the
 * request, pre-filter experiences, call generateItinerary() up to twice
 * (feeding validation errors back in as feedback), and fall back to the
 * hardcoded demo itinerary if both attempts fail — but without needing the
 * Express server running.
 *
 * Usage:
 *   cd backend
 *   npm install
 *   cp .env.example .env   # then paste in your ANTHROPIC_API_KEY (and
 *                          # ANTHROPIC_WORKSPACE_ID if your key needs one)
 *   npm run test:agent
 */

import "dotenv/config";
import { generateItinerary } from "../services/agent.js";
import {
  normalizePlanRequest,
  filterExperiences,
  validateAgentPlan,
  hydrateItinerary,
  buildFallback,
} from "../lib/itinerary.js";

const SAMPLE_REQUEST_BODY = {
  groupType: "date",
  people: 2,
  startTime: "15:00",
  endTime: "20:00",
  budget: 80,
  interests: ["creative", "food", "relaxing"],
  notes: "First date, likes flowers and quiet places",
};

async function main() {
  const request = normalizePlanRequest(SAMPLE_REQUEST_BODY);
  const candidates = filterExperiences(request);
  console.log("PlanRequest:", request);
  console.log(`Pre-filtered to ${candidates.length} candidate experiences.\n`);

  let feedback = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    console.log(`--- Attempt ${attempt} ---`);
    let rawPlan;
    try {
      rawPlan = await generateItinerary({ request, experiences: candidates, feedback });
    } catch (err) {
      console.error("generateItinerary() threw:", err.message);
      break;
    }
    console.log("Raw LLM plan:", JSON.stringify(rawPlan, null, 2));

    feedback = validateAgentPlan(rawPlan, request);
    if (feedback.length === 0) {
      console.log("\n=== VALID — hydrated itinerary (what /plan would return) ===");
      console.log(JSON.stringify(hydrateItinerary(rawPlan, request), null, 2));
      return;
    }
    console.log("Validation errors:", feedback, "\n");
  }

  console.log("=== Both attempts failed — falling back ===");
  console.log(JSON.stringify(buildFallback(request), null, 2));
}

main().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
