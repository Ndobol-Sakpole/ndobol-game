# Wallet UI boundary
`createWallet({provider=globalThis.ethereum,onChange})` → state,connect(),testnet(),disconnect(),dispose(). Native EIP-1193, no SDK/dependency. The adapter requests accounts only on a user click and listens for account/network/disconnect events. Missing provider or rejection leaves guest mode usable. Disconnect is local application state, not a revocation of the wallet's site permission.

`ui/wallet.js:createWalletUI({locked,onAddress})` owns the native dialog; `syncAddress()` applies a deferred change when leaving the round. Current round identity is immutable. The UI shows the connected chain and can explicitly request Monad Testnet 10143. Mainnet 143 is recognized, but there is no mainnet switch button or transaction. The adapter never calls personal_sign, eth_signTypedData or eth_sendTransaction. RiverRegistry stays disabled. Browser connection alone does not prove ownership; RiverRewards authenticates the transaction sender for claims described below.

## Explicit reward transaction
claim.js:createClaimClient({provider,storage,now}) → pending(proof),submit(proof,config),receipt(proof),retryFailed(proof). Adapter connect tetap hanya alamat; modul claim yang terpisah memanggil eth_sendTransaction hanya setelah klik Klaim. Wallet/chain/pool/masa berlaku, codec statis dan eth_call diperiksa. Value0, gas melalui wallet. Hash pending disimpan untuk mencegah kirim ulang; status paid memerlukan receipt sukses + event pool cocok. Tidak ada automatic chain switch/sign/transfer.

## Current revision — 24 October 2026
wallet/auth.js adds EIP-191 personal_sign login (separate from adapter connect and claim transactions). walletSession/clearWalletSession use per-tab sessionStorage; authenticateWallet enforces10143 and rechecks identity after signing. Server verifies ownership before rooms. Requires injected EOA; WalletConnect/EIP1271 are not implemented.
