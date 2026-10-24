# On-chain skeleton — Foundry
Solidity 0.8.28, EVM Paris, optimizer 200, OpenZeppelin 5.1.0 vendored. `forge test --root contracts` dari root, atau `cd contracts && forge test`. Install Foundry dari https://getfoundry.sh/ . Compiler pertama membutuhkan jaringan; dependency Solidity sudah lokal.

- `NdobolItems`: ERC-1155 lengkap dari OpenZeppelin + Ownable; mint selalu revert PhaseOneStub, tidak ada token dicetak.
- `RiverRegistry`: RoundResult + submitRound/isRecorded; semua submission revert. Domain EIP-712, signer rotation, nonce/deadline/replay protection akan diimplementasikan setelah authoritative server.
- `ImpactBadge`: interface award/hasBadge + Ownable, tidak menerbitkan token; standar token/policy transfer sengaja belum diputuskan.

Deployment optional, **tidak dijalankan oleh tugas Fase 1**. Ekspor env dari penyimpanan lokal (jangan commit). `bash contracts/script/deploy.sh testnet` memeriksa chain 10143. Mainnet: `CONFIRM_MAINNET=1 bash contracts/script/deploy.sh mainnet`, chain 143. Private key hanya dibaca lewat environment oleh script Forge; tidak masuk argumen CLI/log. CONTRACT_OWNER wajib nonzero. Deployment menghabiskan gas dan hanya menghasilkan stub yang perlu redeploy untuk fase berikutnya; tidak ada proxy/upgrade pattern.

Verifikasi: set alamat + CONTRACT_OWNER + ETHERSCAN_API_KEY + VERIFIER_URL API explorer yang dipilih, `bash contracts/script/verify.sh 10143` (atau 143). Build ABI: `forge build --root contracts && npm run contracts:abi`. ABI hasil build di shared/abi; belum ada alamat deployment. Tests: ERC165/1155, balances awal, owner, unauthorized mint, disabled mutations, zero owner.

## RiverRewards (reward v1)
Kontrak baru yang membayar native MON dari pool pengelola dengan RoundReward EIP-712. 1kg=0,00001MON. Exact rate, bound signer/player/domain/deadline, replay round+nonce, pause/rotation dan reentrancy. Tidak ada withdrawal/mint uang. RiverRegistry/NdobolItems/ImpactBadge lama tetap stub. DeployRewards.s.sol + deploy-rewards.sh + verify-rewards.sh bersifat terpisah dan tidak dijalankan otomatis. ABI RiverRewards.json diekspor di CI. Lihat docs/rewards.md (root) untuk aktivasi/funding dan batas audit.

## Current revision — 24 October 2026
Deployment convenience: node --env-file=.env infra/scripts/testnet-rewards.js deploy|fund|check from repo root (compile first). Verifies chain/runtime code/owner/signer/rate and receipts; no automatic activation. See docs/deployment.md.

RiverRewards live testnet deployment (24 October 2026): `0x94cb1588221e14f34563eede5401646df3730d4a`, chain 10143. Deployment, 0.01 test MON funding, and a successful 59 g reward claim are recorded in [docs/monad-testnet-deployment.json](../docs/monad-testnet-deployment.json). Runtime bytecode matches the local compiled artifact. This does not claim explorer source verification or an external security audit; the three Phase 1 stub contracts remain unchanged.

## Sponsored revision
RiverRewards now includes claimFor with the same signed recipient and replay protection as claim. This requires a new deployment; see [sponsored setup](../docs/sponsored-claims.md). The deployment above is the historical player-paid pool. New addresses and receipts: [sponsored-testnet-deployment.json](../docs/sponsored-testnet-deployment.json).
