# Utility scripts
`database.py --database PATH --seed`: migrate/seed SQLite (stdlib). `export-abi.js`: ambil ABI artifact Foundry → shared/abi. `deploy-local.sh`: local Docker Compose release; tidak membuka port publik atau melakukan deployment berbayar.

Fase 2: `load-test.js` menjalankan API lokal sementara +80 klien ws dalam20 room, mengukur tick Hz, event-loop p99, CPU, RSS, trafik, disconnect dan dropped simulation time. `LOAD_SECONDS=20`, opsional `PERF_OUTPUT=docs/perf-phase2-load.json`. Gagal bila koneksi/error/tick rate melanggar batas; tidak memerlukan signer atau RPC.

## Current revision — 24 October 2026
testnet-rewards.js check|deploy|fund uses existing viem and compiled RiverRewards artifact, testnet10143 only. Explicit funding amount from FUND_MON. test-postgres.sh validates private RPC against an explicitly supplied disposable TEST_DATABASE_URL.

`npm run supabase:check` loads local .env and checks the Supabase private RPC read-only. Modern secret keys and legacy service-role JWTs are supported. `npm run testnet:rewards -- deploy|fund|check` also loads local .env; only deploy/fund send transactions.

## Pembaruan: gas dibayar pengelola
Server publik kini memakai kontrak baru `0x51fe1d32d251c57b6148ecf6d4b591bf0a9d3579` dan gas sponsor. Angka biaya pemain pada uji awal di atas adalah riwayat. `testnet:prepare` menyiapkan tiga key terpisah; `FUND_GAS_MON` + `testnet:rewards -- fund-relayer` mengisi wallet gas. Supabase perlu migrasi002. Ikuti [panduan sponsor](../../docs/sponsored-claims.md) dan README untuk alur terbaru.
