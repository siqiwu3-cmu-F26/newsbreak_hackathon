import { getDatabase } from "../db/mongo.js";
import { hashToken, newToken } from "../lib/security.js";
import { findUserById } from "./users.js";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(userId, now = Date.now()) {
  const token = newToken();
  const db = await getDatabase();
  await db.collection("sessions").insertOne({
    tokenHash: hashToken(token),
    userId,
    createdAt: new Date(now),
    expiresAt: new Date(now + SESSION_TTL_MS)
  });
  return token;
}

export async function getUserForToken(token, now = Date.now()) {
  const db = await getDatabase();
  const session = await db.collection("sessions").findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date(now) }
  });
  return session ? findUserById(session.userId) : null;
}

export async function destroySession(token) {
  const db = await getDatabase();
  await db.collection("sessions").deleteOne({ tokenHash: hashToken(token) });
}
