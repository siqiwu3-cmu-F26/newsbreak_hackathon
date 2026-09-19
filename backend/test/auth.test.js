import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// The store reads DB_FILE at import time, so point it at a throwaway file first.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "localconnect-auth-"));
process.env.DB_FILE = path.join(tempDir, "db.json");

const { hashPassword, verifyPassword } = await import("../lib/security.js");
const { createUser, findUserByEmail, publicUser } = await import("../services/users.js");
const { createSession, destroySession, getUserForToken, SESSION_TTL_MS } = await import("../services/sessions.js");
const { ageOn, mockVerifyIdentity, normalizeName, validateIdentityInput } = await import("../services/identity.js");
const { earn, getBalance, grantWelcomeCredits, listTransactions, spend } = await import("../services/credits.js");
const { createStore } = await import("../lib/db.js");

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

const NOW = new Date("2026-09-19T12:00:00Z");
const goodId = {
  legalName: "Ada Lovelace",
  dateOfBirth: "1990-05-01",
  idType: "drivers_license",
  idNumber: "D1234567",
  expiryDate: "2030-01-01"
};

test("passwords are hashed and verified", () => {
  const stored = hashPassword("correct horse");
  assert.notEqual(stored, "correct horse");
  assert.ok(verifyPassword("correct horse", stored));
  assert.ok(!verifyPassword("wrong horse", stored));
  assert.ok(!verifyPassword("anything", "not-a-hash"));
});

test("users are stored, unique by email, and public data hides secrets", () => {
  const user = createUser({ name: "Ada Lovelace", email: "Ada@Example.com", password: "supersecret" });
  assert.equal(findUserByEmail("ada@example.com").id, user.id);
  assert.throws(() => createUser({ name: "Other", email: "ada@example.com", password: "supersecret" }), {
    status: 409
  });

  const json = JSON.stringify(publicUser(user));
  assert.ok(!json.includes("passwordHash"));
  assert.ok(!json.includes("supersecret"));
  assert.equal(publicUser(user).verification.status, "unverified");
});

test("the database file persists across store instances", () => {
  const file = path.join(tempDir, "persist.json");
  createStore(file).update((state) => state.users.push({ id: "u1" }));
  assert.deepEqual(createStore(file).read().users, [{ id: "u1" }]);
});

test("sessions resolve to a user until destroyed or expired", () => {
  const user = createUser({ name: "Grace Hopper", email: "grace@example.com", password: "supersecret" });
  const token = createSession(user.id);
  assert.equal(getUserForToken(token).id, user.id);
  assert.equal(getUserForToken("bogus"), null);
  assert.equal(getUserForToken(token, Date.now() + SESSION_TTL_MS + 1), null);

  destroySession(token);
  assert.equal(getUserForToken(token), null);
});

test("age is computed around the birthday", () => {
  assert.equal(ageOn("2008-09-19", NOW), 18);
  assert.equal(ageOn("2008-09-20", NOW), 17);
  assert.equal(ageOn("1990-12-31", NOW), 35);
});

test("identity input validation flags each bad field", () => {
  assert.deepEqual(validateIdentityInput(goodId, NOW).errors, {});

  const { errors } = validateIdentityInput(
    { legalName: "", dateOfBirth: "2030-01-01", idType: "library_card", idNumber: "12", expiryDate: "soon" },
    NOW
  );
  assert.deepEqual(Object.keys(errors).sort(), ["dateOfBirth", "expiryDate", "idNumber", "idType", "legalName"]);
  assert.ok(validateIdentityInput({ ...goodId, dateOfBirth: "1990-02-31" }, NOW).errors.dateOfBirth);
});

test("mock verification enforces age, expiry, name and the demo failure rule", () => {
  assert.equal(mockVerifyIdentity(goodId, "Ada Lovelace", NOW).verified, true);
  assert.equal(mockVerifyIdentity(goodId, "  ada   LOVELACE ", NOW).verified, true);
  assert.equal(mockVerifyIdentity({ ...goodId, dateOfBirth: "2012-01-01" }, "Ada Lovelace", NOW).code, "UNDER_AGE");
  assert.equal(mockVerifyIdentity({ ...goodId, expiryDate: "2020-01-01" }, "Ada Lovelace", NOW).code, "ID_EXPIRED");
  assert.equal(mockVerifyIdentity(goodId, "Someone Else", NOW).code, "NAME_MISMATCH");
  assert.equal(mockVerifyIdentity({ ...goodId, idNumber: "AB-10000" }, "Ada Lovelace", NOW).code, "ID_NOT_FOUND");
  // Non-Latin and accented names must survive normalization, not collapse to empty.
  assert.equal(normalizeName("高博"), "高博");
  assert.equal(normalizeName("José  O'Brien"), "josé o brien");
});

test("time credits are linked to their own user and derived from the ledger", () => {
  const a = createUser({ name: "User A", email: "a@example.com", password: "supersecret" });
  const b = createUser({ name: "User B", email: "b@example.com", password: "supersecret" });

  assert.equal(getBalance(a.id), 0);
  assert.ok(grantWelcomeCredits(a.id));
  assert.equal(grantWelcomeCredits(a.id), null, "welcome credits are granted only once");
  assert.equal(getBalance(a.id), 3);
  assert.equal(getBalance(b.id), 0, "another user's balance is untouched");

  spend(a.id, 2, "experience", { experienceId: "community_01" });
  earn(a.id, 1, "hosted");
  assert.equal(getBalance(a.id), 2);

  const history = listTransactions(a.id);
  assert.deepEqual(history.map((entry) => entry.type), ["earn", "spend", "earn"]);
  assert.equal(history[0].balanceAfter, 2);
  assert.deepEqual(listTransactions(b.id), []);
});

test("spending more credits than the balance is rejected and changes nothing", () => {
  const user = createUser({ name: "User C", email: "c@example.com", password: "supersecret" });
  earn(user.id, 1, "seed");
  assert.throws(() => spend(user.id, 2, "experience"), { status: 402 });
  assert.equal(getBalance(user.id), 1);
  assert.throws(() => spend(user.id, 0, "experience"), { status: 400 });
  assert.throws(() => earn(user.id, 1.5, "seed"), { status: 400 });
});
