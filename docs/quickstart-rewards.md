# Mulai dari Supabase sampai klaim test MON

Panduan ini memakai **Monad Testnet (chain ID 10143)**. Web berada di Vercel, API/room di Render, dan hasil ronde di Supabase. Tidak ada transaksi mainnet.

## 1. Siapkan database Supabase

1. Buka project Anda di dashboard Supabase.
2. Klik **SQL Editor** di menu kiri (ikon SQL), lalu **New query** atau tanda **+**.
3. Buka [001_game.sql](../data/supabase/001_game.sql), salin seluruh isinya, tempel ke editor, lalu klik **Run**.
4. Tunggu hasil **Success. No rows returned**. SQL membuat tabel dan fungsi game, sekaligus membatasi akses ke server.
5. Buka **Project Settings → API Keys**. Salin **Secret key** yang diawali `sb_secret_`. Publishable key tidak dapat dipakai untuk API privat game.
6. Salin Project URL. Di `.env` lokal dan Environment Render, isi:

```dotenv
SUPABASE_URL=https://PROJECT-ANDA.supabase.co
SUPABASE_SECRET_KEY=ISI_SECRET_KEY_DI_SINI
```

Jangan menambahkan `NEXT_PUBLIC_` ke secret key. Game tidak membutuhkan Supabase key di Vercel/browser. Variabel lama `SUPABASE_SERVICE_ROLE_KEY` masih diterima untuk instalasi yang memakai legacy service-role JWT.

Dari folder proyek, jalankan:

```sh
npm run supabase:check
```

Jika sukses, kedua track menampilkan `RPC ready`. Jika `DATABASE_RPC_404`, pastikan SQL dijalankan di project yang URL-nya sama dengan `.env`. Jika401/403, periksa secret key dan hak RPC. Pemeriksaan ini tidak mengubah data.

## 2. Siapkan wallet deployer tanpa mengekspor wallet utama

Dari folder proyek, setelah `npm ci --ignore-scripts`, jalankan:

```sh
npm run testnet:prepare
```

Perintah membuat `.env` bila belum ada, menyimpan dua private key baru secara lokal bila belum diisi, dan hanya menampilkan alamat publik. Menjalankan ulang tidak mengganti key. Jangan menghapus/menimpa `.env` setelah wallet tersebut diisi.

- **deployer**: wallet untuk membayar gas deploy dan mengisi pool.
- **owner**: pengelola kontrak. Anda dapat mengisi `CONTRACT_OWNER` dengan alamat wallet utama sebelum persiapan; jika kosong, deployer menjadi owner.
- **signer**: akun khusus server untuk menandatangani hasil. Key-nya berbeda dari deployer, tidak perlu saldo untuk menandatangani bukti.

Simpan cadangan `.env` secara privat. File ini tidak masuk Git. Jangan tempel private key/seed phrase ke chat, issue, atau README.

## 3. Isi wallet deployer dengan test MON

