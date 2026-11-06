# Clippo CRE settlement workflow

Chainlink CRE (TypeScript SDK `@chainlink/cre-sdk` 1.23) workflow, `workflows/clippo-settlement/`.

Workflow v2: the nodes read YouTube view counts themselves. Clippo only says WHICH clips to check.

Flow (trigger 0: cron, daily; trigger 1: HTTP, optional body `{"day":"YYYY-MM-DD"}` to settle an older day):
1. Each node calls `GET {backendUrl}{manifestPath}[?day=]` -> `{day, hash, clips: [{campaignId, creator, videoId, channelId}]}`. `youtube.ts` validates and canonicalises it (lowercase creators, sorted, deduped, max 300 clips); nodes must return identical `{day, sourceHash, hash, clips}` (`identical` per field).
2. Guards: a manifest older than `maxStalenessDays` (or in the future) is rejected; an empty manifest is a no-op.
3. Each node reads the CRE secret `YOUTUBE_API_KEY` and calls the YouTube Data API v3 (`youtubeApiBase`): `videos.list` and `channels.list`, 50 ids per call, with `fields=` to keep responses small. The key is sent in the `x-goog-api-key` header, never in the URL or a log.
4. Per clip, a node keeps it only if the video's channel equals the manifest `channelId` AND the channel bio contains the exact lowercase string `clippo:<creator wallet>`. Dropped clips are logged with the reason.
5. Consensus on one fixed-shape record `{kept, v0, v1, ...}`: `kept` is the list of kept manifest indexes (`identical`, so nodes that disagree on which clips count break consensus instead of being signed), and `v<i>` is clip i's view count (`median`, 0 when dropped). The field map is built at runtime from the agreed manifest size.
6. Views are summed per `(campaignId, creator)` over the kept clips, split into batches of `maxRowsPerReport` (25), ABI-encoded as `(uint256 campaignId, address creator, uint256 cumulativeViews)[]`, signed (`runtime.report`) and written with `EVMClient.writeReport` to `ClippoReportReceiver` -> `ClippoEscrow.reportViews` (credits only growth, capped by the pool; the creator must be a linked World ID human). A zero `receiverAddress` is refused once there is something to deliver.
7. The forwarder hides a reverted `onReport`, so the workflow reads the receipt: a missing `ReportProcessed` event fails the run, and rows the receiver skipped (`ItemFailed`, for example `NotHuman()`) are logged and counted as `failedRows`.

Limits: about 3 HTTP calls per 50 clips (limit 15 per run), 2 consensus calls (limit 50), observation about 20 bytes per clip (limit 25 KB).

## Setup

```
cd cre
npm install                # or bun install
npm run typecheck          # tsc --noEmit
npm test                   # snapshot.ts unit tests (node:test)
```

Typecheck and tests (`snapshot.test.ts`, `youtube.test.ts`) pass (not re-run after the merge with main).

Secrets: `secrets.yaml` maps the CRE secret `YOUTUBE_API_KEY` to the env var `YOUTUBE_API_KEY_CRE` (set it in the shell or `cre/.env`; `workflow.yaml` points both targets at `../../secrets.yaml`). Real keys never go in the repo.

