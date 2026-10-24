# UI
`createUI(bus)` binds the Start screen, lobby/garage, room, countdown, HUD and results. Public methods: update(state,metadata),setTrack,setReady,setStatus,profile,t,toast,proof,signError,leaderboard,requestError,error. The old rhythm() method was removed; main.js no longer calls it.

Start enters the game lobby. Solo-bots is local-only; bots is removed from create/join payloads. All eight characters and six prototype hulls are freely selectable. Host chooses hull/track before the room. Indonesian default, English game text option. Text from players/network is rendered with textContent.

HUD shows score/trash/time/current, journey, balance, total speed, float damage and own360° thrust direction. No rhythm bar. Native keyboard/multi-touch controls with visible focus. Results show signed payloads and a claim button gated by reward-pool configuration.

`wallet.js:createWalletUI({locked,onAddress})` owns an optional native dialog and deferred profile updates; syncAddress() applies a changed wallet after leaving the round. See ../wallet/README.md. Reward claims use the separate rewards/claim modules described below; minting stays disabled.

## Reward update
HUD menampilkan gram/kg, jumlah benda dan estimasi MON pribadi. Fatal banner/results menjelaskan reward hangus. Harga garasi memakai priceWei. rewards.js:createRewardUI → show(proof),block(code), menangani tombol klaim dan pembuktian receipt; never treat estimated reward as wallet balance. Klaim disabled sampai pool/server dikonfigurasi.

## Current revision — 24 October 2026
Public flow requires wallet: createWalletUI.ensure() connects/switches testnet/verifies login, then createUI.enter() opens create/join lobby. No guest/solo bypass button; create+ready+start supports one human with bots. Result signing waits for asynchronous persistence.

SIGNING_DISABLED explains that reward setup includes both the pool contract and signer configuration. A prepared signer key alone does not activate claims. No public UI interface changed.

Sponsored rewards: the claim button labels gas as operator-paid. Receipt polling confirms payment; failures/budget limits never trigger a player-paid transaction. A matching success shows a MonadScan link and disables duplicate claiming.
