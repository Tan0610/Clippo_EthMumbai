#!/usr/bin/env bash
# Deploys MockUSDC + ClippoEscrow + ClippoReportReceiver on a LOCAL anvil fork of Arc testnet and seeds campaigns 1..12
# (7 and 12 Approved PerView campaigns, matching the shared fixture's campaign ids), then links the fixture's creators to
# World ID humans (registerHuman, signed by a local attestor) because reportViews reverts NotHuman for unlinked wallets.
# Prereq:  anvil --fork-url https://rpc.testnet.arc.io --port 8545 --chain-id 5042002   (fork keeps the real MockKeystoneForwarder)
# Usage:   bash scripts/local-chain.sh        -> writes scripts/.local-chain.env (addresses) and prints them
#          REGISTER_LARGE_ROWS=60 also links the creators served by `mock-backend.mjs --mode large --large-rows 60`
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS="$HERE/../../contracts"
RPC="${RPC_URL:-http://127.0.0.1:8545}"
# Well-known public anvil account #0 (TEST ONLY, no value on any real network).
PK="${DEPLOYER_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
ME="$(cast wallet address --private-key "$PK")"
# Well-known public anvil account #1 plays the backend's World ID attestor (TEST ONLY).
ATTESTOR_KEY="${HUMAN_ATTESTOR_KEY:-0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d}"
ATTESTOR="$(cast wallet address --private-key "$ATTESTOR_KEY")"
# Arc testnet MockKeystoneForwarder (simulation forwarder) from the CRE forwarder directory.
FORWARDER="${FORWARDER_ADDRESS:-0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1}"
# ALLOW_ANY_CHAIN=true below makes Deploy.s.sol default INSECURE_SKIP_WORKFLOW_CHECK=true (mock forwarder passes no workflow metadata).
# EXPECTED_WORKFLOW_OWNER=$ME keeps the receiver's simulation guard on: tx.origin must be the key running the simulation,
# so CRE_ETH_PRIVATE_KEY in .local-chain.env must stay this same key.

# This fork reuses Arc's chain id, so keep forge's output out of contracts/ or it would overwrite the record of a real deployment.
FORGE_TMP="$(mktemp -d)"; trap 'rm -rf "$FORGE_TMP"' EXIT
export FOUNDRY_BROADCAST="$FORGE_TMP/broadcast" FOUNDRY_CACHE_PATH="$FORGE_TMP/cache" FOUNDRY_OUT="$FORGE_TMP/out"

cd "$CONTRACTS"
last_addr() { grep -oE "$1[^0-9a-fA-Fx]*0x[0-9a-fA-F]{40}" | tail -1 | grep -oE "0x[0-9a-fA-F]{40}"; }

OUT=$(forge script script/DeployMock.s.sol --rpc-url "$RPC" --private-key "$PK" --broadcast 2>&1)
USDC=$(echo "$OUT" | last_addr MockUSDC)
echo "MockUSDC $USDC"

OUT=$(ALLOW_ANY_CHAIN=true ADMIN_ADDRESS=$ME UPDATER_ADDRESS=$ME FORWARDER_ADDRESS=$FORWARDER USDC_ADDRESS=$USDC \
  HUMAN_ATTESTOR_ADDRESS=$ATTESTOR EXPECTED_WORKFLOW_OWNER=$ME \
  forge script script/Deploy.s.sol --rpc-url "$RPC" --private-key "$PK" --broadcast 2>&1)
ESCROW=$(echo "$OUT" | last_addr ClippoEscrow)
RECEIVER=$(echo "$OUT" | last_addr ClippoReportReceiver)
echo "ClippoEscrow $ESCROW"; echo "ClippoReportReceiver $RECEIVER"

