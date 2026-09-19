// Used when the browser can't (or hasn't been allowed to) tell us where the user is.
// Matches the backend's default location, the center of Palo Alto.
export const DEFAULT_USER_LOCATION = Object.freeze({ lat: 37.4419, lng: -122.143 });
export const DEFAULT_LOCATION_NAME = 'Palo Alto center';

const EARTH_RADIUS_MILES = 3958.8;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function hasCoordinates(point) {
  return point?.lat != null && point?.lng != null && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng));
}

// Straight-line (great-circle) distance between two { lat, lng } points, in miles.
export function distanceMiles(from, to) {
  const dLat = toRadians(Number(to.lat) - Number(from.lat));
  const dLng = toRadians(Number(to.lng) - Number(from.lng));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(Number(from.lat))) * Math.cos(toRadians(Number(to.lat))) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(a)));
}

// "0.8 mi", "12 mi", or "under 0.1 mi" for very short hops.
export function formatMiles(miles) {
  if (miles < 0.1) return 'under 0.1 mi';
  const rounded = Math.round(miles * 10) / 10;
  return rounded >= 10 ? `${Math.round(miles)} mi` : `${rounded.toFixed(1)} mi`;
}

// Wording shown next to an experience. Only claims "away" when we really know where the
// user is; otherwise it says what the distance is measured from.
export function distanceLabel(miles, source) {
  if (!Number.isFinite(miles)) return '';
  return source === 'device' ? `${formatMiles(miles)} away` : `${formatMiles(miles)} from ${DEFAULT_LOCATION_NAME}`;
}
