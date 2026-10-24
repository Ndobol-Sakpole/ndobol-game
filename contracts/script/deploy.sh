#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
network="${1:-testnet}"
case "$network" in
  testnet) rpc="${MONAD_TESTNET_RPC:-https://testnet-rpc.monad.xyz}"; chain=10143 ;;
  mainnet) : "${CONFIRM_MAINNET:?Set CONFIRM_MAINNET=1 explicitly}"; test "$CONFIRM_MAINNET" = 1; rpc="${MONAD_MAINNET_RPC:-https://rpc.monad.xyz}"; chain=143 ;;
  *) echo 'Usage: deploy.sh testnet|mainnet' >&2; exit 2 ;;
esac
: "${DEPLOYER_PRIVATE_KEY:?Set private key in environment}"
: "${CONTRACT_OWNER:?Set owner address in environment}"
test "$(cast chain-id --rpc-url "$rpc")" = "$chain"
forge script script/Deploy.s.sol:Deploy --rpc-url "$rpc" --broadcast
