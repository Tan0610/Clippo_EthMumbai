# Arc submission: Clippo

**Bounty:** Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio ($3,000).

**One-liner:** Clippo is a clipping-campaign marketplace. Sponsors lock USDC in an escrow contract on Arc. A Chainlink CRE workflow reports verified views. The contract credits creators, holds each credit for a retention window, lets the sponsor dispute it, and pays out only to the creator who earned it.

**Plain status (checked 2026-11-07):**
- Built and tested: the escrow contract, a report receiver for CRE, a Next.js frontend and API.
- Deployed on Arc testnet and read back from the chain.
- Not built: the crosschain conditional transfer (bullet 5).
- Not shown yet: that we built or deployed the contract in Arc Studio (requirement a). We wrote and tested it in Foundry and deployed it with a forge script.

## What they asked -> what we built -> where

Contract file: `contracts/src/ClippoEscrow.sol`. Tests: `contracts/test/ClippoEscrow.t.sol`.

| # | What they asked | What we built | Where (file and function) | Status |
| --- | --- | --- | --- | --- |
| 1 | Conditional escrow with onchain dispute and automatic release | Funds are locked at `createCampaign`. Nothing can be credited or claimed until an admin approves. Admin reject, or `reclaimUnapproved` after the deadline, refunds in full. Per-view credits sit in time tranches. The campaigner disputes a creator's credits that are still in the window; an admin rules. With no ruling inside one retention period, the credits release on their own. Matured credits need no approval; the creator, or anyone through `claimFor`, pulls them and the money can only go to the creator. Anyone can `closeCampaign` after deadline plus grace to return the unspent pool. | `approveCampaign`, `rejectCampaign`, `reclaimUnapproved`, `reportViews`, `disputeCredits`, `resolveDispute`, `claim`, `claimFor`, `closeCampaign`; internals `_pushTranche`, `_maturedTranches`, `_disputeActive`. Tests: `test_dispute_*`, `test_retention_*`, `test_claimFor_*`, `test_reclaimUnapproved_afterDeadlineOnly`, `testFuzz_disputeKeepsBooksBalanced`, `testFuzz_claimConservesFunds` | **Met** in code and Foundry tests. Release is pull-based: someone must send the claim transaction. On real Arc we ran create, approve, human link and one CRE credit. A dispute, a claim and a close have not run on Arc. |
| 2 | Programmable payroll or vesting in USDC or EURC | Pay per view: each creator is credited `delta views x ratePer1kViews / 1000`, capped by the pool. Credits unlock after a retention window (0 to 30 days, default 7, fixed per campaign at creation). USDC only. Not built: payroll schedule, cliff, linear vesting, recurring pay. | `reportViews`, `_pushTranche`, `_maturedTranches`, `claimable`, `setRetentionPeriod`. Tests: `test_perView_*`, `test_retention_*`, `testFuzz_perView_neverExceedsPool` | **Partly**: a time lock on earned credits, not a vesting or payroll schedule. |
| 3 | Treasury management and payment splitting (revenue splits, team or DAO payouts) | Two ways to split a pool across many creators. `HumanSplit`: the campaigner lists creators and amounts; each approval is a one-time EIP-712 approval signed by Clippo's attestor key after a World ID check, bound to that exact split and approver; an optional second approver (an admin) must be a different human. `PoolShare`: CRE-reported views become weights and `closeCampaign` splits the whole pool pro rata. Fees: the campaigner fee is held at funding and accrues to the treasury on approval; the creator fee is taken at claim; both are owner-set and capped at 50 bps; `withdrawFees` pays the treasury. Not built: treasury budgets, yield, DAO voting. | `approveSplit`, `_creditSplit`, `closeCampaign`, `setFees`, `setTreasury`, `withdrawFees`. Tests: `test_humanSplit_*`, `test_poolShare_*`, `test_claim_creatorFeeMath_and_doubleClaim`, `test_feeSnapshotPerCampaign`, `test_zeroFees` | **Met** for splits. **Partly** for treasury: fee accounting only. Not run on real Arc. |
| 4 | Software-to-software payments (one service or agent pays another) | A CRE workflow (software) reads YouTube, builds a report and sends it through the forwarder to `ClippoReportReceiver.onReport`, which calls `ClippoEscrow.reportViews`. No human is in that path. The receiver accepts only the configured forwarder; outside simulation mode it also checks the workflow owner (and optionally id and name). Clippo's backend wallet also calls `claimFor` to pay a creator. An AI agent can propose a split, but a human must approve it. Not built: a contract where one service pays another from its own funds. | `ClippoReportReceiver.onReport`; `cre/workflows/clippo-settlement/main.ts`; `web/src/lib/chain/clippo-wallet.ts` (`claimFor`); `web/src/app/api/campaigns/[id]/split/propose/route.ts` (agent proposes only). Tests: `contracts/test/ClippoReportReceiver.t.sol`, `test_perView_batchViaAdapterSkipsBadItems` | **Partly**. The automated credit ran on real Arc as a one-node simulation (our wallet sent the report through Arc's Chainlink test forwarder). No workflow is deployed. |
| 5 | Crosschain conditional transfer (escrow on source, release on destination via Circle Forwarder) | Nothing. No source-chain escrow, no destination release, no CCTP, Gateway or Circle Forwarder in the code. | None | **Not built** |
| 6 | Bonus: contracts reusable by other builders | `ClippoEscrow` and `ClippoReportReceiver` are standalone Solidity files on OpenZeppelin v5.7. They use custom errors and events, have exported ABIs (`contracts/abi/`), a README (`contracts/README.md`) and 114 Foundry tests across 5 suites. The constructor takes token, treasury, owner and attestor; the report adapter is any contract, set once. Limits: not packaged as a library; shaped around Clippo's model (views, a World ID attestor key); tested with a mock 6-decimal USDC in Foundry and with Arc USDC on chain, not with EURC. | `ClippoEscrow` constructor, `setReportAdapter`; `contracts/abi/*.json`; `contracts/README.md` | **Partly** |

