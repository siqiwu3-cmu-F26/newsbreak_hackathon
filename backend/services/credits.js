import crypto from "node:crypto";

import { db } from "../lib/db.js";
import { HttpError } from "../lib/httpError.js";
import { WELCOME_CREDITS } from "./identity.js";

// Time credits are an append-only ledger per user. The balance is always derived from the
// ledger, so it can't drift from the history the wallet page shows.
const selectBalance = db.prepare(`
  SELECT COALESCE(SUM(CASE type WHEN 'earn' THEN amount ELSE -amount END), 0) AS balance
  FROM credit_transactions WHERE user_id = ?`);
const selectTransactions = db.prepare("SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY seq DESC");
const selectWelcome = db.prepare("SELECT 1 AS granted FROM credit_transactions WHERE user_id = ? AND reason = 'welcome'");
const insertTransaction = db.prepare(`
  INSERT INTO credit_transactions
    (id, user_id, type, amount, reason, experience_id, experience_name, balance_after, created_at)
  VALUES (@id, @user_id, @type, @amount, @reason, @experience_id, @experience_name, @balance_after, @created_at)`);

const toTransaction = (row) => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  amount: row.amount,
  reason: row.reason,
  ...(row.experience_id && { experienceId: row.experience_id, experienceName: row.experience_name }),
  balanceAfter: row.balance_after,
  createdAt: row.created_at
});

export const getBalance = (userId) => selectBalance.get(userId).balance;

export const listTransactions = (userId) => selectTransactions.all(userId).map(toTransaction);

// Must run inside a db.transaction so the balance it reads can't change before the insert.
function record(userId, type, amount, reason, meta) {
  const entry = {
    id: `txn_${crypto.randomUUID()}`,
    user_id: userId,
    type,
    amount,
    reason,
    experience_id: meta.experienceId ?? null,
    experience_name: meta.experienceName ?? null,
    balance_after: getBalance(userId) + (type === "earn" ? amount : -amount),
    created_at: new Date().toISOString()
  };
  insertTransaction.run(entry);
  return toTransaction(entry);
}

function assertAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) throw new HttpError(400, "Credit amount must be a positive whole number");
}

export function earn(userId, amount, reason, meta = {}) {
  assertAmount(amount);
  return db.transaction(() => record(userId, "earn", amount, reason, meta))();
}

export function spend(userId, amount, reason, meta = {}) {
  assertAmount(amount);
  return db.transaction(() => {
    const balance = getBalance(userId);
    if (balance < amount) {
      throw new HttpError(402, "Not enough Time Credits", { balance, required: amount });
    }
    return record(userId, "spend", amount, reason, meta);
  })();
}

// Granted once, when identity and address verification are both complete (not at signup,
// so unverified accounts can't farm credits).
export function grantWelcomeCredits(userId) {
  return db.transaction(() => {
    if (selectWelcome.get(userId)) return null;
    return record(userId, "earn", WELCOME_CREDITS, "welcome", {});
  })();
}
