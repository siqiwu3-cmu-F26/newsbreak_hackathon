import { HttpError } from "../lib/httpError.js";
import { getUserForToken } from "../services/sessions.js";

export function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get("authorization") || "").split(" ");
  const user = scheme === "Bearer" && token ? getUserForToken(token) : null;
  if (!user) return next(new HttpError(401, "Please sign in to continue"));
  req.user = user;
  req.token = token;
  return next();
}

export function requireVerified(req, _res, next) {
  if (req.user?.verification?.status !== "verified") {
    return next(new HttpError(403, "Verify your identity to continue", { code: "IDENTITY_NOT_VERIFIED" }));
  }
  return next();
}
