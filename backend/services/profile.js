import { db } from "../lib/db.js";
import { HttpError } from "../lib/httpError.js";
import { cleanJpeg } from "./jpeg.js";
import { findUserById } from "./users.js";

export const BIO_MAX_LENGTH = 500;
export const AVATAR_MAX_BYTES = 512 * 1024;

const updateBio = db.prepare("UPDATE users SET bio = ? WHERE id = ?");
const upsertAvatar = db.prepare(`
  INSERT INTO user_avatars (user_id, image, updated_at) VALUES (?, ?, ?)
  ON CONFLICT (user_id) DO UPDATE SET image = excluded.image, updated_at = excluded.updated_at`);
const setAvatarTimestamp = db.prepare("UPDATE users SET avatar_updated_at = ? WHERE id = ?");
const deleteAvatar = db.prepare("DELETE FROM user_avatars WHERE user_id = ?");
const selectAvatar = db.prepare("SELECT image, updated_at FROM user_avatars WHERE user_id = ?");

const bioError = (message) => new HttpError(400, "Please fix the highlighted fields", { fields: { bio: message } });

// Plain text only: line breaks are kept, control characters are dropped, and it is always
// shown as text (never as HTML) by the frontend.
export function normalizeBio(input) {
  if (typeof input !== "string") throw bioError("Write your introduction as text.");
  const bio = input
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if ([...bio].length > BIO_MAX_LENGTH) {
    throw bioError(`Keep your introduction to ${BIO_MAX_LENGTH} characters or fewer.`);
  }
  return bio;
}

export function saveBio(userId, input) {
  updateBio.run(normalizeBio(input), userId);
  return findUserById(userId);
}

export function saveAvatar(userId, upload) {
  const image = cleanJpeg(upload);
  const now = new Date().toISOString();
  db.transaction(() => {
    upsertAvatar.run(userId, image, now);
    setAvatarTimestamp.run(now, userId);
  })();
  return findUserById(userId);
}

export function removeAvatar(userId) {
  db.transaction(() => {
    deleteAvatar.run(userId);
    setAvatarTimestamp.run(null, userId);
  })();
  return findUserById(userId);
}

export const getAvatar = (userId) => selectAvatar.get(userId) ?? null;

// What other members may see. An allow-list: never the email, address, date of birth or ID.
export function memberProfile(user) {
  return {
    id: user.id,
    name: user.name,
    bio: user.bio ?? "",
    avatarVersion: user.avatarUpdatedAt ?? null,
    memberSince: user.createdAt,
    verified: true
  };
}
