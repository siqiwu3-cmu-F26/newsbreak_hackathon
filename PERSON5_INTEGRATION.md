# Person 5 integration reference

The map, weather/sunset context, and community experience UI are now wired into the main application.

## Frontend routes

The following components are routed from `App.jsx`:

```jsx
import Community from "./pages/Community.jsx";
import ExperienceDetail from "./pages/ExperienceDetail.jsx";
import OfferSkill from "./pages/OfferSkill.jsx";
```

Suggested paths:

- `/community` → `Community`
- `/experiences/:experienceId` → `ExperienceDetail`
- `/offer-skill` → `OfferSkill`

`Community` tries `GET /api/experiences` first and falls back to the local demo catalog, so it is safe to demo before the backend data is ready.

Use the itinerary components like this:

```jsx
import MapView from "./components/MapView.jsx";
import WeatherContext from "./components/WeatherContext.jsx";

<WeatherContext
  weather={environment.weather}
  sunset={environment.sunset}
  location={environment.location.city}
  onRainReplan={handleRainReplan}
/>
<MapView activities={itinerary.activities} />
```

## Backend route

The context route is mounted in `server.js` at both `/context` and `/api/context`:

```js
import contextRouter from "./routes/context.js";
app.use("/api/context", contextRouter);
```

Example:

```text
GET /api/context?location=Palo%20Alto%2C%20CA
```

The service uses Open-Meteo without an API key and returns deterministic Palo Alto fallback data when the network is unavailable. The result page consumes the returned `location`, `weather`, and `sunset` fields directly.
