import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// The database opens at import time using DB_FILE, so point it at a throwaway file first.
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "localconnect-auth-"));
process.env.DB_FILE = path.join(tempDir, "app.db");

const { hashPassword, verifyPassword } = await import("../lib/security.js");
const { createUser, findUserByEmail, isFullyVerified, publicUser, setVerification } = await import("../services/users.js");
const { mockVerifyAddress, validateAddressInput } = await import("../services/address.js");
const { createSession, destroySession, getUserForToken, SESSION_TTL_MS } = await import("../services/sessions.js");
const { ageOn, mockVerifyIdentity, normalizeName, validateIdentityInput } = await import("../services/identity.js");
const { earn, getBalance, grantWelcomeCredits, listTransactions, spend } = await import("../services/credits.js");
const { db, openDatabase } = await import("../lib/db.js");
const { rowToUser } = await import("../lib/userRows.js");

test.after(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

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

test("the SQLite file persists across connections", () => {
  const file = path.join(tempDir, "persist.db");
  const first = openDatabase(file);
  first.prepare("INSERT INTO users (id, name, email, password_hash, created_at) VALUES ('u1', 'N', 'n@x.co', 'h', 't')").run();
  first.close();

  const second = openDatabase(file);
  assert.equal(second.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1);
  second.close();
});

test("the database itself enforces one account per ID and one welcome bonus", () => {
  const first = createUser({ name: "One", email: "one@example.com", password: "supersecret" });
  const second = createUser({ name: "Two", email: "two@example.com", password: "supersecret" });
  const verified = { status: "verified", idHash: "same-id-hash" };

  setVerification(first.id, verified);
  assert.throws(() => setVerification(second.id, verified), { status: 409 });
  assert.equal(findUserByEmail("two@example.com").verification.idHash, undefined);

  grantWelcomeCredits(first.id);
  const duplicate = () =>
    db
      .prepare(
        `INSERT INTO credit_transactions (id, user_id, type, amount, reason, balance_after, created_at)
         VALUES ('dup', ?, 'earn', 3, 'welcome', 6, 't')`
      )
      .run(first.id);
  assert.throws(duplicate, { code: "SQLITE_CONSTRAINT_UNIQUE" });
  assert.throws(() => db.prepare("UPDATE credit_transactions SET amount = 0 WHERE user_id = ?").run(first.id), {
    code: "SQLITE_CONSTRAINT_CHECK"
  });
});

test("an earlier db.json is imported once into SQLite and kept as a backup", () => {
  const dir = fs.mkdtempSync(path.join(tempDir, "legacy-"));
  const jsonFile = path.join(dir, "db.json");
  // Shape of the previous JSON database: an identity-verified user created before addresses existed.
  fs.writeFileSync(
    jsonFile,
    JSON.stringify({
      users: [
        {
          id: "user_old",
          name: "Old Timer",
          email: "old@example.com",
          passwordHash: "scrypt$aa$bb",
          createdAt: "2026-09-19T00:00:00.000Z",
          verification: {
            status: "verified",
            method: "mock",
            verifiedAt: "2026-09-19T01:00:00.000Z",
            legalName: "Old Timer",
            dateOfBirth: "1990-01-01",
            idType: "passport",
            idLast4: "4567",
            idHash: "hash-old"
          }
        }
      ],
      sessions: [
        { tokenHash: "live", userId: "user_old", createdAt: 1, expiresAt: Date.now() + 60_000 },
        { tokenHash: "dead", userId: "user_old", createdAt: 1, expiresAt: 5 }
      ],
      credits: [
        { id: "txn_1", userId: "user_old", type: "earn", amount: 3, reason: "welcome", balanceAfter: 3, createdAt: "t1" },
        { id: "txn_2", userId: "user_old", type: "spend", amount: 1, reason: "experience", experienceId: "community_01", experienceName: "Flowers", balanceAfter: 2, createdAt: "t2" }
      ]
    })
  );

  const file = path.join(dir, "app.db");
  const migrated = openDatabase(file, { legacyJson: jsonFile });
  const user = rowToUser(migrated.prepare("SELECT * FROM users WHERE id = 'user_old'").get());

  assert.equal(user.email, "old@example.com");
  assert.equal(user.verification.status, "verified");
  assert.equal(user.verification.idLast4, "4567");
  assert.equal(user.address.status, "unverified", "no address yet, so they must add one");
  assert.equal(isFullyVerified(user), false);
  assert.deepEqual(migrated.prepare("SELECT token_hash FROM sessions").all(), [{ token_hash: "live" }], "expired sessions are dropped");
  assert.equal(migrated.prepare("SELECT SUM(CASE type WHEN 'earn' THEN amount ELSE -amount END) AS b FROM credit_transactions").get().b, 2);
  assert.ok(fs.existsSync(`${jsonFile}.migrated`) && !fs.existsSync(jsonFile), "JSON is renamed, not deleted");
  migrated.close();

  // Reopening must not import again or fail.
  const again = openDatabase(file, { legacyJson: jsonFile });
  assert.equal(again.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1);
  again.close();
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

test("address input validation flags each bad field and normalizes good input", () => {
  const good = { line1: "  123   Main St ", line2: "Apt 4", city: "Palo Alto", state: "ca", zip: "94301" };
  const { errors, value } = validateAddressInput(good);
  assert.deepEqual(errors, {});
  assert.deepEqual(value, { line1: "123 Main St", line2: "Apt 4", city: "Palo Alto", state: "CA", zip: "94301" });
  assert.deepEqual(validateAddressInput({ ...good, zip: "94301-1234" }).errors, {});

  const bad = validateAddressInput({ line1: "Main Street", city: "", state: "ZZ", zip: "943" }).errors;
  assert.deepEqual(Object.keys(bad).sort(), ["city", "line1", "state", "zip"]);

  // A P.O. box must pass validation so the specific "not a P.O. Box" rejection can fire.
  assert.deepEqual(validateAddressInput({ ...good, line1: "PO Box 55" }).errors, {});
});

test("mock address verification rejects P.O. boxes and the demo ZIP", () => {
  const ok = { line1: "123 Main St", city: "Palo Alto", state: "CA", zip: "94301" };
  assert.equal(mockVerifyAddress(ok).verified, true);
  assert.equal(mockVerifyAddress({ ...ok, line1: "1 P.O. Box 55" }).verified, true, "only a leading PO box counts");
  assert.equal(mockVerifyAddress({ ...ok, line1: "PO Box 55" }).code, "PO_BOX");
  assert.equal(mockVerifyAddress({ ...ok, line1: "P.O. Box 55" }).code, "PO_BOX");
  assert.equal(mockVerifyAddress({ ...ok, line1: "Post Office Box 9" }).code, "PO_BOX");
  assert.equal(mockVerifyAddress({ ...ok, zip: "00000" }).code, "ADDRESS_NOT_FOUND");
});

test("a member is fully verified only with both identity and address", () => {
  const verified = { status: "verified" };
  assert.equal(isFullyVerified({ verification: verified, address: verified }), true);
  assert.equal(isFullyVerified({ verification: verified, address: { status: "unverified" } }), false);
  assert.equal(isFullyVerified({ verification: { status: "unverified" }, address: verified }), false);
  // Accounts created before address verification existed have no address at all.
  assert.equal(isFullyVerified({ verification: verified }), false);
  assert.equal(publicUser({ id: "u", name: "n", email: "e", verification: verified }).verification.complete, false);
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
