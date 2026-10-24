# Deployment scripts
`Deploy.s.sol` membaca DEPLOYER_PRIVATE_KEY dan CONTRACT_OWNER, hanya chain 10143/143. `deploy.sh testnet|mainnet` memverifikasi RPC chain dan memerlukan opt-in mainnet. `verify.sh CHAIN_ID` memakai alamat deploy + constructor owner + explorer API env. Jangan gunakan shell tracing (`set -x`) dengan secrets.

Reward-only deploy: bash deploy-rewards.sh testnet|mainnet, membutuhkan REWARD_SIGNER_ADDRESS publik selain deployer/owner. Tidak mendanai pool/menyalakan server. verify-rewards.sh CHAIN_ID memerlukan pool/owner/signer/explorer env.
