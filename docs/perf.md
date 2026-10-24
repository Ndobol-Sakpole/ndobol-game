# Verifikasi Fase 2 — 24 Oktober 2026

## Lingkungan dan reproduksi

Apple M1 / macOS arm64, Node v24.5.0. Browser in-app (WebGL2), Three.js0.170.0 lokal. Game tanpa build step. Semua pengukuran lokal, bukan benchmark server cloud atau ponsel fisik.

```sh
npm ci --ignore-scripts
npm run lint
npm test
npm run dev
# terminal terpisah; port acak localhost untuk beban
PERF_OUTPUT=docs/perf-phase2-load.json npm run test:load
python3 infra/scripts/database.py --database /tmp/ndobol-check.sqlite --seed
docker compose config --quiet
forge test --root contracts
```

## Tes otomatis

**44/44 tes JavaScript lulus**, tanpa skip, sekitar20 detik pada run terakhir. Cakupan:
- Formula skor, bounds fisika, state machine, determinisme, spline parity kedua track, pickup sisi/cooldown/keunikan, collision tanpa game-over, timeout dan perbedaan kayuhan sinkron.
- Enam ronde lengkap melalui socket ws asli: 2/3/4 klien × Bengawan/Mahakam. Aturan dan durasi simulasi normal; hanya clock test di-step cepat dalam proses. Semua mencapai garis akhir, snapshot hasil identik, empat partisipan tersimpan. Tidak ada endpoint timewarp/debug mutation.
- Reconnect memulihkan ID/slot/ack; bot mengambil alih; expiry/cleanup room; host berpindah dan dapat digantikan saat room kosong; ready reset; kapasitas4; pesan v1/forged-state dan heartbeat yang tidak dijawab ditolak.
- Perubahan kualitas tidak mereset sesi (cek browser). Own-paddle prediction dan rekonsiliasi ack diuji; callback socket lama tidak merusak koneksi baru.
- EIP-712 signature recovery; perubahan score/domain gagal verifikasi; guest/tokennya salah/skor mustahil ditolak; hanya satu signature dari dua permintaan bersamaan; duplicate409 dan GET recovery; rate429; nonce dan hasil bertahan setelah DB dibuka ulang; migrasi arsip v1/FK/identitas wallet lama; top10 per track.
- Kontrol sentuh singkat tetap terantre; static server menolak path privat/traversal. Tes regresi Fase1 untuk renderer-adjacent helpers dipertahankan.

**7/7 tes Foundry scaffold lulus**, Foundry1.5.1, compilation cached. Kontrak tetap disabled, tanpa deploy. Peringatan konfigurasi Etherscan dari tool tidak memengaruhi tes. Wrapper npm tidak menyediakan binary pada PATH mesin ini; binary resmi platform dari paket cache dijalankan langsung.

ESLint lulus, migrasi+seed SQLite v2 lulus, `docker compose config --quiet` lulus. Workflow CI menjalankan lint, seluruh suite, load smoke10s, migrasi, Compose health dan Foundry/ABI drift. **Belum ada run GitHub Actions yang diklaim**; validasi lokal memakai perintah yang sama.

## Latensi

1. Interpolator: dua jalur delivery50/75ms (RTT100/150ms), jitter ±15ms, synthetic authoritative poses. Posisi monoton, drift<0,12m, extrapolation dibatasi100ms.
2. WebSocket asli + input dan snapshot masing-masing ditunda50/75ms. Durasi10s, **164 perbandingan render**, selisih posisi getek maksimum **0,067m** pada run final. Socket/engine asli berjalan30Hz; comparison memakai interpolator produksi. Ini bukan simulasi packet loss, koneksi seluler, atau round-trip lintas benua. Snapshot sesudah starvation tetap dibatasi extrapolation; reconnect diuji terpisah.

## Beban 20 room / 80 klien

Hasil final lengkap: [perf-phase2-load.json](perf-phase2-load.json). 20 room, masing-masing4 klien ws, dua track bergantian, input sekitar30Hz, snapshot15Hz, durasi20,001s.

