import "../person5.css";

const weatherVisuals = {
  clear: { icon: "☀", label: "Clear" },
  cloudy: { icon: "☁", label: "Cloudy" },
  fog: { icon: "≋", label: "Foggy" },
  rain: { icon: "☂", label: "Rain" },
  snow: { icon: "❄", label: "Snow" },
  storm: { icon: "ϟ", label: "Storm" },
};

export default function WeatherContext({
  weather = { condition: "clear", temperature: 72 },
  sunset = "7:28 PM",
  location = "Palo Alto",
  onRainReplan,
}) {
  const condition = String(weather.condition || "clear").toLowerCase();
  const visual = weatherVisuals[condition] || weatherVisuals.cloudy;

  return (
    <section className="weather-context" aria-label="Local conditions">
      <div className="weather-context__item">
        <span className="weather-context__icon" aria-hidden="true">{visual.icon}</span>
        <span>
          <small>Weather</small>
          <strong>{weather.temperature ?? 72}° · {visual.label}</strong>
        </span>
      </div>
      <div className="weather-context__divider" />
      <div className="weather-context__item">
        <span className="weather-context__icon weather-context__icon--sunset" aria-hidden="true">◐</span>
        <span>
          <small>Sunset in {location}</small>
          <strong>{sunset}</strong>
        </span>
      </div>
      {onRainReplan && (
        <button className="weather-context__action" type="button" onClick={onRainReplan}>
          ☂ Replan for rain
        </button>
      )}
    </section>
  );
}