S="--rpc-url $RPC --private-key $PK"
cast send $USDC "mint(address,uint256)" $ME 1000000000 $S >/dev/null
cast send $USDC "approve(address,uint256)" $ESCROW 1000000000 $S >/dev/null
DEADLINE=$(( $(date +%s) + 30*86400 ))
# createCampaign(mode=0 PerView, rate=$10 per 1k views, pool, deadline, requireAdminApproval=false, uri)
for i in $(seq 1 12); do
  POOL=1000000            # $1 pool (cap demo) ...
  [ "$i" = "7" ] && POOL=500000000   # ... except campaign 7: $500
  cast send $ESCROW "createCampaign(uint8,uint256,uint256,uint64,bool,string)" 0 10000000 $POOL $DEADLINE false "ipfs://clippo-demo-$i" $S >/dev/null
done
cast send $ESCROW "approveCampaign(uint256)" 7 $S >/dev/null
cast send $ESCROW "approveCampaign(uint256)" 12 $S >/dev/null
echo "campaignCount $(cast call $ESCROW 'campaignCount()(uint256)' --rpc-url $RPC)"

# registerHuman(wallet, HumanProof): EIP-712 format per contracts/test/HumanHelper.sol. Reverts abort the script (set -e).
CHAIN_ID="$(cast chain-id --rpc-url "$RPC")"
register_human() {
  local wallet="$1" human expires typed sig
  human="$(cast keccak "clippo-local-human:$wallet")"
  expires=$(( $(date +%s) + 86400 ))
  typed='{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"HumanRegistration":[{"name":"wallet","type":"address"},{"name":"human","type":"bytes32"},{"name":"expiresAt","type":"uint64"}]},"primaryType":"HumanRegistration","domain":{"name":"ClippoEscrow","version":"1","chainId":'$CHAIN_ID',"verifyingContract":"'$ESCROW'"},"message":{"wallet":"'$wallet'","human":"'$human'","expiresAt":'$expires'}}'
  sig="$(cast wallet sign --private-key "$ATTESTOR_KEY" --data "$typed")"
  cast send "$ESCROW" "registerHuman(address,(bytes32,uint64,bytes))" "$wallet" "($human,$expires,$sig)" $S >/dev/null
}
FIXTURE="$HERE/../workflows/clippo-settlement/fixtures/snapshot-feed.json"
CREATORS="$(node -p 'const f=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));[...new Set(JSON.parse(f.normalized).map(r=>r.creator))].join(" ")' "$FIXTURE")"
for wallet in $CREATORS; do
  register_human "$wallet"
  echo "linked $wallet human=$(cast call "$ESCROW" 'humanOf(address)(bytes32)' "$wallet" --rpc-url "$RPC")"
done
# EXTRA_CREATORS="0x.. 0x.." also links these wallets (the real-YouTube run uses a real creator wallet)
for wallet in ${EXTRA_CREATORS:-}; do
  register_human "$wallet"
  echo "linked extra $wallet"
done
i=0
while [ "$i" -lt "${REGISTER_LARGE_ROWS:-0}" ]; do
  register_human "$(printf '0x%040x' $(( 0x1000 + i )))"
  i=$(( i + 1 ))
done
[ "${REGISTER_LARGE_ROWS:-0}" -gt 0 ] && echo "linked $REGISTER_LARGE_ROWS large-mode creators"

cat > "$HERE/.local-chain.env" <<ENV
RPC_URL=$RPC
USDC=$USDC
ESCROW=$ESCROW
RECEIVER=$RECEIVER
FORWARDER=$FORWARDER
HUMAN_ATTESTOR=$ATTESTOR
CRE_ETH_PRIVATE_KEY=$PK
ENV
echo "wrote $HERE/.local-chain.env"

# Point the staging workflow config at the freshly deployed receiver.
CFG="$HERE/../workflows/clippo-settlement/config.staging.json"
sed -E "s/(\"receiverAddress\": \")0x[0-9a-fA-F]{40}/\1$RECEIVER/" "$CFG" > "$CFG.tmp" && mv "$CFG.tmp" "$CFG"
echo "updated receiverAddress in $CFG"
