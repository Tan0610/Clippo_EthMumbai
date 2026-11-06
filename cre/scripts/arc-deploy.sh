#!/usr/bin/env bash
# ONE-SHOT setup on REAL Arc testnet for the CRE demo. RUN THIS YOURSELF in your own Terminal:  bash scripts/arc-deploy.sh
# It asks for the private key of the ADMIN wallet (typed hidden, kept only in memory, never written to disk or printed).
# Does: deploy escrow + receiver (+ referral/profile) -> approve USDC -> create + approve one small PerView campaign
#       -> register the demo creator wallet as a human (attestor-signed) -> write scripts/.arc-deploy.env (addresses only).
# Receiver is in SIMULATION mode (Chainlink test forwarder + our simulation wallet as workflow owner). Not a production lock.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS="$HERE/../../contracts"; CRE_ENV="$HERE/../.env"; WEB_ENV="$HERE/../../web/.env.local"
RPC="${ARC_RPC:-https://rpc.testnet.arc.io}"
ADMIN="${ADMIN_ADDRESS:-0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5}"      # owner, treasury, campaigner and demo creator
CREATOR="${CREATOR_ADDRESS:-$ADMIN}"
FORWARDER="${FORWARDER_ADDRESS:-0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1}" # Arc simulation MockKeystoneForwarder
USDC="${USDC_ADDRESS:-0x3600000000000000000000000000000000000000}"   # override only for local-fork dry runs (a fork cannot emulate Arc USDC)
POOL="${POOL_UNITS:-5000000}"                                                # 5 USDC (6 decimals)
envval() { grep -E "^$2=" "$1" | head -1 | cut -d= -f2- | tr -d '"'"'"' \r'; }
SIM_KEY="$(envval "$CRE_ENV" CRE_ETH_PRIVATE_KEY)"; ATTESTOR_KEY="$(envval "$WEB_ENV" HUMAN_ATTESTOR_PRIVATE_KEY)"
[ -n "$SIM_KEY" ] && [ -n "$ATTESTOR_KEY" ] || { echo "missing CRE_ETH_PRIVATE_KEY (cre/.env) or HUMAN_ATTESTOR_PRIVATE_KEY (web/.env.local)" >&2; exit 1; }
SIM="$(cast wallet address --private-key "$SIM_KEY")"; ATTESTOR="$(cast wallet address --private-key "$ATTESTOR_KEY")"

[ "$(cast chain-id --rpc-url "$RPC")" = "5042002" ] || { echo "RPC $RPC is not Arc testnet (5042002)" >&2; exit 1; }
read -r -s -p "Private key of ADMIN wallet $ADMIN (hidden): " PK; echo
[[ "$PK" == 0x* ]] || PK="0x$PK"
GOT="$(cast wallet address --private-key "$PK" 2>/dev/null || true)"
[ "$(echo "$GOT" | tr 'A-F' 'a-f')" = "$(echo "$ADMIN" | tr 'A-F' 'a-f')" ] || { echo "That key belongs to ${GOT:-an invalid key}, not $ADMIN. Nothing was sent." >&2; exit 1; }
BAL="$(cast call "$USDC" 'balanceOf(address)(uint256)' "$ADMIN" --rpc-url "$RPC" | awk '{print $1}')"
echo "ADMIN USDC balance: $BAL units (6 decimals). Needs at least $((POOL + 1000000)) for the pool plus gas."
[ "$BAL" -ge $((POOL + 1000000)) ] || { echo "Not enough USDC. Get some at https://faucet.circle.com (Arc Testnet), then run again. Nothing was sent." >&2; exit 1; }

echo "== 1/5 deploy contracts"
OUT="$(cd "$CONTRACTS" && ADMIN_ADDRESS="$ADMIN" UPDATER_ADDRESS="$ADMIN" FORWARDER_ADDRESS="$FORWARDER" HUMAN_ATTESTOR_ADDRESS="$ATTESTOR" \
  EXPECTED_WORKFLOW_OWNER="$SIM" INSECURE_SKIP_WORKFLOW_CHECK=true forge script script/Deploy.s.sol --rpc-url "$RPC" --private-key "$PK" --broadcast 2>&1)" || { echo "$OUT" | tail -25; echo "deploy failed (output above, no secrets in it)" >&2; exit 1; }