1. Buka wallet browser Anda dan pilih **Monad Testnet**, chain ID **10143**.
2. Jika belum memiliki test MON, gunakan [faucet resmi](https://faucet.monad.xyz).
3. Pilih **Send/Kirim**. Tempel alamat **deployer** dari langkah2, isi jumlah test MON untuk gas dan dana pool, lalu konfirmasi sendiri di wallet.
4. Untuk demo, 1 test MON dapat dipakai sebagai dana awal; biaya gas berubah dan tetap perlu diperiksa. Tunggu **Confirmed/Success**.

Network RPC: `https://testnet-rpc.monad.xyz`. Jangan tambahkan `/svg`. Pengiriman ke deployer dan pengisian pool adalah dua transaksi berbeda; pool baru ada setelah deploy.

## 4. Deploy RiverRewards

Untuk clone baru, pasang [Foundry](https://getfoundry.sh), lalu compile dan uji:

```sh
forge build --root contracts
forge test --root contracts
```

Pada komputer yang artifact-nya sudah disiapkan, compile tidak perlu diulang jika sumber dan compiler tetap sama. Perintah deploy membaca `.env`, mengirim transaksi testnet, menunggu receipt sukses, dan memeriksa bytecode/owner/signer/tarif:

```sh
npm run testnet:rewards -- deploy
```

Salin alamat `REWARD_POOL_ADDRESS=0x...` yang muncul ke baris `REWARD_POOL_ADDRESS` di `.env`. Simpan alamat dan hash transaksi. Jangan menjalankan deploy lagi bila kontrak yang benar sudah tersedia.

## 5. Isi pool reward

Di `.env`, isi jumlah yang memang ingin disetorkan:

```dotenv
FUND_MON=0.01
```

Kemudian jalankan:

```sh
npm run testnet:rewards -- fund
npm run testnet:rewards -- check
```

Syarat siap: chainId10143, owner/signer benar, `paused: false`, `funded: true`. Saldo pool harus cukup untuk klaim. Pool menerima native test MON; tarif game adalah 1kg =0,00001 MON. Kontrak saat ini tidak menyediakan penarikan oleh owner, jadi gunakan dana uji secukupnya.

Untuk top-up berikutnya, jalankan `fund` dengan jumlah baru atau kirim test MON langsung ke **alamat kontrak pool yang sudah diverifikasi** melalui wallet. Alamat signer bukan alamat pool.

## 6. Aktifkan server Render

Buka layanan API Render → **Environment**. Isi nilai berikut dari `.env` lokal Anda:

```dotenv
DATA_BACKEND=supabase
SUPABASE_URL=https://PROJECT-ANDA.supabase.co
SUPABASE_SECRET_KEY=ISI_SECRET_KEY_DI_RENDER
SIGNER_PRIVATE_KEY=SALIN_KEY_SIGNER_DARI_ENV_LOKAL
REWARD_POOL_ADDRESS=ALAMAT_KONTRAK_HASIL_DEPLOY
SIGNING_CHAIN_ID=10143
REWARD_CLAIMS_ENABLED=true
ALLOWED_ORIGINS=https://WEB-ANDA.vercel.app
HOST=0.0.0.0
NODE_ENV=production
NODE_VERSION=24
```

Jangan menaruh `DEPLOYER_PRIVATE_KEY` di Render atau Vercel. Jangan mengaktifkan klaim sebelum langkah5 berhasil. Pastikan hanya satu instance API.

Simpan, redeploy, lalu periksa:

- `/health`: memuat `ok:true` dan `signing:true`.
- `/rewards/config`: chainId10143, alamat pool benar, `enabled:true`.
- `/leaderboard?track=bengawan`: mengembalikan daftar; kosong saat belum ada hasil adalah normal. ID internal bengawan=Selokan Mataram dan mahakam=Kali Progo.

Untuk server lokal, gunakan nilai signer/pool yang sama di `.env`, `REWARD_CLAIMS_ENABLED=true`, lalu `npm run dev`. Pilih `DATA_BACKEND=supabase` setelah pemeriksaan database berhasil; SQLite tetap bisa dipakai untuk demo lokal.

## 7. Buktikan klaim dari satu ronde

1. Muat ulang web dan connect wallet pada Monad Testnet. Siapkan sedikit test MON pada wallet pemain untuk gas klaim.
2. Buat room, siap, lalu mulai. Satu pemain bisa bermain bersama bot.
3. Ambil sampah sendiri dan selesaikan ronde tanpa mati. Sampah bot tidak menghasilkan reward wallet manusia.
4. Di hasil ronde, klik **Klaim** dan konfirmasi transaksi di wallet.
5. Status dibayar hanya sah setelah receipt sukses dengan event `RewardClaimed` dari pool yang cocok dengan ronde dan pemain.

Ronde yang terbalik/tenggelam tidak bisa diklaim. Ronde tanpa sampah yang diambil manusia juga tidak memiliki reward. Signature atau angka estimasi saja belum membuktikan pembayaran.

Referensi: [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview), [Supabase keys](https://supabase.com/docs/guides/getting-started/api-keys), [Monad network](https://faucet.monad.xyz/add-network). Konfigurasi hosting lengkap: [deployment.md](deployment.md).
