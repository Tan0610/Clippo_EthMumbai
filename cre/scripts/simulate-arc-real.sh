#!/usr/bin/env bash
# CRE simulation with --broadcast on REAL Arc testnet, reading the REAL YouTube API (run after scripts/arc-deploy.sh).
# The clip manifest is served by a local mock backend (one real clip) because the deployed site's manifest route only lists a clip after its approval day has ended (UTC).
# The report is sent by the simulation wallet (CRE_ETH_PRIVATE_KEY in cre/.env) through Arc's simulation forwarder.
# Usage: bash scripts/simulate-arc-real.sh <video id> <youtube channel id>
set -euo pipefail
export PATH="$HOME/.foundry/bin:$HOME/.cre/bin:$HOME/.bun/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")/.."
VIDEO="${1:?video id}"; CHANNEL="${2:?youtube channel id}"
[ -f scripts/.arc-deploy.env ] || { echo "run scripts/arc-deploy.sh first" >&2; exit 1; }
set -a; source scripts/.arc-deploy.env; set +a
SIM_BAL="$(cast balance "$SIM_WALLET" --rpc-url "$ARC_RPC")"
[ "$SIM_BAL" != "0" ] || { echo "the simulation wallet $SIM_WALLET has no USDC for gas: fund it at https://faucet.circle.com" >&2; exit 1; }
MOCK=; TMPCFG="$(mktemp)"; trap 'kill $MOCK 2>/dev/null || true; rm -f "$TMPCFG"' EXIT
node scripts/mock-backend.mjs --mode realyt --real-wallet "$CREATOR" --real-video "$VIDEO" --real-channel "$CHANNEL" --real-campaign "$CAMPAIGN_ID" >/dev/null & MOCK=$!; sleep 1
node -e 'const c=JSON.parse(require("fs").readFileSync("workflows/clippo-settlement/config.production.json","utf8")); c.backendUrl="http://127.0.0.1:8787"; c.requireHttpAuthorizedKeys=false; delete c.httpAuthorizedKeys; c.youtubeApiBase="https://www.googleapis.com/youtube/v3"; c.evm.receiverAddress=process.argv[2]; require("fs").writeFileSync(process.argv[1], JSON.stringify(c,null,2))' "$TMPCFG" "$RECEIVER"
echo "# REAL Arc testnet (chain 5042002). Escrow $ESCROW, receiver $RECEIVER, campaign $CAMPAIGN_ID, creator $CREATOR"
echo "# manifest served to the workflow (one real clip):"; curl -s "http://127.0.0.1:8787/api/snapshots/clips" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).clips)))'
BEFORE="$(cast call "$ESCROW" 'reportedViews(uint256,address)(uint256)' "$CAMPAIGN_ID" "$CREATOR" --rpc-url "$ARC_RPC" | awk '{print $1}')"
echo "# reportedViews before: $BEFORE"
echo "# cre workflow simulate ./workflows/clippo-settlement --target ${CRE_TARGET:-production-settings} --config <production config: local manifest, real YouTube, deployed receiver> --trigger-index 0 --broadcast"
cre workflow simulate ./workflows/clippo-settlement --target "${CRE_TARGET:-production-settings}" --config "$TMPCFG" --non-interactive --trigger-index 0 --broadcast 2>&1
echo "# on-chain check (real Arc): campaign $CAMPAIGN_ID creator $CREATOR"
echo "reportedViews=$(cast call "$ESCROW" 'reportedViews(uint256,address)(uint256)' "$CAMPAIGN_ID" "$CREATOR" --rpc-url "$ARC_RPC" | awk '{print $1}')  credited(USDC units, 6 decimals)=$(cast call "$ESCROW" 'credited(uint256,address)(uint256)' "$CAMPAIGN_ID" "$CREATOR" --rpc-url "$ARC_RPC" | awk '{print $1}')"
