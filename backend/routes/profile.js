import express, { Router } from "express";

import { HttpError, errorHandler } from "../lib/httpError.js";
import { requireAuth, requireVerified } from "../middleware/auth.js";
import { AVATAR_MAX_BYTES, removeAvatar, saveAvatar, saveBio } from "../services/profile.js";
import { publicUser } from "../services/users.js";

const router = Router();

// Everything here edits the signed-in member's own profile; the user id always comes from the
// session, never from the request.
router.patch("/", requireAuth, requireVerified, (req, res) => {
  const user = saveBio(req.user.id, req.body?.bio);
  res.json({ user: publicUser(user) });
});

// The browser resizes the photo and sends it as a raw JPEG body.
router.put(
  "/avatar",
  requireAuth,
  requireVerified,
  express.raw({ type: "image/jpeg", limit: AVATAR_MAX_BYTES }),
  (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new HttpError(415, "Send the photo as a JPEG image");
    }
    res.json({ user: publicUser(saveAvatar(req.user.id, req.body)) });
  }
);

router.delete("/avatar", requireAuth, requireVerified, (req, res) => {
  res.json({ user: publicUser(removeAvatar(req.user.id)) });
});

router.use(errorHandler);

export default router;
