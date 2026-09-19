# Person 5 integration

This branch contains the map, weather/sunset context, and community experience UI.

## Frontend routes

Wire these components into `App.jsx` or the team's router:

```jsx
import Community from "./pages/Community";
import ExperienceDetail from "./pages/ExperienceDetail";
import OfferSkill from "./pages/OfferSkill";
```

Suggested paths:

- `/community` → `Community`
- `/community/:experienceId` → `ExperienceDetail`
- `/offer-skill` → `OfferSkill`

`Community` tries `GET /api/experiences` first and falls back to the local demo catalog, so it is safe to demo before the backend data is ready.

Use the itinerary components like this:

```jsx
import MapView from "./components/MapView";
import WeatherContext from "./components/WeatherContext";

<WeatherContext
  weather={environment.weather}
  sunset={environment.sunset}
  location={environment.location.city}
  onRainReplan={handleRainReplan}
/>
<MapView activities={itinerary.activities} />
```

## Backend route

Mount the context route in `server.js` after Express is initialized:

```js
const contextRouter = require("./routes/context");
app.use("/api/context", contextRouter);
```

Example:

```text
GET /api/context?location=Palo%20Alto%2C%20CA
```

The service uses Open-Meteo without an API key and returns deterministic Palo Alto fallback data when the network is unavailable. The planner can consume the returned `location`, `weather`, and `sunset` fields directly.
