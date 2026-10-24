#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-testnet}" in
  testnet) rpc="${MONAD_TESTNET_RPC:-https://testnet-rpc.monad.xyz}"; chain=10143 ;;
  mainnet) test "${CONFIRM_MAINNET:-0}" = 1; rpc="${MONAD_MAINNET_RPC:-https://rpc.monad.xyz}"; chain=143 ;;
  *) echo 'Usage: deploy-rewards.sh testnet|mainnet' >&2; exit 2 ;;
esac
: "${DEPLOYER_PRIVATE_KEY:?Set deployer key in environment}"
: "${CONTRACT_OWNER:?Set contract owner}"
: "${REWARD_SIGNER_ADDRESS:?Set public reward signer address}"
test "$(cast chain-id --rpc-url "$rpc")" = "$chain"
forge script script/DeployRewards.s.sol:DeployRewards --rpc-url "$rpc" --broadcast
