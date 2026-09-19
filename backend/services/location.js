export const DEFAULT_LOCATION = Object.freeze({
  city: "Palo Alto",
  region: "California",
  country: "United States",
  lat: 37.4419,
  lng: -122.143,
  timezone: "America/Los_Angeles",
  source: "fallback",
});

export async function geocodeLocation(query = "Palo Alto, CA", options = {}) {
  const { timeoutMs = 3500, fetchImpl = global.fetch } = options;
  if (!fetchImpl || String(query).trim().length < 2) return { ...DEFAULT_LOCATION };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      name: String(query).trim(),
      count: "1",
      language: "en",
      format: "json",
    });
    const response = await fetchImpl(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Geocoding failed with ${response.status}`);
    const payload = await response.json();
    const match = payload.results?.[0];
    if (!match) return { ...DEFAULT_LOCATION };

    return {
      city: match.name,
      region: match.admin1 || "",
      country: match.country || "",
      lat: match.latitude,
      lng: match.longitude,
      timezone: match.timezone || DEFAULT_LOCATION.timezone,
      source: "live",
    };
  } catch (_error) {
    return { ...DEFAULT_LOCATION };
  } finally {
    clearTimeout(timeout);
  }
}
