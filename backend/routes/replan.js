import { Router } from "express";
import { buildFallback, normalizePlanRequest, replanForRain } from "../lib/itinerary.js";

const router = Router();

router.post("/", (req, res) => {
  const itinerary = req.body?.itinerary;
  const condition = String(req.body?.condition || "").toLowerCase();
  const constraints = req.body?.constraints || {};

  if (!itinerary) return res.json(buildFallback(normalizePlanRequest(constraints)));
  if (condition !== "rain") return res.json(itinerary);

  return res.json(replanForRain(itinerary, constraints));
});

export default router;
