import { Router } from "express";
import { errorHandler } from "../lib/httpError.js";
import { experienceById, experiences, registerExperience } from "../lib/itinerary.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { createBookingRequest, createCommunityExperience } from "../services/communityExperiences.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(experiences);
});

router.post("/", requireAuth, requireVerified, (req, res) => {
  const experience = createCommunityExperience(req.user, req.body);
  registerExperience(experience);
  res.status(201).json(experience);
});

router.post("/:experienceId/request", requireAuth, requireVerified, (req, res) => {
  const experience = experienceById.get(req.params.experienceId);
  const booking = createBookingRequest(req.user, experience, req.body?.scheduledTime);
  res.status(201).json({ booking, message: `Request sent to ${experience.host}.` });
});

router.use(errorHandler);

export default router;
