import crypto from "node:crypto";

import { db } from "../lib/db.js";
import { HttpError } from "../lib/httpError.js";
import { hashPassword } from "../lib/security.js";
import {
  INSERT_USER_SQL,
  addressParams,
  rowToUser,
  userToParams,
  verificationParams
} from "../lib/userRows.js";

export const normalizeEmail = (email) => String(email).trim().toLowerCase();

const isUniqueViolation = (error) => error?.code === "SQLITE_CONSTRAINT_UNIQUE";

const insertUser = db.prepare(INSERT_USER_SQL);
const selectByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const selectById = db.prepare("SELECT * FROM users WHERE id = ?");
const selectIdHashOwner = db.prepare("SELECT 1 AS taken FROM users WHERE id_hash = ? AND id != ?");

const assignments = (params) =>
  Object.keys(params)
    .map((column) => `${column} = @${column}`)
    .join(", ");
const updateVerification = db.prepare(`UPDATE users SET ${assignments(verificationParams())} WHERE id = @id`);
const updateAddress = db.prepare(`UPDATE users SET ${assignments(addressParams())} WHERE id = @id`);

export const findUserByEmail = (email) => rowToUser(selectByEmail.get(normalizeEmail(email)));

export const findUserById = (id) => rowToUser(selectById.get(id));

export function createUser({ name, email, password }) {
  const user = {
    id: `user_${crypto.randomUUID()}`,
    name: name.trim(),
    email: normalizeEmail(email),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    verification: { status: "unverified" },
    address: { status: "unverified" }
  };

  try {
    insertUser.run(userToParams(user));
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "An account with this email already exists");
    throw error;
  }
  return user;
}

export const isIdHashTaken = (idHash, exceptUserId) => Boolean(selectIdHashOwner.get(idHash, exceptUserId));

// Replaces the user's identity-verification state (a rejected attempt clears earlier details).
export function setVerification(userId, verification) {
  let changes;
  try {
    ({ changes } = updateVerification.run({ id: userId, ...verificationParams(verification) }));
  } catch (error) {
    // Backstop for the one-account-per-ID unique index.
    if (isUniqueViolation(error)) throw new HttpError(409, "This ID is already linked to another account.");
    throw error;
  }
  if (!changes) throw new HttpError(404, "User not found");
  return findUserById(userId);
}

export function setAddress(userId, address) {
  const { changes } = updateAddress.run({ id: userId, ...addressParams(address) });
  if (!changes) throw new HttpError(404, "User not found");
  return findUserById(userId);
}

// A member is fully verified only once both their identity and their address check out.
// Accounts created before address verification existed have no address, so they must add one.
export const isFullyVerified = (user) =>
  user?.verification?.status === "verified" && user?.address?.status === "verified";

// Allow-list of what may leave the server: never the password hash, DOB or ID hash.
export function publicUser(user) {
  const { verification = {}, address = {} } = user;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    verification: {
      status: verification.status,
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
