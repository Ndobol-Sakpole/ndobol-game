# Reward MON — pembaruan v5

Ronde rulesVersion>=5 memakai domain `NdobolRiverRewards`, version `1`, chainId Monad10143/143, verifyingContract=REWARD_POOL_ADDRESS. Jangan kirim bukti baru ke RiverRegistry lama.

```text
RoundReward(bytes32 roundId,address player,bytes32 trackId,uint256 score,uint256 trash,uint256 weightGrams,uint256 rewardWei,uint256 nonce,uint256 deadline)
```

roundId/trackId memakai keccak256(UTF-8 identifier) seperti sebelumnya. Skor=gram, rewardWei=gram×10000000000. Tidak ada bonus uang dari finish. Dead/capsized/sunk ditolak REWARD_FORFEITED, massa0 ditolak NO_REWARD. Blob snapshot klien tidak diterima. Backend memeriksa ID barang dan gram milik masing-masing pemain; bot/offline tidak bisa klaim.

`POST /rounds/sign` dan `GET /rounds/result` mempertahankan bentuk request/auth, tetapi primaryType/types/domain/message baru eksplisit untuk reward. `GET /rewards/config` memberi `{chainId,contract,enabled}` publik. claimEnabled mengikuti opt-in REWARD_CLAIMS_ENABLED dan pool yang cocok; signature lama dengan metadata false dapat diambil lagi setelah aktivasi selama belum kedaluwarsa.

`RiverRewards.claim(RoundReward,signature)` membayar native MON dari pool pengelola. msg.sender harus sama dengan player. Proteksi replay memakai pasangan roundId+player dan nonce per player; boleh out-of-order. Deadline24jam. Tidak ada fungsi withdraw pengelola. Lihat [rewards.md](rewards.md) untuk deployment, pendanaan terpisah dan batas implementasi.

