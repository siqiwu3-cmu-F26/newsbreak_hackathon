import { Router } from "express";

import { HttpError, errorHandler } from "../lib/httpError.js";
import { experiences } from "../lib/itinerary.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { getBalance, listTransactions, spend } from "../services/credits.js";

const router = Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/", requireAuth, asyncRoute(async (req, res) => {
  res.json({
    balance: await getBalance(req.user.id),
    transactions: await listTransactions(req.user.id)
  });
}));

router.post("/spend", requireAuth, requireVerified, asyncRoute(async (req, res) => {
  const experience = experiences.find((item) => item.id === req.body?.experienceId);
  if (!experience) throw new HttpError(404, "Experience not found");
  if (!(experience.credits > 0)) throw new HttpError(400, "This experience doesn't use Time Credits");

  const transaction = await spend(req.user.id, experience.credits, "experience", {
    experienceId: experience.id,
    experienceName: experience.name
  });
  res.json({ transaction, balance: transaction.balanceAfter });
}));

router.use(errorHandler);

export default router;
