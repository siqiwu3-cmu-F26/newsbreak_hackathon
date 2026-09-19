import crypto from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Compared against when the email is unknown so login takes the same time either way.
export const DUMMY_PASSWORD_HASH = hashPassword("not-a-real-password");

export const newToken = () => crypto.randomBytes(32).toString("base64url");

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// Session tokens are 256 random bits, so a plain SHA-256 is enough to store them safely.
export const hashToken = sha256;

// Keyed hash of an ID number, so duplicates can be detected without storing the number.
export function hashIdNumber(idType, idNumber) {
  const secret = process.env.ID_HASH_SECRET || "dev-only-id-hash-secret";
  return crypto.createHmac("sha256", secret).update(`${idType}:${idNumber.toUpperCase()}`).digest("hex");
}
