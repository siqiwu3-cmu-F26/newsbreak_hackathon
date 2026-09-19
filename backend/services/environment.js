const { geocodeLocation } = require("./location");
const { getWeather } = require("./weather");
const { getSunTimes } = require("./sunset");

async function getEnvironmentContext({ query = "Palo Alto, CA", lat, lng, date } = {}) {
  const location = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
    ? {
        city: query.split(",")[0] || "Selected location",
        lat: Number(lat),
        lng: Number(lng),
        timezone: "auto",
        source: "request",
      }
    : await geocodeLocation(query);

  const input = {
    lat: location.lat,
    lng: location.lng,
    timezone: location.timezone || "auto",
    date,
  };
  const [weather, sun] = await Promise.all([getWeather(input), getSunTimes(input)]);

  return {
    location,
    weather,
    sunrise: sun.sunrise,
    sunset: sun.sunset,
    meta: {
      hasLiveData: weather.source === "live" || sun.source === "live",
      generatedAt: new Date().toISOString(),
    },
  };
}

module.exports = { getEnvironmentContext };
