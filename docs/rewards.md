# Berat sampah, kegagalan getek, dan klaim MON

Keputusan 24 Oktober 2026: 1 kg = 0,00001 MON; ban bekas = 0,00015 MON. Reward dibayar kontrak dari dana pengelola. Terbalik atau tenggelam menggugurkan **seluruh reward ronde**, termasuk sampah yang sudah diambil.

## Ekonomi v1 / aturan simulasi v5

- Setiap sampah memiliki massa integer gram. Default botol PET kosong 35 g, kantong 12 g, kaleng 18 g; `weightGrams` pada definisi track dapat mengganti nilainya. Ini massa simulasi game, bukan pengukuran atau bukti pembersihan sungai dunia nyata.
- `shared/game/rewards.js` menjadi sumber tarif: 10.000.000.000 wei/gram, tepat 0,00001 MON/kg. Tidak memakai floating point untuk nominal. Payload JSON menyimpan wei sebagai string.
- Poin = gram terkumpul (1.000 poin/kg), tanpa bonus finish/irama yang menambah hadiah. Berat dan hitungan benda tetap ditampilkan terpisah. Contoh botol 35 g = 35 poin = 0,00000035 MON.
- Reward pribadi berasal dari sampah yang diambil pemain tersebut; tidak digandakan ke seluruh kru. Sampah bot tetap membantu poin tim tetapi reward bot nol. Autopilot pemain terputus tidak mengambil sampah untuk wallet manusia.
- Finish atau timeout tanpa kematian mempertahankan reward. Kematian menyimpan statistik berat/poin untuk laporan tetapi membuat `rewardWei=0`; endpoint signing menolak `REWARD_FORFEITED`.
- Solo offline/guest menampilkan **estimasi/demo**, tidak menerima bukti yang dapat dicairkan. Ronde online otoritatif (termasuk seorang manusia bersama bot) dengan alamat tujuan diperlukan untuk klaim. Alamat dikunci sepanjang ronde; kontrak mensyaratkan pengirim transaksi adalah alamat penerima.

| Getek | Harga MON | Berat ekuivalen |
|---|---:|---:|
| Bambu polos | Gratis | 0 kg |
| Botol | 0,00005 | 5 kg |
| Ban bekas | 0,00015 | 15 kg |
| Drum biru | 0,00025 | 25 kg |
| Ranjang hanyut | 0,00030 | 30 kg |
| Sultan | 0,00050 | 50 kg |

Harga disimpan dalam `shared/game/rafts.js:priceWei`. Katalog game sudah memakai tarif tersebut. Semua hull masih dapat diuji bebas; pembelian, mint ERC-1155, dan pemeriksaan kepemilikan belum diaktifkan. Katalog promosi `data/economy.js` milik modul situs terpisah belum diselaraskan. Harga tidak mengubah tarif reward.

## Terbalik / tenggelam

`shared/game/physics.js` adalah simulasi 30 Hz bersama. Melewati `unstableAngle` mengurangi kemampuan kembali tegak; berat kru, recoil, benturan, dan jeram dapat membawa roll/pitch ke `capsizeAngle=1.15 rad` (~66°). Saat ambang dilintasi, akhir kalah dikunci, karakter mati, input berhenti, dan animasi otoritatif meneruskan rotasi sampai 180°. Bagian bawah getek tetap mengapung terlihat.

Pelampung rusak, air masuk, dan kasur basah menurunkan daya apung. `buoyancy<0.36` selama 2,5 detik atau kondisi penuh air memicu tenggelam. Satu ban pecah masih dapat diselamatkan; semua ban pecah akan tenggelam. Peringatan teks tampil sebelum ambang; perpindahan berat dini dapat memulihkan keadaan. Setelah kalah tidak ada pemulihan dalam ronde yang sama. Main lagi membuat hull/kru/berat/reward baru. Konfigurasi di `shared/game/config.js`, bukan render.

State machine tetap lobby→countdown→running→finished→results. `reason` bertambah `capsized|sunk`. Fatal hold 3,2 detik memberi waktu menampilkan animasi sebelum hasil. Snapshot menambah `failureReason,flooding,sinkTime,deathAxis,deathDirection,weightGrams,rewardWei`; pemain menambah `alive,weightGrams,rewardWei,picked`. Kontrak input WebSocket v3 tetap; aturan hasil naik v5. Seluruh pemakai state/UI/persistence sudah diperbarui.

## Klaim

`RiverRewards` merupakan kontrak terpisah dari stub `RiverRegistry`, sehingga bukti skor lama tidak bisa menjadi klaim uang. EIP-712 `NdobolRiverRewards`, versi `1`, domain chainId+verifyingContract. Tipe exact ada di `shared/reward-signing.js` dan [signing.md](signing.md).

