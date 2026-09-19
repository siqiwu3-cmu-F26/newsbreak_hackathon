import crypto from "node:crypto";

import { getDatabase, withTransaction } from "../db/mongo.js";
import { HttpError } from "../lib/httpError.js";
import { WELCOME_CREDITS } from "./identity.js";

const assertAmount = (amount) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new HttpError(400, "Credit amount must be a positive whole number");
  }
};

const makeTransaction = (userId, type, amount, reason, balanceAfter, meta = {}) => ({
  id: `txn_${crypto.randomUUID()}`,
  userId,
  type,
  amount,
  reason,
  ...(meta.experienceId && { experienceId: meta.experienceId, experienceName: meta.experienceName }),
  balanceAfter,
  createdAt: new Date()
});

export async function getBalance(userId) {
  const db = await getDatabase();
  const user = await db.collection("users").findOne({ id: userId }, { projection: { creditBalance: 1 } });
  return user?.creditBalance ?? 0;
}

export async function listTransactions(userId) {
  const db = await getDatabase();
  return db.collection("creditTransactions").find({ userId }).sort({ createdAt: -1 }).toArray();
}

export async function earn(userId, amount, reason, meta = {}) {
  assertAmount(amount);
  return withTransaction(async (db, session) => {
    const user = await db.collection("users").findOneAndUpdate(
      { id: userId },
      { $inc: { creditBalance: amount }, $set: { updatedAt: new Date() } },
      { returnDocument: "after", includeResultMetadata: false, session }
    );
    if (!user) throw new HttpError(404, "User not found");
    const entry = makeTransaction(userId, "earn", amount, reason, user.creditBalance, meta);
    await db.collection("creditTransactions").insertOne(entry, { session });
    return entry;
  });
}

export async function spend(userId, amount, reason, meta = {}) {
  assertAmount(amount);
  return withTransaction(async (db, session) => {
    const user = await db.collection("users").findOneAndUpdate(
      { id: userId, creditBalance: { $gte: amount } },
      { $inc: { creditBalance: -amount }, $set: { updatedAt: new Date() } },
      { returnDocument: "after", includeResultMetadata: false, session }
    );
    if (!user) {
      const existing = await db.collection("users").findOne({ id: userId }, { projection: { creditBalance: 1 }, session });
      if (!existing) throw new HttpError(404, "User not found");
      throw new HttpError(402, "Not enough Time Credits", { balance: existing.creditBalance ?? 0, required: amount });
    }
    const entry = makeTransaction(userId, "spend", amount, reason, user.creditBalance, meta);
    await db.collection("creditTransactions").insertOne(entry, { session });
    return entry;
  });
}

export async function grantWelcomeCredits(userId) {
  return withTransaction(async (db, session) => {
    const user = await db.collection("users").findOneAndUpdate(
      { id: userId, welcomeCreditsGranted: { $ne: true } },
      {
        $set: { welcomeCreditsGranted: true, updatedAt: new Date() },
        $inc: { creditBalance: WELCOME_CREDITS }
      },
      { returnDocument: "after", includeResultMetadata: false, session }
    );
    if (!user) return null;
    const entry = makeTransaction(userId, "earn", WELCOME_CREDITS, "welcome", user.creditBalance);
    await db.collection("creditTransactions").insertOne(entry, { session });
    return entry;
  });
}
