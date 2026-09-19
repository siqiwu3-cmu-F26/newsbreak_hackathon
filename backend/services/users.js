import crypto from "node:crypto";

import { getDatabase } from "../db/mongo.js";
import { HttpError } from "../lib/httpError.js";
import { hashPassword } from "../lib/security.js";

export const normalizeEmail = (email) => String(email).trim().toLowerCase();

const isUniqueViolation = (error) => error?.code === 11000;

export async function findUserByEmail(email) {
  const db = await getDatabase();
  return db.collection("users").findOne({ email: normalizeEmail(email) });
}

export async function findUserById(id) {
  const db = await getDatabase();
  return db.collection("users").findOne({ id });
}

export async function createUser({ name, email, password }) {
  const now = new Date();
  const user = {
    id: `user_${crypto.randomUUID()}`,
    name: name.trim(),
    email: normalizeEmail(email),
    passwordHash: hashPassword(password),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    verification: { status: "unverified" },
    address: { status: "unverified" },
    creditBalance: 0,
    welcomeCreditsGranted: false
  };

  try {
    const db = await getDatabase();
    await db.collection("users").insertOne(user);
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "An account with this email already exists");
    throw error;
  }
  return user;
}

export async function setLastLogin(userId) {
  const db = await getDatabase();
  const now = new Date();
  const user = await db.collection("users").findOneAndUpdate(
    { id: userId },
    { $set: { lastLoginAt: now, updatedAt: now } },
    { returnDocument: "after", includeResultMetadata: false }
  );
  if (!user) throw new HttpError(404, "User not found");
  return user;
}

export async function isIdHashTaken(idHash, exceptUserId) {
  const db = await getDatabase();
  return Boolean(await db.collection("users").findOne(
    { "verification.idHash": idHash, id: { $ne: exceptUserId } },
    { projection: { _id: 1 } }
  ));
}

export async function setVerification(userId, verification) {
  try {
    const db = await getDatabase();
    const user = await db.collection("users").findOneAndUpdate(
      { id: userId },
      { $set: { verification, updatedAt: new Date() } },
      { returnDocument: "after", includeResultMetadata: false }
    );
    if (!user) throw new HttpError(404, "User not found");
    return user;
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "This ID is already linked to another account.");
    throw error;
  }
}

export async function setAddress(userId, address) {
  const db = await getDatabase();
  const user = await db.collection("users").findOneAndUpdate(
    { id: userId },
    { $set: { address, updatedAt: new Date() } },
    { returnDocument: "after", includeResultMetadata: false }
  );
  if (!user) throw new HttpError(404, "User not found");
  return user;
}

export const isFullyVerified = (user) =>
  user?.verification?.status === "verified" && user?.address?.status === "verified";

export function publicUser(user) {
  const { verification = {}, address = {} } = user;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
    verification: {
      status: verification.status ?? "unverified",
      verifiedAt: verification.verifiedAt,
      idType: verification.idType,
      idLast4: verification.idLast4,
      reason: verification.reason,
      complete: isFullyVerified(user)
    },
    address: {
      status: address.status ?? "unverified",
      verifiedAt: address.verifiedAt,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      reason: address.reason
    }
  };
}
