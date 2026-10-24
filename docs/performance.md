# Fase 1 — Verifikasi dan hasil ukur

Tanggal: **24 Oktober 2026 (Asia/Jakarta)**. Host **Apple M1, RAM 8 GiB**, Chrome headless (Playwright 1.56.1) dan browser dalam Codex. Angka ini merupakan pengukuran pada host tersebut; bukan jaminan seluruh laptop/ponsel kelas menengah.

## Browser dan performa

URL: `http://127.0.0.1:4174/apps/web/index.html`. Kualitas **sedang**, desktop 1440×900 DPR1. Pemanasan 1,2 detik; sampel requestAnimationFrame mentah 10 detik per track. Tidak ada CPU/GPU throttling. Draw calls/triangles adalah snapshot renderer pada sudut kamera saat pengukuran, bukan puncak sepanjang track.

| Track | Rata-rata FPS | p95 frame | Draw calls | Triangles |
|---|---:|---:|---:|---:|
| Bengawan | 59,7 | 16,8 ms | 88 | 67.796 |
| Mahakam | 60,0 | 16,7 ms | 95 | 76.324 |

Viewport ponsel **390×844**, DPR2 (render capped1,5), touch emulation: setelah inisialisasi 58–60 FPS pada sampel panel, satu sampel awal 21 FPS saat pemuatan/kompilasi shader. Tap Angkat menghasilkan +100 dan 1 sampah; touch hold maju mengubah posisi s=15 → 21,64 m. Tidak ada horizontal overflow. **Ini emulasi viewport pada M1, bukan benchmark GPU ponsel**. Target 30 FPS pada ponsel menengah masih perlu pengukuran perangkat fisik. Landscape sempit dan Safari/Android fisik belum diuji.

Enam kali pergantian track mengembalikan geometry GPU ke **49 (Bengawan) / 51 (Mahakam)** dan textures0. Tidak terlihat pertumbuhan monoton pada siklus itu; ini pemeriksaan disposal terbatas, bukan bukti soak test bebas leak.

## Alur yang diverifikasi

Lobi → pilih sungai → Mulai mengalir → keyboard maju → E angkat → HUD +100/1 → debug pilih Mahakam → low/high/medium → orbit drag → follow → ganti track berulang. Pada touch: lobi → Mulai → tap Angkat → tahan tombol maju. Pemeriksaan ulang setelah perbaikan antrean tap singkat lulus.

| Pemeriksaan | Hasil |
|---|---|
| Identitas halaman/judul, konten tidak blank | Lulus |
| Scene, getek, hewan, sampah, rintangan | Terlihat, animasi berjalan |
| Error console/pageerror | 0 pada alur yang diuji |
| Overlay error | Tidak ada |
| Kedua track + ketiga kualitas | Lulus |
| Keyboard / touch pickup dan gerak | Lulus |
| Mobile overflow / layout | Tidak ada overflow pada 390×844 |
| Kamera orbit/follow | Lulus |
| Pergantian track/disposal | Stabil pada enam pergantian |

Verifikasi visual: screenshot desktop lobi, gameplay, Mahakam, mobile lobi dan gameplay diperiksa langsung. Lima aspek diperiksa: hierarchy teks, kontras HUD, posisi getek/objek, kontrol touch, dan clipping/overflow. Kontras brand saat bermain, whitespace judul mobile, dan event tap singkat diperbaiki. Tidak ada referensi raster/Image Gen: semua aset mengikuti instruksi prosedural pengguna. Browser Codex dipakai untuk smoke/interaksi; Playwright Chrome terisolasi dipakai untuk viewport dan telemetry karena Browser skill/plugin khusus tidak tersedia.

## Pengujian kode dan kerangka

- ESLint: lulus.
- Node tests: **19 lulus** (termasuk website lama), mencakup fixed simulation, pickup idempotent, collision, completion, short touch queue, pesan, API, WebSocket cleanup, dan static-server traversal boundary.
- Foundry: **7 lulus**, Solidity0.8.28, Foundry1.5.1. Peringatan mutability pada fungsi stub disengaja: signature tetap nonpayable untuk implementasi masa depan.
- SQLite: migration + seed lulus; empat tabel dan foreign-key rejection diperiksa.
- ABI: diekspor dari compiler, tiga JSON tersedia.
- Compose: `docker compose config --quiet` lulus. Smoke test container **belum terverifikasi**: Docker daemon default tidak aktif; upaya membuat VM Colima QA terisolasi gagal saat ekstraksi image karena ruang disk tinggal 36 MiB. Profil/image QA sudah dihapus; ruang tersedia pulih menjadi sekitar 2,7 GiB dan Docker context tetap `colima`. Layanan web dan API telah dijalankan langsung dan health/API tests lulus; jalankan `docker compose up --build --wait` setelah menyediakan disk/daemon yang memadai.

## Ulangi pengukuran

Jalankan `npm run game`, buka debug, pilih sedang, panaskan 5 detik. Rekam raw rAF frame intervals minimal 30 detik pada perangkat target, termasuk saat bergerak dan bertabrakan; laporkan median/p95 dan draw calls, resolusi CSS, DPR, browser, CPU/GPU, thermal state. Bandingkan kedua track. Gunakan `window.ndobolDebug.snapshot()` untuk state/renderer/memory. Jangan menganggap emulasi viewport sebagai emulasi kemampuan GPU ponsel.

Fase 2: profil ulang setelah authoritative tick/snapshot multiplayer; uji packet loss/latency dan reconnect sebelum mengaktifkan signing hasil.
