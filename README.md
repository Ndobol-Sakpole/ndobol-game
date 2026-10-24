<p align="center"><img src="apps/web/assets/logo.webp" alt="Ndobol Sesarengan" width="320"></p>

# Ndobol Sesarengan

**Satu getek. Banyak tingkah.** Game browser 3D untuk 1–4 pemain. Berjalanlah di atas rakit bambu untuk menjaga keseimbangan, putar badan, lalu **tahan Spasi untuk kentut dan mendorong getek**. Ambil sampah, hindari rintangan, dan usahakan semua kru sampai finis.

Sungainya terinspirasi **Selokan Mataram** dan **Kali Progo**. Mataram punya dinding kanal dan jembatan; Progo punya batu besar dan bagian berarus deras. Dunia, karakter, getek, tekstur, serta suara dibuat dari kode. Logo memakai aset asli proyek.

Proyek ini open source, dibuat oleh tim **DeEs**. Anda boleh menjalankan, mempelajari, dan mengembangkan kodenya sesuai [lisensi MIT](LICENSE). Ini masih prototipe: belum ada marketplace atau pembelian getek. Semua getek di garasi bebas dicoba.

## Baca ini sebelum mulai

- **Wallet wajib**, termasuk jika bermain sendiri. Gunakan browser dengan wallet EVM yang menyediakan koneksi browser, misalnya MetaMask. Di ponsel, buka game melalui browser di dalam aplikasi wallet.
- Game memakai **Monad Testnet, chain ID 10143**. Login meminta tanda tangan pesan; login tidak memindahkan uang dan tidak memakai gas.
- Anda bisa bermain tanpa mengisi private key server. Hasil tetap disimpan, tetapi klaim belum aktif sampai pengelola memasang dan mendanai kontrak reward.
- Bermain sendiri tetap memerlukan server game. Buat room, klik Siap, lalu Mulai. Tiga slot lain diisi bot.
- **Test MON bukan uang nyata.** Jangan gunakan seed phrase atau private key wallet utama untuk konfigurasi percobaan.

## 1. Jalankan di komputer sendiri

### Siapkan dua aplikasi