Referensi: [EIP-712 resmi](https://eips.ethereum.org/EIPS/eip-712). EIP-712 sendiri tidak menyediakan anti-replay; mapping kontrak dan nonce aplikasi menambahkannya. ABI build di shared/abi/RiverRewards.json; codec browser ditest terhadap viem dan ABI.

---

## Arsip kontrak signing Fase2 (rules2–4; tidak membayar MON)

# Bukti hasil EIP-712 — Fase 2

Tidak ada transaksi, wallet connection, minting, atau deploy dari game. Tombol **Klaim** selalu nonaktif. User memilih alamat tujuan manual; kepemilikannya belum dibuktikan. Guest tanpa alamat tetap dapat bermain dan masuk hasil/leaderboard, tetapi tidak memperoleh bukti klaim. Sebelum memberi nilai ekonomi, Fase 3 wajib mengautentikasi wallet dan mengikat identitas sesi ke alamat itu.

## Konfigurasi

API menggunakan viem 2.57.10 dan kunci `SIGNER_PRIVATE_KEY` dari environment server saja. Set `SIGNING_CHAIN_ID=10143` untuk testnet atau `143` untuk mainnet, serta `RIVER_REGISTRY_ADDRESS` ke alamat verifier yang dituju. `.env` diabaikan Git dan tidak pernah disajikan static server. `npm run dev` membaca `.env`; `npm run api` dapat dijalankan dengan `node --env-file=.env services/api/server.js`.

Tanpa kunci, ronde/persistence tetap berjalan dan signing memberi 503 `SIGNING_DISABLED`. Kunci ada tanpa chain/verifier valid membuat API gagal startup. Tes memakai key acak di memori dan alamat verifier dummy, bukan kunci/alamat deployment. Jangan memakai bukti test dengan verifier dummy untuk klaim nanti.

## Skema canonical

Domain:

```js
{ name: 'NdobolRiverRegistry', version: '2', chainId: 10143,
  verifyingContract: process.env.RIVER_REGISTRY_ADDRESS }
```

Primary type `RoundResult`, urutan persis:

```text
RoundResult(bytes32 roundId,address player,bytes32 trackId,uint256 score,uint256 trash,uint256 nonce,uint256 deadline)
```

`roundId = keccak256(UTF8(UUID ronde server))`; `trackId = keccak256(UTF8("bengawan"|"mahakam"))`. `player` adalah alamat EVM tujuan. `score` adalah skor individual (sampah sendiri ×100 + beat kompak yang diikuti ×8 +500 bila mencapai garis akhir). `trash` adalah sampah individual, bukan total tim. Nonce naik per alamat, mulai 0; deadline Unix seconds, 24 jam setelah signing. Jenis dan urutan field diekspor `shared/signing.js`. JSON mengirim uint256 sebagai **string desimal**, tidak sebagai floating point.

## Permintaan dan keandalan

```http
POST /rounds/sign
Authorization: Bearer <resume-token>
Content-Type: application/json

{"roundId":"UUID ronde","playerId":"UUID sesi"}
```

Server mengambil hasil dari `round_players JOIN rounds`; skor/posisi/timestamp dari body ditolak. Hash token harus cocok dengan partisipan ronde. Bukti tersimpan mencakup durasi, jumlah sampah, beat sinkron, status finish dan mode online. Validator memeriksa jumlah sampah track, batas jumlah beat dari durasi/jendela ritme, rumus skor tepat, batas waktu, dan durasi minimal track dari kecepatan maksimum. Jumlah pickup unik dan jumlah per pemain juga diverifikasi saat persistence.

Respons berisi `{domain,types,primaryType,message,signature,signer,roundId,trackId,claimEnabled:false}`. `verifyTypedData` terhadap alamat signer menguji bukti secara lokal; tidak memerlukan RPC. Perubahan skor, chain, verifier atau field lain membatalkan signature.

SQLite memiliki unique `(round_id,session_id)` dan `(player_address,nonce)`. Signing diserialkan dalam proses API untuk mencegah dua async request mengambil nonce sama. Setelah signing berhasil, payload dan kenaikan nonce disimpan atomik sebelum respons. Permintaan ulang mendapat 409 `ALREADY_SIGNED`; bila respons pertama hilang, **GET `/rounds/result?roundId=...` dengan token yang sama** mengembalikan bukti yang sudah ada tanpa tanda tangan baru. Klien otomatis menggunakan GET saat menerima 409. Rate limit 6 upaya/menit per alamat/identitas disimpan di database, berlaku juga setelah restart.

Satu proses API memiliki database dan room. SQLite bersifat durable; room/session live tidak durable. Token yang hilang saat tab ditutup tidak dapat direkonstruksi oleh server. Tidak ada endpoint yang menerima hasil offline untuk ditandatangani.

## Kontrak Fase 3

Skeleton `contracts/` Fase 1 **belum verifier untuk skema ini**: struct lama memiliki `trashCount` dan `durationMs`. Kontrak itu tetap dinonaktifkan; jangan menganggap ABI lamanya kompatibel. Fase 3 harus memperbarui interface/ABI/tests menjadi struct tujuh field di atas, menghitung typed-data digest domain versi 2, memeriksa signer resmi, deadline, pemilik tujuan, nonce/replay, dan `roundId` yang belum dipakai.

Bentuk `submitRound(score, trash, signature)` saja tidak menyampaikan semua metadata yang ditandatangani. Gunakan `submitRound(RoundResult result, bytes signature)` atau paket metadata ekuivalen yang menyampaikan seluruh tujuh field; implementasi/verifikasi dan perubahan ABI dikerjakan pada Fase 3. RPC Monad tidak dipanggil pada Fase 2.

Nonce adalah counter off-chain per alamat, dapat memiliki celah atau telah dipakai pada domain jaringan lain. Verifier Fase 3 sebaiknya melacak `usedNonces[player][nonce]` untuk domain kontraknya; jangan mengasumsikan setiap bukti harus sama dengan counter on-chain berikutnya. Tentukan juga kebijakan rotasi signer sebelum klaim diaktifkan.

## Revisi physics playtest
Transport sekarang v3, tetapi domain EIP-712 tetap version2 dengan tujuh field yang sama. RAFTS tidak meningkatkan cap kecepatan4.6m/s atau rumus skor. Migrasi003 menyimpan raft_id/rules_version/hull_json sebagai evidence internal; data ini bukan field baru signature. Harga draft tidak memengaruhi nonce, skor atau klaim.

### Rules v4 compatibility
New rounds use `rules_version=4`: no synchrony points, score = trash×100 + completed×500. The signer reads the persisted rules version and retains the previous synchrony weight (8) only for archived v2/v3 evidence. Wire protocol and EIP-712 domain remain their existing versions. Track IDs/hashes remain `bengawan` and `mahakam`; UI display names are now Selokan Mataram and Kali Progo. Client wallet connection only pre-fills the optional result address; no claim transaction is enabled.

## Current wallet-required testnet rollout
Manual guest/address entry above is historical. EIP-191 login proves EOA ownership before create/join/resume and grants no token/transfer permission. The server-fixed wallet address is included in persisted EIP-712 evidence. Weighted proof schema and RiverRewards stay unchanged. Public UI follows wallet → create/join → ready/start → results → explicit claim. Local simulation is retained for tests, never unsigned payouts.

Store methods may return promises; createSigner().get is now async and all callers await it. Supabase commits signature+nonce atomically with row locking and unique round/player and wallet/nonce constraints. Failed/uncertain writes never return an unpersisted proof. Duplicate requests recover through authenticated GET after409. Deployment/funding and remaining live verification: [deployment.md](deployment.md).

## Gas sponsorship
The EIP-712 payload and domain version stay unchanged; the new pool address binds proofs to the sponsored deployment. claimFor pays the signed player while the relayer pays gas. Previously issued proofs cannot be migrated to another contract. See [sponsored-claims.md](sponsored-claims.md).
