import { Router } from "express";
import { getEnvironmentContext } from "../services/environment.js";

const router = Router();

router.get("/", async (req, res) => {
  const context = await getEnvironmentContext({
    query: req.query.location || "Palo Alto, CA",
    lat: req.query.lat,
    lng: req.query.lng,
    date: req.query.date,
  });
  res.json(context);
});

export default router;
