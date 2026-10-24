# Klaim tanpa biaya gas pemain

Pemain menekan **Klaim … MON · tanpa gas** setelah ronde selesai. Server mengirim transaksi `claimFor` dari wallet relayer pengelola. Kontrak tetap membayar seluruh reward ke `player` dalam bukti EIP-712. Tidak ada potongan gas dari reward dan tidak ada transaksi wallet pemain. Login tetap memakai tanda tangan pesan, tanpa gas.

## Persiapan pengelola

1. Pasang kontrak RiverRewards versi yang memiliki `claimFor`. Kontrak lama tidak bisa diubah; buktinya tidak berlaku pada kontrak baru. Mulai ronde baru setelah perpindahan. Pool lama tidak memiliki fungsi penarikan dan dananya tetap berada di alamat lama.
2. Isi pool baru dengan test MON untuk pembayaran reward.
3. Jalankan `npm run testnet:prepare` untuk menyiapkan relayer terpisah tanpa mengganti key yang sudah ada. Isi `FUND_GAS_MON=0.20` di `.env`, lalu `npm run testnet:rewards -- fund-relayer` untuk mengisinya dari deployer, dan simpan private key hanya sebagai `RELAYER_PRIVATE_KEY` pada API. Jangan menaruhnya di Vercel, browser, README, atau Git. Jangan gunakan wallet itu untuk transaksi lain karena API mengatur noncenya.
4. Di Supabase jalankan `data/supabase/002_sponsored_claims.sql` setelah migrasi pertama. SQLite melakukan migrasi006 otomatis.
5. Set `REWARD_POOL_ADDRESS`, `REWARD_CLAIMS_ENABLED=true`, `REWARD_SPONSOR_ENABLED=true`, `SIGNING_CHAIN_ID=10143`. Signer tetap kunci server yang cocok dengan signer kontrak.
6. Set `RELAYER_DAILY_BUDGET_MON=0.1` dan `RELAYER_MAX_GAS_PRICE_WEI=150000000000` sebagai batas awal. Batas harian dihitung per tanggal UTC, dari biaya maksimum yang dipesan sebelum broadcast; biaya gagal juga memakai kuota. Batas ini bukan kuota jumlah reward.
7. Restart API, cek `/rewards/config`: `enabled:true`, `sponsored:true`, alamat `contract` dan `relayer` benar. Muat ulang web dan jalankan ronde baru.

Ada dua saldo berbeda: **pool reward** membayar pemain, **wallet relayer** membayar gas. Keduanya dapat diisi dengan transfer MON biasa ke alamat publiknya pada Monad Testnet. Tidak ada top-up otomatis. Jika saldo habis, jaringan bermasalah, atau kuota tercapai, klaim ditunda; UI tidak beralih diam-diam ke transaksi berbayar pemain.

## Kontrak dan protokol

`claim` lama tetap tersedia untuk kompatibilitas. `claimFor(RoundReward,bytes)` menerima pengirim mana pun, tetapi penerima selalu `r.player`; pemanggil tidak bisa mengganti tujuan atau jumlah. Keduanya berbagi pencegahan replay round+player dan nonce, pause, validasi signer/domain/deadline, serta reentrancy guard. Domain tetap versi1 dengan alamat kontrak baru.

`POST /rounds/claim` menerima **hanya** `{ "roundId": "UUID ronde" }` dan bearer token slot ronde yang sudah diverifikasi wallet. API mengambil bukti tersimpan sendiri; tidak menerima alamat, skor, jumlah, calldata, atau signature dari klien. Response: `hash`, `status` (`pending|confirmed|failed`), `recipient`, `rewardWei`, `gasPayer`, `playerGasWei:"0"`, dan receipt bila tersedia. POST berulang adalah pemeriksaan idempoten, bukan transaksi baru.

`GET /rewards/config` menambah `sponsored:boolean` dan `relayer:address|null`. API dan UI lama tetap bekerja saat sponsor dinonaktifkan. `createApiServer` menambah opsi injeksi `sponsoring`. `matchesRewardReceipt(proof,receipt,sender)` menerima pengirim sponsor eksplisit; default tetap pemain untuk klaim lama. Modul FE baru `wallet/sponsored-claim.js` menggunakan fetch native dan tidak menambah library.

## Ketahanan dan batas

API menyimpan raw transaksi bertanda tangan beserta hash dan reservasi gas **sebelum** mengirim. Jika koneksi putus atau proses restart, hanya bytes/hash yang sama dikirim ulang. Semua permintaan pengiriman melewati antrean satu proses. Satu transaksi yang belum pasti menghalangi nonce baru sampai receipt diketahui. Status berhasil memerlukan receipt sukses dari pool dan event RewardClaimed yang cocok dengan penerima, massa, nilai, nonce, serta roundId.

Deployment ini mendukung **satu instance API / satu relayer**, sama dengan server room. Jangan menambah replica atau memakai key relayer pada layanan lain. Jika transaksi menggantung permanen, pengelola perlu meninjau nonce/RPC; belum ada penggantian transaksi otomatis. Tidak ada dukungan sponsor mainnet pada modul ini. Ini prototipe testnet yang diuji, belum diaudit keamanan eksternal.

Gas tidak menjadi lebih murah; **pengelola yang membayarnya**. Nilai reward kecil dibanding gas, sehingga subsidi perlu anggaran tersendiri. Bukti uji browser, saldo sebelum/sesudah, dan semua transaksi disimpan di README dan `sponsored-testnet-deployment.json`.
