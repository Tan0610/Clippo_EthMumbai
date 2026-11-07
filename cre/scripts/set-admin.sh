#!/usr/bin/env bash
# Owner-only: grant (or revoke) the ADMIN role on the Clippo escrow (Arc testnet).
# Usage: cre/scripts/set-admin.sh <adminWallet> [true|false]
# The owner key is asked with a hidden prompt, never stored, never printed. It must be the escrow owner().
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
ESCROW="${ESCROW_ADDRESS:-0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef}"
# The public Arc RPC rate-limits (HTTP 429). Probe the official hosts with retries and use the first that answers.
pick_rpc() {
  local try h
  for try in 1 2 3 4 5; do
    for h in ${ARC_RPC:-} https://rpc.testnet.arc.io https://rpc.testnet.arc.network; do
      if cast chain-id --rpc-url "$h" >/dev/null 2>&1; then echo "$h"; return 0; fi
    done
    sleep $((try * 3))
  done
  return 1
}
RPC="$(pick_rpc)" || { echo "no Arc RPC answered (rate limit?). Wait a minute and run again."; exit 1; }
echo "rpc:    $RPC"
ADMIN="${1:?usage: set-admin.sh <adminWallet> [true|false]}"; ALLOWED="${2:-true}"
case "$ALLOWED" in true|false) ;; *) echo "second argument must be true or false"; exit 1;; esac
[[ "$ADMIN" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "not a wallet address: $ADMIN"; exit 1; }
retry() { local n; for n in 1 2 3 4 5; do "$@" && return 0; sleep $((n * 3)); done; return 1; }
OWNER="$(retry cast call "$ESCROW" 'owner()(address)' --rpc-url "$RPC")" || { echo "could not read owner() (rate limit?). Run again in a minute."; exit 1; }
echo "escrow: $ESCROW"; echo "owner:  $OWNER"; echo "admin:  $ADMIN -> $ALLOWED"
printf "Owner private key (hidden): "; read -rs PK; echo
GOT="$(cast wallet address --private-key "$PK")"
[ "$(echo "$GOT" | tr A-F a-f)" = "$(echo "$OWNER" | tr A-F a-f)" ] || { unset PK; echo "this key is $GOT, not the escrow owner. Nothing sent."; exit 1; }
retry cast send "$ESCROW" 'setAdmin(address,bool)' "$ADMIN" "$ALLOWED" --private-key "$PK" --rpc-url "$RPC" | grep -E 'status|transactionHash|blockNumber'
unset PK
echo "isAdmin($ADMIN) now: $(cast call "$ESCROW" 'isAdmin(address)(bool)' "$ADMIN" --rpc-url "$RPC")"
