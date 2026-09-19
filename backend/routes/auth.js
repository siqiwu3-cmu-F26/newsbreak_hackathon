import { Router } from "express";
import { ObjectId } from "mongodb";

import { getDatabase } from "../db/mongo.js";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  publicUser,
  validateRegistration,
  verifyPassword
} from "../lib/auth.js";

const router = Router();
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

async function issueSession(db, userId) {
  const token = createSessionToken();
  const now = new Date();
  await db.collection("sessions").insertOne({
    tokenHash: hashSessionToken(token),
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS)
  });
  return token;
}

function bearerToken(req) {
  const match = req.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

router.post("/register", async (req, res, next) => {
  try {
    const { errors, name, email } = validateRegistration(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors[0], details: errors });

    const db = await getDatabase();
    const now = new Date();
    const user = {
      name,
      email,
      passwordHash: await hashPassword(req.body.password),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now
    };

    try {
      const result = await db.collection("users").insertOne(user);
      user._id = result.insertedId;
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      throw error;
    }

    const token = await issueSession(db, user._id);
    return res.status(201).json({ user: publicUser(user), token });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = await getDatabase();
    const user = await db.collection("users").findOne({ email });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const lastLoginAt = new Date();
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { lastLoginAt, updatedAt: lastLoginAt } }
    );
    user.lastLoginAt = lastLoginAt;

    const token = await issueSession(db, user._id);
    return res.json({ user: publicUser(user), token });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "Authentication required" });

    const db = await getDatabase();
    const session = await db.collection("sessions").findOne({
      tokenHash: hashSessionToken(token),
      expiresAt: { $gt: new Date() }
    });
    if (!session) return res.status(401).json({ error: "Invalid or expired session" });

    const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });
    if (!user) return res.status(401).json({ error: "User no longer exists" });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const token = bearerToken(req);
    if (token) {
      const db = await getDatabase();
      await db.collection("sessions").deleteOne({ tokenHash: hashSessionToken(token) });
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;

