import { Router } from "express";
import { buildFallback, normalizePlanRequest, replaceActivity } from "../lib/itinerary.js";

const router = Router();

router.post("/", (req, res) => {
  const itinerary = req.body?.itinerary;
  const activityId = req.body?.activityId;
  const constraints = req.body?.constraints || {};

  if (!itinerary || !activityId) {
    return res.json(buildFallback(normalizePlanRequest(constraints)));
  }

  return res.json(replaceActivity(itinerary, activityId, constraints));
});

export default router;
