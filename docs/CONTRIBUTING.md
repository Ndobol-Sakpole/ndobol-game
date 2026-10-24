# Contributing
Node >=24.5 wajib (built-in SQLite), Python3 opsional untuk migrasi manual, Foundry 1.5.1/solc0.8.28 untuk kontrak, Docker Compose untuk smoke container.

1. `npm ci --ignore-scripts` untuk tooling + dua dependensi backend; `npm run game` tanpa install juga bisa untuk runtime.
2. Ubah modul sesuai tanggung jawab, dokumentasikan interface di README modul. Selalu pertahankan no-bundler/no-framework/procedural-assets.
3. `npm run lint && npm test`; `forge test --root contracts`; jika Solidity berubah export ABI.
4. Uji browser desktop/mobile: masuk lobi, W/Spasi, A/D, Q/E dan sentuh, ganti track/kualitas, orbit, kembali, console, memory lifecycle.
5. `python3 infra/scripts/database.py --database /tmp/ndobol.sqlite --seed`; `docker compose config --quiet`; `docker compose up --build --wait`.

Tidak commit .env, private key, sqlite, contract out/cache/broadcast, atau screenshots QA sementara di luar bukti review yang dipilih. Tambahkan tes untuk aturan simulasi/protokol/security boundary; jangan snapshot semua primitive visual. Perubahan arsitektur/biaya perlu kesepakatan pengguna sebelum implementasi.
