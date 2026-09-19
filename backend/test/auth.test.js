import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, hashToken, verifyPassword } from "../lib/security.js";
import { mockVerifyAddress, validateAddressInput } from "../services/address.js";
import { ageOn, mockVerifyIdentity, normalizeName, validateIdentityInput } from "../services/identity.js";
import { isFullyVerified, normalizeEmail, publicUser } from "../services/users.js";

const NOW = new Date("2026-09-19T12:00:00Z");
const goodId = {
  legalName: "Ada Lovelace",
  dateOfBirth: "1990-05-01",
  idType: "drivers_license",
  idNumber: "D1234567",
  expiryDate: "2030-01-01"
};

test("passwords are salted, hashed and verified", () => {
  const first = hashPassword("correct horse battery staple");
  const second = hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(verifyPassword("correct horse battery staple", first), true);
  assert.equal(verifyPassword("wrong password", first), false);
});

test("emails and session tokens are normalized safely", () => {
  assert.equal(normalizeEmail(" Ada@Example.COM "), "ada@example.com");
  assert.equal(hashToken("token"), hashToken("token"));
  assert.notEqual(hashToken("token"), hashToken("other"));
});

test("public users never expose authentication or identity secrets", () => {
  const user = {
    id: "user_123",
    name: "Ada Lovelace",
    email: "ada@example.com",
    passwordHash: "secret",
    createdAt: NOW,
    verification: { status: "verified", idHash: "private", idLast4: "4567" },
    address: { status: "verified", line1: "123 Main St", city: "Palo Alto", state: "CA", zip: "94301" }
  };
  const json = JSON.stringify(publicUser(user));
  assert.ok(!json.includes("passwordHash"));
  assert.ok(!json.includes("idHash"));
  assert.equal(publicUser(user).verification.complete, true);
});

test("age is computed around the birthday", () => {
  assert.equal(ageOn("2008-09-19", NOW), 18);
  assert.equal(ageOn("2008-09-20", NOW), 17);
});

test("identity validation and mock verification cover success and rejection", () => {
  assert.deepEqual(validateIdentityInput(goodId, NOW).errors, {});
  assert.equal(mockVerifyIdentity(goodId, "Ada Lovelace", NOW).verified, true);
  assert.equal(mockVerifyIdentity({ ...goodId, dateOfBirth: "2012-01-01" }, "Ada Lovelace", NOW).code, "UNDER_AGE");
  assert.equal(mockVerifyIdentity({ ...goodId, idNumber: "AB-10000" }, "Ada Lovelace", NOW).code, "ID_NOT_FOUND");
  assert.equal(normalizeName("José  O'Brien"), "josé o brien");
});

test("address validation and mock verification cover success and rejection", () => {
  const good = { line1: "123 Main St", line2: "", city: "Palo Alto", state: "ca", zip: "94301" };
  const { errors, value } = validateAddressInput(good);
  assert.deepEqual(errors, {});
  assert.equal(value.state, "CA");
  assert.equal(mockVerifyAddress(value).verified, true);
  assert.equal(mockVerifyAddress({ ...value, line1: "PO Box 55" }).code, "PO_BOX");
});

test("full verification requires both identity and address", () => {
  const verified = { status: "verified" };
  assert.equal(isFullyVerified({ verification: verified, address: verified }), true);
  assert.equal(isFullyVerified({ verification: verified, address: { status: "unverified" } }), false);
});
