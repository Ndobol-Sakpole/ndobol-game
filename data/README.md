# Data — SQLite v2
`001_initial.sql` is unchanged. `002_coop_rounds.sql` preserves old results/leaderboard as `rounds_v1`/`leaderboard_v1` archives and creates cooperative rounds, round_players, signed_results, per-track leaderboard, durable player_nonces and sign_attempts. Archived local results cannot be claimed. players/items remain; seed is idempotent and contains no wallet keys.

`createStore(filename)` in `store.js` uses Node's built-in SQLite, WAL, foreign keys and short transactions. Migrations run once via `PRAGMA user_version`. `persistRound(state,members)` validates authoritative evidence and atomically stores round/participants/personal bests. `evidence`, `signed`, `rate`, `nonce`, `saveSignature`, `leaderboard`, `close` support API services. No frontend DB writes.

`npm run data:init` applies migrations + seed using Python stdlib (optional admin tool). The API applies the same migrations automatically, no Python in the container. Docker volume `river-data` stores database + WAL; keep both together for backups, use SQLite backup facilities for live backups. Do not delete the volume when restarting services.

`catalog.js`, `site.js`, `downloads/` remain unrelated promotional content. Game CI does not import them.

Migrasi003: ronde menyimpan jenis getek, versi aturan3 dan kondisi hull akhir. Tabel lama dan hasil bertanda tangan tetap utuh.

## Weighted rewards
Migrasi004 mendukung capsized/sunk serta round_players.weight_grams,reward_wei,pickup_json. Migrasi005 menyimpan leaderboard lama ke leaderboard_pre_weight dan memulai perbandingan poin berdasarkan gram. persistRound memverifikasi kepemilikan unik ID sampah dan total massa/wei; hasil mati disimpan dengan reward nol. Arsip dan nonce/signature lama tidak dihapus.

## Current revision — 24 October 2026
Production adapter: createSupabaseStore in supabase-store.js, native fetch to private RPC. Apply supabase/001_game.sql separately. SQLite stays default locally. validate-round.js is shared evidence validation. See supabase/README.md.
