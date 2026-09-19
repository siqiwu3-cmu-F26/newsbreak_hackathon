import crypto from "node:crypto";

import { store } from "../lib/db.js";
import { HttpError } from "../lib/httpError.js";
import { WELCOME_CREDITS } from "./identity.js";

// Time credits are an append-only ledger per user. The balance is always derived from the
// ledger, so it can't drift from the history the wallet page shows.
const forUser = (state, userId) => state.credits.filter((entry) => entry.userId === userId);
const signed = (entry) => (entry.type === "earn" ? entry.amount : -entry.amount);
const balanceOf = (state, userId) => forUser(state, userId).reduce((sum, entry) => sum + signed(entry), 0);

export const getBalance = (userId) => balanceOf(store.read(), userId);

export function listTransactions(userId) {
  return forUser(store.read(), userId).slice().reverse();
}

function record(state, userId, type, amount, reason, meta) {
  const entry = {
    id: `txn_${crypto.randomUUID()}`,
    userId,
    type,
    amount,
    reason,
    ...meta,
    balanceAfter: balanceOf(state, userId) + (type === "earn" ? amount : -amount),
    createdAt: new Date().toISOString()
  };
  state.credits.push(entry);
  return entry;
}

function assertAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) throw new HttpError(400, "Credit amount must be a positive whole number");
}

export function earn(userId, amount, reason, meta = {}) {
  assertAmount(amount);
  return store.update((state) => record(state, userId, "earn", amount, reason, meta));
}

export function spend(userId, amount, reason, meta = {}) {
  assertAmount(amount);
  return store.update((state) => {
    const balance = balanceOf(state, userId);
    if (balance < amount) {
      throw new HttpError(402, "Not enough Time Credits", { balance, required: amount });
    }
    return record(state, userId, "spend", amount, reason, meta);
  });
}

// Granted once, when identity and address verification are both complete (not at signup,
// so unverified accounts can't farm credits).
export function grantWelcomeCredits(userId) {
  return store.update((state) => {
    const alreadyGranted = forUser(state, userId).some((entry) => entry.reason === "welcome");
    return alreadyGranted ? null : record(state, userId, "earn", WELCOME_CREDITS, "welcome", {});
  });
}
