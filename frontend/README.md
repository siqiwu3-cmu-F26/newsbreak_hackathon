# LocalConnect frontend

React + Vite + Tailwind CSS + React Router, using JavaScript and JSX.
Use Node.js 24 (minimum 22.22.0) and npm. Dependency versions are locked in `package-lock.json`.

## Run locally

From the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. The frontend runs without a backend using an explicitly labelled sample fallback. To preview the sample without any API request, open http://localhost:5173/?mock=1 or http://localhost:5173/itinerary?mock=1.

```powershell
npm run build
npm run preview
npm test
```

The production output is `dist/`; preview runs at http://localhost:4173.
The dev and preview servers fail if their configured port is occupied.

## Routes and handoff

| URL | Current status | Integration point |
| --- | --- | --- |
| `/` | Complete input form and submission | `src/pages/Home.jsx` (frontend 1) |
| `/itinerary` | Saved result, sample, or empty state | `src/pages/PlanResult.jsx` wraps member 2's `Itinerary.jsx` |
| `/community` | Placeholder | Community page (member 5) |
| `/experiences/:experienceId` | Placeholder | Experience details (member 5) |
| `/offer-skill` | Placeholder | Offer a Skill page (member 5) |
| Any unknown path | 404 with return link | `src/App.jsx` |

All routes live in `src/App.jsx`, nested under `src/components/AppLayout.jsx`. The layout renders the shared navigation, header, footer, and an `Outlet` for each page. The remaining community placeholders are ready for member 5's page integration. Feature pages should export their content without another router or application shell.

The home page links to the itinerary and community pages. Navigation also provides direct access to planning, itinerary, community, and skill sharing, with an active-page indicator. The result page links back to the saved preferences. All routes can be opened and refreshed directly in Vite.

## Home form and plan handoff

1. Pick Date / Family / Friends / Solo, a positive whole number of people, same-day start/end times, a nonnegative total USD budget, at least one interest, and optional notes (up to 1,000 characters). Solo selects and locks the party size to 1.
2. **Fill first-date example** fills the documented demo scenario; the fields remain editable. This does not change the submission mode.
3. **Plan My Day** posts to the backend; inputs and submit are disabled while waiting. **Cancel** or leaving the page aborts the request without a late redirect.
4. **Use sample plan** / `?mock=1` bypasses the network. Network/HTTP errors, invalid responses, and the 15-second timeout use an explicitly labelled fixed example. Backend responses with `fallback: true` receive a separate backup-example message. Samples are not represented as personalized results.
5. The draft and last result persist in `sessionStorage` under `localconnect.planner.v1` for the current browser tab. Navigating back and refreshing preserves them. Corrupt/unavailable storage safely falls back to defaults/in-memory state.

`src/lib/planRequest.js` owns the request contract, validation, group and interest options. No date or location is sent: this follows Design Doc (2), with Palo Alto as the demo location.

```json
{
  "groupType": "date",
  "people": 2,
  "startTime": "15:00",
  "endTime": "20:00",
  "budget": 80,
  "interests": ["creative", "food", "relaxing"],
  "notes": "First date, likes flowers and quiet places"
}
```

`createPlan(request, { mock, signal })` in `src/services/api.js` returns `{ itinerary, source }`. The result wrapper receives `{ itinerary, source, request, id }`; `itinerary` retains the backend schema (`id`, `travelToNext`, `totals`). `src/lib/itinerary.js` checks that the response is renderable and adapts it for the existing member 2 UI (`experienceId`, incoming `travelMinutes`). Backend totals are passed through rather than recalculated. Planning constraints remain backend responsibilities.

The integrated result is currently read-only: `PlanResult` passes `allowReplace={false}` so a real plan cannot accidentally invoke member 2's local mock replacement function. The standalone `Itinerary` component retains its existing default replacement behavior. Connecting real Replace / Rain, maps, and community pages remains with their feature owners.

Shared design tokens and classes live in `src/styles.css`: `brand`, `brand-soft`, `canvas`, `ink`, `muted`, `line`; `page-container`, `panel`, `eyebrow`, `button-primary`, `button-secondary`. Navigation wraps on narrow screens, links and buttons have a minimum 44px height, and the shell includes visible keyboard focus and a skip-to-content link. Tailwind is configured through the Vite plugin and the CSS `@theme` block; no separate Tailwind or PostCSS config is needed.

## Backend configuration

### Reordering activities

Drag an activity's **Drag** grip to another numbered slot, or use its up/down buttons (also available on mobile). A focused grip supports the up/down arrow keys; Escape cancels an active drag. Budget spinner controls now use $10 steps; manually entered amounts may still include cents.

`POST /reorder` accepts `{ itinerary, activityIds, constraints }`. The backend preserves activity durations, schedules the new order from the planning start time, allows travel and any waiting for opening hours, and recalculates travel estimates and totals. Impossible closing/end-time conflicts return an explanation without dropping activities or changing the displayed plan. Travel remains the existing distance-based estimate, not live directions. Time-specific experiences such as sunset walks should be reviewed after manual rearrangement.

Timeline, map order/pins, travel totals, and saved session all update from the returned itinerary. Replace, rain replan, and reorder are serialized to prevent competing responses; failures leave the prior itinerary intact. Restart the backend after pulling this change to register `/reorder` (or use `npm run dev`).

Optional: copy `.env.example` to `.env.local` and change the backend target.

```powershell
Copy-Item .env.example .env.local
```

- `API_PROXY_TARGET` defaults to `http://localhost:3001`, matching the current Express backend.
- `VITE_API_BASE_URL` defaults to `/api`; `src/services/api.js` imports it through `src/config.js`.
- During development, `/api/plan` is proxied to backend `/plan`, matching Design Doc (2). If the backend exposes `/api/plan` instead, remove the rewrite in `vite.config.js`.
- Restart Vite after changing environment variables.

For local integration, use a second terminal from the repository root:

```powershell
cd backend
npm ci
npm start
```

The backend may return its fixed example until the AI service is available; the frontend labels this response. No AI keys are needed for the frontend or sample mode.

For production, set `VITE_API_BASE_URL` to the backend URL before building (the backend must allow the frontend origin), or configure a same-origin `/api` reverse proxy. The Vite development proxy is not included in `dist/`. Never place secret API keys in `VITE_` variables.

The production host must serve `index.html` for frontend routes such as `/itinerary`, while preserving static assets and API routes. This enables direct navigation and refresh with `BrowserRouter`.

## Configuration references

- [Vite setup](https://vite.dev/guide/)
- [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite)
- [React Router declarative setup](https://reactrouter.com/start/declarative/installation)
