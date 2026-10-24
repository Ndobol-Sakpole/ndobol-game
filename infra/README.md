# Infrastructure — Fase 2
`npm run dev` starts native static web + API using Node >=24.5 and reads an ignored `.env` if present. Default web 4174, API 8787; WEB_PORT/API_PORT/API_ORIGIN/HOST are configurable. `npm run dev:website` retains the unrelated promotional server.

`docker compose up --build --wait` builds Node24 Alpine images, runs nonroot/read-only, drops capabilities, exposes localhost ports and waits for API health before web. `river-data` is the API SQLite volume. `SIGNER_PRIVATE_KEY`, `SIGNING_CHAIN_ID`, `RIVER_REGISTRY_ADDRESS`, `ALLOWED_ORIGINS` are API environment only. No key is baked into image or frontend. `docker compose down` retains results; do not pass `--volumes` to preserve them.

Static server serves only canonical apps/web/shared paths; `/api/*` and WebSocket `/rooms` proxy to the internal API. A generic static server supports solo, not multiplayer. No external cloud hosting or paid service has been introduced.

CI: dependency install, lint, Node unit/integration/signing/latency tests, 20-room load smoke, SQLite migrations, Compose health/web checks, Foundry scaffold tests, ABI drift check. `npm run test:load` runs 20 rooms/80 sockets for 20s; LOAD_SECONDS adjusts length, PERF_OUTPUT writes JSON telemetry. Performance records: docs/perf.md.

Dockerfile/build.js for the old promotional website remain separate. Contract deployment scripts remain explicitly invoked Phase 1 scaffolds and are not called by the game or CI.

## Current revision — 24 October 2026
Cloud: root vercel.json packages static game via build-game.js (only apps/web/shared); render.yaml runs a single API; Supabase migration in data/supabase. See docs/deployment.md. Build/test creates no cloud resources or chain transactions.