1. Server menyimpan hasil otoritatif, ID sampah milik tiap pemain, gram, reward wei, dan kondisi akhir secara atomik.
2. `/rounds/sign` hanya menerima roundId/playerId dengan bearer sesi. Server menghitung ulang gram dari ID sampah/track, cooldown/batas fisik, rumus skor dan nominal; input nominal dari klien ditolak. Nonce per alamat, pembatasan frekuensi, satu bukti per ronde+pemain.
3. Kontrak memeriksa signature signer, domain, deadline, pemilik wallet, tarif persis, roundId+pemain dan nonce yang belum digunakan. Nonce dapat diklaim tidak berurutan.
4. Klik Klaim memeriksa akun/jaringan, keberadaan bytecode, dan `eth_call`, lalu meminta wallet menyetujui `eth_sendTransaction` dengan value nol. Wallet pemain membayar gas. UI tidak pernah mengirim otomatis.
5. Hash transaksi disimpan lokal. Tombol Periksa transaksi membaca receipt; UI baru mengatakan dibayar jika receipt sukses **dan** event RewardClaimed dari pool cocok dengan ronde, penerima, gram, nominal, dan nonce. RPC timeout tidak mengirim ulang transaksi. Transaksi yang sudah mined gagal boleh dicoba lagi.

Pool menerima native MON lewat `receive()`. Dana kurang: revert tanpa memakai nonce/claim. Owner dapat pause dan rotasi signer; tidak ada fungsi mint uang atau penarikan dana pool. Reentrancy dijaga. ECDSA memakai OpenZeppelin 5.1.0 yang sudah menjadi dependency kontrak; source diverifikasi dari tag resmi. Ini implementasi dengan tes, belum audit eksternal.

## Aktivasi untuk salinan proyek sendiri

- Jalankan `forge test --root contracts`.
- Siapkan environment lokal: CONTRACT_OWNER, DEPLOYER_PRIVATE_KEY, REWARD_SIGNER_ADDRESS (alamat publik dari SIGNER_PRIVATE_KEY).
- `bash contracts/script/deploy-rewards.sh testnet`; mainnet membutuhkan CONFIRM_MAINNET=1. Deployment tidak mendanai kontrak otomatis.
- Isi pool secara eksplisit melalui wallet pengelola. Pastikan signer, chain, dan alamat deployment benar. Verifikasi dengan `verify-rewards.sh 10143` beserta env explorer.
- Set REWARD_POOL_ADDRESS, SIGNING_CHAIN_ID, SIGNER_PRIVATE_KEY; setelah siap set REWARD_CLAIMS_ENABLED=true dan restart API. `/rewards/config` hanya mengeluarkan konfigurasi publik. `.env.example` tidak berisi secret.
- Instalasi baru tetap nonaktif tanpa konfigurasi. Deployment publik proyek ini sudah aktif; jangan menyalin key operator atau menganggap instalasi baru dapat memakai signer pool proyek asli.

## Bukti Monad Testnet — 24 Oktober 2026

RiverRewards aktif di `0x94cb1588221e14f34563eede5401646df3730d4a` pada chain 10143. Pool menerima 0,01 test MON. Ronde server `2d0fb2ab-e144-433c-8209-784a0209312c` (Mataram, input otomatis, hasil tersimpan di Supabase) menghasilkan 59 g dan membayar 0,00000059 test MON ke wallet pemain uji. Receipt sukses dan event cocok. API menolak signature ganda dan simulasi replay kontrak mengembalikan `AlreadyClaimed`.

Hash lengkap dan metadata: [monad-testnet-deployment.json](monad-testnet-deployment.json); tautan explorer dan cara top-up: [README](../README.md#bukti-kesiapan-dan-transaksi-monad-testnet). Gas klaim uji adalah 0,01336914 test MON, lebih besar daripada reward; reward yang diterima tidak sama dengan perubahan bersih saldo wallet. Tidak ada subsidi gas atau mainnet deployment dalam tahap ini.

## Data dan kompatibilitas

Migrasi004 memperluas alasan akhir dan menyimpan weight_grams/reward_wei/pickup_json. Migrasi005 mengarsipkan leaderboard aturan lama ke leaderboard_pre_weight karena skala poin berbeda. Arsip ronde, pemain, bukti EIP-712 lama dan nonce tetap terjaga. Ronde aturan2–4 tetap divalidasi dengan rumus lamanya, menghasilkan RoundResult lama tanpa reward. Bukti baru selalu RoundReward. `get` memperbarui metadata claimEnabled sesuai konfigurasi saat ini tanpa mengubah data bertanda tangan.

## Verifikasi

Tes JS mencakup gaya/berat, terbalik karena berjalan ke tepi, pemulihan dini, empat ban bocor/tenggelam, reward hangus, berat palsu/ID ganda, bot/disconnect, persist/migrasi/signing, codec calldata versus ABI+viem, penolakan wallet dan receipt, replay multiplayer serta restart ronde.

Foundry mencakup pembayaran native tepat, replay round/nonce, nonce tidak berurutan, wallet salah, nominal/berat diubah, domain/chain/kontrak salah, expired, dana kosong lalu diisi, transfer ditolak, reentrancy, owner/pause/signer dan fuzz massa. Fixture digest viem cocok dengan Solidity. Lihat [perf.md](perf.md) untuk hasil run dan batas pengujian browser.

## Current wallet-required rollout
Public entry requires an origin-bound wallet signature and Monad Testnet. One human can create/ready/start with bots. Bots earn no MON; death forfeits reward. Supabase persistence and explicit deploy/fund/check workflow: [deployment.md](deployment.md). No cloud resource, wallet funding or contract deployment is performed by build/test.
