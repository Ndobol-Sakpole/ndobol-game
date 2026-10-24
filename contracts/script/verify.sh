#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
chain="${1:?Usage: verify.sh CHAIN_ID}"
case "$chain" in 10143|143) ;; *) echo 'Unsupported chain' >&2; exit 2 ;; esac
: "${VERIFIER_URL:?Set current explorer API URL}"
: "${ETHERSCAN_API_KEY:?Set explorer API key}"
: "${CONTRACT_OWNER:?Set constructor owner}"
: "${NDOBOL_ITEMS_ADDRESS:?Set deployed item address}"
: "${RIVER_REGISTRY_ADDRESS:?Set deployed registry address}"
: "${IMPACT_BADGE_ADDRESS:?Set deployed badge address}"
args="$(cast abi-encode 'constructor(address)' "$CONTRACT_OWNER")"
for pair in "$NDOBOL_ITEMS_ADDRESS:NdobolItems" "$RIVER_REGISTRY_ADDRESS:RiverRegistry" "$IMPACT_BADGE_ADDRESS:ImpactBadge"; do
  address="${pair%%:*}"; name="${pair##*:}"
  forge verify-contract "$address" "src/$name.sol:$name" --chain-id "$chain" --verifier-url "$VERIFIER_URL" --constructor-args "$args" --watch
done