last_addr() { echo "$OUT" | grep -oE "$1[^0-9a-fA-Fx]*0x[0-9a-fA-F]{40}" | tail -1 | grep -oE "0x[0-9a-fA-F]{40}"; }
ESCROW="$(last_addr ClippoEscrow)"; RECEIVER="$(last_addr ClippoReportReceiver)"
DEPLOY_BLOCK="$(echo "$OUT" | grep -oE 'ESCROW_DEPLOY_BLOCK=[0-9]+' | tail -1 | cut -d= -f2)"
[ -n "$ESCROW" ] && [ -n "$RECEIVER" ] || { echo "$OUT" | tail -20; echo "could not read the deployed addresses" >&2; exit 1; }
echo "ClippoEscrow $ESCROW"; echo "ClippoReportReceiver $RECEIVER"; echo "deploy block $DEPLOY_BLOCK"
S="--rpc-url $RPC --private-key $PK"

echo "== 2/5 approve USDC for the escrow"
cast send "$USDC" "approve(address,uint256)" "$ESCROW" "$POOL" $S >/dev/null

echo "== 3/5 create and approve a small PerView campaign ($POOL units, \$10 per 1,000 views)"
DEADLINE=$(( $(date +%s) + 30*86400 ))
cast send "$ESCROW" "createCampaign(uint8,uint256,uint256,uint64,bool,string)" 0 10000000 "$POOL" "$DEADLINE" false "ipfs://clippo-cre-demo-1" $S >/dev/null
CAMPAIGN="$(cast call "$ESCROW" 'campaignCount()(uint256)' --rpc-url "$RPC" | awk '{print $1}')"
cast send "$ESCROW" "approveCampaign(uint256)" "$CAMPAIGN" $S >/dev/null
echo "campaign id $CAMPAIGN approved"

echo "== 4/5 register the demo creator $CREATOR as a human (signed by the attestor $ATTESTOR)"
CHAIN_ID=5042002
human="$(cast keccak "clippo-demo-human:$CREATOR")"; expires=$(( $(date +%s) + 7*86400 ))
typed='{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"HumanRegistration":[{"name":"wallet","type":"address"},{"name":"human","type":"bytes32"},{"name":"expiresAt","type":"uint64"}]},"primaryType":"HumanRegistration","domain":{"name":"ClippoEscrow","version":"1","chainId":'$CHAIN_ID',"verifyingContract":"'$ESCROW'"},"message":{"wallet":"'$CREATOR'","human":"'$human'","expiresAt":'$expires'}}'
sig="$(cast wallet sign --private-key "$ATTESTOR_KEY" --data "$typed")"
cast send "$ESCROW" "registerHuman(address,(bytes32,uint64,bytes))" "$CREATOR" "($human,$expires,$sig)" $S >/dev/null

echo "== 5/5 checks"
echo "reportAdapter == receiver: $([ "$(cast call "$ESCROW" 'reportAdapter()(address)' --rpc-url "$RPC" | tr 'A-F' 'a-f')" = "$(echo "$RECEIVER" | tr 'A-F' 'a-f')" ] && echo yes || echo NO)"
echo "humanOf(creator) set:      $([ "$(cast call "$ESCROW" 'humanOf(address)(bytes32)' "$CREATOR" --rpc-url "$RPC")" != "0x0000000000000000000000000000000000000000000000000000000000000000" ] && echo yes || echo NO)"
echo "receiver workflow owner:   $(cast call "$RECEIVER" 'expectedWorkflowOwner()(address)' --rpc-url "$RPC")  (should be $SIM)"
cat > "$HERE/.arc-deploy.env" <<ENV
ARC_RPC=$RPC
ESCROW=$ESCROW
RECEIVER=$RECEIVER
DEPLOY_BLOCK=$DEPLOY_BLOCK
CAMPAIGN_ID=$CAMPAIGN
ADMIN=$ADMIN
CREATOR=$CREATOR
SIM_WALLET=$SIM
ATTESTOR=$ATTESTOR
FORWARDER=$FORWARDER
ENV
CFG="$HERE/../workflows/clippo-settlement/config.production.json"
sed -E "s/(\"receiverAddress\": \")0x[0-9a-fA-F]{40}/\1$RECEIVER/" "$CFG" > "$CFG.tmp" && mv "$CFG.tmp" "$CFG"
unset PK ATTESTOR_KEY SIM_KEY
echo; echo "DONE. Addresses saved to scripts/.arc-deploy.env (no keys). Explorer: https://explorer.testnet.arc.io/address/$ESCROW"
echo "Next: fund the CRE simulation wallet $SIM with a little Arc USDC from https://faucet.circle.com, then tell me 'deployed'."
