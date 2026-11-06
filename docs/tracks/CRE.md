# Track: Chainlink CRE ("Best workflow with CRE", $1,500, ETHGlobal Mumbai)

Canonical track document. Status date: 2026-11-07. Code: `cre/` (workflow), `contracts/src/ClippoReportReceiver.sol` and `ClippoEscrow.sol` (chain side), `web/` (manifest, indexer, Confirmed views). Developer notes: `cre/README.md`. Plan, scope and deploy runbook (written before the work, now with status banners): `docs/CRE_PLAN.md`, `docs/CRE_SCOPE.md`, `docs/CRE_DEPLOY.md`.

## 1. Summary

Clippo pays creators from a USDC pool in an escrow on Arc, per view. Who says how many views a clip has? A Chainlink CRE workflow. The nodes fetch the list of clips to check from Clippo (`GET /api/snapshots/clips`), then read the view counts from the YouTube Data API themselves (the API key is a CRE secret). A node keeps a clip only if the channel bio holds `clippo:<creator wallet>`, so the channel is publicly tied to the wallet. The nodes take the median view count per clip and send one signed report to `ClippoReportReceiver`, which calls `ClippoEscrow.reportViews`. The escrow credits views only when the call comes from that receiver, which was set once as `reportAdapter`. The app shows "Confirmed views" (read from the chain) with a link to the report transaction.

Status in one line: the workflow ran as a CRE CLI simulation with `--broadcast` on real Arc and credited a creator. It is NOT deployed on the CRE network (deploy access is not enabled for our account), so the receiver is still in simulation mode and not locked.

## 2. Prize requirements and evidence

