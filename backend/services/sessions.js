import { store } from "../lib/db.js";
import { hashToken, newToken } from "../lib/security.js";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Only a hash of the token is stored, so a leaked database file can't be replayed as logins.
export function createSession(userId, now = Date.now()) {
  const token = newToken();
  store.update((state) => {
    state.sessions = state.sessions.filter((session) => session.expiresAt > now);
    state.sessions.push({ tokenHash: hashToken(token), userId, createdAt: now, expiresAt: now + SESSION_TTL_MS });
  });
  return token;
}

export function getUserForToken(token, now = Date.now()) {
  const tokenHash = hashToken(token);
  const state = store.read();
  const session = state.sessions.find((item) => item.tokenHash === tokenHash && item.expiresAt > now);
  return session ? state.users.find((user) => user.id === session.userId) ?? null : null;
}

export function destroySession(token) {
  const tokenHash = hashToken(token);
  store.update((state) => {
    state.sessions = state.sessions.filter((session) => session.tokenHash !== tokenHash);
  });
}
