# Utility scripts
`database.py --database PATH --seed`: migrate/seed SQLite (stdlib). `export-abi.js`: ambil ABI artifact Foundry → shared/abi. `deploy-local.sh`: local Docker Compose release; tidak membuka port publik atau melakukan deployment berbayar.

Fase 2: `load-test.js` menjalankan API lokal sementara +80 klien ws dalam20 room, mengukur tick Hz, event-loop p99, CPU, RSS, trafik, disconnect dan dropped simulation time. `LOAD_SECONDS=20`, opsional `PERF_OUTPUT=docs/perf-phase2-load.json`. Gagal bila koneksi/error/tick rate melanggar batas; tidak memerlukan signer atau RPC.

## Current revision — 24 October 2026
testnet-rewards.js check|deploy|fund uses existing viem and compiled RiverRewards artifact, testnet10143 only. Explicit funding amount from FUND_MON. test-postgres.sh validates private RPC against an explicitly supplied disposable TEST_DATABASE_URL.
