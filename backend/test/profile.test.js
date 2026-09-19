import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "localconnect-profile-"));
process.env.DB_FILE = path.join(tempDir, "app.db");

const { db, MIGRATIONS, openDatabase } = await import("../lib/db.js");
const { MAX_IMAGE_DIMENSION, cleanJpeg } = await import("../services/jpeg.js");
const { BIO_MAX_LENGTH, getAvatar, memberProfile, normalizeBio, removeAvatar, saveAvatar, saveBio } =
  await import("../services/profile.js");
const { createUser, findUserById, publicUser } = await import("../services/users.js");

test.after(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

// ---- a tiny synthetic JPEG: only the markers matter to the sanitizer, not the pixels ----
const segment = (marker, payload) => {
  const body = Buffer.from(payload);
  const header = Buffer.from([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff]);
  return Buffer.concat([header, body]);
};
const frame = (width, height) =>
  segment(0xc0, [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0]);

function makeJpeg({ width = 256, height = 256, extras = [] } = {}) {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    segment(0xe0, Buffer.from("JFIF\0\x01\x01\0\0\x01\0\x01\0\0")),
    ...extras,
    segment(0xdb, Buffer.alloc(65, 3)),
    frame(width, height),
    segment(0xda, [1, 1, 0, 0, 63, 0]),
    Buffer.from([0x12, 0x34, 0x56, 0x78]), // pretend compressed data
    Buffer.from([0xff, 0xd9])
  ]);
}
const withMetadata = () =>
  makeJpeg({
    extras: [
      segment(0xe1, Buffer.from("Exif\0\0GPS-LATITUDE-37.44N")),
      segment(0xe2, Buffer.from("ICC_PROFILE-ish-secret")),
      segment(0xfe, Buffer.from("private comment"))
    ]
  });

test("cleanJpeg removes EXIF/GPS, other APP segments and comments but keeps the image", () => {
  const original = withMetadata();
  assert.ok(original.includes("GPS-LATITUDE"));

  const cleaned = cleanJpeg(original);
  for (const secret of ["GPS-LATITUDE", "Exif", "ICC_PROFILE", "private comment"]) {
    assert.ok(!cleaned.includes(secret), `${secret} should be gone`);
  }
  assert.ok(cleaned.includes("JFIF"), "the standard JFIF header stays");
  assert.ok(cleaned.subarray(cleaned.length - 6).equals(Buffer.from([0x12, 0x34, 0x56, 0x78, 0xff, 0xd9])), "image data is untouched");
  assert.equal(cleaned[0], 0xff);
  assert.equal(cleaned[1], 0xd8);
  assert.ok(cleaned.length < original.length);
  assert.ok(cleanJpeg(cleaned).equals(cleaned), "cleaning is idempotent");
});

test("cleanJpeg rejects anything that isn't a sane JPEG", () => {
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  const good = makeJpeg();
  const rejects = {
    "a PNG": png,
    "an empty body": Buffer.alloc(0),
    "text": Buffer.from("<script>alert(1)</script>"),
    "a truncated JPEG (no end marker)": good.subarray(0, good.length - 2),
    "a JPEG with no frame header": Buffer.concat([Buffer.from([0xff, 0xd8]), segment(0xe0, [0, 0]), segment(0xda, [0, 0]), Buffer.from([0xff, 0xd9])]),
    "zero width": makeJpeg({ width: 0, height: 10 }),
    "a huge image": makeJpeg({ width: MAX_IMAGE_DIMENSION + 1, height: 10 })
  };
  for (const [label, buffer] of Object.entries(rejects)) {
    assert.throws(() => cleanJpeg(buffer), { status: 400 }, `${label} should be rejected`);
  }
  assert.doesNotThrow(() => cleanJpeg(makeJpeg({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION })));
});

