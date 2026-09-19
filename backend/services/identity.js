// MOCK identity verification. Nothing here talks to a real ID provider or government
// database: it only applies the rules below to what the user typed. To go live, replace
// mockVerifyIdentity with a call to a provider (e.g. Persona, Stripe Identity).

export const ID_TYPES = ["drivers_license", "passport", "state_id"];
export const MIN_AGE = 18;
export const WELCOME_CREDITS = 3;

const ID_NUMBER_PATTERN = /^[A-Za-z0-9-]{5,20}$/;

function parseDate(value) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text ? null : text;
}

// Casefolds and drops punctuation/spacing so "Brandon  Gao" matches "brandon gao".
export const normalizeName = (name) =>
  String(name).normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function ageOn(dateOfBirth, now = new Date()) {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const passedBirthday =
    now.getUTCMonth() + 1 > month || (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day);
  return now.getUTCFullYear() - year - (passedBirthday ? 0 : 1);
}

// Shape and format checks. Returns { errors, value }; errors is keyed by form field.
export function validateIdentityInput(body = {}, now = new Date()) {
  const errors = {};
  const today = now.toISOString().slice(0, 10);

  const legalName = String(body.legalName ?? "").trim();
  if (legalName.length < 2 || legalName.length > 100) {
    errors.legalName = "Enter your full name exactly as it appears on your ID.";
  }

  const dateOfBirth = parseDate(body.dateOfBirth);
  if (!dateOfBirth || dateOfBirth >= today || dateOfBirth < "1900-01-01") {
    errors.dateOfBirth = "Enter a valid date of birth.";
  }

  const idType = String(body.idType ?? "");
  if (!ID_TYPES.includes(idType)) errors.idType = "Choose the type of ID you're using.";

  const idNumber = String(body.idNumber ?? "").trim();
  if (!ID_NUMBER_PATTERN.test(idNumber)) {
    errors.idNumber = "Enter the ID number using 5–20 letters, numbers or dashes.";
  }

  const expiryDate = parseDate(body.expiryDate);
  if (!expiryDate) errors.expiryDate = "Enter the expiry date shown on your ID.";

  return { errors, value: { legalName, dateOfBirth, idType, idNumber, expiryDate } };
}

// Policy checks on well-formed input. Returns { verified, code?, reason?, age }.
export function mockVerifyIdentity(value, accountName, now = new Date()) {
  const age = ageOn(value.dateOfBirth, now);

  if (age < MIN_AGE) {
    return { verified: false, code: "UNDER_AGE", reason: `You must be at least ${MIN_AGE} to join LocalConnect.`, age };
  }
  if (value.expiryDate <= now.toISOString().slice(0, 10)) {
    return { verified: false, code: "ID_EXPIRED", reason: "This ID has expired. Use a current government-issued ID.", age };
  }
  if (normalizeName(value.legalName) !== normalizeName(accountName)) {
    return {
      verified: false,
      code: "NAME_MISMATCH",
      reason: "The name on your ID doesn't match the name on your account.",
      age
    };
  }
  // Demo hook so the rejection path can be shown on stage.
  if (value.idNumber.replace(/-/g, "").endsWith("0000")) {
    return {
      verified: false,
      code: "ID_NOT_FOUND",
      reason: "We couldn't match this ID to a record. (Demo: ID numbers ending in 0000 always fail.)",
      age
    };
  }
  return { verified: true, age };
}
