# Arc submission — Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio

**Submitting for:** *Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio* ($3,000). Name and amount copied from the live prize page (https://ethglobal.com/events/mumbai/prizes) on 2026-11-06

**Status (2026-11-06 evening IST; deadline Sat 2026-11-07 09:00 IST):** the contract is written and tested in Foundry. Arc Studio has not been used yet and no Studio project exists (every Arc prize requires one). The current enforcing escrow (commit `498f649`) is not deployed anywhere. The two escrows on Arc testnet are the older design. The new work has not run on real Arc.

## One-liner
Clippo is a clipping-campaign marketplace. Sponsors fund campaigns in **USDC on Arc**; creators earn by views and get paid from an **advanced escrow contract** that does conditional release, a retention window on per-view credits, and pool splits — all on-chain. The escrow *is* the product: remove it and there is no funding, no payout, and no refund.

## Why it fits this bounty (their criteria → our code)
| What they asked for | Where it lives |
| --- | --- |
| Conditional escrow with dispute + automatic release | `contracts/src/ClippoEscrow.sol` — Funded → Approved/Rejected lifecycle. The campaigner disputes a creator's PerView credits that are still in the retention window (`disputeCredits`); an admin settles it (`resolveDispute`). Undisputed credits become claimable on their own once the window passes; the creator (or `claimFor`) still has to call the claim. Contract in HEAD only; not deployed. |
| Programmable payroll / vesting in USDC | Not a vesting schedule. PerView credits sit in a **retention window** (default 7 days, owner-set 0 to 30, snapshotted per campaign) before they are claimable. |
| Treasury mgmt + payment splitting (revenue splits, team/DAO payouts) | `HumanSplit` (an explicit split, World ID approved) and `PoolShare` (the pool is shared by CRE-reported views at close) split a pool across many creators. The contract has no `PoolShare` token. |
| Software-to-software payments | `ClippoReportReceiver` receives Chainlink CRE reports and calls `reportViews()`, which credits creators. The CRE workflow runs in local simulation only (single node, not deployed). |
| Conditional flows / onchain automation / multi-step settlement | fund → approve → credit → retention window → claim → close; pool-capped, deadline-gated |
| **Bonus:** reusable by other builders | Generic 3-mode escrow, custom errors, events, exported ABI (`contracts/abi/`), Foundry tests (not re-run for this write-up; no count claimed) |

## Effective use of Arc + Circle developer tools
- **USDC as the settlement and gas token.** The constructor rejects any token whose `decimals() != 6`; the deploy script defaults to Arc's official USDC `0x3600…0000`. Fees are paid in USDC, so a user needs only USDC — one Circle faucet drop covers funding **and** gas.
- **Arc Studio: not used yet.** `ClippoEscrow.sol` was written and tested in Foundry, not in Arc Studio. Plan: create the Studio project, import the contract and tests, compile and run them there, and deploy from Studio. Until that is done, do not claim "built in Arc Studio". (Prompt + import kit: `docs/tracks/arc-studio-prompt.md`. It describes the current contract: constructor `(usdc, treasury, owner, humanAttestor)`, EIP-712 `HumanRegistration` / `HumanApproval`, disputes and `claimFor`.)
- **Real frontend + backend, not a mock.** `web/src/lib/chain/client.ts` sends the wallet transaction and waits for the receipt, then the API (`web/src/lib/chain/indexer.ts`) checks it on-chain before trusting it. The chain path **auto-enables** the moment `ESCROW_ADDRESS` is set (`web/src/lib/chain/config.ts`). Not proven: the app against the new escrow on real Arc. The live site (`clippo-six.vercel.app`) still runs the old build against an old escrow and has no `YOUTUBE_API_KEY`.

## Architecture
See the Mermaid source + money-flow sequence in `docs/ARCHITECTURE.md` (current design). Known gap: `docs/architecture.svg` still shows the older design in other ways: no humanAttestor, registerHuman, disputes or OIDC step-up, and it says retained credits "vest". Its caption does mention `claim()`/`claimFor()`. Redraw it before exporting to PNG for the form.

## Submission fields (fill after deploy)
| Field | Value |
| --- | --- |
| Bounty | Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio (copied from the live prize page on 2026-11-06) |
| Arc Studio project URL | `<ARC_STUDIO_PROJECT_URL>` (open: project not created yet) |
| Deployed escrow (ClippoEscrow) | Open: the new enforcing escrow is not deployed. Two OLD-design escrows have code on Arc testnet. The live site's `/api/chain/config` points to `0xd8453c22996bea11598a3dbf05112675b945c39c` (https://explorer.testnet.arc.io/address/0xd8453c22996bea11598a3dbf05112675b945c39c). The earlier version of this doc cited `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310` (https://explorer.testnet.arc.io/address/0xc7b9588ee0a4bff31e17ece1141ea404ad05e310). Neither has the HEAD contract. Replace with the new address after deploy. |
| GitHub repo | https://github.com/Tan0610/Clippo_EthMumbai |
| Demo video (2 to 4 min, hard cap 4:00, 720p or better, no AI voiceover, not sped up) | `<VIDEO_URL>` (open: not recorded) — script in `docs/DEMO_SCRIPT.md` |
| Architecture diagram | OPEN: `docs/architecture.svg` shows the older design; update it before exporting. Current design: Mermaid diagrams in `docs/ARCHITECTURE.md`. |

The repo's `ClippoEscrow.sol` was compiled and tested with Foundry. It was not deployed through Arc Studio. The app reads the escrow from `ESCROW_ADDRESS`, so one repo holds the contract, the frontend, and the other integrations. The old deployments used usdc `0x3600…0000` (read on-chain from both). Treasury and owner values are not the same across the two old escrows; do not quote them as the submission's constructor values. The HEAD constructor takes `(usdc, treasury, owner, humanAttestor)`.

---

## Deploy runbook — the steps only you can do (login + funded key)

### Step 1 — Fund a testnet wallet
Get testnet USDC at <https://faucet.circle.com> (also built into Arc Studio). USDC is the gas token on Arc.

### Step 2 — Build + deploy in Arc Studio (gating requirement; NOT DONE)
Web path (`studio.arc.io`):
1. New project → paste the prompt from the "Prompt" section of `docs/tracks/arc-studio-prompt.md`.
2. When Studio generates its escrow, replace it with the reviewed `contracts/src/ClippoEscrow.sol` (+ `MockUSDC.sol` for the sandbox) and ask Studio to compile and run the flows. The prompt describes the current contract, including the `humanAttestor` constructor argument. Studio's generated code may still differ, so expect to import the contract and tests rather than rely on generation.
3. **Deploy to Arc testnet from Studio.** Record the **Studio project URL** and the **deployed address**.

### Step 3 — Point the app at the deployed contract
In `web/.env.local` set (the deploy helper can also write these — `node scripts/deploy-arc.mjs` after a forge broadcast):
```
ESCROW_ADDRESS="0x<deployed escrow>"   # placeholder; no new escrow exists yet
ARC_RPC_URL="https://rpc.testnet.arc.io"
ARC_CHAIN_ID="5042002"
# USDC_ADDRESS defaults to Arc USDC 0x3600…0000; override only if Studio used MockUSDC
ESCROW_DEPLOY_BLOCK="<block the escrow was deployed at>"   # required with the new escrow
HUMAN_ATTESTOR_PRIVATE_KEY="0x<attestor key>"              # required for the core loop; its address is the constructor's humanAttestor
```
Never set `DEPLOYER_PRIVATE_KEY` on Vercel (only `scripts/deploy-arc.mjs` uses it). `UPDATER_PRIVATE_KEY` is optional (profile/referral modules).
The moment `ESCROW_ADDRESS` is a valid address, `chainConfig().enabled` flips true and chain-dependent endpoints stop answering 503 `CHAIN_NOT_CONFIGURED` and the UI uses the **real** wallet path (the `0xdemo…` fallback exists only when `NEXT_PUBLIC_DEMO` is set, which must be unset when recording). No code change needed.

### Step 4 — Run the real end-to-end flow (the plan; NOT DONE, not run against the enforcing escrow)
1. `cd web && npm run dev`, connect a wallet on Arc testnet.
2. **Fund** a campaign (approve USDC + `createCampaign`) → see the real tx on the explorer.
3. **Approve** as admin (`approveCampaign`; a pool above the owner-set threshold also needs a `HumanProof`).
4. **Link the creator** with `registerHuman` (the backend signs with `HUMAN_ATTESTOR_PRIVATE_KEY`). Only linked wallets can be credited.
5. **Credit and claim.**
   - PerView: views are credited only by a CRE report (`reportViews`, via the receiver; the CRE workflow is local simulation only today). Then wait out the retention window. A claim right after approve ends in `NothingToClaim`.
   - HumanSplit: the campaigner approves the split with a `HumanProof` (`approveSplit`), then the creator claims.
6. **Close**/refund the unspent pool (only after the deadline plus grace window; earlier it reverts with `DeadlineNotReached`).

### Step 5 — Record the demo (2 to 4 min, hard cap 4:00; over 4:00 is rejected)
Show: the Arc Studio project (only if it exists by then; otherwise say it was not used) → the app funding → a claim only on a matured campaign or a HumanSplit (not proven) → the txs on `explorer.testnet.arc.io`. Narrate "USDC is the gas + settlement token." Script: `docs/DEMO_SCRIPT.md`.

> Only after `docs/architecture.svg` is updated to the current design: to turn it into a PNG for the form, open it in a browser and export, or run `npx -y svgexport docs/architecture.svg docs/architecture.png 2x`.