| Metrik | Hasil |
|---|---:|
| Tick simulasi efektif | 30,05 Hz |
| Waktu step terlama (20 room) | 4,85 ms |
| Event-loop delay p99 | 18,30 ms |
| Waktu simulasi dibuang | 0 ms |
| Scheduler overrun | 0 |
| Koneksi bertahan | 80 / 80 |
| Error protokol | 0 |
| CPU terhadap satu core | 18,03% |
| RSS harness keseluruhan | 180,41 MiB |
| Payload diterima semua klien | 66,51 MiB |

API dan80 simulated clients berada dalam **proses Node yang sama**; CPU/RSS mencakup server, client parsing dan history pengujian. Bukan klaim RSS API terisolasi. Snapshot diserialisasi sekali per room; event visual dibatasi12; scheduler mengejar fixed steps maksimal1s dan mengirim pose terbaru, tanpa burst snapshot per langkah catch-up. Waktu di atas1s yang tidak dapat dikejar dilaporkan droppedMs, bukan disembunyikan.

Run awal gagal target:18,48Hz, event-loop p99 930,61ms ([rekaman awal](perf-phase2-load-before.json)); run antara mencapai26,83Hz dengan2044ms dropped time. Saat itu load average host sempat37,57, turun menjadi3,15 sebelum run yang stabil. Karena beban host juga berubah, peningkatan **tidak dapat diatribusikan seluruhnya** pada optimisasi kode. Load test gagal bila klien putus, ada error protokol, atau tickHz<28; ambang tidak diturunkan untuk meluluskan hasil.

## Browser dan rasa permainan

- Bengawan solo +3 bot: garis akhir100s,12 sampah; countdown, HUD dan hasil tampil tanpa console error.
- Mahakam solo +3 bot pada build akhir: garis akhir102s,12 sampah, UI/culture Inggris; console bersih dan hasil offline tidak meminta API.
- Mahakam dengan dua tab manusia +2 bot: garis akhir134s,12 sampah; kedua tab menampilkan hasil identik (Raka548, Sari640, bot1656/556). Reload tab Sari memulihkan identitas/slot dan ronde. Leaderboard menunjukkan skor per track. [Bukti layar](phase2-results.jpg).
- Online Bengawan dengan alamat EVM dummy dan signer acak di memori: hasil tersimpan, proof/domain/nonce/signature tampil, Klaim disabled. Tidak ada secret/key yang disimpan atau ditampilkan. Verifier dummy0x222… adalah lingkungan uji, **bukan alamat deploy**. [Bukti UI](phase2-proof.jpg).
- Kualitas sedang: viewport703×859 pada laptopM1, jendela120 sampel sekitar60s saat ronde Bengawan, **rata-rata59,9fps, minimum56fps**, pembacaan akhir75 draw calls. Sampel lain59,8/min54fps. Ini memenuhi sasaran sekitar60fps pada laptop uji; bukan jaminan universal. Jumlah draw calls berubah dengan frustum/posisi track.
- Efek percik, empat hewan kru, animasi dayung, suara sintetis dan HUD aktif. Pergantian kualitas medium/low/medium tidak merusak hasil. Console kedua tab dan proof run tidak menunjukkan error/warning.

## Batas verifikasi dan pekerjaan lanjutan

- **Ponsel fisik belum tersedia**: target30fps belum disertifikasi. Layout responsif, target sentuh48px, multi-pointer dan reduced-motion diimplementasikan; tetap perlu uji Android/iOS menengah dengan empat klien dan jaringan seluler.
- **Docker daemon tidak aktif** (`~/.colima/default/docker.sock` tidak tersedia), sehingga `compose up` belum dijalankan untuk revisi Fase2 ini. Konfigurasi tervalidasi dan smoke test ada di CI. Tidak membuat/mengubah VM lain atau mengunduh image besar untuk mengatasi batas host.
- Preview review pada4174 menggunakan DB `/tmp/ndobol-phase2-review.sqlite`, key uji acak di memori dan verifier dummy. Jalankan `npm run dev` dengan `.env` milik Anda untuk lingkungan biasa; tanpa key/verifier, signing fail-closed503 sementara gameplay/DB tetap berjalan. Hentikan preview yang memakai port tersebut sebelum menjalankan dev baru, atau pilih WEB_PORT/API_PORT berbeda.
- Room live belum dipersistkan; API restart mengakhiri sesi. DB hasil/proof/nonce durable. Wallet ownership, kontrak verifier v2, replay prevention on-chain, minting dan klaim adalah Fase3.
- Tidak ada bug fungsional yang diketahui tersisa dari skenario teruji. Stall host panjang, mobile thermals, packet loss berat dan deployment container masih memerlukan validasi di lingkungan sasaran.

