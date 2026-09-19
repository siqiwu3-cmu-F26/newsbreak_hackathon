// MOCK address verification. Nothing here calls a real address or postal service: it checks
// the format and applies the rules below. To go live, swap mockVerifyAddress for a provider
// (e.g. USPS, Google Address Validation, or a mailed postcard code).

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
  "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH",
  "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;
const CITY_PATTERN = /^[\p{L}][\p{L}\s.'-]{1,59}$/u;
const PO_BOX_PATTERN = /^\s*(p\.?\s*o\.?\s*box|post\s+office\s+box)\b/i;

const clean = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

// Shape and format checks. Returns { errors, value }; errors is keyed by form field.
export function validateAddressInput(body = {}) {
  const errors = {};
  const line1 = clean(body.line1);
  const line2 = clean(body.line2);
  const city = clean(body.city);
  const state = clean(body.state).toUpperCase();
  const zip = clean(body.zip);

  // P.O. boxes have no house number; let them through so they get the specific rejection below.
  if (line1.length < 3 || line1.length > 100 || (!/^\d/.test(line1) && !PO_BOX_PATTERN.test(line1))) {
    errors.line1 = "Enter your street address, starting with the house number.";
  }
  if (line2.length > 50) errors.line2 = "Apartment or unit must be 50 characters or fewer.";
  if (!CITY_PATTERN.test(city)) errors.city = "Enter your city.";
  if (!US_STATES.includes(state)) errors.state = "Enter a 2-letter US state, like CA.";
  if (!ZIP_PATTERN.test(zip)) errors.zip = "Enter a 5-digit ZIP code, like 94301.";

  return { errors, value: { line1, line2, city, state, zip } };
}

// Policy checks on a well-formed address. Returns { verified, code?, reason? }.
export function mockVerifyAddress(value) {
  if (PO_BOX_PATTERN.test(value.line1)) {
    return {
      verified: false,
      code: "PO_BOX",
      reason: "We need the street address where you live, not a P.O. Box."
    };
  }
  // Demo hook so the rejection path can be shown on stage.
  if (value.zip.startsWith("00000")) {
    return {
      verified: false,
      code: "ADDRESS_NOT_FOUND",
      reason: "We couldn't find this address. (Demo: ZIP 00000 always fails.)"
    };
  }
  return { verified: true };
}
