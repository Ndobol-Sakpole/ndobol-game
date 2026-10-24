# API — Fase 2
Node >=24.5 (`http`, `node:sqlite`), pinned `ws` + `viem`; no framework. `npm run dev` starts web + API; `npm run api` starts API only, default 127.0.0.1:8787. Use `node --env-file=.env services/api/server.js` to load local environment separately.

`createApiServer({database=':memory:',signing={},roomOptions={}})` returns http.Server with `roomServer`, `store`, `signer`, async `dispose()`. Library default is isolated in-memory DB for tests; executable defaults to `data/ndobol.sqlite`, configurable `DATABASE_PATH`. `dispose` closes sockets, HTTP connections and DB. Persist is injected into rooms; no client write-result endpoint.

- GET /health: phase2/protocol3/tickHz/room count/signing configured.
- WS /rooms: authoritative lobby/rounds/reconnect, see rooms/README and docs/protocol.md.
- POST /rounds/sign, GET /rounds/result: authenticated persisted results, see signing/README and docs/signing.md.
- GET /leaderboard?track=: ten best human scores per track.

Signing is disabled unless server environment provides key and verifier. Manual destination addresses have no proof of ownership yet. One API process owns rooms/database; live room state is not restored after process restart. Completed results and issued proofs survive restart. No blockchain calls or deployment.

Reward v5: GET /rewards/config mengembalikan chainId/contract/enabled publik. POST /rounds/sign tetap identifiers-only, sekarang memakai bukti massa untuk rules5. Fatal rounds disimpan tanpa hak reward. API key/pool boleh kosong; guest/game tetap hidup.

## Current revision — 24 October 2026
Protocol4 requires wallet ownership: POST /auth/challenge and /auth/verify; exact-origin CORS for Vercel. createApiServer accepts persistence adapter and walletRequired=true (false only for in-process tests). Production entry uses DATA_BACKEND=supabase and Render PORT. Store methods and signer.get may be async; saved state follows commit.

Render entry: `npm run start:api`, assigned `PORT`, `HOST` defaults to `0.0.0.0` when `RENDER=true`; local default remains `127.0.0.1`. `npm run build:api` only checks dependency imports. Node is bounded to series24 (minimum24.5). Exact CORS origins and Supabase runtime configuration are still required in production. See docs/deployment.md.
