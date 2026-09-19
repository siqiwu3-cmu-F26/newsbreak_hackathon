# LocalConnect AI

LocalConnect AI plans a local day out from a group's interests, time window, budget, and
location, mixing local businesses with community-hosted experiences. Members sign up,
verify their identity and address, and earn Time Credits by sharing a skill with the app's
built-in listing generator.

## Demo flow

1. Sign up and complete identity + address verification (mock providers, instant).
2. Fill the first-date example on the home page, or plan together and pick from three AI-suggested directions.
3. Generate a structured itinerary with the Anthropic-powered planner.
4. Review the timeline, live weather, sunset time, totals, and route map.
5. Replace or reorder an activity, or replan the itinerary for rain.
6. Explore community experiences, or describe a skill and let the AI turn it into a listing.

The application returns a labelled fallback itinerary if the AI provider or network is unavailable.

## Run locally

Requirements: Node.js 22 or newer.

Backend:

```bash
cd backend
npm ci
cp .env.example .env
# Add ANTHROPIC_API_KEY and MONGODB_URI to .env.
npm run db:init
npm run dev
```

Frontend, in a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`.

The Vite development proxy sends `/api` requests to `http://localhost:3001`. Override it with `API_PROXY_TARGET` when needed. For a deployed backend, set `VITE_API_BASE_URL` in `frontend/.env`.

## Environment variables

Backend (`backend/.env`):

- `ANTHROPIC_API_KEY`: required for live AI plans and skill listings.
- `ANTHROPIC_WORKSPACE_ID`: optional workspace header for organization-level keys.
- `PORT`: optional backend port; defaults to `3001`.
- `MONGODB_URI`: MongoDB Atlas connection string used for users, sessions, and Time Credits.
- `MONGODB_DB_NAME`: optional database name; defaults to `localconnect`.
- `ID_HASH_SECRET`: optional secret for hashing stored ID numbers; defaults to a dev-only value — set a real one before deploying.

Frontend (`frontend/.env`):

- `VITE_API_BASE_URL`: public API base; defaults to `/api`.
- `API_PROXY_TARGET`: development proxy target; defaults to `http://localhost:3001`.

Never commit `.env` files. Both frontend and backend include safe `.env.example` templates.

## API

All routes are also available under an `/api` prefix (e.g. `/api/plan`) for the frontend's dev proxy.

| Route | Purpose |
| --- | --- |
| `GET /health` | Liveness check |
| `POST /auth/signup` (or `/auth/register`), `/auth/login`, `/auth/logout`, `GET /auth/me` | Account + session |
| `POST /auth/verify-identity`, `/auth/verify-address` | Mock identity/address verification |
| `GET /credits`, `POST /credits/spend` | Time Credit balance and spending |
| `GET /experiences` | Business + community experience catalog |
| `GET /context?location=...&date=...` | Weather, sunset, and location context |
| `POST /plan/options` | Three AI-suggested directions (collaborative planning) |
| `POST /plan` | Full AI-generated itinerary |
| `POST /replace`, `/reorder`, `/replan` | Swap, reorder, or weather-replan an itinerary |
| `POST /skills/extract` | AI-generated listing preview from a freeform skill description |

## Verification

```bash
cd frontend && npm test && npm run build
cd ../backend && npm test
```

To make one live Anthropic request using the configured backend environment:

```bash
cd backend
npm run test:agent
```

## Project structure

- `frontend/`: React, React Router, Vite, and Tailwind UI.
- `backend/`: Express API.
  - `routes/`: HTTP endpoints (auth, credits, plan, replace/reorder/replan, skills, experiences, context).
  - `services/`: Anthropic client, itinerary/skill prompts, weather/sunset/location, credits, identity/address.
  - `db/`: MongoDB connection, collection indexes, and transaction helper.
  - `lib/`: deterministic itinerary logic and shared validation/security helpers.
  - `data/experiences.json`: demo business and community catalog.