Perapian akhir: expiry room mengembalikan UI ke lobi; mode solo tidak meminta leaderboard/signing ke API saat hasil, sehingga tetap dapat berjalan dari server statis generik. Bahasa Inggris diverifikasi pada lobi, pilihan pendamping, HUD dan pengantar Mahakam.

## Revisi visual/fisika kentut — 24 Oktober 2026

Pengukuran baru, terpisah dari baseline Fase 2 di atas. Mesin Apple M1, Node24.5.0. Semua hull/karakter adalah prosedural; detail dan aturan di physics-playtest.md.

- Ronde ban bekas di browser1280×720, kualitas sedang dengan soft shadows: avg59.6fps/min54 pada120 sampel×0.5s (~60s), sampel akhir94 draw calls. Ini satu mesin; bukan bukti target ponsel fisik.
- Uji transport nyata dengan RTT100/150ms pada pemeriksaan akhir:165 perbandingan, selisih posisi getek maksimum0.028m. Uji reconnect tambahan mempertahankan posisi kru, facing, hull ban dan ban pecah; satu-satunya hook posisi fixture berada dalam test process, tidak diekspos lewat protokol.
- Lint dan63 tes JavaScript lulus (13.18s untuk suite akhir).
- 12 kombinasi getek×track dengan4 bot mencapai finis sebelum batas waktu, skor valid. Tes khusus menguji distribusi berat, perbedaan pegas, arah gas/torsi, normalisasi gerak diagonal, cap kecepatan/cooldown, puncture hanya tajam, botol lepas, drum penyok dan kasur basah.
- Uji beban20 room/80 klien selama20.005s pada06:27:13Z:29.992Hz;80 tetap tersambung;0 error,0 overrun,0 dropped ms. CPU24.93% satu core; RSS141.47MiB (termasuk klien generator). Max step159.31ms dan event-loop p9958.62ms menunjukkan spike pada mesin pengembangan yang juga menjalankan pekerjaan/browser; rata-rata tick terjaga, tetapi bukan bukti bebas hitch pada server produksi. Trafik diterima73.52MiB termasuk fixture/snapshot.
- Ronde online UI Mahakam dengan getek ban selesai116s/12 sampah. Dua sektor ban rusak tetap2/4 setelah reload/reconnect; arah kru kembali dari takeover bot, hasil rules_version3 tersimpan dengan hull_json. Guest tetap tanpa klaim.
- Pemeriksaan UI1280×720 dan390×844: enam pilihan getek merender, harga/teks mengikuti pilihan, kontrol keyboard/sentuh aktif, arah gas57° dan perubahan keseimbangan terlihat, tanpa error console pada jalur yang diuji. Ponsel adalah emulasi ukuran viewport pada desktop, bukan pengukuran GPU ponsel.

Perubahan ini tidak menambah library. Pengukuran awal dibantu panel debug DOM; screenshot QA disimpan di /tmp, bukan aset produksi. Docker/CI remote/ponsel fisik tetap memiliki batas verifikasi yang dijelaskan sebelumnya.

## River rules v4 · 2026-10-24

`npm run lint` + `npm test`: **74/74 pass**. New coverage includes one-player idle with no drift, four thrust directions, 360° local recoil invariance, rotated hand-side pickup, three smooth rapid envelopes, collision separation during event cooldown, all six hulls with arbitrary input, waveform bounds and wallet adapter rejection/disconnect. All 2/3/4-client rounds, reconnect, persistence, valid EIP-712 and archived v3 score validation pass. Injected 100/150ms RTT:162 comparisons, max interpolated raft divergence0.064m.

