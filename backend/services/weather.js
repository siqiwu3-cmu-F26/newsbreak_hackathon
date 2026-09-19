export const WEATHER_CODES = {
  0: "clear",
  1: "clear",
  2: "cloudy",
  3: "cloudy",
  45: "fog",
  48: "fog",
  51: "rain",
  53: "rain",
  55: "rain",
  56: "rain",
  57: "rain",
  61: "rain",
  63: "rain",
  65: "rain",
  66: "rain",
  67: "rain",
  71: "snow",
  73: "snow",
  75: "snow",
  77: "snow",
  80: "rain",
  81: "rain",
  82: "rain",
  85: "snow",
  86: "snow",
  95: "storm",
  96: "storm",
  99: "storm",
};

export const FALLBACK_WEATHER = Object.freeze({
  condition: "clear",
  temperature: 72,
  precipitation: 0,
  precipitationProbability: 5,
  isDay: true,
  source: "fallback",
});

export async function getWeather({ lat, lng, timezone = "auto" } = {}, options = {}) {
  const { timeoutMs = 3500, fetchImpl = global.fetch } = options;
  if (!fetchImpl || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return { ...FALLBACK_WEATHER };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: "temperature_2m,weather_code,is_day,precipitation",
      daily: "precipitation_probability_max",
      temperature_unit: "fahrenheit",
      timezone,
      forecast_days: "1",
    });
    const response = await fetchImpl(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Weather lookup failed with ${response.status}`);
    const payload = await response.json();
    const current = payload.current || {};

    return {
      condition: WEATHER_CODES[current.weather_code] || "cloudy",
      temperature: Math.round(current.temperature_2m ?? FALLBACK_WEATHER.temperature),
      precipitation: current.precipitation ?? 0,
      precipitationProbability: payload.daily?.precipitation_probability_max?.[0] ?? null,
      isDay: Boolean(current.is_day),
      observedAt: current.time || null,
      source: "live",
    };
  } catch (_error) {
    return { ...FALLBACK_WEATHER };
  } finally {
    clearTimeout(timeout);
  }
}
