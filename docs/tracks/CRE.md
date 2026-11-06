# Track: Chainlink CRE ("Best workflow with CRE", $1,500, ETHGlobal Mumbai)

Owner dir: `cre/` (plus `web/scripts/freeze-snapshot.mjs` and `web/src/app/api/snapshots/{clips,daily}`). Researched and built 2026-10-28; workflow v1 simulation output captured 2026-11-06 (after commit 6f74f7b); workflow v2, the real Arc deployment and the real-Arc simulation 2026-11-07.

## Status on 2026-11-07 (read this first)

- Workflow v2 (commit `d954f67`): each node fetches the clip manifest (`/api/snapshots/clips`), then reads the YouTube Data API itself (`videos.list`, `channels.list`). A clip is kept only if its video is on the manifest's channel and the channel bio holds `clippo:<wallet>`. View counts go through `median` consensus. Clippo only says which clips to check; it does not supply view counts.
- Run on REAL Arc (2026-11-07, `cre workflow simulate --target production-settings --broadcast`, CLI v1.39.0, real YouTube read): tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409` (block 71094857, success), from our simulation wallet `0x7149…01F6` to Arc's Chainlink simulation forwarder `0x6E9E…eDc1`. Escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`, campaign 1: `reportedViews` 3 and `credited` 30000 units (0.03 USDC), checked with an independent `cast call`. Output: `docs/tracks/cre-simulation-real-arc.txt`. Explorer: https://explorer.testnet.arc.io/tx/0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409
- Also run: the same real YouTube read delivered on a local anvil fork of Arc (`docs/tracks/cre-simulation-real-youtube.txt`), and the earlier v1 runs on a local fork with a mock feed (`docs/tracks/cre-simulation-output.txt`, when the workflow read Clippo's `/api/snapshots/daily`).
- Not done: this is a SIMULATION. The simulator is single-node, so no real multi-node consensus ran; our own wallet sent the report through Arc's Chainlink TEST forwarder, so no DON signatures were shown. The receiver is in simulation mode (`workflowCheckSkipped` true, not locked). No workflow is deployed (needs Early Access). The manifest in the real-Arc run came from a local mock backend: the deployed backend lists a clip only after its approval day has finished (UTC), so its `/api/snapshots/clips` is empty until then. The demo creator's human registration is an attestor-signed stand-in for the World check.
- Data source: YouTube, read by the nodes. The YouTube key is the CRE secret `YOUTUBE_API_KEY` (sent in a header, never logged); it is also set on the deployed site for its own polling.
- Escrow on Arc: the enforcing escrow `0x1e05…26Ef` and receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` were deployed on 2026-11-07 in simulation mode (`docs/CRE_DEPLOY.md`). `config.production.json` now holds that receiver and `backendUrl` https://clippo-cre.vercel.app. The two older escrows (`0xd845…c39c`, `0xc7b9…e310`) have no `humanAttestor` and do not enforce the CRE-only path.
- In the app: Confirmed (read by CRE, written on Arc) vs Pending (Clippo's own count) views with a proof link. The deployed site https://clippo-cre.vercel.app shows Confirmed views 3 and the proof link for campaign 1 (deployed by the Vercel CLI from the feature branch; it will be redeployed from `main` after the merge).
- Trust claim, stated honestly: the contract design makes `reportViews` callable only by the one-time-set `reportAdapter` (the receiver), and the receiver accepts only the forwarder (plus the expected workflow owner outside simulation). That is what the code and tests show, and the runs exercised it with the simulation forwarder. A trust-minimised multi-node DON signing the report is not demonstrated.

## Prize requirements (source: https://ethglobal.com/events/mumbai/prizes, "Best workflow with CRE", $1,500; page read 2026-11-06 and verified live)

> Goal: Build, simulate, or deploy a CRE Workflow that's used as an orchestration layer within your project. Note : It is NOT mandatory to deploy it during the hackathon, simulation is enough!
> Your workflow should: Integrate at least one blockchain with an external API, system, data source, LLM, or AI agent. Demonstrate a successful simulation (via the CRE CLI) or a live deployment on the CRE network. Be meaningfully used in your project.

A separate "Best use of Chainlink CCIP 2.0" ($3,500) prize exists and is not targeted. The page lists no separate judging criteria. Video rule (2 to 4 minutes, hard cap 4:00): see `docs/DEMO_SCRIPT.md`. So the proof judges need is `cre workflow simulate` output (or a live deployment): `docs/tracks/cre-simulation-real-arc.txt` holds the real CLI output on real Arc, `docs/tracks/cre-simulation-real-youtube.txt` and `cre-simulation-output.txt` the local-fork runs. `scripts/capture-evidence.sh` (emulation) is separate supporting evidence, NOT the CLI simulation.

## Current CRE facts (docs.chain.link/cre, fetched 2026-10-28)

| Item | Finding |
| --- | --- |
| CLI | `cre` v1.39.0. Windows native: `irm https://app.chain.link/cre/install.ps1 \| iex`, or the zip from https://github.com/smartcontractkit/cre-cli/releases (verify checksum). |
| Verified locally | Downloaded `cre_windows_amd64.zip` v1.39.0, SHA-256 `bce12d90866edf6125664129e1b241f98c823ef577ed6530232053bdf1b86c64` matches the GitHub release digest. `cre version` runs. |
| Runtime deps | Bun >= 1.2.21 (SDK compiles with bun + Javy to WASM). bun 1.4.4 installed via npm in a scratch dir. |
| TS SDK | `@chainlink/cre-sdk` 1.23.0 (latest on npm; already in `cre/package.json`). |
| Account | Free account at https://app.chain.link/cre. **`cre init` and `cre workflow simulate` both refuse to run unless logged in (`cre login`, browser + 2FA) or `CRE_API_KEY` is set.** Observed on 2026-10-28 (before login): both aborted with "Authentication required". |
| Deploy | `cre workflow deploy` needs Early Access deploy approval (`cre account access` or https://cre.chain.link/request-access); not required for the prize. Simulation does not need it. |
| Arc support | **Arc Testnet is supported** (chain name `arc-testnet`, in SDK 1.23 selectors). Forwarders (https://docs.chain.link/cre/guides/workflow/using-evm-client/supported-networks-ts): simulation MockKeystoneForwarder `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`, production KeystoneForwarder `0x76c9cf548b4179F8901cda1f8623568b58215E62`. Docs: confirm tenant availability with `cre workflow supported-chains` after login. |
| Sim flags | `cre workflow simulate <workflow-name-or-path> --target <target> [--broadcast] [--non-interactive --trigger-index N] [--http-payload '<json>|<file>']`; `cre login` is required even for simulate (browser; `CRE_API_KEY` only for approved deploy access); `CRE_ETH_PRIVATE_KEY` in `.env` for writes; without `--broadcast` it is a dry run (empty tx hash `0x`). Bun >= 1.2.21 for TS workflows. |
| Config shape | `project.yaml`: `<target>: { rpcs: [{chain-name, url}] }` (`account.workflow-owner-address` is multisig-only/optional). `workflow.yaml`: `<target>: { user-workflow.workflow-name, workflow-artifacts.{workflow-path,config-path,secrets-path} }`. |
| Consensus | `consensusMedianAggregation`, `consensusIdenticalAggregation`, `consensusCommonPrefixAggregation`, `ConsensusAggregationByFields({field: median/identical/commonPrefix/ignore})`. |
| Write path | `runtime.report({encodedPayload, encoderName:"evm", signingAlgo:"ecdsa", hashingAlgo:"keccak256"})` then `EVMClient.writeReport(runtime,{receiver, report, gasConfig})`; the forwarder calls `IReceiver.onReport(metadata, report)`. Check both `txStatus` and `receiverContractExecutionStatus`. |
| Triggers | Cron (6-field) and HTTP (`authorizedKeys` required for deployed workflows; none for simulation). One HTTP handler max per workflow. |

Doc caveat: the simulate docs say the simulator's mock forwarder "doesn't call your onReport()". We tested the Arc mock forwarder on-chain (anvil fork): it DOES call `onReport` and the escrow credits. The CLI (`simulate --broadcast`, v1.39.0) also sends a real transaction to that forwarder, and the escrow credits (see `cre-simulation-output.txt`). The forwarder swallows an `onReport` revert: the tx still succeeds and `writeReport` reports SUCCESS, so `main.ts` also requires the receiver's `ReportProcessed` event in the receipt.

## Requirement checklist

| # | Requirement | Source | Status |
| --- | --- | --- | --- |
| 1 | Workflow connects a blockchain to an external data source | Prize page (verified 2026-11-06) | DONE in code and run once on real Arc: each node reads the YouTube Data API v3 for the clips in Clippo's `/api/snapshots/clips` manifest, then EVM `writeReport` to Arc. The real-Arc write was a simulation (tx `0xa41f…c8409`) |
| 2 | Successful simulation via CRE CLI OR live deployment | Prize page (verified 2026-11-06) | **DONE by simulation, single-node**: `--broadcast` on REAL Arc with the real YouTube read (`docs/tracks/cre-simulation-real-arc.txt`); also a real YouTube read on a local anvil fork (`cre-simulation-real-youtube.txt`) and the earlier v1 fork run (`cre-simulation-output.txt`). No live deployment. Reproduce: `bash scripts/simulate-arc-real.sh <videoId> <channelId>` (real Arc) or `bash scripts/simulate-local.sh` (local fork) |
| 3 | Meaningfully used in the project | Prize page, PRD 6.1 | DONE: replaces the admin wallet writing view counts. On the deployed escrow `0x1e05…26Ef` the receiver is the one-time `reportAdapter`, so only it can call `reportViews`, and the app shows the CRE-confirmed views with a proof link. Caveat: the run on real Arc is a simulation (our wallet sent the report through the test forwarder) and no workflow is deployed |
| 4 | Workflow compiles with the CLI toolchain | CRE SDK | VERIFIED: `cre-compile` (typecheck, runtime-compat check, Javy WASM, 2.5 MB for v1; 2.6 MB for v2 per `docs/BUILD_LOG.md`) passes with bun 1.4.4 |
| 5 | project.yaml / workflow.yaml match canonical format | CRE docs | DONE from docs; `cre init` was not run, so project.yaml / workflow.yaml are not diffed against init output |
| 6 | Consensus across nodes | PRD 6.1 step 2 | CODED (v2): the manifest hash and the kept-clip set are `identical`, the per-clip view counts use `median`; the backend serves an immutable completed-day manifest. NOT proven: the simulator runs one node, so consensus never saw disagreement |
| 7 | Report via forwarder to `IReceiver`; escrow credits only new views within pool cap | PRD 6.1 step 3 | VERIFIED by `cre workflow simulate --broadcast` on REAL Arc testnet through the Arc MockKeystoneForwarder (tx `0xa41f…c8409`, campaign 1 credited 0.03 USDC) and earlier on a local anvil fork against fresh local deploys (evidence below). The production KeystoneForwarder was not used |
| 8 | Empty feed, large batch, replay, staleness | task | Saved v1 CLI output (`cre-simulation-output.txt`, not re-run for v2) covers: empty feed no-op (live), replay credits 0, unlinked creator fails with `NotHuman`. For v2, `docs/BUILD_LOG.md` records a local-fork run where 3 of 5 manifest clips were kept (2 dropped with a logged reason), a replay credited nothing more and an unlinked wallet failed with `NotHuman` (the log's claim; that output is not saved in `docs/tracks`). Not shown by the CLI: 60 rows into 3 reports of 25 and stale day rejected (only the CLI-free emulation script earlier) |
| 9 | HTTP trigger in addition to cron | task | DONE (trigger index 1, optional `{"day":"YYYY-MM-DD"}`); simulated with `--http-payload '{}'` in the v1 run, the `day` option not simulated; the real-Arc run used trigger index 0 |
| 10 | Backend freeze of one manifest per day | PRD 6.1 step 1 | DONE (below): `GET /api/snapshots/clips` (the manifest) and `GET /api/snapshots/daily` are frozen per UTC day. The deployed site's manifest is empty until the seeded approval day ends (UTC), so no run has used it yet |
| 11 | Live deployment on Arc testnet | optional | PARTLY: the enforcing escrow and receiver are deployed on real Arc in simulation mode (`0x1e05…26Ef`, `0x6b0f…C0cd`) and `config.production.json` has the receiver. The workflow itself is NOT deployed (needs Early Access) |
| 12 | Campaign id gap (DB cuid vs on-chain uint256) | ARCHITECTURE.md | Closed in code (commit 292d107): the feed and the manifest emit the numeric on-chain id as `campaignId` and skip campaigns with no `onchainId` (`web/src/lib/snapshots.ts`). The real-Arc run used on-chain campaign 1 with a manifest from a local mock backend, so the deployed backend's manifest has not fed a workflow run |

## What was built

- `cre/workflows/clippo-settlement/main.ts` (v2): handler 0 = cron (daily 00:30 UTC), handler 1 = HTTP. Each node fetches the clip manifest `{day, hash, clips:[{campaignId, creator, videoId, channelId}]}` from `/api/snapshots/clips`, then reads the YouTube Data API itself (`youtube.ts`: `videos.list`, `channels.list`; key from the CRE secret `YOUTUBE_API_KEY`, sent in the `x-goog-api-key` header only). A clip is kept only if its video is on the manifest's channel and the channel bio holds `clippo:<wallet>`. Consensus: the manifest hash and the kept-clip set are `identical`, view counts use `median`, so divergence fails consensus instead of being signed. After consensus: staleness guard (`maxStalenessDays`, default 2, DON time `runtime.now()`), empty manifest is a no-op, rows chunked by `maxRowsPerReport` (25), one signed report per chunk, `txStatus` and `receiverContractExecutionStatus` both checked, then the receipt is read: a missing `ReportProcessed` fails the run, and rows the receiver swallowed (`ItemFailed`) are logged with their reason and counted as `failedRows` (the run still exits 0). A zero `receiverAddress` is refused only once there are rows to deliver. (`snapshot.ts` still validates, canonicalises and ABI-encodes the rows.)
- Replay safety: `ClippoEscrow.reportViews` ignores `cumulativeViews <= last`, so re-sending a day credits 0 (shown).
- Backend (additive only): `web/src/lib/snapshots.ts` gains `frozenSnapshot(day)`, `buildFrozenSnapshot`, `previousDay`, and an optional `asOfDay` arg on `latestPerSubmission`/`latestSnapshots`. `GET /api/snapshots/daily[?day=YYYY-MM-DD]` returns `{day, hash (sha256), rows}` with `ETag`; default is yesterday (UTC), a completed day that `refreshSnapshots` no longer writes to; 400 for invalid or incomplete days. `GET /api/snapshots/latest` untouched. Added for v2: `GET /api/snapshots/clips[?day=...]`, the manifest (approved, live, verdict-approved clips of PerView and PoolShare campaigns with a verified wallet-bound channel code `clippo:<wallet>`, no view counts, frozen per UTC day; a clip appears only after its approval day has finished), `POST /api/channels/:id/upgrade-code` to re-verify old-format channels, an indexer for `ViewsReported`, and the Confirmed vs Pending display (`web/src/components/ConfirmedViews.tsx`).
- `web/scripts/freeze-snapshot.mjs`: `BACKEND_URL=... CRON_SECRET=... node scripts/freeze-snapshot.mjs [--day D] [--out f.json]` refreshes, then fetches/saves the frozen day. Schedule at about 00:10 UTC, before the CRE cron.
- `cre/scripts/`: `mock-backend.mjs` (shared fixture in the real envelope, also serves the manifest and a fake YouTube API; modes fixture, empty, stale, large, bump, unlinked, realyt), `arc-deploy.sh` (deploys the escrow and receiver to real Arc in simulation mode, `docs/CRE_DEPLOY.md`), `simulate-arc-real.sh` (the real-Arc `--broadcast` run), `simulate-real-youtube.sh` (real YouTube read on a local fork), `local-chain.sh` (anvil-fork deploy using the contracts' `DeployMock.s.sol` and `Deploy.s.sol`, seeds campaigns 1..12, approves 7 and 12, links the fixture creators with `registerHuman` signed by a local attestor, patches `receiverAddress`), `simulate-local.sh` (the real `cre workflow simulate` run), `emulate-delivery.mts` and `capture-evidence.sh` (CLI-free evidence).
- Tests: `docs/BUILD_LOG.md` records `cd cre && npm test` 22 pass (9 old, 13 new) and a clean typecheck at commit `d954f67`. That is the log's claim, not re-run for this doc after the merge.

## Evidence

Real Arc, workflow v2 (real CLI output: `docs/tracks/cre-simulation-real-arc.txt`, captured 2026-11-07 with `cre/scripts/simulate-arc-real.sh`): channel @visualsbyanii, video `vWk4YV_dbsE`, creator wallet `0x8CF9…60e5`, campaign 1 on escrow `0x1e05…26Ef`, receiver `0x6b0f…C0cd`. Manifest: one real clip served by a local mock backend. YouTube: the real Data API. Result: "youtube agreed: kept 1/1 clips", 1 report, 0 failed rows, tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409` (block 71094857). On-chain read afterwards: `reportedViews` 3 (the video's real count at that time), `credited` 30000 units = 0.03 USDC at $10 per 1,000 views. One CRE node; our own wallet sent the report through Arc's test forwarder.

Local fork, workflow v2 (`docs/tracks/cre-simulation-real-youtube.txt`): the same real YouTube read delivered on a local anvil fork with fresh contracts; `reportedViews` 3.

Earlier workflow v1 (real CLI output: `docs/tracks/cre-simulation-output.txt`; the workflow then read Clippo's `/api/snapshots/daily`; not re-run for v2):

Local anvil fork of Arc testnet (the real Arc MockKeystoneForwarder is present in the fork), mock fixture feed (not real Clippo or YouTube data), rate $10 per 1k views, campaign 7 funded $500, campaign 12 funded $1 (the 25 bps campaigner fee is taken at funding, so its pool is 0.9975):

- First delivery: campaign 7 `0x1111...` 1200 views = 12.000000 USDC; `0xABcd...` 300 views = 3.000000; campaign 12 `0xABcd...` 5000 views would be $50 but is credited 0.997500 (pool cap).
- Replay: on-chain values unchanged. Unlinked creator: row logged as failed with `NotHuman()`, the other rows unaffected. Live feed on `production-settings` (no broadcast): "no-op: empty snapshot".
- Not in the saved CLI output and not re-run on 2026-11-06: bump +100 views (credits only the delta), stale day, 60 rows into 3 reports of 25, wrong simulation key, zero receiver with rows. Earlier versions of these scenarios were checked with the CLI-free emulation script (`emulate-delivery.mts`), not `cre workflow simulate`. Treat them as not proven by the CLI.

## Reproduce

```
cd cre && npm install
# REAL Arc (needs the deployed addresses from scripts/arc-deploy.sh, a funded simulation wallet in cre/.env, a YouTube key, and `cre login` done)
bash scripts/simulate-arc-real.sh <videoId> <channelId>
# local fork simulation (needs cre, bun, foundry, and `cre login` done)
bash scripts/simulate-local.sh
# production config, no broadcast (not run for v2; the deployed manifest is empty until the seeded approval day ends, UTC)
npm run simulate:live
# CLI-free supporting evidence (needs foundry + node 22+; do not redirect it into cre-simulation-output.txt)
bash scripts/capture-evidence.sh
# manual equivalent:
#   anvil --fork-url https://rpc.testnet.arc.io --port 8545 --chain-id 5042002
#   bash scripts/local-chain.sh; set -a; source scripts/.local-chain.env; set +a
#   node scripts/mock-backend.mjs &
#   cre workflow simulate ./workflows/clippo-settlement --target staging-settings --non-interactive --trigger-index 0 --broadcast
#   cre workflow simulate ./workflows/clippo-settlement --target staging-settings --non-interactive --trigger-index 1 --http-payload '{}' --broadcast
```

The local `CRE_ETH_PRIVATE_KEY` is the public anvil account #0 key and the local attestor is public anvil account #1 (no value on any real network). `local-chain.sh` rewrites `receiverAddress` in `config.staging.json` on each run.

## Live path on Arc testnet (supported)

1. DONE 2026-11-07: contracts deployed to real Arc in simulation mode with `bash scripts/arc-deploy.sh` (`docs/CRE_DEPLOY.md`): forwarder = Arc's simulation forwarder, workflow owner = the simulation wallet, `HUMAN_ATTESTOR_ADDRESS` set. Creators must be linked with `registerHuman` or their rows fail `NotHuman` (the demo creator was linked by an attestor-signed script). One `simulate --broadcast` against it is done (above).
2. `cre login`; `cre account access` (Early Access) until `cre whoami` shows deploy access. `cre whoami` showed "Deploy Access: Not enabled" when last checked (`docs/BUILD_LOG.md`).
3. DONE: the public backend URL (`backendUrl` https://clippo-cre.vercel.app) and the receiver (`evm.receiverAddress`) are in `config.production.json`; `scripts/deploy-arc.mjs` writes `receiverAddress` only into `config.staging.json` (the local anvil fork target), so production is edited by hand. Still to do: the daily freeze job.
4. After deploy access: `cre workflow simulate ./workflows/clippo-settlement --target production-settings --broadcast`, then `cre workflow deploy ./workflows/clippo-settlement --target production-settings` (add HTTP `authorizedKeys` first), then switch the receiver from simulation to locked: `setForwarder` to the production forwarder `0x76c9cf548b4179F8901cda1f8623568b58215E62`, `setExpectedWorkflowOwner`, `setExpectedWorkflowId`, `setWorkflowCheckSkipped(false)`, `lockConfig()` (owner transactions from the admin wallet).

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

- `cre init` and real multi-node consensus were NOT run: the simulator runs one node, so `ConsensusAggregationByFields` was executed but never saw disagreement (`median` and `identical` never ran across nodes). The mock forwarder checks no DON signatures. `--broadcast` ran on real Arc once, as a simulation (our wallet, Arc's test forwarder); a live KeystoneForwarder was not used. PoolShare rows were not run through the CLI (seeded campaigns are PerView). `ReceiverContractExecutionStatus.REVERTED` was never observed: a reverting `onReport` still came back non-reverted in the simulator. Reading receipts in a deployed workflow is untested.
- `cre workflow simulate` needs the CRE API for its credential check even for local runs; that check timed out intermittently (`context deadline exceeded`) and a retry passed.
- project.yaml / workflow.yaml were written from the docs, not diffed against `cre init`.
- Test counts are in `docs/BUILD_LOG.md` (the log's claims at the commits where they were run); not re-run for this doc after the merge.
- The path real YouTube views -> deployed manifest -> CRE -> escrow -> app has not run end to end with the deployed backend feeding the workflow: the real-Arc run used a local manifest, and the deployed manifest is empty until the seeded approval day ends (UTC). The older `clippo-six.vercel.app` is not in the owner's Vercel account and is not used.
- The demo creator's human registration is an attestor-signed stand-in for the World check. The deploy script's output ended with "campaign id 1 approved" and did not decode the campaign state; the CRE report did credit it.
- No workflow is deployed and the receiver is not locked, so nothing pins the workflow id on-chain. What `reportAdapter` is set to on the two old escrows was not checked.
- Arc availability for deployed workflows in your tenant: confirm with `cre workflow supported-chains`.
- The Mumbai prize page states no judging criteria beyond the requirements above.
