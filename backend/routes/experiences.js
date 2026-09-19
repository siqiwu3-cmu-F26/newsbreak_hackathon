import { Router } from "express";
import { experiences } from "../lib/itinerary.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(experiences);
});

export default router;
