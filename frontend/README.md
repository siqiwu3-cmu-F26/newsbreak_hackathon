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

Open http://localhost:5173. The frontend shell runs without a backend.

```powershell
npm run build
npm run preview
```

The production output is `dist/`; preview runs at http://localhost:4173.
The dev and preview servers fail if their configured port is occupied.

## Routes and handoff

| URL | Current status | Integration point |
| --- | --- | --- |
| `/` | Landing shell; input form is next | `src/pages/Home.jsx` (frontend 1) |
| `/itinerary` | Placeholder | `src/pages/Itinerary.jsx` (frontend 2) |
| `/community` | Placeholder | Community page (member 5) |
| `/experiences/:experienceId` | Placeholder | Experience details (member 5) |
| `/offer-skill` | Placeholder | Offer a Skill page (member 5) |
| Any unknown path | 404 with return link | `src/App.jsx` |

All routes live in `src/App.jsx`. Replace each `PagePlaceholder` with the actual page component once its default export exists. Existing empty feature files are intentionally not imported. The header, footer, and browser router are shared; feature pages should export their content without another router or application shell.

Shared design tokens and classes live in `src/styles.css`: `brand`, `brand-soft`, `canvas`, `ink`, `muted`, `line`; `page-container`, `panel`, `eyebrow`, `button-primary`. Tailwind is configured through the Vite plugin and the CSS `@theme` block; no separate Tailwind or PostCSS config is needed.

## Backend configuration

Optional: copy `.env.example` to `.env.local` and change the backend target.

```powershell
Copy-Item .env.example .env.local
```

- `API_PROXY_TARGET` defaults to `http://localhost:3001` (an integration placeholder until the backend port is settled).
- `VITE_API_BASE_URL` defaults to `/api`; import `API_BASE_URL` from `src/config.js` when implementing `src/services/api.js`.
- During development, `/api/plan` is proxied to backend `/plan`, matching Design Doc (2). If the backend exposes `/api/plan` instead, remove the rewrite in `vite.config.js`.
- Restart Vite after changing environment variables.
- API requests, fallback data, the planning form, and result rendering are not implemented in this scaffolding step.

For production, set `VITE_API_BASE_URL` to the backend URL before building (the backend must allow the frontend origin), or configure a same-origin `/api` reverse proxy. The Vite development proxy is not included in `dist/`. Never place secret API keys in `VITE_` variables.

The production host must serve `index.html` for frontend routes such as `/itinerary`, while preserving static assets and API routes. This enables direct navigation and refresh with `BrowserRouter`.

## Configuration references

- [Vite setup](https://vite.dev/guide/)
- [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite)
- [React Router declarative setup](https://reactrouter.com/start/declarative/installation)
