# Track: Chainlink CRE ("Best workflow with CRE", $1,500, ETHGlobal Mumbai)

Owner dir: `cre/` (plus `web/scripts/freeze-snapshot.mjs` and `web/src/app/api/snapshots/daily`). Researched and built 2026-10-28; simulation output re-captured 2026-11-06 (after commit 6f74f7b, which made the workflow simulate for real).

## Status on 2026-11-06 (read this first)

- Run: `cre workflow simulate` (CLI v1.39.0) with the cron and HTTP triggers. Output is in `docs/tracks/cre-simulation-output.txt`.
  - Live feed (`production-settings`, no broadcast): exits 0 with "no-op: empty snapshot". `https://clippo-six.vercel.app/api/snapshots/daily` returns `rows: []` today.
  - `--broadcast` (`staging-settings`): ran only on a local anvil FORK of Arc, with a MOCK feed, against a fresh local deploy of the current contracts. The escrow credited the mock creators there.
- Not done: nothing was broadcast to real Arc. No workflow is deployed (needs Early Access). `config.production.json` still has a zero `receiverAddress`. The simulator is single-node, so no real multi-node consensus ran and the mock forwarder checks no DON signatures.
- Data source: the workflow reads Clippo's own frozen snapshot feed (`/api/snapshots/daily`), not YouTube. Clippo fills that feed by polling YouTube; the live site has no `YOUTUBE_API_KEY`, so no real view data has gone through this path.
- Escrow on Arc: the enforcing escrow (commit 498f649: CRE-only `reportViews`, World ID `humanOf`, disputes) is NOT deployed anywhere. The live site (`/api/chain/config`) points at the old-design escrow `0xd8453c22996bea11598a3dbf05112675b945c39c`; `docs/SUBMISSION_ARC.md` cites a different old one, `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`. Neither enforces the CRE-only path. Real-Arc delivery of CRE reports is not proven.
- Trust claim, stated honestly: the contract design makes `reportViews` callable only by the one-time-set `reportAdapter` (the receiver), and the receiver accepts only the forwarder (plus the expected workflow owner outside simulation). That is what the code and tests show, and the fork run exercised it with the mock forwarder. A trust-minimised multi-node DON signing the report is not demonstrated.

## Prize requirements (source: https://ethglobal.com/events/mumbai/prizes, "Best workflow with CRE", $1,500; page read 2026-11-06)

> Goal: Build, simulate, or deploy a CRE Workflow that's used as an orchestration layer within your project. Note : It is NOT mandatory to deploy it during the hackathon, simulation is enough!
> Your workflow should: Integrate at least one blockchain with an external API, system, data source, LLM, or AI agent. Demonstrate a successful simulation (via the CRE CLI) or a live deployment on the CRE network. Be meaningfully used in your project.

The page lists no separate judging criteria. Video rule (2 to 4 minutes, hard cap 4:00): see `docs/DEMO_SCRIPT.md`. So the proof judges need is `cre workflow simulate` output (or a live deployment): `docs/tracks/cre-simulation-output.txt` holds the real CLI output. `scripts/capture-evidence.sh` (emulation) is separate supporting evidence, NOT the CLI simulation.

## Current CRE facts (docs.chain.link/cre, fetched 2026-10-28)

