import { Router } from "express";
import { errorHandler } from "../lib/httpError.js";
import { experienceById, experiences, registerExperience } from "../lib/itinerary.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { createBookingRequest, createCommunityExperience } from "../services/communityExperiences.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(experiences);
});

router.post("/draft", requireAuth, requireVerified, async (req, res, next) => {
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
  if (description.length < 12) return res.status(400).json({ error: "Tell us a little more about what you can share" });
  try {
    const agent = await import("../services/agent.js");
    const raw = await agent.extractSkillListing({
      description,
      duration: Number(req.body?.duration) || 60,
      capacity: Number(req.body?.capacity) || 4,
    });
    return res.json(normalizeDraft(raw, { description, duration: req.body?.duration, capacity: req.body?.capacity }));
  } catch (error) {
    console.error("Skill extraction failed:", error.message);
    return res.json(normalizeDraft({}, { description, duration: req.body?.duration, capacity: req.body?.capacity }));
  }
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

function normalizeDraft(raw, fallback) {
  const categories = ["creative", "food", "outdoors", "relaxing", "active", "culture"];
  const duration = Math.min(180, Math.max(30, Math.round(Number(fallback.duration) || 60)));
  const capacity = Math.min(12, Math.max(1, Math.round(Number(fallback.capacity) || 4)));
  const words = fallback.description.split(/\s+/).slice(0, 7).join(" ");
  return {
    name: clean(raw?.name, 80) || words || "Share a Skill with a Neighbor",
    category: categories.includes(raw?.category) ? raw.category : "creative",
    description: clean(raw?.description, 500) || fallback.description,
    duration,
    capacity,
    credits: Math.min(4, Math.max(1, Math.round(Number(raw?.credits) || (duration > 60 ? 2 : 1)))),
    indoor: raw?.indoor !== false,
    availability: clean(raw?.availability, 120) || "Saturday afternoon",
    openFrom: validTime(raw?.openFrom) ? raw.openFrom : "14:00",
    openTo: validTime(raw?.openTo) ? raw.openTo : "18:00",
  };
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function validTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export default router;
