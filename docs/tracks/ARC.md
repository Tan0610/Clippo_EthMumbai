# Arc track: Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio

Internal status and evidence sheet. The paste-ready text for the judges is `docs/SUBMISSION_ARC.md`. Researched 2026-10-28; prize text re-copied and status rewritten against the code and the chain on 2026-11-07. Prize $3,000 (https://ethglobal.com/events/mumbai/prizes/arc). Status words: Met / Partly / Not built for the six looking-for bullets; DONE / OPEN / UNVERIFIED for everything else.

## Current state (checked 2026-11-07 against the code and the chain)
- **Bounty entered:** "Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio", $3,000.
- **Arc Studio (requirement a): NOT demonstrated by us.** The enforcing `ClippoEscrow.sol` was written and tested in Foundry and deployed with a forge script, not in Studio. Never write that it was built in Studio. A Studio project URL is on file from a teammate's commit `943779e` (https://studio.arc.io/app/34ef3b95-32bd-48f9-9310-b8135e1d92ce). We have not opened it and cannot say what it holds. Main's older docs also said an earlier escrow `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310` was "compiled and deployed from Studio"; UNVERIFIED by us. Open actions are listed at the end of this section.
- **Deployed on Arc testnet (chain 5042002), enforcing design, simulation mode:** escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` (creation tx `0xc65b42e4998cc93d4d9bb2a363d53acf11129329fd5426feaaeb004f9de5ba03`) and report receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` (creation tx `0x4d1369931084c290dc49b92f1231672f6106668815a8c109ebdd04a85b02e522`). Both txs succeeded in block 71094347. Deployed by the owner with their own wallet, using `contracts/script/Deploy.s.sol` through `cre/scripts/arc-deploy.sh`; all 12 deploy txs succeeded. That wrapper also created and approved campaign 1 and called `registerHuman` for the demo creator, using `cast`.
- **Read back from the chain on 2026-11-07** (read-only `cast` calls to https://rpc.testnet.arc.io): chain id 5042002; escrow `reportAdapter` is the receiver; owner and treasury `0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5`; `humanAttestor` `0x62EdCF9A14F0aB803Ee154EE9709323E56655074`; token is Arc USDC `0x3600…0000`; `campaignCount` 1; campaign 1 is mode PerView, state Approved, rate 10,000,000 units per 1,000 views ($10), gross 5,000,000 (5 USDC), campaigner fee 12,500, pool 4,987,500, allocated 30,000, retention 604,800 s, grace 86,400 s, not high-value. Receiver: `workflowCheckSkipped` true, `configLocked` false, forwarder `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1` (Arc's Chainlink simulation forwarder). Demo creator `0x8CF9…60e5` has a `humanOf` entry (an attestor-signed stand-in for the World check) and `reportedViews` 3, `credited` 30,000. One wallet plays owner, treasury, campaigner and creator in this demo.
- **CRE report on real Arc:** tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`, block 71094857, status success, sent by our simulation wallet `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6` to the forwarder. Its logs hold `CreatorCredited` and `ViewsReported` from the escrow, `ReportProcessed` from the receiver, and one forwarder log. `reportedViews` 3 and credited 30,000 units = 0.03 USDC. One-node simulation, real YouTube read. Evidence file: `docs/tracks/cre-simulation-real-arc.txt`.
- **Not run on real Arc:** funding through the app, a dispute, a resolve, a claim, a close, a HumanSplit, a PoolShare, `reclaimUnapproved`, `withdrawFees`. Nothing in the app has run against a funded campaign end to end on real Arc through the UI. Nothing here is crosschain.
- **Older escrows (not the submission):** `0xd8453c22996bea11598a3dbf05112675b945c39c` (owner and treasury `0xE4b7…359f`) and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310` (treasury `0x6c94…354e`, owner `0x48c5…09bD`). Neither has `humanAttestor` (on-chain read, 2026-11-07), so neither enforces World ID or CRE in the contract. The live site's earlier escrow was `0xd845…c39c`.
- **Web app:** Next.js with API routes and Postgres, at https://clippo-cre.vercel.app, uploaded from `main` with the Vercel CLI (the Vercel project is not connected to GitHub). It points at the escrow above. https://clippo-cre.vercel.app/slips/cmw5jiz940005scec1r7rcyaz shows Confirmed views 3 with the proof link. The records behind it are seeded and labelled `[SEED]`; the views, credit and proof are real. No mobile app.
- **Tests (run 2026-11-07 on the merged tree; not re-run for this write-up):** `forge test` 114 passed (5 suites; 71 + 8 + 15 + 19 + 1 test functions in the five test files, which matches); web 325 passed, 1 skipped; CRE 26 passed.
- **Circle and Arc tools actually used:** USDC as the escrow token and as Arc's gas token (the constructor requires `decimals() == 6`); the Arc testnet RPC and explorer; the Circle faucet link (`web/src/lib/chain/config.ts`, `web/src/components/wallet.ts`). Not used anywhere in the code: CCTP, Gateway, Circle Forwarder, Circle Wallets, Paymaster, App Kit, EURC. (The word "gateway" in `web/src/lib/onramp/transak.ts` is Transak's API host, not Circle's.)
- **Open actions (Arc Studio):** (1) open the URL above, press Share, check it loads logged out, and read what it holds; or ask the teammate who added it; (2) import the current contract and tests into Studio (steps in `docs/tracks/arc-studio-prompt.md`), compile, share the project, and use that URL; (3) decide whether to deploy from Studio (this makes a new escrow and changes `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, the receiver pairing and the CRE `receiverAddress`) or keep the forge-deployed one and say so; (4) show Studio on screen in the demo.

## Sources
- Arc docs index: https://docs.arc.io/llms.txt
- Connect to Arc: https://docs.arc.io/integrate/connect-to-arc and https://docs.arc.io/arc/references/rpc-endpoints.md
- Contract addresses: https://docs.arc.io/arc/references/contract-addresses
- Arc Studio: https://docs.arc.io/ai/arc-studio.md and CLI https://docs.arc.io/ai/arc-studio-cli.md
- ETHGlobal Mumbai prizes (Arc section, read 2026-11-06): https://ethglobal.com/events/mumbai/prizes
- ETHGlobal Mumbai Arc prize (verified 2026-11-06): https://ethglobal.com/events/mumbai/prizes/arc
- ETHGlobal Cannes 2026 Arc prize (earlier event, same track idea): https://ethglobal.com/events/cannes2026/prizes/arc
- Connect to Arc (RPC host): https://docs.arc.io/arc/references/connect-to-arc.md
- Arc winners blog (judging wording): https://www.arc.io/blog/meet-the-arc-track-winners-from-ethglobal-cannes-hackathon-and-what-we-learned

## Network facts (official docs.arc.io)
| Item | Value |
| --- | --- |
| Chain ID | 5042002 |
| Primary RPC | https://rpc.testnet.arc.io (official docs; WS wss://rpc.testnet.arc.io). Set ARC_RPC_URL to override. The older host rpc.testnet.arc.network also still answers (docs.arc.network 301-redirects to docs.arc.io); a read-only `eth_chainId` call on 2026-11-07 returned 5042002 from both hosts. In this repo `.io` is the default in `scripts/deploy-arc.mjs`, `web/src/lib/chain/config.ts`, `web/src/components/wallet.ts`, `cre/project.yaml` and the `cre/scripts`; `.network` is left in the default of `cre/scripts/simulate-real-youtube.sh` and in `docs/RUNBOOK.md`. Alternates: rpc.blockdaemon / rpc.drpc / rpc.quicknode .testnet.arc.io |
| Explorer | https://explorer.testnet.arc.io (older: testnet.arcscan.app). Gas tracker at /gas-tracker |
| Faucet | https://faucet.circle.com (Studio also has a built-in faucet). Third-party report: 20 USDC per 2 h per address, UNVERIFIED |
| USDC | 0x3600000000000000000000000000000000000000 (testnet and mainnet) |
| EURC (testnet) | 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a |
| Decimals | Native gas balance 18 decimals; ERC-20 interface 6 decimals. Same balance, show one USDC row. Use only the ERC-20 interface (6) for transfers and balances |
| CCTP | domain 26; TokenMessengerV2 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA; MessageTransmitterV2 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275 |
| Gateway | GatewayWallet 0x0077777d7EBA4688BDeF3E311b846F25870A19B9; GatewayMinter 0x0022222ABE238Cc2C7Bb1f21003F0a260052475B |

Gas semantics: fees are paid in USDC, so a campaigner or creator needs only USDC. One faucet drop covers both campaign funding and gas.

## Arc Studio
- Web app: https://studio.arc.io/ (docs describe no login flow; expect an account or wallet sign-in, UNVERIFIED).
- Prompt to full-stack app: plans, generates, compiles and deploys Solidity to Arc testnet only (never mainnet), live sandbox with real testnet transactions, chat refinement, built-in faucet, wallet connect.
- Export: "Push to GitHub". CLI `@circle-fin/arc-studio-cli` (`npm i -g`, Node 20+): `arc-studio login`, `arc-studio run "<prompt>" --file src/X.sol` (uploads existing code as context; this is the import path), `arc-studio pull --out ./onchain --paths "contracts/**"` (export), `arc-studio deployments`, `arc-studio clone <public github repo>`.
- No documented "import project" button; the supported import is `--file` context or `clone`. Web UI import UNVERIFIED.
- Studio warns generated code must be reviewed before use.

## Prize text (copied 2026-11-07 from the live prize page, https://ethglobal.com/events/mumbai/prizes/arc)

> Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio, $3,000. Write, test, and deploy smart contracts in Arc Studio that demonstrate advanced programmable logic using USDC or EURC, such as conditional flows, onchain automation, or multi-step settlement. Then connect them to a web or mobile app, new or existing, without leaving Studio.

> What we're looking for: (1) Conditional escrow with onchain dispute and automatic release. (2) Programmable payroll or vesting in USDC or EURC. (3) Treasury management and payment splitting, such as revenue splits and team or DAO payouts. (4) Software-to-software payments, where one service or agent pays another. (5) Crosschain "conditional transfer" (escrow on source, release on destination via Circle Forwarder). (6) Bonus consideration for contracts designed to be reused by other builders.

> Qualification Requirements: Please be clear what bounty you are submitting for. (a) Built in Arc Studio. Include a shareable Arc Studio project URL that judges can open, and show Studio in your demo. (b) Functional MVP and diagram: a working frontend and backend plus an architecture diagram. (c) Video demonstration + presentation: succinctly outline the project's core functions and its effective use of Arc Studio and Circle's developer tools, supported by detailed documentation. (d) Link to GitHub/Replit repo.

An earlier session also quoted the Mumbai prizes overview as saying "Every Arc prize requires using Arc Studio as the starting point." That sentence is not in the text above and was not re-checked today. Treat Studio as required either way.

## Looking-for bullets: status, evidence, gap

Contract: `contracts/src/ClippoEscrow.sol` (693 lines). Receiver: `contracts/src/ClippoReportReceiver.sol` (178 lines). Tests: `contracts/test/ClippoEscrow.t.sol` (71 test functions), `ClippoReportReceiver.t.sol` (19).

| # | Bullet | Status | Code (function) | Tests | Ran on real Arc | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Conditional escrow, onchain dispute, automatic release | **Met** | `createCampaign`, `approveCampaign` (two overloads), `rejectCampaign`, `reclaimUnapproved`, `reportViews`, `disputeCredits`, `resolveDispute`, `claim`, `claimFor`, `closeCampaign` | `test_dispute_upheld_returnsCreditsToPool`, `test_dispute_blocksClaimWhileOpen_thenDeniedReleases`, `test_dispute_lapses_automaticRelease`, `test_dispute_afterClose_refundsCampaigner_notAdmin`, `test_dispute_cannotTouchMaturedOrOlderOrAskTwice`, `test_dispute_access`, `test_retention_*`, `test_claimFor_paysOnlyTheCreator`, `test_reclaimUnapproved_afterDeadlineOnly`, `testFuzz_disputeKeepsBooksBalanced`, `testFuzz_claimConservesFunds` | create, approve, `registerHuman`, one `reportViews` credit | "Automatic" means credits mature and disputes lapse by timestamp with no transaction. Money still moves only when someone sends `claim`/`claimFor`/`closeCampaign`. Disputes cover PerView only. Dispute, claim, close not run on Arc. |
| 2 | Programmable payroll or vesting | **Partly** | `reportViews` (rate x delta), `_pushTranche`, `_maturedTranches`, `_release`, `claimable`, `pendingTotal`, `tranches`, `setRetentionPeriod` | `test_perView_*`, `test_retention_blocksClaimUntilMatured`, `test_retention_tranchesMatureIndependently`, `test_retention_sameDayCreditsMergeAndDelay`, `test_retention_configBounds`, `test_owner_cannotShortenRetentionOfLiveCampaign`, `testFuzz_perView_neverExceedsPool` | one credit (0.03 USDC); no claim | No payroll schedule, cliff, linear vesting or recurring pay. Same-UTC-day credits share one tranche. Retention does not apply to HumanSplit (`test_retention_doesNotApplyToHumanSplit`). USDC only. |
| 3 | Treasury management and payment splitting | **Met** (splits), **Partly** (treasury) | `approveSplit`, `_creditSplit`, `closeCampaign` (PoolShare), `setFees`, `setTreasury`, `withdrawFees`, `treasuryAccrued` | `test_humanSplit_campaignerAlone`, `test_humanSplit_secondApproverRequired`, `test_split_twoApproversMustBeTwoHumans`, `test_split_needsRealFreshAttestation`, `test_poolShare_proportionalAtClose`, `test_poolShare_unevenWeights`, `test_claim_creatorFeeMath_and_doubleClaim`, `test_feeSnapshotPerCampaign`, `test_setFees_maxAndAccess`, `test_zeroFees`, `test_withdrawFees_emptyReverts` | no | Treasury is fee accounting only: campaigner fee accrues on approval, creator fee at claim, `withdrawFees` sends it out. No budgets, yield, vesting or DAO voting. No HumanSplit or PoolShare run on Arc. `withdrawFees` and `reclaimUnapproved` have no UI or API; call them from a wallet. |
| 4 | Software-to-software payments | **Partly** | `ClippoReportReceiver.onReport` (forwarder, then `reportViews`); `cre/workflows/clippo-settlement/main.ts`; `web/src/lib/chain/clippo-wallet.ts` `claimFor`; agent proposes only (`web/src/app/api/campaigns/[id]/split/propose/route.ts`) | `contracts/test/ClippoReportReceiver.t.sol` (19), `test_perView_batchViaAdapterSkipsBadItems`, `test_perView_onlyAdapterCanReport`, `test_admin_cannotReportViewsOrSwapCre`, CRE tests (26) | yes: tx `0xa41f…c8409`, one-node simulation through the test forwarder | A service triggers a credit; no service pays another from its own funds. The simulation is not a deployed workflow, and shows no Chainlink node signatures. Receiver is not locked. |
| 5 | Crosschain conditional transfer | **Not built** | none | none | no | No source escrow, no destination release, no Circle Forwarder, CCTP or Gateway call anywhere in the code. A CCTP deposit path is described in this file only (see "CCTP deposit path (doc only)"). |
| 6 | Reusable by other builders (bonus) | **Partly** | constructor `(usdc, treasury, owner, humanAttestor)`; `setReportAdapter` (one time); `contracts/abi/*.json`; `contracts/README.md` | all 114 | n/a | Not packaged as a library or template. Built around views and a World ID attestor key. Mock 6-decimal USDC in tests; Arc USDC on chain; EURC not tried. |

### Which functions the web app calls (checked in `web/src/lib/chain/*` and `web/src/app/api/*`)

| Function | Web path |
| --- | --- |
| `createCampaign` | `fundCampaign` in `client.ts` (USDC `approve` first), then `POST /api/campaigns/[id]/fund` checks the receipt on-chain |
| `approveCampaign` | `approveCampaignOnchain` in `client.ts`; high-value pools use the signed proof from `POST /api/campaigns/[id]/attest` |
| `rejectCampaign` | `rejectCampaignOnchain` |
| `reportViews` | CRE only, via the receiver. The indexer (`indexer.ts`, events `ViewsReported`, `CreatorCredited`) stores the result as Confirmed views |
| `approveSplit` | `approveSplit` in `client.ts` after `POST /api/campaigns/[id]/split` |
| `disputeCredits`, `resolveDispute` | `client.ts`; UI `components/OnchainDisputes.tsx` (in `DeskView` for the campaigner, `BenchView` for the admin); `GET /api/chain/disputes` reads the state from the escrow |
| `closeCampaign` | `closeCampaignOnchain` (UI in `DeskView`) |
| `claimFor` | `POST /api/payouts/[id]/claim`: Clippo's backend wallet (`HUMAN_ATTESTOR_PRIVATE_KEY`) sends it and pays the gas; the contract can only pay the creator. A creator may instead pass the hash of their own `claim` tx |
| `registerHuman` | `clippoWallet().ensureHuman`, called from `POST /api/worldid/verify` and the split route |
| `reclaimUnapproved`, `withdrawFees`, owner setters | not wired; ABI only |

## Qualification requirements: status

| | Requirement | Status |
| --- | --- | --- |
| Bounty named | State which bounty | DONE in `docs/SUBMISSION_ARC.md`. Also write it in the form |
| (a) | Built in Arc Studio, shareable project URL, Studio shown in demo | **OPEN, not demonstrated.** URL on file (`943779e`), unverified. Enforcing escrow built in Foundry and deployed by forge script. See Current state for the open actions |
| (b) | Functional MVP (frontend and backend) | DONE: web app and API deployed. Not proven: a funded campaign end to end through the UI on real Arc |
| (b) | Architecture diagram | DONE: `docs/architecture.svg` was redrawn on 2026-11-07 for the current design (checked by rendering it in a browser) and `docs/ARCHITECTURE.md` has the Mermaid versions. OPEN: export the SVG to PNG for the form. |
| (c) | Video and presentation naming Studio and Circle tools | OPEN, not recorded. Rule: 2 to 4 minutes, hard cap 4:00, at least 720p, no AI voiceover, not sped up (`docs/DEMO_SCRIPT.md`) |
| (d) | GitHub or Replit link | DONE: https://github.com/Tan0610/Clippo_EthMumbai (the `origin` remote). Public visibility not verified by us; clone with `--recurse-submodules` |

Superseded: the earlier requirements table, inferred from the Cannes 2026 page and the PRD (including "CCTP/Gateway/Forwarder named in track text" and the judging-blog criteria), was replaced on 2026-11-06 and again today. CCTP and Gateway remain a doc-only path below, not built.

## Arc Studio plan (for the enforcing escrow; nothing below has been run by us)
Judges need a shareable Studio project URL and the prize says contracts are written, tested and deployed in Studio, so:
1. Install the CLI (Node 20+): `npm install -g @circle-fin/arc-studio-cli`; `arc-studio login` (browser device link, human action).
2. Import option A, upload files as editable round trip: `arc-studio run "Review, test and deploy this conditional escrow on Arc testnet" --file src/ClippoEscrow.sol:contracts/ClippoEscrow.sol` (Solidity under `contracts/`, web code under `src/`). Limits: 100 files, 1 MB each, 10 MB total, prompt max 10,000 chars, `.env` refused.
3. Import option B: `arc-studio clone <owner>/<repo>` clones a PUBLIC GitHub repo server-side (run one turn first so a live sandbox exists).
4. Have Studio iterate, test and deploy the escrow to Arc testnet; check with `arc-studio apps --json`, `arc-studio deployments`, `arc-studio open`; export with `arc-studio pull`.
5. Record the Studio project URL; keep the repo as the source of truth and re-sync.
6. Fund the deployer from https://faucet.circle.com (the 20 USDC per 2 hours cap is a third-party report, UNVERIFIED).
7. Show Studio in the demo video and say which bounty is entered.

## Arc-specific gotchas (official Arc docs, fetched 2026-11-06)
- USDC is the gas token. Minimum base fee is 20 Gwei, so transactions must set `maxFeePerGas >= 20 Gwei`.
- Web client fee handling: `web/src/lib/chain/client.ts` and `signer.ts` call viem `writeContract` with no explicit fee params, so viem derives fees from the node (EIP-1559 estimate: roughly 2 x baseFee plus priority fee, which should clear a 20 Gwei base fee). This was NOT tested against Arc; if a transaction is rejected as underpriced, add `maxFeePerGas: 20_000_000_000n` (or higher) to the write calls. Browser wallets estimate on their own.
- Sending to `address(0)` reverts on Arc.
- Do not mix 6-decimal (ERC-20 USDC) and 18-decimal (native gas balance) amounts.
- Arc docs recommend `arc-forge` / `arc-cast` (Arc Foundry fork; install: https://docs.arc.io/arc/tutorials/install-arc-foundry.md). Docs deploy example: `arc-forge create src/X.sol:X --rpc-url $ARC_TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast`. Plain `forge script ... --broadcast` deployed our contracts to real Arc on 2026-11-07 (`cre/scripts/arc-deploy.sh`); `arc-forge` was not used.
## Deploy and verify (exact commands)
Prereqs: testnet-only deployer key funded at https://faucet.circle.com (USDC is gas). Required env (exact names Deploy.s.sol reads): ADMIN_ADDRESS, UPDATER_ADDRESS, FORWARDER_ADDRESS and HUMAN_ATTESTOR_ADDRESS (the backend key that signs World ID attestations; it is immutable in the escrow, so choose it before deploying), plus EXPECTED_WORKFLOW_OWNER unless INSECURE_SKIP_WORKFLOW_CHECK=true (the script lists missing ones up front). FORWARDER_ADDRESS is the Chainlink forwarder for Arc testnet from the CRE docs (UNVERIFIED as the right one for a deployed workflow; the real-Arc deploy of 2026-11-07 used Arc's simulation forwarder `0x6E9E…eDc1`; any address works for a non-CRE demo).

```bash
export PATH="$HOME/.foundry/bin:$PATH"
cd contracts && forge build && forge test
export ADMIN_ADDRESS=0x... UPDATER_ADDRESS=0x... FORWARDER_ADDRESS=0x... HUMAN_ATTESTOR_ADDRESS=0x...
export EXPECTED_WORKFLOW_OWNER=0x...   # CRE workflow owner; REQUIRED (receiver fails closed). Optional: EXPECTED_WORKFLOW_ID (bytes32), EXPECTED_WORKFLOW_NAME (bytes10)
# simulation-only alternative (mock forwarder passes no metadata): export INSECURE_SKIP_WORKFLOW_CHECK=true   # NEVER for production
# optional: TREASURY_ADDRESS CAMPAIGNER_FEE_BPS=25 CREATOR_FEE_BPS=25 (max 50 each) RETENTION_SECONDS GRACE_SECONDS HIGH_VALUE_THRESHOLD
export PRIVATE_KEY=0x...   # testnet only, local shell only (deploy-arc.mjs also accepts DEPLOYER_PRIVATE_KEY); forge reads it via --private-key, Deploy.s.sol does not. Never set it on Vercel
forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.arc.io \
  --private-key $PRIVATE_KEY --broadcast
# verify (explorer assumed Blockscout-style, UNVERIFIED; fall back to the explorer UI)
forge verify-contract <ESCROW_ADDR> src/ClippoEscrow.sol:ClippoEscrow --chain-id 5042002 \
  --verifier blockscout --verifier-url https://explorer.testnet.arc.io/api/ \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address)" 0x3600000000000000000000000000000000000000 $TREASURY_ADDRESS <DEPLOYER> $HUMAN_ATTESTOR_ADDRESS)
```
One-shot from repo root, which also writes config:
```bash
node scripts/deploy-arc.mjs --deploy     # forge script --broadcast --verify, then writes env
node scripts/deploy-arc.mjs              # only (re)write env from the last broadcast log
node scripts/deploy-arc.mjs --dry        # print only
```
It upserts ESCROW_ADDRESS, ESCROW_DEPLOY_BLOCK, REFERRAL_ADDRESS, PROFILE_ADDRESS, REPORT_RECEIVER_ADDRESS, ARC_RPC_URL, ARC_CHAIN_ID in web/.env.local, and sets `evm.receiverAddress` only in cre/workflows/clippo-settlement/config.staging.json (the local anvil fork config). Edit `config.production.json` by hand. The helper's cre/project.yaml step looks for a `REPLACE-WITH-ARC-TESTNET-RPC` placeholder that no longer exists there (the file already has a URL), so it changes nothing. ESCROW_DEPLOY_BLOCK is required with the new escrow. The helper itself defaults ARC_RPC_URL to rpc.testnet.arc.io. Deploy.s.sol reverts off chain 5042002 unless ALLOW_ANY_CHAIN=true. The real-Arc deploy of 2026-11-07 used `cre/scripts/arc-deploy.sh` (this forge script in simulation mode, plus one demo campaign); see `docs/CRE_DEPLOY.md`.

## CCTP deposit path (doc only)
A campaigner holding USDC on another chain bridges to Arc with CCTP V2 (domain 26) or App Kit Bridge (https://docs.arc.io/app-kit/bridge.md), using the Forwarding Service (https://docs.arc.io/app-kit/tutorials/bridge/use-forwarding-service.md) to mint straight to their Arc address, then approves and calls `createCampaign`. A hook contract that calls createCampaign on mint is a later add-on.


## Point the app at the deployed contract
In `web/.env.local` (the deploy helper can also write these: `node scripts/deploy-arc.mjs` after a forge broadcast). On Vercel the same names are set as project variables (names only here, no values):
```
ESCROW_ADDRESS="0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef"   # enforcing escrow on Arc testnet (simulation mode)
ARC_RPC_URL="https://rpc.testnet.arc.io"
ARC_CHAIN_ID="5042002"
# USDC_ADDRESS defaults to Arc USDC 0x3600…0000; override only for a mock token
ESCROW_DEPLOY_BLOCK="71094327"    # what the deployed site uses; the escrow was created in block 71094347
HUMAN_ATTESTOR_PRIVATE_KEY="0x…"  # required for the core loop; its address is the escrow's humanAttestor. It also pays gas for claimFor and registerHuman
```
Never set `DEPLOYER_PRIVATE_KEY` or `CRE_ETH_PRIVATE_KEY` on Vercel. `UPDATER_PRIVATE_KEY` is optional (profile and referral modules). The moment `ESCROW_ADDRESS` is a valid address, `chainConfig().enabled` is true (`web/src/lib/chain/config.ts`), chain endpoints stop answering 503 `CHAIN_NOT_CONFIGURED`, and the UI uses the real wallet path. The `0xdemo…` fallback exists only when `NEXT_PUBLIC_DEMO` is set; leave it unset when recording.

Campaign 1 on Arc was created by the deploy wrapper with `metadataURI` `ipfs://clippo-cre-demo-1`. The indexer links an on-chain campaign to a database row only when the URI is `clippo://campaign/<id>` (`campaignIdFromUri` in `web/src/lib/chain/indexer.ts`), so the site's record for campaign 1 is seeded, not indexed from `CampaignCreated`. This matches the `[SEED]` labels.

## Plan for the first full run on real Arc (not done)
Goal: record dispute, claim and close tx hashes. Owner wallet needed. Arc USDC is the gas token, so the owner wallet needs a little USDC too.
1. Optional, to shorten the waits: `setRetentionPeriod` (for example 300 s) and `setGracePeriod` (for example 0). New campaigns snapshot these; campaign 1 does not change.
2. Through the web app (`cd web && npm run dev`, wallet on Arc testnet): create and fund a PerView campaign with a short deadline (`CAMPAIGN_DEADLINE_SECONDS`), approve it as admin.
3. Link the creator wallet with `registerHuman` (the backend signs with `HUMAN_ATTESTOR_PRIVATE_KEY`). Only linked wallets can be credited.
4. Run the CRE simulation again so the creator gets a credit: `bash cre/scripts/simulate-arc-real.sh <video id> <youtube channel id>`. The script reads `CAMPAIGN_ID` from `cre/scripts/.arc-deploy.env`, which holds campaign 1, so point it at the new campaign first. Leave campaign 1 alone: the site's evidence page depends on it.
5. As campaigner, `disputeCredits` inside the window; as admin, `resolveDispute`. Run a second credit and let it mature, then `claimFor` through the app.
6. After deadline plus grace, `closeCampaign`.
7. Write every tx hash into `docs/SUBMISSION_ARC.md` and `docs/BUILD_LOG.md`. Until then these steps are "not run".
## Unverified
Whether Arc Studio can run the Foundry tests or accept a pinned external contract (we have not tried it; what the Studio project on file holds is unverified by us); judging weights (the page lists none beyond qualification); Studio login and web import UI; blockscout verifier path; faucet cap; Chainlink forwarder address on Arc; Circle USDC blacklisting could make claim/refund revert for a blocked address; whether the GitHub repo is public; whether the Studio project on file loads logged out; whether any funded campaign works end to end through the web UI on Arc (dispute, claim, close, HumanSplit, PoolShare were only run in Foundry tests); whether the 20 Gwei minimum base fee needs explicit fee params in the web writes (see gotchas); EURC (the contract only checks 6 decimals; never tried).
