import crypto from "node:crypto";

import { store } from "../lib/db.js";
import { HttpError } from "../lib/httpError.js";
import { hashPassword } from "../lib/security.js";

export const normalizeEmail = (email) => String(email).trim().toLowerCase();

export function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  return store.read().users.find((user) => user.email === normalized) ?? null;
}

export function findUserById(id) {
  return store.read().users.find((user) => user.id === id) ?? null;
}

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

  return store.update((state) => {
    if (state.users.some((existing) => existing.email === user.email)) {
      throw new HttpError(409, "An account with this email already exists");
    }
    state.users.push(user);
    return user;
  });
}

export function isIdHashTaken(idHash, exceptUserId) {
  return store
    .read()
    .users.some((user) => user.id !== exceptUserId && user.verification?.idHash === idHash);
}

export function setVerification(userId, verification) {
  return store.update((state) => {
    const user = state.users.find((item) => item.id === userId);
    if (!user) throw new HttpError(404, "User not found");
    user.verification = verification;
    return user;
  });
}

export function setAddress(userId, address) {
  return store.update((state) => {
    const user = state.users.find((item) => item.id === userId);
    if (!user) throw new HttpError(404, "User not found");
    user.address = address;
    return user;
  });
}

// A member is fully verified only once both their identity and their address check out.
// Accounts created before address verification existed have no `address`, so they must add one.
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