test("normalizeBio keeps plain text, tidies whitespace and enforces the limit", () => {
  assert.equal(normalizeBio("  Hi there!  "), "Hi there!");
  assert.equal(normalizeBio("Line one\r\nLine two"), "Line one\nLine two");
  assert.equal(normalizeBio("a\n\n\n\n\nb"), "a\n\nb");
  assert.equal(normalizeBio("bell\u0007 and null\u0000 removed"), "bell and null removed");
  assert.equal(normalizeBio(""), "", "an empty introduction is allowed");
  assert.equal(normalizeBio("<b>not html</b>"), "<b>not html</b>", "stored as-is; the frontend only ever renders it as text");

  assert.doesNotThrow(() => normalizeBio("x".repeat(BIO_MAX_LENGTH)));
  assert.throws(() => normalizeBio("x".repeat(BIO_MAX_LENGTH + 1)), { status: 400 });
  // Emoji count as one character each, not two.
  assert.doesNotThrow(() => normalizeBio("😀".repeat(BIO_MAX_LENGTH)));
  assert.throws(() => normalizeBio(42), { status: 400 });
  assert.throws(() => normalizeBio(null), { status: 400 });
});

test("bio and photo are saved per user and shown to others without private details", () => {
  const ada = createUser({ name: "Ada Lovelace", email: "ada@example.com", password: "supersecret" });
  const bob = createUser({ name: "Bob Builder", email: "bob@example.com", password: "supersecret" });

  assert.equal(publicUser(ada).bio, "");
  assert.equal(publicUser(ada).avatarVersion, null);

  saveBio(ada.id, "I love flowers and talking about maths.");
  const withPhoto = saveAvatar(ada.id, withMetadata());
  assert.equal(findUserById(ada.id).bio, "I love flowers and talking about maths.");
  assert.equal(findUserById(bob.id).bio, "", "another user is unaffected");
  assert.ok(withPhoto.avatarUpdatedAt);
  assert.equal(publicUser(withPhoto).avatarVersion, withPhoto.avatarUpdatedAt);

  const stored = getAvatar(ada.id);
  assert.ok(!stored.image.includes("GPS-LATITUDE"), "the stored image has no location data");
  assert.equal(getAvatar(bob.id), null);

  const profile = memberProfile(findUserById(ada.id));
  assert.deepEqual(Object.keys(profile).sort(), ["avatarVersion", "bio", "id", "memberSince", "name", "verified"]);
  const json = JSON.stringify(profile);
  for (const secret of ["ada@example.com", "passwordHash", "verification", "address"]) {
    assert.ok(!json.includes(secret), `${secret} must not be exposed to other members`);
  }
});

test("replacing and removing a photo updates the version and deletes the image", async () => {
  const user = createUser({ name: "Grace Hopper", email: "grace@example.com", password: "supersecret" });
  const first = saveAvatar(user.id, makeJpeg());
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = saveAvatar(user.id, makeJpeg({ width: 128, height: 128 }));
  assert.notEqual(second.avatarUpdatedAt, first.avatarUpdatedAt, "a new version busts the browser cache");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM user_avatars WHERE user_id = ?").get(user.id).n, 1);

  const removed = removeAvatar(user.id);
  assert.equal(removed.avatarUpdatedAt, null);
  assert.equal(getAvatar(user.id), null);
  assert.equal(removeAvatar(user.id).avatarUpdatedAt, null, "removing twice is harmless");
});

test("a schema-version-1 database (like one created before profiles) upgrades in place", () => {
  const file = path.join(tempDir, "v1.db");
  const old = new Database(file);
  old.exec(MIGRATIONS[0]);
  old.pragma("user_version = 1");
  old.prepare("INSERT INTO users (id, name, email, password_hash, created_at) VALUES ('u_old', 'Old User', 'old@example.com', 'h', 't')").run();
  old.close();

  const upgraded = openDatabase(file);
  assert.equal(upgraded.pragma("user_version", { simple: true }), MIGRATIONS.length);
  const row = upgraded.prepare("SELECT bio, avatar_updated_at FROM users WHERE id = 'u_old'").get();
  assert.deepEqual(row, { bio: "", avatar_updated_at: null }, "existing users keep their data and get an empty profile");
  assert.equal(upgraded.prepare("SELECT COUNT(*) AS n FROM user_avatars").get().n, 0);
  upgraded.close();

  // Opening it again must not try to re-run the migration.
  openDatabase(file).close();
});
