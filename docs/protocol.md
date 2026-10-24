## Tambahan rules v5: kegagalan dan berat
Wire tetap v3 (input sama); state.rulesVersion=5. Snapshot menambah weightGrams/rewardWei/failureReason/flooding/sinkTime/deathAxis/deathDirection; pemain menambah weightGrams/rewardWei/picked/alive. collected event memuat weightGrams. finished.reason dapat finish|timeout|capsized|sunk. Fatal finished bertahan3,2detik dengan animasi otoritatif sebelum results. Klien menghentikan input di finished. Semua string wei integer; reward fatal dan bot nol. Lihat [rewards.md](rewards.md).

# Protokol multiplayer v3

Browser native ESM → same-origin WebSocket `/rooms`. `infra/static-server.js` memproksi ke API. Browser tidak memuat `ws` atau viem. Definisi dan validator runtime: `shared/messages.js`.

Envelope: `{ "v": 3, "type": "input", "payload": { ... } }`. Text JSON maksimum 4096 byte; server menolak field tambahan pada pesan klien, versi lama, input non-finite, binary dan pesan state/result buatan klien. Compression dimatikan. Maksimum 45 pesan/detik/koneksi; pelanggaran berulang menutup koneksi. Batas 400 koneksi/100 room adalah pagar kapasitas, bukan jaminan performa.

| Arah | Tipe | Payload |
|---|---|---|
| C → S | hello | `{protocol:3}` dalam 5 detik sejak connect |
| S → C | welcome | `{protocol:3,serverTime,heartbeatMs}` |
| C → S | create | `{name,animal,trackId,raftId?:string,address?:string|null}` |
| C → S | join | `{code,name,animal,address?:string|null}` |
| C → S | resume | `{code,token}` |
| S → C | joined | `{code,playerId,slot,token,lastSeq}` |
| C → S | ready | `{ready:boolean}` |
| C → S | animal | `{animal: keyof ANIMALS}`; hanya lobi, membatalkan siap |
| C → S | start / again / leave | `{}`; start/again khusus host |
| C → S | input | `{roundId,seq,fart:boolean,moveX?:-1|0|1,moveZ?:-1|0|1,turn?:-1|0|1,reach:-1|0|1}` |
| S → C | snapshot | `{roomCode,hostId,serverTime,state,persistence:{saved,error}}` |
| C → S | ping | `{clientTime}`; sinkronisasi jam, bukan input permainan |
| S → C | pong | `{clientTime,serverTime}` |
| S → C | error | `{code,message}` |
| S → C | left | `{}` |

Nama 1–24 karakter, kode room 6 karakter tanpa I/O/0/1, alamat opsional EVM 20 byte nonzero. `playerId` adalah UUID sesi, **berbeda** dari alamat EVM `player` pada bukti EIP-712. Server mengunci alamat pada create/join. Alamat yang sama tidak boleh mengisi dua slot dalam satu room. Hewan bebas dipilih, bukan item berbayar.

`raftId` dikunci ketika host membuat room, dipertahankan saat main lagi dan reconnect. Nilai default `bambu-polos`; allow-list enam jenis di `shared/game/rafts.js`. Peserta yang bergabung mengikuti getek host. Seluruh getek gratis dicoba, harga USD hanya draft referensi.

Protocol v3 sengaja menolak klien v2. Physics dan UI tidak memakai input `stroke`/`steer` lama. Deploy FE+API bersama dan muat ulang tab lama. EIP-712 tetap skema v2 (versi terpisah dari protokol transport).

## Otoritas dan jam

`shared/game/round.js` adalah satu implementasi untuk server dan demo offline. Server menjalankan 30 fixed steps/detik menggunakan jam monotonic; snapshot 15Hz. Semua jarak, pickup, cooldown, tabrakan, waktu, bot dan skor dihitung server. Input memuat nomor urut naik; replay/out-of-order diabaikan dan `roundId` lama ditolak. Arah kedaluwarsa setelah 350ms tanpa input. WASD berjalan di dek; panah kiri/kanan (atau J/L) memutar arah dorongan. Spasi menghasilkan pulse kentut; menahan Spasi tidak mengulang pulse. Cooldown minimum 450ms. Move/turn yang dihilangkan bernilai nol. Q/E menjangkau sampah.

State mencakup `roundId,raftId,trackId,mode,phase,phaseTime,tick,elapsed,limitSeconds,s,lateral,speed,steer,bump,cohesion,beat,score,collected,completed,reason,players,picked,events,eventId`. Player: `id,name,animal,address,slot,bot,connected,ready,trash,syncBeats,score,lastSeq,fartSeq,lastFart,lastReach,lastBeat,gas,x,z,facing,walk`. State fisika tambahan: `roll,pitch,rollVelocity,pitchVelocity,heading,yawVelocity,lateralVelocity,loadX,loadZ,balance,floats[4],wetness,buoyancy,heave`. Sudut radian, `x/z` kru dalam meter lokal dek, `facing=0` mendorong maju; nilai positif memutar ke kanan. `floats` berurutan kiri-depan, kanan-depan, kiri-belakang, kanan-belakang; integritas 0–1. `damage` event membawa `kind:puncture|bottles|dent` dan `corner`. Semua koordinat getek dalam meter sepanjang spline (`s`) dan offset lateral. `picked` adalah indeks sampah canonical yang sudah diangkat, sehingga reconnect tidak menghidupkan sampah kembali. Event ber-ID monoton adalah efek sementara; hanya 12 terakhir disimpan. Hasil dan pickup tidak bergantung pada pengiriman event efek.

