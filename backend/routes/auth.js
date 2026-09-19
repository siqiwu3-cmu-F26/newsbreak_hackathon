import { Router } from "express";

import { HttpError, errorHandler } from "../lib/httpError.js";
import { DUMMY_PASSWORD_HASH, hashIdNumber, verifyPassword } from "../lib/security.js";
import { requireAuth } from "../middleware/auth.js";
import { getBalance, grantWelcomeCredits } from "../services/credits.js";
import { mockVerifyIdentity, validateIdentityInput } from "../services/identity.js";
import { createSession, destroySession } from "../services/sessions.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  isIdHashTaken,
  publicUser,
  setVerification
} from "../services/users.js";

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const loginFailures = new Map();

function validateSignup({ name, email, password } = {}) {
  const fields = {};
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    fields.name = "Enter your full name.";
  }
  if (typeof email !== "string" || email.length > 254 || !EMAIL_PATTERN.test(email.trim())) {
    fields.email = "Enter a valid email address.";
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    fields.password = "Use a password of at least 8 characters.";
  }
  return fields;
}

function authPayload(user, token) {
  return { ...(token ? { token } : {}), user: publicUser(user), credits: { balance: getBalance(user.id) } };
}

function checkLoginThrottle(key, now = Date.now()) {
  const entry = loginFailures.get(key);
  if (entry && entry.resetAt > now && entry.count >= MAX_LOGIN_FAILURES) {
    throw new HttpError(429, "Too many failed attempts. Try again in a few minutes.");
  }
}

function recordLoginFailure(key, now = Date.now()) {
  const entry = loginFailures.get(key);
  if (!entry || entry.resetAt <= now) loginFailures.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  else entry.count += 1;
}

router.post("/signup", (req, res) => {
  const fields = validateSignup(req.body);
  if (Object.keys(fields).length) throw new HttpError(400, "Please fix the highlighted fields", { fields });

  const user = createUser(req.body);
  res.status(201).json(authPayload(user, createSession(user.id)));
});

router.post("/login", (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const throttleKey = `${req.ip}|${email}`;
  checkLoginThrottle(throttleKey);

  const user = email ? findUserByEmail(email) : null;
  // Verify against a dummy hash for unknown emails so both failures look and time the same.
  const passwordOk = verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !passwordOk) {
    recordLoginFailure(throttleKey);
    throw new HttpError(401, "Incorrect email or password");
  }

  loginFailures.delete(throttleKey);
  res.json(authPayload(user, createSession(user.id)));
});

router.post("/logout", requireAuth, (req, res) => {
  destroySession(req.token);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json(authPayload(req.user));
});

// MOCK: checks the submitted details against simple rules (see services/identity.js).
// Only the last 4 digits and a keyed hash of the ID number are kept, never the full number.
router.post("/verify-identity", requireAuth, (req, res) => {
  const { user } = req;
  if (user.verification.status === "verified") {
    throw new HttpError(409, "Your identity is already verified");
  }

  const { errors, value } = validateIdentityInput(req.body);
  if (Object.keys(errors).length) throw new HttpError(400, "Please fix the highlighted fields", { fields: errors });

  const result = mockVerifyIdentity(value, user.name);
  const idHash = hashIdNumber(value.idType, value.idNumber);

  if (result.verified && isIdHashTaken(idHash, user.id)) {
    result.verified = false;
    result.code = "ID_ALREADY_USED";
    result.reason = "This ID is already linked to another account.";
  }

  if (!result.verified) {
    setVerification(user.id, { status: "rejected", reason: result.reason, code: result.code });
    throw new HttpError(422, result.reason, {
      code: result.code,
      user: publicUser(findUserById(user.id))
    });
  }

  const verified = setVerification(user.id, {
    status: "verified",
    method: "mock",
    verifiedAt: new Date().toISOString(),
    legalName: value.legalName,
    dateOfBirth: value.dateOfBirth,
    idType: value.idType,
    idLast4: value.idNumber.slice(-4),
    idHash
  });
  const welcome = grantWelcomeCredits(user.id);

  res.json({ ...authPayload(verified), welcomeCredits: welcome?.amount ?? 0 });
});

router.use(errorHandler);

export default router;