Install the CRE CLI (https://docs.chain.link/cre/getting-started/cli-installation), `cre login`, and Bun (needed by the CLI for compilation).

Config files in `workflows/clippo-settlement/`:
- `config.staging.json` (target `staging-settings`): `backendUrl` and `youtubeApiBase` (`/youtube/v3`) are the local mock backend and fake YouTube API `http://127.0.0.1:8787` (`scripts/mock-backend.mjs`), and `evm.receiverAddress` is a receiver on a local anvil fork. `scripts/local-chain.sh` rewrites `receiverAddress` on every run.
- `config.production.json` (target `production-settings`): `backendUrl` is `https://clippo-cre.vercel.app` (the deployed test site); `evm.receiverAddress` is the `ClippoReportReceiver` on real Arc testnet, `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` (simulation mode, see `../docs/CRE_DEPLOY.md`). The workflow refuses to deliver rows while `receiverAddress` is the zero address.

Fields: `backendUrl`, `manifestPath` (`/api/snapshots/clips`), `youtubeApiBase` (`https://www.googleapis.com/youtube/v3`), `feedPath` (optional, legacy `/api/snapshots/daily`, only `emulate-delivery.mts` reads it), `maxStalenessDays`, `maxRowsPerReport`, `evm.receiverAddress` (deployed `ClippoReportReceiver`, see `../contracts/README.md`), `evm.chainSelectorName` (`arc-testnet`, present in SDK 1.23 chain selectors), `evm.gasLimit`, `httpAuthorizedKeys` and `requireHttpAuthorizedKeys` (EVM addresses allowed to call the deployed HTTP trigger; when the flag is true the workflow refuses to start without keys), and `schedule` (6-field cron, default `0 30 0 * * *`, daily 00:30 UTC).

`project.yaml`: `staging-settings` RPC is `http://127.0.0.1:8545`, a local anvil FORK of Arc testnet, not real Arc. `production-settings` RPC is `https://rpc.testnet.arc.io`. Copy `.env.example` to `.env`; `CRE_ETH_PRIVATE_KEY` is only needed to broadcast (`scripts/simulate-local.sh` uses the public anvil key).

## Simulate

```
# real CLI simulation on a local anvil fork of Arc + mock backend + fake YouTube API (fake key FAKE_YOUTUBE_KEY) (needs cre, bun, foundry, `cre login`)
bash scripts/simulate-local.sh
# live backend + real YouTube, no broadcast (needs a real YOUTUBE_API_KEY_CRE; npm run simulate:live)
cre workflow simulate ./workflows/clippo-settlement --target production-settings --non-interactive --trigger-index 0
# REAL Arc testnet with --broadcast, reading the real YouTube API (after scripts/arc-deploy.sh; see ../docs/CRE_DEPLOY.md)
bash scripts/simulate-arc-real.sh <youtube video id> <youtube channel id>
```

`npm run simulate` and `npm run simulate:broadcast` use `staging-settings` with `--non-interactive --trigger-index 0`, so they need the local fork and mock backend that `simulate-local.sh` starts (see the manual steps in `../docs/tracks/CRE.md`). Trigger index 1 is the HTTP trigger (`--http-payload '{}'`). `simulate-arc-real.sh` uses `production-settings` with `--broadcast`, a one-clip manifest from a local mock backend (the deployed manifest is empty until an approval day has finished) and the simulation wallet `CRE_ETH_PRIVATE_KEY` in `cre/.env`; the report goes to real Arc through Arc's simulation forwarder.

For simulation, the CRE simulator's mock forwarder address must be set as `forwarder` on `ClippoReportReceiver` (`setForwarder`, or `FORWARDER_ADDRESS` at deploy) and the receiver registered via `ClippoEscrow.setReportAdapter`. The mock forwarder passes no workflow metadata, so the receiver must be deployed with `INSECURE_SKIP_WORKFLOW_CHECK=true` (or `setWorkflowCheckSkipped(true)`). For production use the KeystoneForwarder address for the target chain from the CRE docs, set `EXPECTED_WORKFLOW_OWNER` (required; receiver fails closed without it), optionally `setExpectedWorkflowId` after `cre workflow deploy`, and `setWorkflowCheckSkipped(false)`. See `../contracts/README.md`.

## Status

See `../docs/tracks/CRE.md` (requirements checklist, evidence, live path, unverified items) and `../docs/tracks/cre-simulation-output.txt` (real `cre` CLI output).

Workflow v2: `bash scripts/simulate-local.sh` ran green against the mock backend and fake YouTube API (3 of 5 clips kept, 2 dropped, credited on the local fork). A real YouTube read through the workflow also ran on a local fork (`../docs/tracks/cre-simulation-real-youtube.txt`).

Real Arc (`../docs/tracks/cre-simulation-real-arc.txt`, `../docs/BUILD_LOG.md` entry 18): `cre workflow simulate --target production-settings --broadcast` (CLI v1.39.0) read the real YouTube Data API ("youtube agreed: kept 1/1 clips"), sent 1 report with 0 failed rows, and wrote it to the receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` and escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` on Arc testnet. Transaction `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409` (https://explorer.testnet.arc.io/tx/0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409). `cast call` read back `reportedViews` 3 and `credited` 30000 units (0.03 USDC).

Earlier v1 run (before the nodes read YouTube): `cre workflow simulate` ran against the live feed on `production-settings` without broadcast (exit 0, "no-op: empty snapshot", because the live feed had no rows). With `--broadcast` on a local anvil FORK of Arc, a mock feed and the Arc MockKeystoneForwarder, the receiver credited creators in the escrow (checked with `cast call`).

Not proven: it is a SIMULATION. The simulator runs a single node, so real multi-node consensus never ran; the report was sent by our own simulation wallet through Arc's Chainlink TEST forwarder, so no Chainlink nodes signed it and the receiver is not locked. The manifest in the real-Arc run came from a local mock backend, not from the deployed backend. No workflow is deployed (deploy needs CRE Early Access). `cre workflow simulate` needs `cre login`, and its API check timed out intermittently during the runs. CLI-free supporting evidence: `bash scripts/capture-evidence.sh` (not the CLI simulation).
The workflow reads the manifest `GET /api/snapshots/clips` and YouTube; it no longer reads view counts from Clippo.
