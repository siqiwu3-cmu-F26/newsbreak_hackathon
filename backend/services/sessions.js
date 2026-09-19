import { db } from "../lib/db.js";
import { hashToken, newToken } from "../lib/security.js";
import { findUserById } from "./users.js";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const deleteExpired = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");
const insertSession = db.prepare(
  "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
);
const selectSession = db.prepare("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?");
const deleteSession = db.prepare("DELETE FROM sessions WHERE token_hash = ?");

// Only a hash of the token is stored, so a leaked database file can't be replayed as logins.
export function createSession(userId, now = Date.now()) {
  const token = newToken();
  db.transaction(() => {
    deleteExpired.run(now);
    insertSession.run(hashToken(token), userId, now, now + SESSION_TTL_MS);
  })();
  return token;
}

export function getUserForToken(token, now = Date.now()) {
  const session = selectSession.get(hashToken(token), now);
  return session ? findUserById(session.user_id) : null;
}

export function destroySession(token) {
  deleteSession.run(hashToken(token));
}
