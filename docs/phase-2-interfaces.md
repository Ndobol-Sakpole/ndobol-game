> Perubahan v5 (weightGrams/rewardWei/failureReason/alive/priceWei dan kontrak RiverRewards) terdokumentasi di [rewards.md](rewards.md).

# Fase 2 — perubahan antarmuka

Baseline Fase 1 disimpan pada commit `75078dd`. Website promosi tidak termasuk perubahan gameplay.

1. `shared/game/`: satu implementasi pure-JS untuk konfigurasi, state machine, skor dan simulasi. Server dan demo lokal mengimpor implementasi yang sama, bukan dua salinan yang dapat menyimpang. Fixed step 30Hz; render tetap rAF.
2. Track JSON mempertahankan lokasi dan semua field Fase 1. Field `length` ditambahkan, dihitung dari spline Catmull-Rom 600 sampel yang sama dengan renderer. Server tidak memerlukan Three.js. Ubah path → hitung ulang length dan jalankan parity test.
3. Input Fase 2: `stroke:boolean`, `steer:-1|0|1`, `reach:-1|0|1`, `seq`, `roundId`. W/Spasi/↑ menjadi pulse dayung; Q/E menjangkau kiri/kanan; A/D/←/→ mengarahkan. Tahan tombol tidak menghasilkan stroke berulang.
4. `createLocalRound` menjalankan aturan bersama dengan tiga bot; hasil lokal selalu demo dan tidak dikirim untuk signing.
5. Protokol v1 stub diganti v2. `/rounds/sign` hanya menerima pengenal ronde dari sesi terautentikasi, tidak menerima skor buatan klien. Definisi lengkap pada `protocol.md` dan `signing.md`.
6. Identitas tujuan: alamat EVM manual opsional, dikunci selama ronde, sesuai persetujuan pengguna. Tanpa alamat = guest tanpa klaim. Kepemilikan alamat belum dibuktikan; Fase 3 wajib menambahkan autentikasi wallet sebelum memberi nilai ekonomi.

Simulasi Fase 1 `game/simulation.js` dipertahankan sementara untuk kompatibilitas baseline; composition root Fase 2 memakai `shared/game/round.js`. Renderer/environment tetap tidak memiliki aturan bisnis.

7. `createClient({onMessage,onStatus})` sekarang transport native WebSocket; `send(type,payload)` menggantikan stub `send(envelope)` dan listener `onMessage`. Semua pemakai di main/session diperbarui. `createUI` sekarang memakai `update(state,metadata)` serta state room/results.
8. `createGetek.update` menerima `motion.players[{slot,paddle}]`; `createAnimal` menambah `react(time,strength)`; kamera menambah `impact(strength)`. Input/camera/entities tetap presentasi, tidak memiliki skor/fisika otoritatif.
9. API `createApiServer(options)` menambah store/signer/async dispose; room parser lama menjadi re-export ws adapter. `/rounds/sign` beralih dari 501 stub menjadi API authenticated seperti signing.md. DB migrasi v2 mengarsipkan tabel ronde/leaderboard lama tanpa menghapusnya.
10. `npm run dev` kini game web+api; command promosi lama menjadi `dev:website`. Game `npm test` eksplisit pada suite game; suite promosi tetap `test:website`. Static server menambah proxy same-origin; generic server tetap mendukung demo offline.
11. Skeleton Solidity/ABI Fase 1 sengaja belum diaktifkan/diubah. Skema signature v2 menjadi kontrak antarmuka Fase 3 dan berbeda dari struct lama; rincian migrasi ada di signing.md.
12. `getek.deck` adalah grup visual apung tambahan untuk menempelkan hewan kru. Disposal kru dilakukan sebelum getek. Debug menambah ringkasan FPS pada jendela sampel; snapshot QA tetap read-only.


## Revisi visual dan fisika kentut (24 Oktober 2026)

Dokumen di atas mencatat baseline Fase 2. Antarmuka aktif sekarang protokol **v3**; detail aturan dan referensi di [physics-playtest.md](physics-playtest.md).

- `createRound(track,{raftId,...})` / `createLocalRound(track,{raftId,...})`; default bambu-polos. Server room mengunci raftId host. `shared/game/physics.js` mengintegrasikan gaya, torsi, berat kru, redaman, kontak kru dan kerusakan, tanpa ketergantungan Three.js.
- Input v3 `{fart,moveX,moveZ,turn,reach}` menggantikan `{stroke,steer,reach}`. Keyboard WASD jalan, ←/→ atau J/L arah, Spasi kentut. Semua pemakai aktif dan integration fixtures diperbarui; fixture simulasi Fase 1 tetap historis.
- Player `gas,fartSeq,lastFart,x,z,facing,walk` menggantikan animasi paddle/lastStroke. Pose/interpolator mencakup roll/pitch/heave/heading dan posisi kru; `facing` diinterpolasi melewati batas ±π dengan lintasan terpendek.
- `createGetek(type='bambu-polos')` menambah `type,deckHeight`; mempertahankan `root,deck,slots,update,dispose`. Tidak ada mesh dayung. Getek hanya menampilkan state fisika yang diberikan.
- `createAnimal(type)` menerima delapan karakter referensi (`dog,cat,duck,monkey,pig,squirrel,crocodile,snake`) serta buffalo/proboscis lama. `update(time,pose?)` menerima gas/walk; `react` tetap ada. Karakter baru berasal dari primitif prosedural, bukan PNG sebagai model.
- `createFeedback` menambah `gas(position,direction,slot)` dan `sound('fart'|'puncture',slot)` dengan pool terbatas. WebAudio dibuat setelah interaksi pengguna, bisa dimatikan dari lobi/pengaturan.
- UI `profile()` menambah raftId, create/solo memakai nilai itu; join sengaja menghilangkannya. Event `raft` mengubah preview di luar room saja. Kamera, kualitas dan perubahan track tidak mengubah aturan simulasi.
- Obstacle log bertanda `sharp:true` pada data track, ujung runcing terlihat; batu/eceng bukan pemicu ban pecah. Collider tetap proxy radius (bukan mesh collision).
- Migrasi 003 additive menyimpan `rounds.raft_id,rules_version,hull_json`. Hasil lama ditandai rules_version=2; hasil baru 3. Field/signature EIP-712 v2 tidak berubah; tidak ada klaim atau transaksi baru.

## Superseding river/physics revision (rules v4)
See [river-update.md](river-update.md) for all new interfaces and compatibility. Solo has one character by default with optional bots, rhythm scoring is removed for new rounds, heading is free 360°, rapids supply explicit shared water forces. Wire v3 and EIP-712 types are unchanged. Logo and Start screen precede the lobby. Wallet UI and native EIP-1193 adapter are optional; no browser signature/transaction or on-chain claim.