## Qualification requirements

| | Requirement | Status |
| --- | --- | --- |
| (a) | Built in Arc Studio, shareable Studio project URL judges can open, Studio shown in the demo | **Not demonstrated.** The escrow was written and tested in Foundry and deployed with `forge script`, not in Studio. A Studio URL is on file from a teammate's commit (https://studio.arc.io/app/34ef3b95-32bd-48f9-9310-b8135e1d92ce). We have not opened it and cannot say what it contains. Not submitted as proof until checked. See open items. |
| (b) | Functional MVP (frontend and backend) and architecture diagram | **Frontend and backend: Met** (Next.js app, API routes, Postgres, deployed at https://clippo-cre.vercel.app; no mobile app). The deployed page for campaign 1 shows the real CRE result. **Not proven:** a funded campaign run end to end through the UI on real Arc. **Diagram: Met.** `docs/architecture.svg` was redrawn on 2026-11-07 for the current design; `docs/ARCHITECTURE.md` has the Mermaid versions. Export the SVG to PNG for the form. |
| (c) | Video demonstration and presentation covering core functions and use of Arc Studio and Circle tools | **Not recorded.** Limit 4:00. Outline below. |
| (d) | GitHub or Replit repo link | **Met:** https://github.com/Tan0610/Clippo_EthMumbai (the `origin` remote). Public visibility not verified by us. |

Circle and Arc tools used: USDC as the escrow token and as Arc's gas token (fees are paid in USDC), the Arc testnet RPC and explorer, the Circle faucet. Not used: CCTP, Gateway, Circle Forwarder, Circle Wallets, Paymaster, EURC.

## Evidence

All on Arc testnet (chain 5042002). Explorer links: `https://explorer.testnet.arc.io/tx/<hash>` and `/address/<addr>`.

| Item | Value |
| --- | --- |
| ClippoEscrow | [`0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`](https://explorer.testnet.arc.io/address/0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef). Creation tx [`0xc65b42e4998cc93d4d9bb2a363d53acf11129329fd5426feaaeb004f9de5ba03`](https://explorer.testnet.arc.io/tx/0xc65b42e4998cc93d4d9bb2a363d53acf11129329fd5426feaaeb004f9de5ba03), block 71094347 |
| ClippoReportReceiver | [`0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd`](https://explorer.testnet.arc.io/address/0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd). Creation tx [`0x4d1369931084c290dc49b92f1231672f6106668815a8c109ebdd04a85b02e522`](https://explorer.testnet.arc.io/tx/0x4d1369931084c290dc49b92f1231672f6106668815a8c109ebdd04a85b02e522), block 71094347 |
| How it was deployed | `forge script contracts/script/Deploy.s.sol` with the owner's own wallet, run through `cre/scripts/arc-deploy.sh`. All 12 deploy transactions succeeded. That wrapper then created and approved campaign 1 (`createCampaign`, `approveCampaign`) and linked the demo creator wallet (`registerHuman`) with `cast`. None of this was done in Arc Studio. |
| Roles | Owner, admin and treasury: [`0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5`](https://explorer.testnet.arc.io/address/0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5). `humanAttestor`: `0x62EdCF9A14F0aB803Ee154EE9709323E56655074`. Token: USDC `0x3600000000000000000000000000000000000000`. The escrow's `reportAdapter` is the receiver. The demo uses one wallet as owner, campaigner and creator. |
| Receiver mode | **Simulation, on purpose.** Forwarder is Arc's Chainlink simulation forwarder `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`. `workflowCheckSkipped` is true and the config is not locked. A production setup would turn the skip off and call `lockConfig`. |
| Campaign 1 | PerView, $10 per 1,000 views, 5 USDC funded, approved. The demo creator wallet is registered as a human with an attestor-signed stand-in for the World ID check. |
| CRE report on real Arc | Tx [`0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`](https://explorer.testnet.arc.io/tx/0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409), block 71094857, success. `reportedViews` 3, credited 30000 units = 0.03 USDC. Events: `CreatorCredited` and `ViewsReported` from the escrow, `ReportProcessed` from the receiver. One-node simulation, real YouTube read, report sent by our own simulation wallet. Output: `docs/tracks/cre-simulation-real-arc.txt` |
| Live app | https://clippo-cre.vercel.app, uploaded from `main` with the Vercel CLI (the Vercel project is not connected to GitHub). Page https://clippo-cre.vercel.app/slips/cmw5jiz940005scec1r7rcyaz shows Confirmed views 3 with the proof link. Users, channels, campaigns and clips behind it are seeded and labelled `[SEED]`. The views, credit and proof are real. |
| Tests | Run 2026-11-07 on the merged tree: `forge test` 114 passed (5 suites); web 325 passed, 1 skipped; CRE 26 passed. |
| Older escrows (not submitted) | Two older-design escrows also exist on Arc testnet: `0xd8453c22996bea11598a3dbf05112675b945c39c` and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`. They have no `humanAttestor`, no disputes and no `claimFor`. |

## Architecture diagram

`docs/architecture.svg` (redrawn 2026-11-07 for the current design). Current Mermaid diagrams and the money-flow sequence: `docs/ARCHITECTURE.md`.

## Demo outline (limit 4:00; aim for 3:45)

Only show what has run. Say plainly what has not.

| Time | Show | Say |
| --- | --- | --- |
| 0:00 | Landing page | One line on Clippo and the bounty name. |
| 0:15 | Arc Studio project | **Only if the open items below are done.** Otherwise say the contract was written and tested in Foundry and deployed with a forge script. |
| 0:45 | `ClippoEscrow.sol` in the editor | Walk the flow: fund, approve, CRE report, tranches, `disputeCredits`, `resolveDispute`, `claimFor`. State which parts ran on Arc. |
| 1:30 | Terminal: `forge test` | 114 passed. Name the dispute and retention tests. |
| 2:00 | Explorer: escrow, creation tx, CRE tx | Show the three events in the CRE tx. Say it is a one-node simulation through the test forwarder. |
| 2:45 | https://clippo-cre.vercel.app slip page | Confirmed views 3 and the proof link. Say the records are seeded and the views, credit and proof are real. |
| 3:15 | Architecture diagram | Name the pieces. Say crosschain is not built. |
| 3:35 | Close | USDC is the settlement and gas token. Repo link. |

## Links

- Repo: https://github.com/Tan0610/Clippo_EthMumbai
- Live app: https://clippo-cre.vercel.app
- Escrow: https://explorer.testnet.arc.io/address/0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef
- Prize page: https://ethglobal.com/events/mumbai/prizes/arc
- Arc Studio project URL: OPEN (see below)
- Demo video: `<VIDEO_URL>` OPEN, not recorded

## Open items

1. **Arc Studio (requirement a).** Either import the current contract into Studio, compile, test and share the project, then use that public URL; or ask the teammate what the existing URL holds. Open it, press Share, check it loads logged out. Do not say "built in Arc Studio" unless this is done. A Studio deploy would be a new escrow: the app's `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, the receiver pairing and the CRE `receiverAddress` would all change. Import steps: `docs/tracks/arc-studio-prompt.md`.
2. **Show Studio in the video** (requirement a, c).
3. **Record the video** (4:00 maximum, 720p or better, no AI voiceover, not sped up).
4. **Diagram.** Export the redrawn `docs/architecture.svg` to PNG for the form.
5. **Run dispute, claim and close on real Arc** (not done). Needs the owner wallet: lower retention and grace with `setRetentionPeriod` and `setGracePeriod`, create a short campaign, send another CRE report, then dispute, resolve, claim and close. Record the tx hashes here.
6. **Run one funded campaign through the web UI on real Arc** (not done).
7. **Repo visibility.** Confirm the repo is public and the merged work is on the branch judges see.
8. **Bullet 5 (crosschain)** stays not built. Say so; do not claim it.