| Item | Finding |
| --- | --- |
| CLI | `cre` v1.39.0. Windows native: `irm https://app.chain.link/cre/install.ps1 \| iex`, or the zip from https://github.com/smartcontractkit/cre-cli/releases (verify checksum). |
| Verified locally | Downloaded `cre_windows_amd64.zip` v1.39.0, SHA-256 `bce12d90866edf6125664129e1b241f98c823ef577ed6530232053bdf1b86c64` matches the GitHub release digest. `cre version` runs. |
| Runtime deps | Bun >= 1.2.21 (SDK compiles with bun + Javy to WASM). bun 1.4.4 installed via npm in a scratch dir. |
| TS SDK | `@chainlink/cre-sdk` 1.23.0 (latest on npm; already in `cre/package.json`). |
| Account | Free account at https://app.chain.link/cre. **`cre init` and `cre workflow simulate` both refuse to run unless logged in (`cre login`, browser + 2FA) or `CRE_API_KEY` is set.** Observed on 2026-10-28 (before login): both aborted with "Authentication required". |
| Deploy | `cre workflow deploy` needs Early Access deploy approval (`cre account access` or https://cre.chain.link/request-access). Simulation does not. |
| Arc support | **Arc Testnet is supported** (chain name `arc-testnet`, in SDK 1.23 selectors). Forwarders (https://docs.chain.link/cre/guides/workflow/using-evm-client/supported-networks-ts): simulation MockKeystoneForwarder `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`, production KeystoneForwarder `0x76c9cf548b4179F8901cda1f8623568b58215E62`. Docs: confirm tenant availability with `cre workflow supported-chains` after login. |
| Sim flags | `cre workflow simulate <dir> --target <t> [--non-interactive --trigger-index N] [--http-payload JSON or @file] [--broadcast]`; `CRE_ETH_PRIVATE_KEY` in `.env` for writes; without `--broadcast` writes are a dry run. |
| Config shape | `project.yaml`: `<target>: { rpcs: [{chain-name, url}] }` (`account.workflow-owner-address` is multisig-only/optional). `workflow.yaml`: `<target>: { user-workflow.workflow-name, workflow-artifacts.{workflow-path,config-path,secrets-path} }`. |
| Consensus | `consensusMedianAggregation`, `consensusIdenticalAggregation`, `consensusCommonPrefixAggregation`, `ConsensusAggregationByFields({field: median/identical/commonPrefix/ignore})`. |
| Write path | `runtime.report({encodedPayload, encoderName:"evm", signingAlgo:"ecdsa", hashingAlgo:"keccak256"})` then `EVMClient.writeReport(runtime,{receiver, report, gasConfig})`; the forwarder calls `IReceiver.onReport(metadata, report)`. Check both `txStatus` and `receiverContractExecutionStatus`. |
| Triggers | Cron (6-field) and HTTP (`authorizedKeys` required for deployed workflows; none for simulation). One HTTP handler max per workflow. |

Doc caveat: the simulate docs say the simulator's mock forwarder "doesn't call your onReport()". We tested the Arc mock forwarder on-chain (anvil fork): it DOES call `onReport` and the escrow credits. The CLI (`simulate --broadcast`, v1.39.0) also sends a real transaction to that forwarder, and the escrow credits (see `cre-simulation-output.txt`). The forwarder swallows an `onReport` revert: the tx still succeeds and `writeReport` reports SUCCESS, so `main.ts` also requires the receiver's `ReportProcessed` event in the receipt.

## Requirement checklist

| # | Requirement | Source | Status |
| --- | --- | --- | --- |
| 1 | Workflow connects a blockchain to an external data source | Prize page | DONE in code: HTTP read of Clippo's `/api/snapshots/daily` (Clippo's feed, not YouTube directly), EVM `writeReport` to Arc. The write to real Arc has not been run |
| 2 | Successful simulation via CRE CLI OR live deployment | Prize page | **DONE by simulation, single-node** (`docs/tracks/cre-simulation-output.txt`): live feed no-op on `production-settings`, and `--broadcast` with mock rows on a local anvil fork credited the escrow. Not broadcast on real Arc. No live deployment. Reproduce: `bash scripts/simulate-local.sh` |
| 3 | Meaningfully used in the project | Prize page, PRD 6.1 | DONE in the code design only: the enforcing escrow lets only the receiver (its one-time `reportAdapter`) call `reportViews`. NOT live: that escrow is not deployed, the live site runs an old escrow, and no workflow is deployed |
| 4 | Workflow compiles with the CLI toolchain | CRE SDK | VERIFIED: `cre-compile` (typecheck, runtime-compat check, Javy WASM, 2.5 MB) passes with bun 1.4.4 |
| 5 | project.yaml / workflow.yaml match canonical format | CRE docs | DONE from docs; `cre init` was not run, so project.yaml / workflow.yaml are not diffed against init output |
| 6 | Consensus across nodes on one frozen snapshot | PRD 6.1 step 2 | CODED: per-field `identical` on `{day, hash, rows}`; backend serves an immutable completed-day snapshot. NOT proven: the simulator runs one node, so consensus never saw disagreement |
| 7 | Report via forwarder to `IReceiver`; escrow credits only new views within pool cap | PRD 6.1 step 3 | VERIFIED by `cre workflow simulate --broadcast` on a local anvil fork of Arc testnet through the Arc MockKeystoneForwarder, against a fresh local deploy of the current contracts (evidence below). Not run on real Arc |
| 8 | Empty feed, large batch, replay, staleness | task | Saved CLI output covers: empty feed no-op (live), replay credits 0, unlinked creator fails with `NotHuman`. Not in the CLI output and not re-run on 2026-11-06: 60 rows into 3 reports of 25 and stale day rejected (only shown by the CLI-free emulation script earlier) |
| 9 | HTTP trigger in addition to cron | task | DONE (trigger index 1, optional `{"day":"YYYY-MM-DD"}`); simulated with `--http-payload '{}'`, the `day` option not simulated |
| 10 | Backend freeze of one snapshot per day | PRD 6.1 step 1 | DONE (below). The live site serves `GET /api/snapshots/daily` (returned `{day:"2026-11-05", rows:[]}`), but with no rows; the DB-backed code path with real rows was not run (needs Postgres and a `YOUTUBE_API_KEY` for real views) |
| 11 | Live deployment on Arc testnet | optional | NOT DONE. Blocked on Early Access, a funded key, and deploying the enforcing escrow and receiver to Arc (`config.production.json` receiver is still the zero address) |
| 12 | Campaign id gap (DB cuid vs on-chain uint256) | ARCHITECTURE.md | Closed in code (commit 292d107): the feed emits the numeric on-chain id as `campaignId` and skips campaigns with no `onchainId` (`web/src/lib/snapshots.ts`). `docs/ARCHITECTURE.md` also says closed in code. Only mock rows and an empty live feed have gone through the workflow, so it is not proven with real campaigns |

## What was built

- `cre/workflows/clippo-settlement/main.ts`: handler 0 = cron (daily 00:30 UTC), handler 1 = HTTP. Each node fetches `{day, hash, rows}`, validates and canonicalises rows (`snapshot.ts`), returns `{day, hash = keccak256(rows), rows}`; `ConsensusAggregationByFields` with `identical` on every field, so divergence fails consensus instead of being signed. After consensus: staleness guard (`maxStalenessDays`, default 2, DON time `runtime.now()`), empty feed is a no-op, rows chunked by `maxRowsPerReport` (25), one signed report per chunk, `txStatus` and `receiverContractExecutionStatus` both checked, then the receipt is read: a missing `ReportProcessed` fails the run, and rows the receiver swallowed (`ItemFailed`) are logged with their reason and counted as `failedRows` (the run still exits 0). A zero `receiverAddress` is refused only once there are rows to deliver, so the empty feed still simulates before the new receiver is deployed.
- Replay safety: `ClippoEscrow.reportViews` ignores `cumulativeViews <= last`, so re-sending a day credits 0 (shown).
- Backend (additive only): `web/src/lib/snapshots.ts` gains `frozenSnapshot(day)`, `buildFrozenSnapshot`, `previousDay`, and an optional `asOfDay` arg on `latestPerSubmission`/`latestSnapshots`. New `GET /api/snapshots/daily[?day=YYYY-MM-DD]` returns `{day, hash (sha256), rows}` with `ETag`; default is yesterday (UTC), a completed day that `refreshSnapshots` no longer writes to; 400 for invalid or incomplete days. No schema change. `GET /api/snapshots/latest` untouched.
- `web/scripts/freeze-snapshot.mjs`: `BACKEND_URL=... CRON_SECRET=... node scripts/freeze-snapshot.mjs [--day D] [--out f.json]` refreshes, then fetches/saves the frozen day. Schedule at about 00:10 UTC, before the CRE cron.
- `cre/scripts/`: `mock-backend.mjs` (shared fixture in the real envelope; modes fixture, empty, stale, large, bump, unlinked), `local-chain.sh` (anvil-fork deploy using the contracts' `DeployMock.s.sol` and `Deploy.s.sol`, seeds campaigns 1..12, approves 7 and 12, links the fixture creators with `registerHuman` signed by a local attestor, patches `receiverAddress`), `simulate-local.sh` (the real `cre workflow simulate` run), `emulate-delivery.mts` and `capture-evidence.sh` (CLI-free evidence).
- Tests: `cd cre && npm test` 9 pass; `npm run typecheck` clean.

## Evidence (real CLI output: `docs/tracks/cre-simulation-output.txt`)

Local anvil fork of Arc testnet (the real Arc MockKeystoneForwarder is present in the fork), mock fixture feed (not real Clippo or YouTube data), rate $10 per 1k views, campaign 7 funded $500, campaign 12 funded $1 (the 25 bps campaigner fee is taken at funding, so its pool is 0.9975):

- First delivery: campaign 7 `0x1111...` 1200 views = 12.000000 USDC; `0xABcd...` 300 views = 3.000000; campaign 12 `0xABcd...` 5000 views would be $50 but is credited 0.997500 (pool cap).
- Replay: on-chain values unchanged. Unlinked creator: row logged as failed with `NotHuman()`, the other rows unaffected. Live feed on `production-settings` (no broadcast): "no-op: empty snapshot".
- Not in the saved CLI output and not re-run on 2026-11-06: bump +100 views (credits only the delta), stale day, 60 rows into 3 reports of 25, wrong simulation key, zero receiver with rows. Earlier versions of these scenarios were checked with the CLI-free emulation script (`emulate-delivery.mts`), not `cre workflow simulate`. Treat them as not proven by the CLI.

## Reproduce

```
cd cre && npm install
# REAL simulation (needs cre, bun, foundry, and `cre login` done)
bash scripts/simulate-local.sh
# live feed, no broadcast (no-op while the feed is empty)
npm run simulate:live
# CLI-free supporting evidence (needs foundry + node 22+; do not redirect it into cre-simulation-output.txt)
bash scripts/capture-evidence.sh
# manual equivalent:
#   anvil --fork-url https://rpc.testnet.arc.network --port 8545 --chain-id 5042002
#   bash scripts/local-chain.sh; set -a; source scripts/.local-chain.env; set +a
#   node scripts/mock-backend.mjs &
#   cre workflow simulate ./workflows/clippo-settlement --target staging-settings --non-interactive --trigger-index 0 --broadcast
#   cre workflow simulate ./workflows/clippo-settlement --target staging-settings --non-interactive --trigger-index 1 --http-payload '{}' --broadcast
```

The local `CRE_ETH_PRIVATE_KEY` is the public anvil account #0 key and the local attestor is public anvil account #1 (no value on any real network). `local-chain.sh` rewrites `receiverAddress` in `config.staging.json` on each run.

## Live path on Arc testnet (supported)

1. `cre login`; `cre account access` (Early Access) until `cre whoami` shows deploy access.
2. Deploy contracts with `contracts/script/Deploy.s.sol`, `FORWARDER_ADDRESS=0x76c9cf548b4179F8901cda1f8623568b58215E62` (production), and `HUMAN_ATTESTOR_ADDRESS`. Creators must be linked with `registerHuman` or their rows fail `NotHuman`. Use the mock `0x6E9E...` only while running `simulate --broadcast` against the real chain; with `workflowCheckSkipped` on, the broadcasting key must be `EXPECTED_WORKFLOW_OWNER`. Arc gas is USDC (https://faucet.circle.com).
3. Put the public backend URL in `config.production.json` (`feedPath` is `/api/snapshots/daily`) and the receiver in `evm.receiverAddress` by hand: it is the zero address today, and `scripts/deploy-arc.mjs` writes `receiverAddress` only into `config.staging.json` (the local anvil fork target). Run the daily freeze job.
4. `cre workflow simulate ./workflows/clippo-settlement --target production-settings --broadcast`, then `cre workflow deploy ./workflows/clippo-settlement --target production-settings` (add HTTP `authorizedKeys` first), and `setForwarder` to the production forwarder.

## Accounts and credentials the user must create

- CRE account at https://app.chain.link/cre, then `cre login` (needed even for simulation). Optional `CRE_API_KEY` for headless use.
- Deployment only: Early Access approval (`cre account access`).
- A funded Arc testnet key (USDC gas, Circle faucet) as `CRE_ETH_PRIVATE_KEY` for real-chain broadcast/deploy. Never commit it.
- Forwarder addresses above; confirm with `cre workflow supported-chains`.
- Public backend URL reachable by CRE nodes, and `CRON_SECRET` for the freeze job.

## Contract requests (for the contracts agent; not edited here)

1. DONE (contracts agent): `ClippoReportReceiver.onReport` now validates the forwarder metadata (docs: building-consumer-contracts, ReceiverTemplate pattern). Metadata is 64 bytes from the production KeystoneForwarder: workflowId bytes32 | workflowName bytes10 | workflowOwner address | reportId bytes2 (the 109-byte header is the signed report header, not the `metadata` arg). Workflow owner is REQUIRED (fail closed when unset); workflow id and name (bytes10) optional; owner-only setters with events. The CRE docs state the simulation MockKeystoneForwarder passes NO workflow metadata, so simulation needs the explicit test-only flag. Tests: `contracts/test/ClippoReportReceiver.t.sol`.
   - Simulation: deploy with `INSECURE_SKIP_WORKFLOW_CHECK=true` (local scripts with `ALLOW_ANY_CHAIN=true` default to it); `FORWARDER_ADDRESS=0x6E9E...`. If `EXPECTED_WORKFLOW_OWNER` is also set, `tx.origin` must equal it.
   - Production: `FORWARDER_ADDRESS=0x76c9...`, `EXPECTED_WORKFLOW_OWNER=<your CRE account/workflow owner address>`; after `cre workflow deploy` call `setExpectedWorkflowId(<id>)` (and optionally `setExpectedWorkflowName`); `setWorkflowCheckSkipped(false)`. Moving an existing simulation deployment to production: `setForwarder`, `setExpectedWorkflowOwner`, `setWorkflowCheckSkipped(false)`.
   - Unverified: the exact owner address/format shown by the CRE tooling, and that production metadata matches the documented layout (not tested against a live KeystoneForwarder).
2. Optional: include the report metadata (execution id) in `ReportProcessed` for audit.

## Unverified and risks

- `cre init` and real multi-node consensus were NOT run: the simulator runs one node, so `ConsensusAggregationByFields` was executed but never saw disagreement. The mock forwarder checks no DON signatures. `--broadcast` was never run against real Arc, a live KeystoneForwarder was not used, and the live feed has only produced the empty no-op. PoolShare rows were not run through the CLI (seeded campaigns are PerView). `ReceiverContractExecutionStatus.REVERTED` was never observed: a reverting `onReport` still came back non-reverted in the simulator. Reading receipts in a deployed workflow is untested.
- `cre workflow simulate` needs the CRE API for its credential check even for local runs; that check timed out intermittently (`context deadline exceeded`) and a retry passed.
- project.yaml / workflow.yaml were written from the docs, not diffed against `cre init`.
- Web tests and typecheck: `docs/BUILD_LOG.md` records 304 web tests passing and a clean typecheck at commit 19205ba. That is the log's claim, not re-run for this doc.
- The live site runs the old build, has no `YOUTUBE_API_KEY`, and serves an empty feed. The path real YouTube views -> snapshot feed -> CRE -> escrow has never run end to end.
- The enforcing escrow and a receiver wired to it are not deployed on Arc. No CRE report has been delivered to Arc, and `config.production.json` cannot be filled in until a receiver is deployed. What `reportAdapter` is set to on the two old escrows was not checked.
- Arc availability for deployed workflows in your tenant: confirm with `cre workflow supported-chains`.
- The Mumbai prize page states no judging criteria beyond the requirements above.
