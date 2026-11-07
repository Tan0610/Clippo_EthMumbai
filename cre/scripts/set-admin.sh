#!/usr/bin/env bash
# Owner-only: grant (or revoke) the ADMIN role on the Clippo escrow (Arc testnet).
# Usage: cre/scripts/set-admin.sh <adminWallet> [true|false]
# The owner key is asked with a hidden prompt, never stored, never printed. It must be the escrow owner().
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"
ESCROW="${ESCROW_ADDRESS:-0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef}"
RPC="${ARC_RPC:-https://rpc.testnet.arc.io}"
ADMIN="${1:?usage: set-admin.sh <adminWallet> [true|false]}"; ALLOWED="${2:-true}"
case "$ALLOWED" in true|false) ;; *) echo "second argument must be true or false"; exit 1;; esac
[[ "$ADMIN" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "not a wallet address: $ADMIN"; exit 1; }
OWNER="$(cast call "$ESCROW" 'owner()(address)' --rpc-url "$RPC")"
echo "escrow: $ESCROW"; echo "owner:  $OWNER"; echo "admin:  $ADMIN -> $ALLOWED"
printf "Owner private key (hidden): "; read -rs PK; echo
GOT="$(cast wallet address --private-key "$PK")"
[ "$(echo "$GOT" | tr A-F a-f)" = "$(echo "$OWNER" | tr A-F a-f)" ] || { unset PK; echo "this key is $GOT, not the escrow owner. Nothing sent."; exit 1; }
cast send "$ESCROW" 'setAdmin(address,bool)' "$ADMIN" "$ALLOWED" --private-key "$PK" --rpc-url "$RPC" | grep -E 'status|transactionHash|blockNumber'
unset PK
echo "isAdmin($ADMIN) now: $(cast call "$ESCROW" 'isAdmin(address)(bool)' "$ADMIN" --rpc-url "$RPC")"
