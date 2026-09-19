# LocalConnect AI

LocalConnect AI creates local itineraries from a group's interests, time window, budget, and location. Plans combine local businesses with community-hosted experiences and can be updated when the weather changes.

## Demo flow

1. Fill the first-date example on the home page.
2. Generate a structured itinerary with the Anthropic-powered planner.
3. Review the timeline, live weather, sunset time, totals, and route map.
4. Replace one activity or replan the itinerary for rain.
5. Explore community experiences or generate a skill listing.

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

- `ANTHROPIC_API_KEY`: required for live AI plans.
- `ANTHROPIC_WORKSPACE_ID`: optional workspace header for organization-level keys.
- `PORT`: optional backend port; defaults to `3001`.
- `MONGODB_URI`: MongoDB Atlas connection string used by the login API.
- `MONGODB_DB_NAME`: optional database name; defaults to `localconnect`.

Frontend (`frontend/.env`):

- `VITE_API_BASE_URL`: public API base; defaults to `/api`.
- `API_PROXY_TARGET`: development proxy target; defaults to `http://localhost:3001`.

Never commit `.env` files. Both frontend and backend include safe `.env.example` templates.

## API

- `GET /health`
- `POST /api/auth/register` with `{ "name", "email", "password" }`
- `POST /api/auth/login` with `{ "email", "password" }`
- `GET /api/auth/me` with an `Authorization: Bearer <token>` header
- `POST /api/auth/logout` with an `Authorization: Bearer <token>` header
- `GET /api/experiences`
- `GET /api/context?location=Palo%20Alto%2C%20CA&date=2026-09-19`
- `POST /api/plan`
- `POST /api/replace`
- `POST /api/replan`

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
- `backend/`: Express API, AI prompt/service, deterministic planning utilities, and local context services.
- `backend/data/experiences.json`: demo business and community catalog.
