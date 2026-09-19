import { HttpError } from "../lib/httpError.js";
import { getUserForToken } from "../services/sessions.js";
import { isFullyVerified } from "../services/users.js";

export function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get("authorization") || "").split(" ");
  const user = scheme === "Bearer" && token ? getUserForToken(token) : null;
  if (!user) return next(new HttpError(401, "Please sign in to continue"));
  req.user = user;
  req.token = token;
  return next();
}

// Identity and address must both be verified.
export function requireVerified(req, _res, next) {
  if (!isFullyVerified(req.user)) {
    const missing = [];
    if (req.user?.verification?.status !== "verified") missing.push("identity");
    if (req.user?.address?.status !== "verified") missing.push("address");
    return next(
      new HttpError(403, "Verify your identity and address to continue", {
        code: "VERIFICATION_INCOMPLETE",
        missing
      })
    );
  }
  return next();
}
