export const FALLBACK_SUN = Object.freeze({
  sunrise: "7:01 AM",
  sunset: "7:08 PM",
  source: "fallback",
});

export function formatLocalTime(isoTime) {
  if (!isoTime || !isoTime.includes("T")) return null;
  const [hourText, minute] = isoTime.split("T")[1].split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

export async function getSunTimes({ lat, lng, date, timezone = "auto" } = {}, options = {}) {
  const { timeoutMs = 3500, fetchImpl = global.fetch } = options;
  if (!fetchImpl || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return { ...FALLBACK_SUN };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily: "sunrise,sunset",
      timezone,
      forecast_days: "1",
    });
    if (date) {
      params.set("start_date", date);
      params.set("end_date", date);
      params.delete("forecast_days");
    }
    const response = await fetchImpl(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Sun lookup failed with ${response.status}`);
    const payload = await response.json();
    const sunrise = formatLocalTime(payload.daily?.sunrise?.[0]);
    const sunset = formatLocalTime(payload.daily?.sunset?.[0]);
    if (!sunrise || !sunset) return { ...FALLBACK_SUN };

    return { sunrise, sunset, source: "live" };
  } catch (_error) {
    return { ...FALLBACK_SUN };
  } finally {
    clearTimeout(timeout);
  }
}
