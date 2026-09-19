import { Router } from "express";
import {
  buildFallback,
  experienceById,
  filterExperiences,
  hydrateItinerary,
  normalizePlanRequest,
  validateAgentPlan
} from "../lib/itinerary.js";
import { getEnvironmentContext } from "../services/environment.js";

const router = Router();

router.post("/options", async (req, res) => {
  const request = normalizePlanRequest(req.body);
  const candidates = filterExperiences(request);
  const environment = await getEnvironmentContext({
    query: `${request.location?.city || "Palo Alto"}, CA`,
    lat: request.location?.lat,
    lng: request.location?.lng,
    date: request.date,
  });

  try {
    const agent = await import("../services/agent.js");
    const raw = await agent.generateAnchorOptions({ request, experiences: candidates, environment });
    const options = hydrateOptions(raw?.options, candidates);
    if (options.length !== 3) throw new Error("Agent did not return three valid options");
    return res.json({
      message: typeof raw.message === "string" ? raw.message : "Choose the direction that feels most like your day.",
      options,
    });
  } catch (error) {
    console.error("Anchor option generation failed:", error.message);
    return res.json(buildOptionFallback(candidates, request));
  }
});

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

function hydrateOptions(rawOptions, candidates) {
  const allowed = new Set(candidates.map((item) => item.id));
  const seen = new Set();
  return (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option) => {
      const experience = allowed.has(option?.id) ? experienceById.get(option.id) : null;
      if (!experience || seen.has(option.id)) return null;
      seen.add(option.id);
      return {
        ...experience,
        label: typeof option.label === "string" ? option.label : "Agent pick",
        reason: typeof option.reason === "string" ? option.reason : "A strong match for your preferences.",
        tradeoff: typeof option.tradeoff === "string" ? option.tradeoff : "Leaves less time for another stop.",
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

function buildOptionFallback(candidates, request) {
  const interests = new Set(request.interests);
  const ranked = [...candidates].sort((a, b) => {
    const score = (item) => (interests.has(item.category) ? 4 : 0) + (item.type === "community" ? 2 : 0) + (item.cost === 0 ? 1 : 0);
    return score(b) - score(a) || a.cost - b.cost;
  });
  const distinct = [];
  for (const item of ranked) {
    if (distinct.some((picked) => picked.category === item.category) && distinct.length < 2) continue;
    distinct.push(item);
    if (distinct.length === 3) break;
  }
  for (const item of ranked) {
    if (distinct.length === 3) break;
    if (!distinct.some((picked) => picked.id === item.id)) distinct.push(item);
  }
  return {
    message: "I found three good directions. Pick one anchor and I’ll plan around it.",
    options: distinct.map((item, index) => ({
      ...item,
      label: ["Best fit", "More social", "Easygoing"][index],
      reason: interests.has(item.category) ? `Matches your interest in ${item.category}.` : "Adds a different local experience to the day.",
      tradeoff: item.duration >= 75 ? "Uses more of your available time." : item.cost > 0 ? `Uses $${item.cost} of the budget.` : "A lighter, less structured choice.",
    })),
  };
}

export default router;
