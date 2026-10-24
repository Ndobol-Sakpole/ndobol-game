# Supabase production storage
Apply `001_game.sql` in the project's SQL editor. The API uses `createSupabaseStore()` with server-only `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. No browser Supabase SDK or key. Native fetch calls the private `ndobol_store` RPC. Postgres tables use the `ndobol_` prefix to avoid collisions with the website.

`persistRound`, `evidence`, `evidenceByToken`, `signed`, `nonce`, `rate`, `saveSignature`, `leaderboard` are asynchronous equivalents of the SQLite adapter. Both validate identical authoritative evidence before persistence. A round inserts in one transaction; signature + nonce advancement are atomic with row locking and uniqueness. A nonce conflict fails closed (the proof is never returned); a retry reads the next nonce. RLS is enabled, anon/authenticated have no table access and cannot execute the RPC. Service role belongs only on Render.

Completed results persist. In-memory rooms/auth sessions still belong to one Render process. Restart requires wallet login and abandons unfinished rounds. Do not scale to multiple API instances without shared room routing/state.

No live Supabase project is created by this migration. Local CI verifies the migration against PostgreSQL using `infra/scripts/test-postgres.sh`.