Native in-app browser QA at1280×800 and390×844 on Apple M1: Start→lobby→solo (one character), 91° right-facing fart and a full turn, touch fart from0 to3km/h, optional bot selection, online create/ready/start, Kali Progo rapids, results and rematch. No app console warnings/errors. Actual online Progo round:97s,12trash,one punctured tyre, completed result saved with rules_version4. Wallet dialog handles missing provider and retains guest access; real wallet extension authorization was not exercised (adapter tested with simulated EIP-1193 provider).

Render, medium: end-of-round rolling120×0.5s samples **avg60.0/min60fps**, latest100draw calls; earlier track/world construction was visible as a transient13fps minimum. These are app-reported frame samples, not an external GPU profiler. Both dimensions passed responsive checks;390×844 is viewport emulation, not a physical-phone benchmark. Audio signal generation and browser gestures were checked; listening on multiple devices remains a playtest item.

Load command: `PERF_OUTPUT=/tmp/ndobol-river-v4-load.json npm run test:load`. Apple M1,darwin arm64,Node24.5.0;20rooms/80clients,20.001s,30.049Hz,max simulation step3.884ms,event-loopP9915.852ms,CPU17.71% of one core,RSS163.94MiB (load generator and server in same process),80.17MiB received.80/80 remain connected,zero errors,zero overruns/dropped milliseconds. Local game/browser also active; this is a local engineering sample, not internet-scale production capacity.

## 2026-10-24 — rules v5, fatal physics and weight-based MON

Mac Apple M1, darwin arm64, Node24.5.0. `npm run lint` passed; `npm test` **88/88** (~23.1s). Includes capsize/recovery/sinking, forfeiture, per-item mass/ownership validation, EIP-712 weighted proofs, calldata ABI differential checks, pending/failed/confirmed wallet handling, 2–4 clients on both tracks and fatal snapshot/replay persistence. The latest injected100/150ms RTT run completed without state divergence failures (exact diagnostic in test stdout; timing varies by host load).

`forge test --root contracts --offline -v` **18/18** passed (7 existing +11 reward tests); one property test ran256 masses. viem typed-data fixture agrees with Solidity digest; forged amount/domain, replay, wrong player, empty pool, rejecting receiver and reentrancy rejected. Local Forge1.5.1 needs --offline to avoid its macOS system-proxy discovery crash; compilation succeeds and EVM tests run locally without RPC.

20-room/80-client load,20s: **29.9996Hz**, max step20.656ms, overruns0, dropped0ms, event-loop p9945.679ms, CPU24.39% of one core, RSS182.81MiB (server+generator), received86.95MiB, connected80, errors[]. Native browser UI also running on the same machine. Command `PERF_OUTPUT=/tmp/ndobol-reward-load.json npm run test:load`.

Native in-app browser at1280×800 and390×844: Start→garage prices (ban0.00015MON/15kg)→solo→walk to edge→capsize→dead crew→zero reward→replay reset. Touch pickup at start produced35g/35points/0.00000035MON; subsequent capsize retained35g statistics and forfeited payout. No app console warnings/errors in observed flows. Claim activation/dead/empty disabled states are truthful. Screenshots saved outside repo in/tmp. Sinking and funded-pool payout were verified in deterministic JS/EVM tests; no wallet extension, public-chain deployment, real MON transfer or physical-phone FPS measurement in this run.

## 2026-10-24 — protocol4, held gas, wallet and cloud preparation

