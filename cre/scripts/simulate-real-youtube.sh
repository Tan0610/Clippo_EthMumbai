#!/usr/bin/env bash
# REAL YouTube read through the CRE workflow, delivered on a LOCAL anvil fork of Arc (nothing goes to real Arc).
# The manifest comes from the local mock backend (one real clip); the YouTube key comes from cre/.env (YOUTUBE_API_KEY_CRE).
# Usage: bash scripts/simulate-real-youtube.sh <creator wallet> <video id> <channel id> [campaign id, default 7]
set -euo pipefail
export PATH="$HOME/.foundry/bin:$HOME/.cre/bin:$HOME/.bun/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")/.."
WALLET="${1:?creator wallet}"; VIDEO="${2:?video id}"; CHANNEL="${3:?channel id}"; CAMPAIGN="${4:-7}"
RPC=http://127.0.0.1:8545
[ -s .env ] || { echo "cre/.env is missing or empty (needs YOUTUBE_API_KEY_CRE)" >&2; exit 1; }
if cast block-number --rpc-url "$RPC" >/dev/null 2>&1; then echo "something already listens on $RPC; stop it first" >&2; exit 1; fi
anvil --fork-url "${ARC_RPC:-https://rpc.testnet.arc.network}" --port 8545 --chain-id 5042002 >"${ANVIL_LOG:-/dev/null}" 2>&1 &
ANVIL=$!; MOCK=; TMPCFG="$(mktemp)"; trap 'kill $ANVIL $MOCK 2>/dev/null || true; rm -f "$TMPCFG"; git checkout -- workflows/clippo-settlement/config.staging.json 2>/dev/null || true' EXIT
until cast block-number --rpc-url "$RPC" >/dev/null 2>&1; do sleep 1; done
EXTRA_CREATORS="$WALLET" bash scripts/local-chain.sh >&2
set -a; source scripts/.local-chain.env; set +a
node scripts/mock-backend.mjs --mode realyt --real-wallet "$WALLET" --real-video "$VIDEO" --real-channel "$CHANNEL" --real-campaign "$CAMPAIGN" >/dev/null & MOCK=$!; sleep 1
# staging config, but with the REAL YouTube API instead of the mock
node -e 'const c=JSON.parse(require("fs").readFileSync("workflows/clippo-settlement/config.staging.json","utf8")); c.youtubeApiBase="https://www.googleapis.com/youtube/v3"; require("fs").writeFileSync(process.argv[1], JSON.stringify(c,null,2))' "$TMPCFG"
echo "# manifest served to the workflow (one real clip):"; curl -s "http://127.0.0.1:8787/api/snapshots/clips" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).clips)))'
echo "# cre workflow simulate ./workflows/clippo-settlement --target staging-settings --config <staging config with youtubeApiBase = real YouTube> --trigger-index 0 --broadcast (local anvil fork of Arc)"
cre workflow simulate ./workflows/clippo-settlement --target staging-settings --config "$TMPCFG" --non-interactive --trigger-index 0 --broadcast 2>&1
echo "# on-chain check (local fork): reportedViews and credited for campaign $CAMPAIGN, creator $WALLET"
echo "reportedViews=$(cast call "$ESCROW" 'reportedViews(uint256,address)(uint256)' "$CAMPAIGN" "$WALLET" --rpc-url "$RPC")  credited(USDC units, 6 decimals)=$(cast call "$ESCROW" 'credited(uint256,address)(uint256)' "$CAMPAIGN" "$WALLET" --rpc-url "$RPC")"
