# Shared contracts
`game/` is the sole gameplay implementation used by server and offline demo: config, state machine, score validation, deterministic fixed-step round. Units: metres/seconds; persistence evidence durationMs; signed deadline Unix seconds.

`messages.js` exports v2 envelope validator/factory, client/server type lists, address/room code validators. Client messages never include score or position. The v1 stub is retired; see `docs/protocol.md` and `docs/phase-2-interfaces.md`.

`signing.js` exports EIP-712 RoundResult type/domain name/version, with no signing key or library in the browser. `chains.js` contains only public Monad networks. `abi/` remains the disabled Phase 1 contract scaffold, not a verifier for Phase 2 proofs; Phase 3 must update that interface as documented in `docs/signing.md`.

Playtest fisika memakai protokol transport v3. Input fart/moveX/moveZ/turn/reach, RAFTS dan physics di game/. Domain/signature EIP-712 tetap v2, jangan disamakan dengan versi transport.

reward-signing.js: tipe EIP-712 RoundReward terpisah dari arsip RoundResult. reward-claim.js: encodeRewardClaim(proof,config),matchesRewardReceipt(proof,receipt). Codec statis native browser, differential-tested against viem + compiled ABI. game/rewards.js memusatkan tarif dan massa.

## Current revision — 24 October 2026
Protocol4: authenticated wallet hello, held fart input and thrustActive snapshot; rulesVersion5 reward fields unchanged. See docs/protocol.md.