Mode lokal juga menginterpolasi satu tick sehingga jalan kru tetap mulus pada render 60Hz. Klien online membuffer snapshot 120ms, menginterpolasi pose getek/kru, dan mengekstrapolasi maksimum 100ms saat paket terlambat. RTT minimum dari ping menentukan offset jam. Rhythm cue memakai jam simulasi terbaru, bukan pose tertunda. Prediksi hanya animasi/suara kentut sendiri; `lastSeq` merekonsiliasi prediksi. Klien tidak memprediksi skor, pickup, posisi atau tabrakan.

## Lobi dan ketahanan

Satu getek berisi 4 slot. Host boleh mulai setelah semua manusia siap; slot sisa menjadi bot (1 manusia + 3 bot juga sah). 2–4 manusia memakai alur sama. Mulai ulang menghasilkan UUID ronde baru dan mengembalikan manusia yang terhubung ke lobi; ready direset. Keluar di tengah ronde mengubah slot menjadi bot sesuai `disconnectedPolicy`.

Token acak 256-bit diberikan hanya ke pemilik slot, disimpan di sessionStorage tab; snapshot tidak pernah memuat token/hash. Server menyimpan hash token. Ping WebSocket setiap 5s, terminate setelah 15s tanpa trafik/pong. Klien mencoba reconnect setiap 700ms selama 30s, mempertahankan identitas/slot/skor/animal/ack/posisi dek/arah gas/kondisi pelampung. Host berpindah ke manusia terhubung bila host putus. Room kosong dibersihkan setelah 35s; lobi idle 15 menit dan layar hasil 5 menit. Room aktif hanya di memori: restart API mengakhiri sesi, **hasil yang selesai tetap di SQLite**. Tab lain harus join dengan kode, bukan menyalin resume token.

Untuk publikasi nanti, set `ALLOWED_ORIGINS` dan gunakan TLS reverse proxy. Compose saat ini membuka port localhost. Tidak ada layanan cloud/biaya tambahan, wallet auth, multi-process room routing, atau on-chain call.

## HTTP

Browser: `/api/health`, `/api/leaderboard?track=bengawan`, `/api/rounds/sign`, `/api/rounds/result?roundId=...`; proxy menghapus `/api`. API langsung memakai path tanpa `/api`.

`GET /leaderboard?track=` → `{track,entries:[{name,score,roundId}]}` maksimum 10 hasil manusia server, diurutkan skor menurun, tie deterministik. Bot dan demo offline tidak masuk leaderboard. Alamat sama memiliki personal best per track. Guest dikelompokkan per identitas sesi, bukan identitas manusia global.

Signing memakai `Authorization: Bearer <token>` dan hanya pengenal ronde/pemain. Lihat [signing.md](signing.md). Error status umum: 400 bentuk pesan salah, 401 token salah, 403 hasil bukan pemilik/guest, 409 sudah ditandatangani, 422 bukti melampaui batas fisika, 429 rate limit, 503 signer belum dikonfigurasi.

## River revision / rules v4
Wire protocol remains v3 (same input fields). Snapshot adds `rulesVersion:4,current:number,rapid:0..1,verticalVelocity:number`. `heading`/`facing` are circular angles and interpolate across ±π by the shortest arc. Rhythm fields remain zero for compatibility; no beat awards. Calm sections have no automatic drift. `track.rapids` is canonical server/FE data. Display names now Selokan Mataram (`bengawan`) and Kali Progo (`mahakam`); old IDs/hashes remain stable. See river-update.md.

## Protocol v4 — current wallet login and held propulsion

Every current envelope is `{v:4,type,payload}`. The v3 section above is historical. Connect an injected EOA wallet on Monad Testnet, request `POST /auth/challenge {address}`, sign the exact EIP-191 message, and `POST /auth/verify {id,signature}` from the same allowed web origin. Response: `{token,address,expiresAt,chainId:10143}`. Nonce is single-use, challenge expires in 2 minutes, session in 6 hours, requests rate-limited. Token stays in tab sessionStorage, never a URL. API restart requires reauthentication.

`hello {protocol:4,authToken}` authenticates the connection. Without a valid token, create/join/resume return `WALLET_REQUIRED`. Server binds player identity to the verified wallet; a supplied differing address is rejected. Resume requires both original room token and matching wallet. Duplicate wallet slots remain forbidden. In-process tests can inject walletRequired:false; no public/env bypass exists. Public UI has no guest/solo bypass. A lone human can create/ready/start with bots.

`fart:true` remains active between packets; false releases. Maximum impulse rate stays GAME.minFartInterval. Stale input stops after 350ms. Player snapshots add thrustActive:boolean. Blur/hidden/cancel clears browser controls and sound.

Cloud snapshots include persistence.saving/saved/error. saved:true follows successful commit only; failure is SAVE_FAILED. Results wait for saved evidence before signing. No client score/mass accepted. runtime-config.js supplies public HTTPS/WSS endpoints; sockets connect directly to Render with exact-origin checks.

## Sponsored claim extension
GET /rewards/config adds sponsored and relayer. POST /rounds/claim accepts only roundId with the round bearer token; responses include pending/confirmed/failed, hash, recipient, rewardWei, gasPayer, playerGasWei and verified receipt. It is idempotent across restart. Room protocol remains4. See [sponsored-claims.md](sponsored-claims.md).
