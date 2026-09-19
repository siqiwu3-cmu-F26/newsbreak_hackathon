import { Router } from "express";
import {
  buildFallback,
  filterExperiences,
  hydrateItinerary,
  normalizePlanRequest,
  validateAgentPlan
} from "../lib/itinerary.js";
import { getEnvironmentContext } from "../services/environment.js";

const router = Router();

router.post("/", async (req, res) => {
  const request = normalizePlanRequest(req.body);
  const candidates = filterExperiences(request);
  const environment = await getEnvironmentContext({
    query: `${request.location?.city || "Palo Alto"}, CA`,
    lat: request.location?.lat,
    lng: request.location?.lng,
    date: request.date,
  });

  let feedback = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const rawPlan = await callAgent({ request, experiences: candidates, feedback, environment });
      feedback = validateAgentPlan(rawPlan, request, environment);
      if (feedback.length === 0) return res.json(hydrateItinerary(rawPlan, request));
    } catch (error) {
      console.error(`Plan generation attempt ${attempt + 1} failed:`, error.message);
      feedback = [`The previous response could not be parsed: ${error.message}`];
    }
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