1. Pasang **Node.js 24 LTS, minimal 24.5**, dari [nodejs.org](https://nodejs.org/en/download). npm sudah ikut di dalamnya.
2. Pasang **Git** dari [git-scm.com](https://git-scm.com/downloads). Jika tidak ingin memasang Git, buka tombol **Code → Download ZIP** di GitHub lalu ekstrak ZIP.
3. Gunakan browser modern yang mendukung WebGL2 dan wallet browser. Aktifkan akselerasi grafis jika scene terlihat lambat.

Buka **Terminal** di macOS/Linux atau **PowerShell** di Windows. Periksa Node:

```sh
node --version
npm --version
```

Versi Node harus `v24.5.0` atau lebih baru pada seri 24. Jika perintah tidak ditemukan, tutup lalu buka Terminal setelah instalasi.

### Unduh dan jalankan

Jika memakai Git, salin perintah ini satu per satu:

```sh
git clone https://github.com/Ndobol-Sakpole/ndobol-game.git
cd ndobol-game
npm ci --ignore-scripts
npm run dev
```

Jika memakai ZIP, buka Terminal di folder hasil ekstrak yang berisi `package.json`, lalu jalankan dua perintah `npm` di atas. Nama folder ZIP biasanya `ndobol-game-main`.

Tunggu tulisan `Ndobol world` dan `Ndobol API`, lalu buka:

**http://127.0.0.1:4174/apps/web/index.html**

Biarkan Terminal tetap terbuka selama bermain. Untuk mematikan server, tekan **Ctrl+C** di Terminal. Untuk menjalankan lagi, masuk ke folder yang sama dan ketik `npm run dev`; instalasi `npm ci` tidak perlu diulang setiap kali bermain.

Tidak perlu membuat database secara manual. SQLite dibuat otomatis di `data/ndobol.sqlite`. Tidak perlu memasang Foundry atau Docker untuk sekadar bermain. Jangan membuka `index.html` dengan klik dua kali; game memerlukan server di atas.

## 2. Hubungkan wallet dan mulai bermain

1. Klik **CONNECT & START**.
2. Setujui koneksi wallet. Jika diminta, tambahkan atau pindah ke **Monad Testnet**.
3. Baca lalu tanda tangani pesan login Ndobol. Ini berbeda dari transaksi klaim.
4. Pilih nama, karakter, sungai, dan getek.
5. Klik **Buat room**, lalu **Siap → Mulai**. Anda bisa langsung bermain sendiri dengan bot.
6. Untuk bermain bersama, bagikan kode room kepada teman yang membuka **alamat server game yang sama**. Mereka menghubungkan wallet masing-masing, klik **Gabung**, masukkan kode, lalu klik **Siap**. Host menekan **Mulai**.

`127.0.0.1` hanya menunjuk komputer Anda sendiri. Teman di komputer lain tidak bisa masuk ke server Anda memakai alamat tersebut. Untuk bermain lintas perangkat/internet, gunakan deployment HTTPS pada bagian 5. Untuk uji beberapa pemain di satu komputer, gunakan profil browser dan alamat wallet berbeda; satu alamat tidak bisa mengisi dua slot pada room yang sama.

| Gerakan | Tombol |
| --- | --- |
| Berjalan di atas getek | W A S D |
| Memutar badan 360° | Panah kiri/kanan atau J/L |
| Kentut terus-menerus | **Tahan Spasi**; lepas untuk berhenti |
| Mengambil sampah di sisi tubuh | Q / E |

Tombol sentuh tersedia di layar ponsel. Kentut keluar dari belakang badan: jika karakter menghadap kanan, dorongan mengarah ke kanan. Rakit masih bisa meluncur karena momentum setelah tombol dilepas. Berjalan ke sisi berlawanan untuk mengimbangi kemiringan. Jika getek terbalik atau tenggelam, kru gugur dan **reward ronde hangus**.

Buka **Pengaturan** untuk mengganti kualitas grafis, suara, dan track di lobi. Pilih kualitas rendah jika gerakan terasa berat.

## 3. Bagaimana MON dihitung?

Sampah punya berat. Poin dihitung dari berat yang berhasil diambil, dengan perhitungan:

**1 kg = 0,00001 MON.** Contohnya 15 kg setara 0,00015 MON, sama dengan harga rancangan getek ban. Harga getek saat ini adalah katalog; transaksi membeli getek belum tersedia.

Reward hanya berasal dari sampah yang diambil pemain manusia pada ronde server yang sah. Sampah bot tidak menjadi reward wallet. Berat dalam game bukan bukti pengumpulan sampah fisik di dunia nyata.

Alur klaim:

1. Ronde selesai dan pemain selamat.
2. Server menyimpan hasil serta memeriksa berat/skor.
3. Server membuat bukti bertanda tangan EIP-712.
4. Pemain menekan **Klaim MON**, lalu menyetujui transaksi di wallet.
5. Kontrak membayar test MON dari pool yang sebelumnya diisi pengelola. UI baru menampilkan status dibayar setelah receipt dan event pembayaran cocok.

Pemain memerlukan sedikit test MON untuk biaya gas klaim. Ambil melalui [faucet Monad](https://faucet.monad.xyz). Klaim yang sama tidak bisa dibayar dua kali. **Repo ini belum menyertakan alamat kontrak live atau pool yang didanai.** Tanpa konfigurasi tersebut, tombol klaim tetap nonaktif; angka estimasi di hasil bukan saldo wallet.

## 4. Menyalakan reward di Monad Testnet — untuk pengelola

Langkah ini diperlukan hanya jika ingin membayar reward. Siapkan wallet pengelola dengan test MON, alamat owner, serta wallet signer server yang terpisah. Jangan bagikan private key di chat, GitHub, atau frontend.

1. Pasang [Foundry](https://getfoundry.sh/). Jalankan `forge build --root contracts` untuk membuat bytecode kontrak.
2. Buat salinan `.env.example` bernama **`.env`** di folder proyek. File ini sudah dikecualikan dari Git. Di Windows gunakan `Copy-Item .env.example .env`; di macOS/Linux gunakan `cp .env.example .env`.
3. Isi `DEPLOYER_PRIVATE_KEY`, `CONTRACT_OWNER`, `REWARD_SIGNER_ADDRESS`, dan `SIGNER_PRIVATE_KEY`. Alamat signer harus berasal dari key signer; owner adalah alamat publik pengelola.
4. Deploy kontrak:

```sh
node --env-file=.env infra/scripts/testnet-rewards.js deploy
```

5. Salin alamat hasil deploy ke `REWARD_POOL_ADDRESS` di `.env`. Isi `FUND_MON` dengan jumlah test MON yang sengaja ingin Anda masukkan ke pool, lalu jalankan:

```sh
node --env-file=.env infra/scripts/testnet-rewards.js fund
node --env-file=.env infra/scripts/testnet-rewards.js check
```

6. Setelah pemeriksaan benar, pool berisi dana dan tidak paused, isi `SIGNING_CHAIN_ID=10143` dan `REWARD_CLAIMS_ENABLED=true`. Restart server dengan Ctrl+C lalu `npm run dev`.
7. Mainkan ronde baru, ambil sampah sendiri, selesaikan tanpa mati, kemudian klaim dari wallet yang sama.

**Deploy dan fund mengirim transaksi.** Skrip menolak jaringan selain testnet 10143. Kontrak saat ini tidak menyediakan penarikan dana oleh owner; masukkan dana uji secukupnya. Alur lengkap, konfigurasi, dan batas pengujian ada di [panduan deployment](docs/deployment.md) serta [reward](docs/rewards.md).

## 5. Pasang di internet: Vercel + Render + Supabase

Tiga layanan ini punya tugas berbeda:

| Layanan | Tugas |
| --- | --- |
| Vercel | Menampilkan halaman dan dunia 3D. |
| Render | Menjalankan room, koneksi multiplayer, login wallet, dan penandatanganan hasil. |
| Supabase | Menyimpan hasil, leaderboard, nonce, dan bukti reward. |

### A. Supabase

Buat project Supabase. Buka **SQL Editor**, tempel isi [data/supabase/001_game.sql](data/supabase/001_game.sql), lalu jalankan. Simpan Project URL dan **service-role key** untuk Render. Key ini tidak boleh berada di Vercel atau file browser.

### B. Render

Hubungkan repo ini sebagai **Blueprint**; Render membaca `render.yaml`. Gunakan **satu instance**. Isi `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`. Isi `ALLOWED_ORIGINS` dengan origin HTTPS web Anda, misalnya `https://nama-game.vercel.app`, tanpa garis miring/path. Jika URL Vercel belum ada, pakai sementara `https://game.example.invalid` dan ganti setelah langkah C; login belum akan diterima sebelum origin benar.

Untuk klaim, isi `SIGNER_PRIVATE_KEY` dan `REWARD_POOL_ADDRESS` dari langkah 4. Biarkan `REWARD_CLAIMS_ENABLED=false` sampai kontrak siap. Jangan taruh key deployer di Render. Sesudah layanan aktif, buka `https://alamat-api-anda.onrender.com/health`; respons harus memuat `"ok":true`.

### C. Vercel

Import repo ini, pilih preset **Other**, Node **24.x**, root directory tetap folder utama. Tambahkan environment variable:

```text
PUBLIC_API_ORIGIN=https://alamat-api-anda.onrender.com
```

Vercel membaca `vercel.json`: build `npm run build:game`, hasil `dist/game`. Build hanya menyalin file native dan menulis alamat API publik; tidak memakai bundler. Setelah deploy, perbarui `ALLOWED_ORIGINS` di Render menjadi origin Vercel yang sebenarnya, lalu redeploy Render. Buka URL Vercel, hubungkan wallet, buat room, dan uji dengan wallet kedua.

Render free dapat tidur saat tidak dipakai. Restart/deploy server mengakhiri room yang masih berjalan, tetapi data hasil di Supabase tetap ada. Pilih layanan yang selalu aktif jika diperlukan; pilihan paket dan biaya Anda tentukan sendiri. Vercel tidak menjalankan server WebSocket game ini. Konfigurasi terperinci: [docs/deployment.md](docs/deployment.md).

## Pilihan lain: Docker

Jika Docker Desktop sudah terpasang dan sedang berjalan, dari folder proyek jalankan:

```sh
docker compose up --build
```

Buka URL lokal yang sama pada port 4174. Untuk berhenti, tekan Ctrl+C lalu `docker compose down`. Data SQLite berada di volume Docker; jangan memakai `down -v` jika ingin menyimpannya. Cara Node di bagian 1 lebih sederhana untuk percobaan pertama.

## Jika menemui masalah

| Gejala | Yang perlu diperiksa |
| --- | --- |
| `node` / `npm` tidak ditemukan | Pasang Node24, lalu buka ulang Terminal. |
| PowerShell menolak `npm.ps1` | Gunakan `npm.cmd ci --ignore-scripts` dan `npm.cmd run dev`, atau Command Prompt. Tidak perlu melonggarkan kebijakan komputer. |
| Error `node:sqlite` | Node terlalu lama. Gunakan Node24.5+ pada seri24. |
| Muncul `ExperimentalWarning: SQLite` | Ini peringatan Node, bukan kegagalan game. Pastikan dua alamat server muncul. |
| `EADDRINUSE` / port sudah dipakai | Hentikan server game lain dengan Ctrl+C, lalu coba kembali. Jangan menjalankan dua `npm run dev` di port yang sama. |
| Halaman kosong / modul tidak terbaca | Buka lewat URL HTTP, bukan `file://`. Periksa WebGL2 dan akselerasi grafis. |
| Wallet tidak tersedia | Gunakan browser dengan wallet aktif; browser preview aplikasi mungkin tidak punya extension wallet. |
| Login ditolak / `ORIGIN_NOT_ALLOWED` | Pastikan API aktif dan `ALLOWED_ORIGINS` sama persis dengan origin browser. Coba login ulang setelah API restart. |
| Room teman tidak ditemukan | Pastikan kedua pemain memakai deployment yang sama dan kode room benar. |
| Klaim nonaktif | Selesaikan ronde server, ambil sampah sendiri, jangan mati; pengelola perlu menyiapkan key signer, kontrak, dana, dan flag klaim. |
| Transaksi klaim gagal | Periksa jaringan10143, wallet penerima, test MON untuk gas, batas waktu bukti, dan saldo pool. Jangan menganggap gagal berarti sudah dibayar. |
| Game lambat | Pilih kualitas rendah, tutup tab3D lain, aktifkan akselerasi grafis. |

Untuk melaporkan bug, sertakan perangkat/browser, langkah kejadian, dan pesan error di [Issues](https://github.com/Ndobol-Sakpole/ndobol-game/issues). Jangan sertakan token, key, seed phrase, atau file `.env`.

## Untuk yang ingin mengembangkan kode

Frontend memakai HTML/CSS/JavaScript ES modules dan Three.js0.170.0; backend memakai Node, `ws`, `viem`, dan SQLite bawaan. Tidak ada framework frontend atau bundler. Supabase diakses hanya oleh API melalui HTTPS, tanpa SDK tambahan.

| Folder | Isi |
| --- | --- |
| `apps/web/` | Scene, karakter, kontrol, suara, UI wallet/room/hasil. |
| `services/api/` | Simulasi server30Hz, WebSocket, autentikasi, signing. |
| `shared/` | Aturan fisika, perhitungan reward, protokol4, ABI. |
| `data/` | SQLite lokal dan migrasi/adapter Supabase produksi. |
| `contracts/` | Solidity, Foundry tests, deployment. |
| `infra/` | Server lokal, Docker, packaging, pengujian beban, template CI. |
| `tests/`, `docs/` | Pengujian dan penjelasan teknis. |

```sh
npm run lint
npm test
npm run test:load
forge test --root contracts
```

Hasil lokal terakhir: **95 tes JavaScript dan18 tes Solidity lulus**. Dua sampai empat klien diuji pada kedua track, termasuk reconnect dan latensi100–150ms. Data ukur dan batas pengujian ada di [docs/perf.md](docs/perf.md). Deployment publik, Supabase nyata, Docker runtime di mesin ini, serta transaksi wallet publik belum diverifikasi. Target60fps desktop/30fps ponsel masih perlu pengukuran pada perangkat sasaran.

**GitHub Actions belum aktif:** PAT publikasi tidak punya izin `workflow`. File siap pakai ada di [infra/ci/github-actions.yml](infra/ci/github-actions.yml). Untuk mengaktifkan, login GitHub dengan akun yang berwenang, pilih **Add file → Create new file**, beri nama `.github/workflows/ci.yml`, salin isi template, lalu commit. Workflow mencakup lint,95 tes JS, tes PostgreSQL, Docker smoke, uji beban, dan Foundry. Jangan mengirim PAT lewat issue.

Panduan lain: [kontribusi](docs/CONTRIBUTING.md), [protokol](docs/protocol.md), [signing](docs/signing.md), [visual/suara](docs/visual-audio.md). Situs promosi berada di repo terpisah: [ndobol-landing](https://github.com/Ndobol-Sakpole/ndobol-landing).

## Lisensi

Kode dan dokumentasi asli: [MIT](LICENSE). Three.js dan OpenZeppelin mempertahankan lisensinya. Logo/identitas merek tidak otomatis ikut lisensi kode; lihat [ASSETS.md](ASSETS.md) dan [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Membagikan versi modifikasi tidak boleh menyiratkan dukungan resmi tim Ndobol.
