import assert from "node:assert/strict";
import test from "node:test";

import {
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  publicUser,
  validateRegistration,
  verifyPassword
} from "../lib/auth.js";

test("email addresses are normalized", () => {
  assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
});

test("registration validates required fields", () => {
  const result = validateRegistration({ name: "", email: "invalid", password: "short" });
  assert.equal(result.errors.length, 3);
});

test("password hashes are salted and verifiable", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
});

test("session token hashes are deterministic", () => {
  assert.equal(hashSessionToken("token"), hashSessionToken("token"));
  assert.notEqual(hashSessionToken("token"), hashSessionToken("other"));
});

test("public users never expose password hashes", () => {
  const result = publicUser({
    _id: { toString: () => "123" },
    name: "Test",
    email: "test@example.com",
    passwordHash: "secret",
    createdAt: new Date("2026-01-01T00:00:00Z")
  });
  assert.equal(result.passwordHash, undefined);
  assert.equal(result.id, "123");
});

