import { Router } from "express";
import {
  buildFallback,
  filterExperiences,
  hydrateItinerary,
  normalizePlanRequest,
  validateAgentPlan
} from "../lib/itinerary.js";

const router = Router();

router.post("/", async (req, res) => {
  const request = normalizePlanRequest(req.body);
  const candidates = filterExperiences(request);

  try {
    let feedback = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const rawPlan = await callAgent({ request, experiences: candidates, feedback });
      feedback = validateAgentPlan(rawPlan, request);
      if (feedback.length === 0) return res.json(hydrateItinerary(rawPlan, request));
    }
  } catch (error) {
    console.error("Plan generation failed; using fallback:", error.message);
  }

  return res.json(buildFallback(request));
});

async function callAgent(input) {
  const agent = await import("../services/agent.js");
  const generate = agent.generateItinerary || agent.planItinerary || agent.default;
  if (typeof generate !== "function") throw new Error("Agent service is not implemented yet");
  return generate(input);
}

export default router;