- `npm run lint`: pass. Final JavaScript suite **95/95** passed (~25.1s), including async persistence commit timing, held keyboard/touch input, wallet challenge/replay, wrong-wallet reconnect rejection and reward proof validation. Injected100/150ms RTT:115 comparisons, maximum interpolated raft divergence0.036m. CI is configured; this is a local run, not a claimed remote CI result.
- `forge test --root contracts --offline -v`: 18/18 including 256 fuzz cases for exact native payout, replay, reentrancy and empty/funded pool. No public-chain transaction.
- Load: Apple M1/macOS arm64, Node24.5, 20 rooms/80 clients, 10.217s, 29.949Hz, RSS76.64MiB, CPU26.27% of one core, no overruns/droppedMs/errors. Worst step97.75ms; event-loop p99 187.96ms during other desktop activity. This is a short smoke load, not a production-latency guarantee. Simulator load fixtures bypass login only in process; signed-wallet entry has separate integration tests.
- Browser: native IAB, 1280×720 and390×844. EIP-1193 disposable-wallet fixture on port4175 tested actual challenge/verification, create/ready/start, Mataram finish at87s, Progo finish at97s with12 collected items and tyre puncture/rapids, Space held4.5s and touch held4s. Telemetry showed successive lastFart timestamps and held:false after release. No console errors at inspection. No real wallet keys/funds used. Port4174 without injected wallet correctly stops at connect dialog.
- Mobile document clientWidth/scrollWidth both390 (no horizontal overflow); touch controls and create/join usable. This is desktop viewport emulation, **not a physical-phone performance test**.
- Medium DPR reduced1.5→1.25; directional shadows refresh20Hz (high30Hz). Preliminary single-tab average~50fps with intermittent desktop stalls; 99–113 draw calls. Before adjustment/two scenes, average~27fps. These are different workloads, not a controlled A/B benchmark; stable60fps desktop/30fps physical mobile remain unverified.
- `docker compose config --quiet`: passed. Docker execution/PostgreSQL SQL test could not run locally: Colima image extraction failed when disk space exhausted. Only the new partial VM image/cache were removed, restoring space; no project assets or other VM data removed. CI now includes PostgreSQL17 migration/permission/nonce/rate tests. A configured Supabase project and cloud deployment are still untested.
- Vercel static packaging succeeded (85 files); output scan found no server/deployer/Supabase secret variable names. No bundler added.

## Public repository packaging
The95-test suite and18 Solidity tests above were run locally. GitHub Actions is supplied as `infra/ci/github-actions.yml` because the publishing PAT lacks workflow scope. Copy it to `.github/workflows/ci.yml` using an authorized account to activate CI; no remote CI success is claimed.

Release-check note: a fresh-install parallel suite passed94/95 with a0.749m latency-test outlier while other work ran on the host. The unchanged real-WebSocket test passed in isolation (160 comparisons, max0.038m). Test files now run serially to keep CPU-heavy fixtures from competing with the wall-clock latency measurement; thresholds are unchanged. Long host stalls remain a documented performance limitation.

The repeated serial suite still observed one latency outlier0.582m (94/95 passed). The RTT harness now samples both clients at exactly the same timestamp and reports timer lateness. Deliveries delayed more than20ms beyond the injected RTT invalidate measurements until the buffers refill; at least21 valid comparisons are required, with the existing0.55m threshold unchanged. This separates the100/150ms network test from unbounded host scheduling delays. The packet-starvation deterministic test still verifies bounded extrapolation; severe host-stall smoothness is not certified.

Final rerun after harness correction: **95/95 passed** in21.5s; latency test164 valid comparisons, maximum drift0.029m, **zero excluded/delayed deliveries**, maximum timer lateness5ms. Exported repository lint also passed. The earlier outliers remain above for transparency.


### Deployment regression verification — 24 October 2026

Node 24.5.0 on the local development machine: `npm test` **100/100 passed**, total 29.0s; `npm run lint` and `npm run build:vercel` passed. Five added deployment checks cover Render API import validation without PUBLIC_API_ORIGIN, Vercel default endpoint and independent override, HTTPS-origin rejection, and Render startup on the assigned port with no web child. Startup smoke received /health=200 and rejected an unknown origin with 403. No real Supabase or blockchain write was made.

The existing 100/150ms injected-RTT WebSocket test recorded 156 valid pose comparisons, maximum divergence 0.019m; two host-delayed deliveries (maximum timer lateness38ms) were excluded under the previously documented harness rule. This is not a new device FPS measurement. A read-only request to the supplied public Render /health timed out after20s before redeployment; cloud readiness remains unverified.


