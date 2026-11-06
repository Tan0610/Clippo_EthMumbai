# Arc submission — Best Smart Contracts with Advanced Stablecoin Logic

**Submitting for:** *Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio* ($3,000)

## One-liner
Clippo is a clipping-campaign marketplace. Sponsors fund campaigns in **USDC on Arc**; creators earn by views and get paid from an **advanced escrow contract** that does conditional release, vesting, and revenue splits — all on-chain. The escrow *is* the product: remove it and there is no funding, no payout, and no refund.

## Why it fits this bounty (their criteria → our code)
| What they asked for | Where it lives |
| --- | --- |
| Conditional escrow with dispute + automatic release | `contracts/src/ClippoEscrow.sol` — Funded → Approved/Rejected lifecycle, admin dispute, auto-release of matured credits |
| Programmable payroll / vesting in USDC | PerView credits **vest over a 7-day retention window** before they are claimable |
| Treasury mgmt + payment splitting (revenue splits, team/DAO payouts) | `HumanSplit` and `PoolShare` modes split a pool across many creators |
| Software-to-software payments | `ClippoReportReceiver` (a Chainlink CRE service) drives `reportViews()` → auto-credits creators |
| Conditional flows / onchain automation / multi-step settlement | fund → approve → credit → vest → claim → close; pool-capped, deadline-gated |
| **Bonus:** reusable by other builders | Generic 3-mode escrow, custom errors, events, exported ABI (`contracts/abi/`), Foundry tests |

## Effective use of Arc + Circle developer tools
- **USDC as the settlement and gas token.** The constructor rejects any token whose `decimals() != 6`; the deploy script defaults to Arc's official USDC `0x3600…0000`. Fees are paid in USDC, so a user needs only USDC — one Circle faucet drop covers funding **and** gas.
- **Arc Studio** is the build origin: it writes/tests `ClippoEscrow.sol`, deploys to Arc testnet, and pushes to GitHub. (Prompt + import kit: `docs/tracks/arc-studio-prompt.md`.)
- **Real frontend + backend, not simulated.** `web/src/lib/chain/client.ts` sends the wallet transaction, waits for the receipt, then the API verifies the receipt on-chain before trusting it. The chain path **auto-enables** the moment `ESCROW_ADDRESS` is set (`web/src/lib/chain/config.ts`).

## Architecture
See `docs/architecture.svg` (open in a browser; export/screenshot to PNG for the form) and the Mermaid source + money-flow sequence in `docs/ARCHITECTURE.md`.

## Submission fields (fill after deploy)
| Field | Value |
| --- | --- |
| Bounty | Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio |
| Arc Studio project URL | `<ARC_STUDIO_PROJECT_URL>` |
| Deployed escrow (explorer) | `https://explorer.testnet.arc.io/address/<ESCROW_ADDRESS>` |
| GitHub repo | https://github.com/Tan0610/Clippo_EthMumbai |
| Demo video (≤5 min) | `<VIDEO_URL>` — script in `docs/DEMO_SCRIPT.md` |
| Architecture diagram | `docs/architecture.svg` |

---

## Deploy runbook — the steps only you can do (login + funded key)

### Step 1 — Fund a testnet wallet
Get testnet USDC at <https://faucet.circle.com> (also built into Arc Studio). USDC is the gas token on Arc.

### Step 2 — Build + deploy in Arc Studio (gating requirement)
Web path (`studio.arc.io`):
1. New project → paste the prompt from `docs/tracks/arc-studio-prompt.md` (lines 21–42).
2. When Studio generates its escrow, replace it with the reviewed `contracts/src/ClippoEscrow.sol` (+ `MockUSDC.sol` for the sandbox) and ask Studio to compile and run the flows.
3. **Deploy to Arc testnet from Studio.** Record the **Studio project URL** and the **deployed address**.

### Step 3 — Point the app at the deployed contract
In `web/.env.local` set (the deploy helper can also write these — `node scripts/deploy-arc.mjs` after a forge broadcast):
```
ESCROW_ADDRESS="0x<deployed escrow>"
ARC_RPC_URL="https://rpc.testnet.arc.io"
ARC_CHAIN_ID="5042002"
# USDC_ADDRESS defaults to Arc USDC 0x3600…0000; override only if Studio used MockUSDC
```
The moment `ESCROW_ADDRESS` is a valid address, `chainConfig().enabled` flips true and the UI uses the **real** wallet path instead of the `0xdemo…` fallback. No code change needed.

### Step 4 — Run the real end-to-end flow (the "working MVP")
1. `cd web && npm run dev`, connect a wallet on Arc testnet.
2. **Fund** a campaign (approve USDC + `createCampaign`) → see the real tx on the explorer.
3. **Approve** as admin (`approveCampaign`).
4. **Claim** as creator (`claim`) after the retention window → USDC lands in the creator's wallet.
5. **Close**/refund the unspent pool.

### Step 5 — Record the demo (≤5 min)
Show: Arc Studio generating/deploying the contract → the app funding → claim → the txs on `explorer.testnet.arc.io`. Narrate "USDC is the gas + settlement token." Script: `docs/DEMO_SCRIPT.md`.

> To turn `docs/architecture.svg` into a PNG for the form: open it in a browser and export, or run `npx -y svgexport docs/architecture.svg docs/architecture.png 2x`.
