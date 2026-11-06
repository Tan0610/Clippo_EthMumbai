#!/usr/bin/env bash
# REAL CRE simulation against a local anvil fork + mock backend. Every --broadcast here goes to 127.0.0.1:8545 only.
# Requires: `cre login` done, cre CLI, bun, foundry, node. Run from anywhere:  bash scripts/simulate-local.sh
# Each `#` header line names the command and target that produced the raw CLI output below it.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$HOME/.cre/bin:$HOME/.bun/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")/.."
RPC=http://127.0.0.1:8545
if cast block-number --rpc-url "$RPC" >/dev/null 2>&1; then echo "something already listens on $RPC; stop it first" >&2; exit 1; fi
anvil --fork-url "${ARC_RPC:-https://rpc.testnet.arc.network}" --port 8545 --chain-id 5042002 >/dev/null 2>&1 &
ANVIL=$!; MOCK=; trap 'kill $ANVIL $MOCK 2>/dev/null || true' EXIT
until cast block-number --rpc-url "$RPC" >/dev/null 2>&1; do sleep 1; done
bash scripts/local-chain.sh >&2             # deploys MockUSDC/escrow/receiver, links creators, patches config.staging.json receiverAddress
set -a; source scripts/.local-chain.env; set +a   # exports CRE_ETH_PRIVATE_KEY (public anvil key)
# Workflow v2 reads YouTube itself. The CRE secret YOUTUBE_API_KEY comes from the env var YOUTUBE_API_KEY_CRE (cre/secrets.yaml).
# Obviously fake key; the mock YouTube API (scripts/mock-backend.mjs) only accepts this value, and only in the x-goog-api-key header.
# Config (config.staging.json) already points backendUrl + youtubeApiBase at the mock on 127.0.0.1:8787.
export YOUTUBE_API_KEY_CRE=FAKE_YOUTUBE_KEY MOCK_YOUTUBE_KEY=FAKE_YOUTUBE_KEY

mock() {
  if [ -n "$MOCK" ]; then kill "$MOCK" 2>/dev/null; wait "$MOCK" 2>/dev/null || true; fi
  node scripts/mock-backend.mjs --mode "$1" >/dev/null & MOCK=$!; sleep 1
}
state() {
  echo "# on-chain check: cast call against local anvil escrow $ESCROW"
  for c in "7 0x1111111111111111111111111111111111111111" "7 0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD" "12 0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD" "7 0x2222222222222222222222222222222222222222"; do
    set -- $c; echo "campaign $1 creator $2 reportedViews=$(cast call "$ESCROW" 'reportedViews(uint256,address)(uint256)' "$1" "$2" --rpc-url "$RPC_URL") credited=$(cast call "$ESCROW" 'credited(uint256,address)(uint256)' "$1" "$2" --rpc-url "$RPC_URL")"
  done
}
sim() { # label, then args after `cre workflow simulate ./workflows/clippo-settlement`
  echo; echo "# $1: cre workflow simulate ./workflows/clippo-settlement --target staging-settings --non-interactive ${*:2} (local anvil fork of Arc, mock feed)"
  local out rc=0
  out="$(cre workflow simulate ./workflows/clippo-settlement --target staging-settings --non-interactive "${@:2}" 2>&1)" || rc=$?
  echo "$out"
  [ "$rc" -eq 0 ] || exit "$rc"
  # Show the CLI's transaction really exists on the local chain, and who sent it to where.
  local tx; tx="$(echo "$out" | grep -oE 'tx 0x[0-9a-f]{64}' | head -1 | cut -d' ' -f2)"
  echo "# on-chain check: cast tx/receipt $tx on local anvil"
  echo "from=$(cast tx "$tx" from --rpc-url "$RPC_URL") to=$(cast tx "$tx" to --rpc-url "$RPC_URL") status=$(cast receipt "$tx" status --rpc-url "$RPC_URL") forwarder=$FORWARDER receiver.expectedWorkflowOwner=$(cast call "$RECEIVER" 'expectedWorkflowOwner()(address)' --rpc-url "$RPC_URL")"
}

mock fixture
state
sim "first delivery" --trigger-index 0 --broadcast
state
sim "replay of the same day via the HTTP trigger, escrow must credit 0" --trigger-index 1 --http-payload '{}' --broadcast
state
mock unlinked
sim "feed with an unlinked creator, row must be reported as failed" --trigger-index 0 --broadcast
state