### Supabase setup verification — 24 October 2026

The production Supabase project migration was applied successfully in its SQL Editor. The local native-fetch adapter then read both track leaderboards through the deployed private RPC using a modern server secret key; both returned valid empty arrays. This confirms migration and read connectivity, not a completed on-chain claim.

After adding secret-key header compatibility, a non-rotating testnet key preparation command, and disabled-signing startup support: **104/104 JavaScript tests passed**, total20.8s. Lint and Vercel packaging passed. No private key or database credential is included in this record. Testnet deployment/funding/claim receipts remain pending until the deployer receives gas funds.

### Live cloud verification — 24 October 2026, 17:33 WIB

Render deployed source `ba8cbc1` successfully using Node 24.22.1 and `npm run build:api`. The Vercel game rendered its 3D start screen; runtime config points to the Render HTTPS/WSS endpoints, and the Three.js and shared protocol modules returned HTTP 200. Render health reported protocol 4 / 30 Hz; this configured tick rate is not a measured load-test result. The Supabase secret and server signer were configured only on the API; the deployer key stayed local.

Live API testing verified EIP-191 logins for two test wallets, the allowed Vercel CORS origin, and HTTP 403 for an unknown origin. An automated client sent gameplay inputs to real server rooms: Mataram solo with bots reached the finish in 84.8 simulation seconds; Progo with two client slots and bots reached it in 96.8 seconds. Both persisted records were independently read through the private Supabase adapter and appeared in the public per-track leaderboard. These are test rounds named `Uji deployment`, not evidence of physical litter collection or MON payment.

The first CLI observer timed out before observing the final snapshots; the database records nevertheless confirmed both finishes. A repeat Mataram run using the same application ping heartbeat as the browser received `finished` → `saved:true` → `results`, finishing in 82.03 simulation seconds with 59 g collected by the client. Snapshot delivery timestamps at those transitions differed from the local clock by 60–64 ms; clocks were not synchronized, so this is not a certified network-latency measurement. The repeat exited successfully. No root cause is assigned to the first observer timeout without further evidence.

[Public verification record](cloud-verification-2026-10-24.json) contains round IDs and sanitized result fields. Initial leaderboard counts may grow as people play. The sign-disabled UI copy now covers both contract and signer setup; lint and Vercel packaging passed after this text change. No new performance/FPS claim or remote CI result is implied.

Monad Testnet deployer balance remained zero at the check. `/rewards/config` returned `contract:null, enabled:false`; no deployment, funding, or claim transaction was broadcast. On-chain receipt evidence remains pending.

### Confirmed Monad Testnet deployment and claim — 24 October 2026, 17:42 WIB

After the operator funded the dedicated deployer with 1.5 test MON, RiverRewards deployed successfully at `0x94cb1588221e14f34563eede5401646df3730d4a`. Runtime bytecode, owner, signer, rate, chain 10143, and unpaused state were checked. A separate funding transaction deposited 0.01 test MON. Render was redeployed with the verified pool address and claims enabled; `/health` now reports signing:true and `/rewards/config` reports enabled:true.

The repeat live Mataram round above was signed through the deployed `/rounds/sign` endpoint, with no supplied client score/weight. The EIP-712 signature matched the on-chain signer and domain. A CLI-controlled test player then sent the claim transaction: success at block 73792849, event RewardClaimed for exactly 59 g / 590000000000 wei (0.00000059 test MON). The pool balance became 0.00999941 test MON. A duplicate signing request returned 409 ALREADY_SIGNED; a replay eth_call reverted AlreadyClaimed without sending another transaction.

All three hashes, blocks, public identities, and balance observations are in [the transaction record](monad-testnet-deployment.json). The explorer also displayed Success and the internal MON transfer. The claim consumed 131070 gas at 102 gwei, costing 0.01336914 test MON; the wallet's net balance declined because gas exceeded the small reward. This is a testnet execution proof, not an assertion of profitable economics, a real MetaMask UI test, source verification on an explorer, or a security audit. Earlier pending notes above describe checks before operator funding.
