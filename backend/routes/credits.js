import { Router } from "express";

import { HttpError, errorHandler } from "../lib/httpError.js";
import { experiences } from "../lib/itinerary.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { getBalance, listTransactions, spend } from "../services/credits.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  res.json({ balance: getBalance(req.user.id), transactions: listTransactions(req.user.id) });
});

// The price comes from the experience catalog, never from the client.
router.post("/spend", requireAuth, requireVerified, (req, res) => {
  const experience = experiences.find((item) => item.id === req.body?.experienceId);
  if (!experience) throw new HttpError(404, "Experience not found");
  if (!(experience.credits > 0)) throw new HttpError(400, "This experience doesn't use Time Credits");

  const transaction = spend(req.user.id, experience.credits, "experience", {
    experienceId: experience.id,
    experienceName: experience.name
  });
  res.json({ transaction, balance: getBalance(req.user.id) });
});

router.use(errorHandler);

export default router;
