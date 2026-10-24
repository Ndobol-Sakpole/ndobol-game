# Infrastructure

Local: `npm run dev` (or `npm start`) starts native static web on 4174 and API on 8787, using Node 24.5+ within series 24. An ignored local `.env` is loaded. WEB_PORT/API_PORT/API_ORIGIN/HOST are configurable. Static routes expose only apps/web/shared; `/api/*` and `/rooms` proxy to the API.

Render: `npm run build:api` verifies API imports without opening ports or databases. `npm run start:api` starts the single authoritative API, using Render PORT and HOST=0.0.0.0. Generic `npm run build` / `npm start` detect RENDER=true and select only the API; a local `.env` is not loaded in that mode.

Vercel: `npm run build:vercel` copies apps/web and shared into dist/game, writing only the public API HTTPS and WSS endpoints. PUBLIC_API_ORIGIN overrides this project's default https://ndobol-game.onrender.com; forks must supply their own API. `npm run build:game` is the generic explicit-origin packager. Neither command bundles/transpiles code or deploys contracts. Node stays within series 24. See [deployment](../docs/deployment.md) for manual dashboard settings, Supabase and CORS.

Docker: `docker compose up --build --wait` builds Node24 Alpine images, runs nonroot/read-only, drops capabilities, exposes localhost ports and waits for API health. The river-data SQLite volume persists after `docker compose down`; omit --volumes to retain results. No server secret is baked into images or frontend assets.

CI template: infra/ci/github-actions.yml runs lint, unit/integration/signing/latency/deployment tests, 20-room load smoke, SQLite/Postgres checks, Compose health and Foundry tests. It must be activated with GitHub workflow permission. `npm run test:load` runs 20 rooms/80 sockets for 20s; LOAD_SECONDS and PERF_OUTPUT configure the run. Records: docs/perf.md.

There are no changes to frontend module interfaces. Build and runtime entry selection are documented in docs/deployment.md. No cloud resource purchases or chain transactions occur during build/test.
