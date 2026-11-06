# Arc submission — Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio

**Submitting for:** *Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio* ($3,000). Name and amount copied from the live prize page (https://ethglobal.com/events/mumbai/prizes) on 2026-11-06

**Status (2026-11-07; deadline Sat 2026-11-07 09:00 IST):**
- **Enforcing escrow, on real Arc testnet in simulation mode:** `ClippoEscrow` `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` and `ClippoReportReceiver` `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` (chain 5042002; the escrow's owner, treasury and `humanAttestor` were read back from the chain on 2026-11-07). It was written and tested in Foundry and deployed with a forge script (`cre/scripts/arc-deploy.sh`), not through Arc Studio. "Simulation mode" means the receiver trusts Arc's Chainlink TEST forwarder and our simulation wallet as workflow owner; it is not locked.
- **Run on real Arc so far:** the deploy script created and approved campaign 1 (PerView, 5 USDC pool) and registered the demo creator wallet as a human with an attestor-signed stand-in for the World check. One CRE simulation (`--broadcast`, one node, real YouTube read) then sent a report: tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`, `reportedViews` 3, credited 0.03 USDC (`docs/tracks/cre-simulation-real-arc.txt`). Not proven: funding through the app, a claim, a dispute or a close on real Arc; Chainlink nodes signing (the simulator is one node and our own wallet sent the report).
- **Deployed site:** https://clippo-cre.vercel.app (new Vercel project, deployed by the Vercel CLI from the feature branch, pointing at the escrow above). It will be redeployed from `main` after the merge.
- **Older contracts on Arc:** two older 3-arg escrows have code on Arc testnet: `0xd8453c22996bea11598a3dbf05112675b945c39c` and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`. Neither has `humanAttestor` (on-chain read, 2026-11-07), so neither is the enforcing design.

## One-liner
Clippo is a clipping-campaign marketplace. Sponsors fund campaigns in **USDC on Arc**; creators earn by views and get paid from an **advanced escrow contract** that does conditional release, a retention window on per-view credits, and pool splits — all on-chain. The escrow *is* the product: remove it and there is no funding, no payout, and no refund.

## Why it fits this bounty (their criteria → our code)
> The rows below describe the **enforcing escrow** in this repo (`0x1e05…26Ef` on Arc testnet, simulation mode). The older 3-arg escrows on Arc implement the escrow lifecycle, retention, splits and fees, but not disputes, `claimFor` or `humanAttestor`.

| What they asked for | Where it lives |
| --- | --- |
| Conditional escrow with dispute + automatic release | `contracts/src/ClippoEscrow.sol` — Funded → Approved/Rejected lifecycle. The campaigner disputes a creator's PerView credits that are still in the retention window (`disputeCredits`); an admin settles it (`resolveDispute`). Undisputed credits become claimable on their own once the window passes; the creator (or `claimFor`) still has to call the claim. Deployed on Arc testnet at `0x1e05…26Ef` (simulation mode). The dispute and claim flow has not been run on real Arc. |
| Programmable payroll / vesting in USDC | Not a vesting schedule. PerView credits sit in a **retention window** (default 7 days, owner-set 0 to 30, snapshotted per campaign) before they are claimable. |
| Treasury mgmt + payment splitting (revenue splits, team/DAO payouts) | `HumanSplit` (an explicit split, World ID approved) and `PoolShare` (the pool is shared by CRE-reported views at close) split a pool across many creators. The contract has no `PoolShare` token. |
| Software-to-software payments | `ClippoReportReceiver` receives Chainlink CRE reports and calls `reportViews()`, which credits creators. The CRE workflow (each node reads YouTube itself from the `/api/snapshots/clips` manifest and takes the median) ran as a one-node simulation on real Arc: tx `0xa41f…c8409`. It is not deployed as a live workflow. |
| Conditional flows / onchain automation / multi-step settlement | fund → approve → credit → retention window → claim → close; pool-capped, deadline-gated |
| **Bonus:** reusable by other builders | Generic 3-mode escrow, custom errors, events, exported ABI (`contracts/abi/`), Foundry tests (not re-run for this write-up; no count claimed). `npm run e2e:chain` passed 48/48 against the OLD escrow on a local chain (main's docs); it is not updated for the enforcing escrow, so it is not evidence for it. |

## Effective use of Arc + Circle developer tools
- **USDC as the settlement and gas token.** The constructor rejects any token whose `decimals() != 6`; the deploy script defaults to Arc's official USDC `0x3600…0000`. Fees are paid in USDC, so a user needs only USDC — one Circle faucet drop covers funding **and** gas.
- **Arc Studio: URL on file, not verified by us.** Main's commit `943779e` adds the Studio project URL https://studio.arc.io/app/34ef3b95-32bd-48f9-9310-b8135e1d92ce (use the Studio **Share** button to make it public). That commit states only the URL. Main's earlier docs also said the older 3-arg escrow (`0xc7b9…`) was compiled and deployed from that project; nothing in the repo proves what Studio did, and we have not opened the project. The enforcing escrow (`0x1e05…`) was written and tested in Foundry and deployed with a forge script, so do not say it was "built in Arc Studio" unless the owner confirms it and shows it in the video. (Prompt + import kit: `docs/tracks/arc-studio-prompt.md`. It describes the current contract: constructor `(usdc, treasury, owner, humanAttestor)`, EIP-712 `HumanRegistration` / `HumanApproval`, disputes and `claimFor`.)
- **Real frontend + backend, not a mock.** `web/src/lib/chain/client.ts` sends the wallet transaction and waits for the receipt, then the API (`web/src/lib/chain/indexer.ts`) checks it on-chain before trusting it. The chain path **auto-enables** the moment `ESCROW_ADDRESS` is set (`web/src/lib/chain/config.ts`). The deployed site https://clippo-cre.vercel.app runs with `ESCROW_ADDRESS=0x1e05…26Ef` and shows the real CRE result (campaign 1: Confirmed views 3 and the proof link to tx `0xa41f…c8409`); its user, channel, campaign and clip records are seeded and labelled `[SEED]`, the views, credit and proof are real. Not proven: a full fund-to-claim run through the app on real Arc. The older `clippo-six.vercel.app` is a different project, not in the owner's Vercel account, and ran an older build against an older escrow when last checked; do not point judges there.

## Architecture
See the Mermaid source + money-flow sequence in `docs/ARCHITECTURE.md` (current design). Known gap: `docs/architecture.svg` still shows the older design in other ways: no humanAttestor, registerHuman, disputes or World step-up, and it says retained credits "vest". Its caption does mention `claim()`/`claimFor()`. Redraw it before exporting to PNG for the form.

## Submission fields
| Field | Value |
| --- | --- |
| Bounty | Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio (copied from the live prize page on 2026-11-06) |
| Arc Studio project URL | https://studio.arc.io/app/34ef3b95-32bd-48f9-9310-b8135e1d92ce (from main's commit `943779e`; use the Studio **Share** button to make it public, then paste the public link here. Not verified by us: we have not opened it and the repo does not show what is in it) |
| Deployed escrow (ClippoEscrow) | `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` — https://explorer.testnet.arc.io/address/0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef (enforcing escrow, simulation mode, created in block 71094347). Receiver: `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd`. Older 3-arg escrows, not the enforcing design: `0xd8453c22996bea11598a3dbf05112675b945c39c` and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310` |
| GitHub repo | https://github.com/Tan0610/Clippo_EthMumbai |
| Demo video (2 to 4 min, hard cap 4:00, 720p or better, no AI voiceover, not sped up) | `<VIDEO_URL>` (open: not recorded) — script in `docs/DEMO_SCRIPT.md` |
| Architecture diagram | OPEN: `docs/architecture.svg` shows the older design; update it before exporting. Current design: Mermaid diagrams in `docs/ARCHITECTURE.md`. |

The repo's `ClippoEscrow.sol` was compiled and tested with Foundry and deployed with a forge script, not through Arc Studio. The app reads the escrow from `ESCROW_ADDRESS`, so one repo holds the contract, the frontend, and the other integrations. The enforcing escrow's constructor is `(usdc, treasury, owner, humanAttestor)`; on `0x1e05…26Ef` the chain returns usdc `0x3600…0000`, owner and treasury `0x8CF9…60e5`, humanAttestor `0x62Ed…5074`. The older escrow `0xc7b9…e310` returns usdc `0x3600…0000`, treasury `0x6c94…354e` and owner `0x48c5…09bD`; `0xd845…c39c` returns owner and treasury `0xE4b7…359f`. Do not quote the older values as the submission's constructor values.

---

## Deploy runbook — the steps only you can do (login + funded key)

### Step 1 — Fund a testnet wallet
Get testnet USDC at <https://faucet.circle.com> (also built into Arc Studio). USDC is the gas token on Arc.

### Step 2 — Arc Studio (gating requirement; project URL on file, enforcing escrow NOT deployed from Studio)
Web path (`studio.arc.io`): the project URL above is on file but unverified by us. The enforcing escrow was deployed with a forge script, not from Studio. To get it into Studio and deploy from there:
1. New project (or reuse the existing one) → import `contracts/src/ClippoEscrow.sol` (+ `MockUSDC.sol` for the sandbox) via the Code editor (the chat caps pastes at ~10k chars), ask Studio to compile and run the flows. Studio's generated code may differ, so import the contract and tests rather than rely on generation.
2. The constructor takes `humanAttestor`; supply it alongside usdc/treasury/owner. A Studio deploy makes a NEW escrow, so `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, the receiver pairing and the CRE `receiverAddress` would all have to be redone.
3. **Deploy to Arc testnet from Studio.** Record the **Studio project URL** and the **deployed address**.

### Step 3 — Point the app at the deployed contract
In `web/.env.local` (the deploy helper can also write these — `node scripts/deploy-arc.mjs` after a forge broadcast):
```
ESCROW_ADDRESS="0x<deployed escrow>"   # 0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef is the enforcing escrow on Arc testnet (simulation mode)
ARC_RPC_URL="https://rpc.testnet.arc.io"
ARC_CHAIN_ID="5042002"
# USDC_ADDRESS defaults to Arc USDC 0x3600…0000; override only if Studio used MockUSDC
ESCROW_DEPLOY_BLOCK="<block the escrow was deployed at>"   # required; the deployed site uses 71094327 for 0x1e05…26Ef (the escrow was created in block 71094347)
HUMAN_ATTESTOR_PRIVATE_KEY="0x<attestor key>"              # required for the core loop; its address is the constructor's humanAttestor
```
Never set `DEPLOYER_PRIVATE_KEY` on Vercel (only `scripts/deploy-arc.mjs` uses it). `UPDATER_PRIVATE_KEY` is optional (profile/referral modules).
The moment `ESCROW_ADDRESS` is a valid address, `chainConfig().enabled` flips true and chain-dependent endpoints stop answering 503 `CHAIN_NOT_CONFIGURED` and the UI uses the **real** wallet path (the `0xdemo…` fallback exists only when `NEXT_PUBLIC_DEMO` is set, which must be unset when recording). No code change needed.

### Step 4 — Run the real end-to-end flow (partly done)
Done on real Arc: the deploy script created and approved campaign 1; one CRE simulation report credited the creator (tx `0xa41f…c8409`). Not run on real Arc: funding through the app, a claim, a dispute, a close. Plan for the rest:
1. `cd web && npm run dev`, connect a wallet on Arc testnet.
2. **Fund** a campaign (approve USDC + `createCampaign`) → see the real tx on the explorer.
3. **Approve** as admin (`approveCampaign`; a pool above the owner-set threshold also needs a signed proof: the API returns `proof` and the client calls `approveCampaign(id, proof)`).
4. **Link the creator** with `registerHuman` (the backend signs with `HUMAN_ATTESTOR_PRIVATE_KEY`). Only linked wallets can be credited.
5. **Credit and claim.**
   - PerView: views are credited only by a CRE report (`reportViews`, via the receiver; the CRE workflow ran as a one-node simulation on real Arc, not as a deployed workflow). Then wait out the retention window. A claim right after approve ends in `NothingToClaim`.
   - HumanSplit: the campaigner approves the split with a signed proof (the API returns `proof`; the client calls `approveSplit(id, creators, amounts, proof)`), then the creator claims.
6. **Close**/refund the unspent pool (only after the deadline plus grace window; earlier it reverts with `DeadlineNotReached`).

### Step 5 — Record the demo (2 to 4 min, hard cap 4:00; over 4:00 is rejected)
Show: the Arc Studio project (open the URL first and check it loads and is public; say plainly what was and was not done in Studio) → the app funding → a claim only on a matured campaign or a HumanSplit (not proven) → the CRE report and the txs on `explorer.testnet.arc.io`. Narrate "USDC is the gas + settlement token." Script: `docs/DEMO_SCRIPT.md`.

> Only after `docs/architecture.svg` is updated to the current design: to turn it into a PNG for the form, open it in a browser and export, or run `npx -y svgexport docs/architecture.svg docs/architecture.png 2x`.
