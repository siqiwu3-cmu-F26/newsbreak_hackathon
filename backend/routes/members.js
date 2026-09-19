import { Router } from "express";

import { HttpError, errorHandler } from "../lib/httpError.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { getAvatar, memberProfile } from "../services/profile.js";
import { findUserById, isFullyVerified } from "../services/users.js";

const router = Router();

// Only signed-in, fully verified members can look at other members, and only fully verified
// members can be looked at. Unknown and unverified ids look identical (404).
router.use(requireAuth, requireVerified);

function findMember(id) {
  const user = findUserById(id);
  if (!user || !isFullyVerified(user)) throw new HttpError(404, "Member not found");
  return user;
}

router.get("/:id", (req, res) => {
  res.json({ member: memberProfile(findMember(req.params.id)) });
});

router.get("/:id/avatar", (req, res) => {
  const member = findMember(req.params.id);
  const avatar = getAvatar(member.id);
  if (!avatar) throw new HttpError(404, "No profile photo");
  res
    .set({
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    })
    .send(avatar.image);
});

router.use(errorHandler);

export default router;
