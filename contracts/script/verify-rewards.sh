#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
chain="${1:?Usage: verify-rewards.sh CHAIN_ID}"
case "$chain" in 10143|143) ;; *) exit 2 ;; esac
: "${VERIFIER_URL:?Set explorer API URL}"
: "${ETHERSCAN_API_KEY:?Set explorer API key}"
: "${REWARD_POOL_ADDRESS:?Set reward pool address}"
: "${CONTRACT_OWNER:?Set owner address}"
: "${REWARD_SIGNER_ADDRESS:?Set public reward signer address}"
args="$(cast abi-encode 'constructor(address,address)' "$CONTRACT_OWNER" "$REWARD_SIGNER_ADDRESS")"
forge verify-contract "$REWARD_POOL_ADDRESS" src/RiverRewards.sol:RiverRewards --chain-id "$chain" --verifier-url "$VERIFIER_URL" --constructor-args "$args" --watch
