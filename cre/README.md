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

Typecheck and tests (`snapshot.test.ts`, `youtube.test.ts`) pass.

Secrets: `secrets.yaml` maps the CRE secret `YOUTUBE_API_KEY` to the env var `YOUTUBE_API_KEY_CRE` (set it in the shell or `cre/.env`; `workflow.yaml` points both targets at `../../secrets.yaml`). Real keys never go in the repo.

Install the CRE CLI (https://docs.chain.link/cre/getting-started/cli-installation), `cre login`, and Bun (needed by the CLI for compilation).

Config files in `workflows/clippo-settlement/`:
- `config.staging.json` (target `staging-settings`): `backendUrl` and `youtubeApiBase` (`/youtube/v3`) are the local mock backend and fake YouTube API `http://127.0.0.1:8787` (`scripts/mock-backend.mjs`), and `evm.receiverAddress` is a receiver on a local anvil fork. `scripts/local-chain.sh` rewrites `receiverAddress` on every run.
- `config.production.json` (target `production-settings`): `backendUrl` is `https://clippo-six.vercel.app`; `evm.receiverAddress` is still the zero address until a receiver is deployed (the workflow refuses to deliver rows while it is zero).

Fields: `backendUrl`, `manifestPath` (`/api/snapshots/clips`), `youtubeApiBase` (`https://www.googleapis.com/youtube/v3`), `feedPath` (optional, legacy `/api/snapshots/daily`, only `emulate-delivery.mts` reads it), `maxStalenessDays`, `maxRowsPerReport`, `evm.receiverAddress` (deployed `ClippoReportReceiver`, see `../contracts/README.md`), `evm.chainSelectorName` (`arc-testnet`, present in SDK 1.23 chain selectors), `evm.gasLimit`, and `schedule` (6-field cron, default `0 30 0 * * *`, daily 00:30 UTC).

`project.yaml`: `staging-settings` RPC is `http://127.0.0.1:8545`, a local anvil FORK of Arc testnet, not real Arc. `production-settings` RPC is `https://rpc.testnet.arc.network`. Copy `.env.example` to `.env`; `CRE_ETH_PRIVATE_KEY` is only needed to broadcast (`scripts/simulate-local.sh` uses the public anvil key).

## Simulate

```
# real CLI simulation on a local anvil fork of Arc + mock backend + fake YouTube API (fake key FAKE_YOUTUBE_KEY) (needs cre, bun, foundry, `cre login`)
bash scripts/simulate-local.sh
# live backend + real YouTube, no broadcast (needs a real YOUTUBE_API_KEY_CRE; npm run simulate:live)
cre workflow simulate ./workflows/clippo-settlement --target production-settings --non-interactive --trigger-index 0
```

`npm run simulate` and `npm run simulate:broadcast` use `staging-settings` with `--non-interactive --trigger-index 0`, so they need the local fork and mock backend that `simulate-local.sh` starts (see the manual steps in `../docs/tracks/CRE.md`). Trigger index 1 is the HTTP trigger (`--http-payload '{}'`).

For simulation, the CRE simulator's mock forwarder address must be set as `forwarder` on `ClippoReportReceiver` (`setForwarder`, or `FORWARDER_ADDRESS` at deploy) and the receiver registered via `ClippoEscrow.setReportAdapter`. The mock forwarder passes no workflow metadata, so the receiver must be deployed with `INSECURE_SKIP_WORKFLOW_CHECK=true` (or `setWorkflowCheckSkipped(true)`). For production use the KeystoneForwarder address for the target chain from the CRE docs, set `EXPECTED_WORKFLOW_OWNER` (required; receiver fails closed without it), optionally `setExpectedWorkflowId` after `cre workflow deploy`, and `setWorkflowCheckSkipped(false)`. See `../contracts/README.md`.

## Status

See `../docs/tracks/CRE.md` (requirements checklist, evidence, live path, unverified items) and `../docs/tracks/cre-simulation-output.txt` (real `cre` CLI output).

Workflow v2: `bash scripts/simulate-local.sh` ran green against the mock backend and fake YouTube API (3 of 5 clips kept, 2 dropped, credited on the local fork). Real YouTube and a real backend manifest were not run. The paragraph below describes the earlier v1 runs.

v1 run: `cre workflow simulate` (v1.39.0) ran against the live feed on `production-settings` without broadcast (exit 0, "no-op: empty snapshot", because the live feed has no rows). With `--broadcast` on a local anvil FORK of Arc, a mock feed and the Arc MockKeystoneForwarder, the receiver credited creators in the escrow (checked with `cast call`).

Not proven: nothing was broadcast to real Arc, no workflow is deployed (deploy needs CRE Early Access), and the simulator runs a single node, so real multi-node consensus never ran. The local fork run deployed fresh copies of the HEAD contracts (MockUSDC, escrow, receiver) on the fork. The enforcing escrow (`498f649`) is not deployed on real Arc, and `config.production.json` has no receiver yet. `cre workflow simulate` needs `cre login`, and its API check timed out intermittently during the runs. CLI-free supporting evidence: `bash scripts/capture-evidence.sh` (not the CLI simulation).
The workflow reads the manifest `GET /api/snapshots/clips` and YouTube; it no longer reads view counts from Clippo.
