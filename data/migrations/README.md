# Migrations
File SQL urut `NNN_description.sql`, transaksi eksplisit, set `PRAGMA user_version = N`. Runner hanya menerapkan versi yang lebih tinggi. 001 membuat skema pertama; migrasi berikutnya harus additive atau menyertakan migrasi data dan tes. Jangan mengubah 001 setelah deployment dengan data pengguna.

002 mengarsipkan rounds/leaderboard Fase 1 dan membuat skema co-op, round_players, signed_results, player_nonces, sign_attempts dan leaderboard per track. Data arsip dipertahankan tetapi tidak diperlakukan sebagai hasil authoritative. API memakai runner Node SQLite; skrip Python memakai versi migrasi yang sama.

003 additive menyimpan raft_id (default bambu-polos), rules_version (hasil lama2, baru3), hull_json (integritas empat pelampung dan wetness). Tidak mengubah signature EIP-712.

004: alasan gagal dan massa/reward/pickup evidence; 005: arsip leaderboard skala lama. Migrasi idempoten via user_version; jangan edit migrasi yang sudah diterapkan dalam deployment.