Prize text (https://ethglobal.com/events/mumbai/prizes, "Best workflow with CRE", $1,500; read 2026-11-06, live): "Build, simulate, or deploy a CRE Workflow that's used as an orchestration layer within your project. It is NOT mandatory to deploy it during the hackathon, simulation is enough." The page lists no other judging criteria. CRE docs: https://docs.chain.link/cre. Templates: https://github.com/smartcontractkit/cre-templates/. A separate CCIP prize ($3,500) is not targeted.

| # | Requirement | How we meet it | Evidence |
| --- | --- | --- | --- |
| 1 | Integrate at least one blockchain with an external API, system, data source, LLM or AI agent | Blockchain: Arc testnet (`arc-testnet`), written through `EVMClient.writeReport`. External systems: Clippo's manifest API and the YouTube Data API v3 (`videos.list`, `channels.list`). Code: `cre/workflows/clippo-settlement/main.ts` (`fetchManifest`, `youtubeGet`, `readYoutube`, `settle`), `youtube.ts` (`videosUrl`, `channelsUrl`, `evaluateClips`) | Real run on Arc: "youtube agreed: kept 1/1 clips", 1 report, tx `0xa41f91da...c8409`. `docs/tracks/cre-simulation-real-arc.txt` |
| 2 | Successful simulation via the CRE CLI, or a live deployment | Simulation: `cre workflow simulate --target production-settings --broadcast`, CLI v1.39.0, real Arc, real YouTube read. Result string: `delivered day=2026-11-05 rows=1 reports=1 failedRows=0 unconfirmedBatches=0`. Live deployment: not done | `docs/tracks/cre-simulation-real-arc.txt` (raw CLI output, no key in it). Independent `cast` reads of the escrow and the transaction |
| 3 | Meaningfully used in the project | The workflow is the only path that credits views: `ClippoEscrow.reportViews` reverts `NotAdapter` unless `msg.sender == reportAdapter`, and `setReportAdapter` can be set once. On the deployed escrow `reportAdapter` is the receiver. The app shows the chain's numbers as Confirmed views with a proof link. See section 3 for the honest limits | Escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` `reportAdapter()` = receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` (read from Arc). Deployed page, section 4 |

## 3. Is it core? (honest answer)

Short answer: a strong feature, not something the product cannot exist without.

**Removal test.** Take CRE out and nobody can call `reportViews`: PerView and PoolShare campaigns credit no one, and the Confirmed number stays at 0. So the money path depends on it. But the contract does not force CRE by itself: `ClippoEscrow.setReportAdapter(address)` accepts any address once. An escrow deployed with one server key as adapter would work the same, with a key to trust. The CRE-only property comes from how we deployed it, not from the contract type. HumanSplit campaigns do not use CRE at all.

**Three layers.** Each one makes CRE harder to remove.

| Layer | What it means | Status | Where in the code |
| --- | --- | --- | --- |
| Truth | Nodes read YouTube themselves and check the channel bio. Clippo supplies no view counts. | Built. Ran once on a single simulated node with the real YouTube API | `main.ts` `readYoutube`, `observationAggregation`; `youtube.ts` `evaluateClips`, `bioHasCode`; `web/src/lib/clip-manifest.ts` `frozenClipManifest` (no counts in it); `web/src/lib/channel-code.ts` `channelCodeFor` |
| Visible | The app shows "Confirmed views" from the chain, with a Chainlink badge and a proof link. Clippo's own YouTube poll shows only as "Pending". | Built. Shown on the deployed site | `web/src/lib/chain/indexer.ts` (`ViewsReported` case writes a `ViewsReport` row); `web/src/lib/confirmed.ts` (`foldReports`, `confirmedForCampaign`, `withPending`); `web/src/components/ConfirmedViews.tsx`; `SlipDetail.tsx`; `GET /api/campaigns/:id` field `performance` |
| Immutable | After a workflow deploy: pin the workflow id on the receiver and lock it, so nobody can swap the reporter or the logic. | **NOT done.** Needs a deployed workflow, and deploy access is not enabled. On Arc now: `workflowCheckSkipped` true, `configLocked` false, `expectedWorkflowId` 0x00 (read from the chain) | `ClippoReportReceiver.sol` `setExpectedWorkflowId`, `setWorkflowCheckSkipped`, `lockConfig` (reverts `CannotLockWhileSkipping` while the skip flag is on) |

**What a judge can fairly point out.**

- Today the "DON" is us. In simulation mode `ClippoReportReceiver.onReport` accepts only the forwarder, and then only when `tx.origin` is `expectedWorkflowOwner`, our simulation wallet `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6`. Nothing here shows Chainlink nodes signing.
- Clippo still decides which clips qualify (brand, AI verdict, admin approval, wallet-bound channel code). The workflow reads YouTube for those clips only.
- Bot views on YouTube still count. The workflow reports what YouTube shows.
- Chain data is per (campaign, creator), not per clip, so Confirmed views are shown per creator and campaign.

**Score** (our own 1 to 5 scale from `docs/CRE_PLAN.md` section 3b): Truth + Visible = 3, a strong feature. Adding Immutable on a deployed workflow would make it 4. It is never 5, because of the points above. Without deploy access we stop at 3.

## 4. Evidence

| What | Result | Where |
| --- | --- | --- |
| Real Arc simulation (the headline) | `cre workflow simulate --target production-settings --broadcast`, CLI v1.39.0. Manifest from a LOCAL mock backend with one real clip. YouTube: the REAL Data API (channel @visualsbyanii `UCIZw3qclbEDMa4TCFMAatww`, video `vWk4YV_dbsE`). "kept 1/1 clips", 1 report, 0 failed rows | `docs/tracks/cre-simulation-real-arc.txt` |
| The transaction | `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`, block 71094857, status success. From the simulation wallet `0x7149...01F6` to Arc's Chainlink simulation forwarder `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`. Four logs: `CreatorCredited` and `ViewsReported` (escrow), `ReportProcessed` (receiver), the forwarder's own event (the logs are from `docs/BUILD_LOG.md` entry 18). `from`, `to`, block and status re-read from Arc with `cast` | https://explorer.testnet.arc.io/tx/0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409 |
| On-chain result | Escrow `reportedViews(1, 0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5)` = 3, `credited` = 30000 units = 0.03 USDC at $10 per 1,000 views (re-read with `cast call`) | Escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`, receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` (simulation mode), campaign 1 |
| Contracts on Arc | Creation txs and deploy block 71094327 are recorded in `docs/BUILD_LOG.md` entry 17 (escrow `0xc65b42e4...5ba03`, receiver `0x4d136993...2e522`) | `cre/scripts/arc-deploy.sh` |
| Local fork, real YouTube | Same real YouTube read delivered on a local anvil fork of Arc; `reportedViews` 3 | `docs/tracks/cre-simulation-real-youtube.txt` |
| Local fork, earlier v1 | Workflow v1 (read Clippo's `/api/snapshots/daily`): first delivery credits, replay credits 0, unlinked creator fails with `NotHuman()`, live empty feed is a no-op, pool cap holds | `docs/tracks/cre-simulation-output.txt` |
| Fork end to end | CRE `--broadcast` on a local fork -> real indexer (`syncChain`) -> API -> browser. 14 of 14 browser checks passed (`docs/BUILD_LOG.md` entry 14) | `web/scripts/e2e-confirmed-ui.mjs`; test `web/src/lib/chain/confirmed-views.e2e.test.ts` (runs only with `E2E_CRE_FORK=1`) |
| Tests | CRE: typecheck clean, 26 tests pass (13 in `snapshot.test.ts`, 13 in `youtube.test.ts`), compiles to WASM (2.6 MB). Web: 325 passed, 1 skipped (the gated fork test). Foundry: 114 passed (`ClippoReportReceiver.t.sol` covers the forwarder, owner, id, name, skip flag and lock) | Run on the merged tree (`docs/BUILD_LOG.md` entry 21); not re-run for this doc |
| Deployed page | https://clippo-cre.vercel.app (main `ab35b35`, Vercel CLI upload, Neon database). `GET /api/campaigns/cmw5jiz940005scec1r7rcyaz` returns `performance.confirmedViews` 3, `pendingViews` 0, and `proof.txHash` = the transaction above (re-read with curl). The page `/slips/cmw5jiz940005scec1r7rcyaz` shows "Confirmed views, all creators: 3", the Chainlink badge and the proof link (checked in a browser earlier; the page is client-rendered, not re-checked with curl) | Records behind the page (user, channel, campaign, clip, approval) are SEEDED and labelled `[SEED]` by `web/scripts/seed-cre-demo.mjs`. Views, credit and proof are real |

Time note: the site's API gives the report block time as 2026-11-06 21:56:24 UTC. The CLI log lines in the evidence files are labelled `Z` but are 5 h 30 min ahead of that, so they are local time (IST) and the run is 2026-11-07 local.

## 5. The 3-screen demo (one tx hash in three places)

Say it plainly: this is a simulation, one node, our wallet sent the report through Chainlink's test forwarder.

**Screen 1: terminal.** Show the CLI output ending in the tx hash.

```
cd cre
cat ../docs/tracks/cre-simulation-real-arc.txt      # the saved real output of the run
# or run it live (needs scripts/.arc-deploy.env, cre/.env with a funded simulation wallet and the YouTube key, and `cre login`):
bash scripts/simulate-arc-real.sh vWk4YV_dbsE UCIZw3qclbEDMa4TCFMAatww
```

Point at: `youtube agreed: kept 1/1 clips`, `receiver processed 1 rows, 0 failed`, the `delivered ... txs=0xa41f91da...` line, and the last line `reportedViews=3 credited(...)=30000`. A live re-run sends a NEW transaction. The escrow credits only growth, so with no new views it credits 0, and the site's proof link would still show the old hash (from `foldReports`: the proof is the latest report that added views; not tried). To keep the same hash in all three places, replay the saved output.

**Screen 2: Arc explorer.** Open https://explorer.testnet.arc.io/tx/0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409. Show: success, block 71094857, from `0x7149...01F6`, to the Chainlink simulation forwarder `0x6E9E...eDc1`, and the `ViewsReported` and `CreatorCredited` logs.

**Screen 3: the site.** Open https://clippo-cre.vercel.app/slips/cmw5jiz940005scec1r7rcyaz. Show "Confirmed views, all creators: 3", the Chainlink badge, and the proof link `Proof 0xa41f91...8409`. Click it: it opens the same explorer page. Optional, in the terminal: `curl -s https://clippo-cre.vercel.app/api/campaigns/cmw5jiz940005scec1r7rcyaz` and point at `performance.proof.txHash`. Say that the campaign, clip and approval rows are seeded and labelled `[SEED]`, while the views, the credit and the proof come from the chain.

## 6. How to reproduce

Needs: the CRE CLI (`cre login` done, even for simulation), Bun >= 1.2.21, Foundry, Node 22+. Never commit keys: `CRE_ETH_PRIVATE_KEY` and `YOUTUBE_API_KEY_CRE` live in the git-ignored `cre/.env` (`cre/.env.example` shows the names).

```
cd cre && npm install
npm run typecheck                    # tsc --noEmit
npm test                             # snapshot.test.ts + youtube.test.ts (26 tests)
npm run compile                      # cre-compile to dist/clippo-settlement.wasm

# 1. Local anvil fork of Arc + mock backend + fake YouTube API (no real keys, nothing on real Arc)
bash scripts/simulate-local.sh

# 2. REAL YouTube read, delivered on a local fork
bash scripts/simulate-real-youtube.sh <creator wallet> <video id> <channel id> [campaign id]

# 3. REAL Arc testnet with --broadcast, REAL YouTube (the headline run)
bash scripts/arc-deploy.sh           # the owner runs it: asks for the admin key (hidden); deploys escrow + receiver in simulation mode
bash scripts/simulate-arc-real.sh vWk4YV_dbsE UCIZw3qclbEDMa4TCFMAatww

# 4. Production config, no broadcast (not run for v2; the deployed manifest is empty today, so a no-op is expected)
npm run simulate:live

# 5. Deployed manifest feeding the workflow (NOT run yet): once UTC day 2026-11-06 has ended the seeded clip should be listed
#    (not checked). Needs cre/.env with the simulation wallet key and the YouTube key.
cre workflow simulate ./workflows/clippo-settlement --target production-settings --non-interactive --trigger-index 0 --broadcast

# CLI-free supporting evidence (NOT the CLI simulation; do not redirect it into cre-simulation-output.txt)
bash scripts/capture-evidence.sh
```

App side:

```
cd web && npm test                                              # 325 passed, 1 skipped
node scripts/seed-cre-demo.mjs [--confirm] [--retire-old]       # seeds the demo rows (dry run without --confirm)
# fork end to end: see the header of web/src/lib/chain/confirmed-views.e2e.test.ts (E2E_CRE_FORK=1) and web/scripts/e2e-confirmed-ui.mjs
cd ../contracts && forge test                                   # 114 passed
```

Manual equivalent of `simulate-local.sh`: `anvil --fork-url https://rpc.testnet.arc.io --port 8545 --chain-id 5042002`; `bash scripts/local-chain.sh`; `set -a; source scripts/.local-chain.env; set +a`; `node scripts/mock-backend.mjs &`; then `cre workflow simulate ./workflows/clippo-settlement --target staging-settings --non-interactive --trigger-index 0 --broadcast`. Trigger 1 is the HTTP trigger: add `--trigger-index 1 --http-payload '{}'`. The local `CRE_ETH_PRIVATE_KEY` is the public anvil account #0 key (no value on any real network).

## 7. Not proven and limits

Not proven:

- **Not deployed.** `cre whoami` showed "Deploy Access: Not enabled" when last checked, and the owner has not reported the result of `cre account access`. No workflow is live on the CRE network.
- **One node.** The simulator runs a single node, so `median` and `identical` consensus ran but never saw a disagreement between nodes.
- **No Chainlink signatures shown.** In a simulation our own wallet sends the report through Arc's test forwarder. The production KeystoneForwarder was never used, and the production metadata layout is untested.
- **Receiver not locked.** `workflowCheckSkipped` is true, `configLocked` is false, and no workflow id is pinned. Nothing on-chain stops a change of reporter.
- **Manifest was local.** In the real Arc run the manifest came from a local mock backend. The deployed `/api/snapshots/clips` lists a clip only after its approval day has ended (UTC), so it is empty now. The path deployed manifest -> CRE -> escrow -> app has not run end to end.
- **Failure paths.** A wrong YouTube key or a YouTube 5xx run end to end was not done (`youtubeGet` throws an error with only the status code; it is not exercised by the CLI). Not shown by the CLI for v2: bump, stale day, 60 rows into 3 reports of 25. The v1 CLI output covers replay, `NotHuman` and the empty feed. `docs/BUILD_LOG.md` records a v2 local-fork run (3 of 5 clips kept, 2 dropped with a reason, replay credited nothing) that is not saved in `docs/tracks`. PoolShare was not run through the CLI. `ReceiverContractExecutionStatus.REVERTED` was never observed, and reading receipts in a deployed workflow is untested.
- **Stand-ins.** The demo creator's human registration is an attestor-signed script, not a real World ID check. The rows behind the deployed page are seeded.
- **Setup.** `cre init` was not run; `project.yaml` and `workflow.yaml` were written from the docs. `cre workflow simulate` needs the CRE API for its credential check, which timed out intermittently (a retry passed).
- **Old escrows.** The older escrows `0xd845...c39c` and `0xc7b9...e310` have no `humanAttestor` and do not enforce the CRE-only path. What `reportAdapter` is on them was not checked.

Limits:

- **CRE quotas** (https://docs.chain.link/cre/service-quotas): 15 HTTP requests, 50 consensus calls, 25 KB per consensus observation, 250 KB per HTTP response, 5 minutes per run. This workflow needs about 3 HTTP requests (manifest, `videos.list`, `channels.list`) per 50 clips and 2 consensus calls. `normalizeManifest` refuses more than `MAX_CLIPS` = 300 clips.
- **Chain granularity.** The chain stores views per (campaign, creator), not per clip.
- **Scope.** YouTube only. No LLM in the workflow. HumanSplit is not touched by CRE.
- **Trust.** A trust-minimised multi-node DON signing the report is not demonstrated.

## 8. Paste-ready submission text

> **Clippo: a CRE workflow reads YouTube views and settles creator pay on Arc.**
>
> Clippo pays creators per view from a USDC pool held by an escrow contract on Arc. The question is who says how many views a clip has. We use a Chainlink CRE workflow for that. Each node gets the list of clips to check from Clippo's API, then reads the YouTube Data API itself (the API key is a CRE secret). A clip counts only if the channel bio holds `clippo:<creator wallet>`, which ties the channel to the wallet in public. The nodes take the median view count and send one signed report to a receiver contract, which calls the escrow. The escrow credits views only from that receiver. The app shows "Confirmed views" from the chain, with a link to the report transaction.
>
> What we ran: `cre workflow simulate --broadcast` (CLI v1.39.0) on Arc testnet, reading the real YouTube API. Result: kept 1 of 1 clips, 1 report, tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`. The escrow credited 3 views, 0.03 USDC. The deployed site https://clippo-cre.vercel.app shows the same transaction as its proof link.
>
> Honest limits: this is a simulation on one node, and our own wallet sent the report through Chainlink's test forwarder. The workflow is not deployed (deploy access is not enabled for our account), so the receiver is not locked. The clip list in the real run came from a local backend. Clippo still decides which clips qualify, and bot views on YouTube still count.
>
> Evidence: `docs/tracks/CRE.md`, `docs/tracks/cre-simulation-real-arc.txt`. Code: `cre/workflows/clippo-settlement/`.

## Appendix A. What was built

- `cre/workflows/clippo-settlement/main.ts` (workflow v2). Handler 0 is a cron trigger (config `schedule`, default daily 00:30 UTC), handler 1 an HTTP trigger with an optional body `{"day":"YYYY-MM-DD"}` (`onCron`, `onHttp`, both call `settle`). `settle`: (1) `fetchManifest` on each node, every field `identical` across nodes (`day`, `sourceHash`, `hash`, `clips`); (2) `assertFresh` (`maxStalenessDays`, DON time `runtime.now()`), an empty manifest is a no-op; (3) `runtime.getSecret({id: "YOUTUBE_API_KEY"})` and `runInNodeMode(readYoutube, observationAggregation(n))`: one flat record, `kept` is `identical`, each `v<i>` is `median`; (4) `sumByCreator` into rows, `assertReceiverConfigured`, `chunkRows` by `maxRowsPerReport` (25), then per batch `runtime.report` and `EVMClient.writeReport`, checking `txStatus` and `receiverContractExecutionStatus`; (5) `readReportOutcome` reads the receipt: a missing `ReportProcessed` fails the run, and rows the receiver skipped (`ItemFailed`, for example `NotHuman()`) are logged and counted as `failedRows`.
- `youtube.ts`: `normalizeManifest` (validate, lowercase, dedupe, sort, max 300), `manifestHash`, `videosUrl` and `channelsUrl` (use `fields=`, no key in the URL), `parseVideos`, `parseChannels`, `bioHasCode` (exact lowercase `clippo:<wallet>`, not followed by more letters or digits), `evaluateClips` (drop reasons: video not found, other channel, no view count, channel not found, bio lacks the code), `buildObservation`, `observationFields`, `parseKept`, `sumByCreator`.
- `snapshot.ts`: `encodeReport`, `chunkRows`, `assertFresh`, `assertReceiverConfigured`, `summarizeReceiverLogs`. `config.ts`: `configSchema` and `httpTriggerConfig`. The key goes in the `x-goog-api-key` header only. The CRE secret `YOUTUBE_API_KEY` is mapped to the env var `YOUTUBE_API_KEY_CRE` by `cre/secrets.yaml` (`workflow.yaml` points both targets at it).
- Locked-down HTTP trigger (from a teammate): `config.production.json` sets `requireHttpAuthorizedKeys` true and lists the simulation wallet `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6` as the authorized key; `httpTriggerConfig` fails at startup if keys are required but missing. Production config: `backendUrl` https://clippo-cre.vercel.app, receiver `0x6b0f...C0cd`, RPC `https://rpc.testnet.arc.io` (`cre/project.yaml`).
- Replay safety: `ClippoEscrow.reportViews` ignores `cumulativeViews <= last` (emits `ViewsReported` with delta 0), credits only growth, and caps by the remaining pool. A creator without `humanOf` fails with `NotHuman`.
- Receiver: `ClippoReportReceiver.onReport` checks `msg.sender == forwarder`, then either the workflow owner, id and name from the metadata (`_checkWorkflow`) or, in simulation mode, `tx.origin == expectedWorkflowOwner`. A failing row is skipped and logged (`ItemFailed`), so one bad row does not block a batch.
- Backend: `GET /api/snapshots/clips[?day=]` (`web/src/app/api/snapshots/clips/route.ts`, `web/src/lib/clip-manifest.ts` `frozenClipManifest`): clips whose verdict is APPROVE and was made before the end of the day, still LIVE, in an APPROVED PER_VIEW or POOL_SHARE campaign with an on-chain id, on a verified YouTube channel whose code equals `clippo:<wallet>`; clips under an open or confirmed `VIEW_ANOMALY` flag are left out; only completed UTC days (400 otherwise); no view counts. `GET /api/snapshots/daily` (the v1 feed) still exists. Wallet-bound code: `web/src/lib/channel-code.ts` (`channelCodeFor`, `hasWalletBoundCode`, `needsReverify`) and `POST /api/channels/:id/upgrade-code`. Indexer: `web/src/lib/chain/indexer.ts` case `ViewsReported`. Display: `confirmed.ts` and `ConfirmedViews.tsx`.
- Scripts in `cre/scripts/`: `mock-backend.mjs` (modes fixture, empty, stale, large, bump, unlinked, realyt; also a fake YouTube API), `local-chain.sh`, `simulate-local.sh`, `simulate-real-youtube.sh`, `arc-deploy.sh`, `simulate-arc-real.sh`, `emulate-delivery.mts` and `capture-evidence.sh` (CLI-free). `web/scripts/freeze-snapshot.mjs` refreshes and saves the frozen v1 feed.

## Appendix B. CRE facts checked (docs.chain.link/cre, 2026-10-28)

| Item | Finding |
| --- | --- |
| CLI | `cre` v1.39.0. Needs `cre login` even for `simulate`. |
| SDK | `@chainlink/cre-sdk` 1.23.0 (in `cre/package.json`). Bun >= 1.2.21 compiles to WASM. |
| Arc | `arc-testnet` is supported. Forwarders: simulation MockKeystoneForwarder `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`, production KeystoneForwarder `0x76c9cf548b4179F8901cda1f8623568b58215E62`. |
| Simulate | `cre workflow simulate <path> --target <t> [--broadcast] [--non-interactive --trigger-index N] [--http-payload ...] [--config file]`. Without `--broadcast` it is a dry run. `CRE_ETH_PRIVATE_KEY` is needed to write. |
| Deploy | `cre workflow deploy` needs Early Access deploy approval (`cre account access`). Not required for the prize. |
| Write path | `runtime.report(...)`, then `EVMClient.writeReport`; the forwarder calls `IReceiver.onReport(metadata, report)`. |

Doc caveat: the simulate docs say the mock forwarder "doesn't call your onReport()". We tested it: it does, and the escrow credits. The forwarder swallows an `onReport` revert (the tx still succeeds), which is why `main.ts` also requires `ReportProcessed` in the receipt.

## Appendix C. If deploy access is approved (NOT done)

1. `cre login`; `cre account access` until `cre whoami` shows deploy access.
2. Secret: `cre secrets create` for `YOUTUBE_API_KEY`.
3. Deploy with the deployment registry private: `cre workflow deploy ./workflows/clippo-settlement --target production-settings` (CLI; the CRE web page only shows results). The HTTP trigger keys are already in `config.production.json`.
4. On the receiver, as owner (the admin wallet): `setForwarder(0x76c9cf548b4179F8901cda1f8623568b58215E62)`, `setExpectedWorkflowOwner(<CRE organization address>)`, `setExpectedWorkflowId(<deployed id>)` (optionally `setExpectedWorkflowName`), `setWorkflowCheckSkipped(false)`, then `lockConfig()`. `lockConfig` refuses while the skip flag is on, so the lock works only for a deployed workflow. Unverified: the exact owner address format shown by the CRE tooling, and that production metadata matches the documented 64-byte layout.

## Appendix D. Addresses

| Role | Address |
| --- | --- |
| Escrow (enforcing, Arc testnet) | `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` |
| Receiver (simulation mode, not locked) | `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` |
| Arc simulation forwarder | `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1` |
| Arc production forwarder (not used) | `0x76c9cf548b4179F8901cda1f8623568b58215E62` |
| CRE simulation wallet (sends reports, workflow owner; key only in git-ignored `cre/.env`) | `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6` |
| Backend attestor (World ID stand-in signer) | `0x62EdCF9A14F0aB803Ee154EE9709323E56655074` |
| Admin, treasury, campaigner and demo creator | `0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5` |
