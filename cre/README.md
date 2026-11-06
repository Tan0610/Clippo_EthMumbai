# Clippo CRE settlement workflow

Chainlink CRE (TypeScript SDK `@chainlink/cre-sdk` 1.23) workflow in `workflows/clippo-settlement/`. For the track write-up, evidence and honest limits, read `../docs/tracks/CRE.md` first.

Status (2026-11-07): workflow v2 ran as a `cre workflow simulate --broadcast` on real Arc testnet, reading the real YouTube API (tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`). It is a simulation: one node, our own wallet sends the report through Arc's Chainlink test forwarder. It is NOT deployed on the CRE network (deploy access is not enabled), and the receiver is not locked.

Workflow v2: the nodes read YouTube view counts themselves. Clippo only says WHICH clips to check.

Flow (trigger 0: cron, daily; trigger 1: HTTP, optional body `{"day":"YYYY-MM-DD"}` to settle an older day). Function names are in `main.ts` and `youtube.ts`:
1. `fetchManifest`: each node calls `GET {backendUrl}{manifestPath}[?day=]` -> `{day, hash, clips: [{campaignId, creator, videoId, channelId}]}`. `normalizeManifest` validates and canonicalises it (lowercase creators, sorted, deduped, max `MAX_CLIPS` = 300). Nodes must return identical `{day, sourceHash, hash, clips}` (`identical` per field).
2. Guards: `assertFresh` rejects a manifest older than `maxStalenessDays` (or in the future); an empty manifest is a no-op.
3. `readYoutube` (runs on each node via `runInNodeMode`): reads the CRE secret `YOUTUBE_API_KEY` and calls the YouTube Data API v3 (`youtubeApiBase`): `videos.list` and `channels.list`, 50 ids per call, with `fields=` to keep responses small. The key is sent in the `x-goog-api-key` header (`youtubeGet`), never in the URL or a log.
4. `evaluateClips`: per clip, a node keeps it only if the video's channel equals the manifest `channelId` AND the channel bio contains the exact lowercase string `clippo:<creator wallet>` (`bioHasCode`). Dropped clips are logged with the reason.
5. Consensus (`observationAggregation`) on one fixed-shape record `{kept, v0, v1, ...}`: `kept` is the list of kept manifest indexes (`identical`, so nodes that disagree on which clips count break consensus instead of being signed), and `v<i>` is clip i's view count (`median`, 0 when dropped). The field map is built at runtime from the agreed manifest size.
6. `sumByCreator` adds views per `(campaignId, creator)` over the kept clips. `chunkRows` splits them into batches of `maxRowsPerReport` (25); `encodeReport` ABI-encodes `(uint256 campaignId, address creator, uint256 cumulativeViews)[]`; each batch is signed (`runtime.report`) and written with `EVMClient.writeReport` to `ClippoReportReceiver` -> `ClippoEscrow.reportViews` (credits only growth, capped by the pool; the creator must be a linked World ID human). `assertReceiverConfigured` refuses a zero `receiverAddress` once there is something to deliver.
7. The forwarder hides a reverted `onReport`, so `readReportOutcome` reads the receipt (`summarizeReceiverLogs`): a missing `ReportProcessed` event fails the run, and rows the receiver skipped (`ItemFailed`, for example `NotHuman()`) are logged and counted as `failedRows`. The run still ends with a result string such as `delivered day=... rows=1 reports=1 failedRows=0 unconfirmedBatches=0 txs=0x...`.

Limits: about 3 HTTP calls per 50 clips (CRE limit 15 per run), 2 consensus calls (limit 50), observation about 20 bytes per clip (limit 25 KB). Source: https://docs.chain.link/cre/service-quotas.

## Setup

```
cd cre
npm install                # or bun install
npm run typecheck          # tsc --noEmit
npm test                   # snapshot.test.ts + youtube.test.ts (node:test)
npm run compile            # cre-compile to dist/clippo-settlement.wasm
```

Typecheck is clean and 26 tests pass (13 in `snapshot.test.ts`, 13 in `youtube.test.ts`); the workflow compiles to WASM (2.6 MB). Run on the merged tree (main `ab35b35`), per `../docs/BUILD_LOG.md` entry 21; not re-run for this README.

Secrets: `secrets.yaml` maps the CRE secret `YOUTUBE_API_KEY` to the env var `YOUTUBE_API_KEY_CRE` (set it in the shell or `cre/.env`; `workflow.yaml` points both targets at `../../secrets.yaml`). Real keys never go in the repo; `.env` is git-ignored and `.env.example` shows the names (`CRE_ETH_PRIVATE_KEY`, `YOUTUBE_API_KEY_CRE`).

Install the CRE CLI (https://docs.chain.link/cre/getting-started/cli-installation), run `cre login` (needed even for simulation), and install Bun (the CLI uses it to compile).

Config files in `workflows/clippo-settlement/`:
- `config.staging.json` (target `staging-settings`): `backendUrl` and `youtubeApiBase` (`/youtube/v3`) are the local mock backend and fake YouTube API `http://127.0.0.1:8787` (`scripts/mock-backend.mjs`), and `evm.receiverAddress` is a receiver on a local anvil fork. `scripts/local-chain.sh` rewrites `receiverAddress` on every run.
- `config.production.json` (target `production-settings`): `backendUrl` is `https://clippo-cre.vercel.app` (the deployed test site); `evm.receiverAddress` is the `ClippoReportReceiver` on real Arc testnet, `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` (simulation mode, see `../docs/CRE_DEPLOY.md`). It sets `requireHttpAuthorizedKeys` true and lists the simulation wallet `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6` as the authorized HTTP key. The workflow refuses to deliver rows while `receiverAddress` is the zero address.

Fields (`config.ts`, `configSchema`): `schedule` (6-field cron, default `0 30 0 * * *`, daily 00:30 UTC), `backendUrl`, `manifestPath` (`/api/snapshots/clips`), `youtubeApiBase` (`https://www.googleapis.com/youtube/v3`), `feedPath` (optional, legacy `/api/snapshots/daily`, only `emulate-delivery.mts` reads it), `maxStalenessDays`, `maxRowsPerReport`, `httpAuthorizedKeys` and `requireHttpAuthorizedKeys` (EVM addresses allowed to call the deployed HTTP trigger; `httpTriggerConfig` fails at startup when the flag is true and there are no keys), and `evm`: `chainSelectorName` (`arc-testnet`, present in SDK 1.23 chain selectors), `isTestnet`, `receiverAddress` (deployed `ClippoReportReceiver`, see `../contracts/README.md`), `gasLimit`.

`project.yaml`: `staging-settings` RPC is `http://127.0.0.1:8545`, a local anvil FORK of Arc testnet, not real Arc. `production-settings` RPC is `https://rpc.testnet.arc.io`. Copy `.env.example` to `.env`; `CRE_ETH_PRIVATE_KEY` is only needed to broadcast (`scripts/simulate-local.sh` uses the public anvil key).

## Scripts

| Script | What it does |
| --- | --- |
| `scripts/simulate-local.sh` | Real CLI simulation on a local anvil fork of Arc + mock backend + fake YouTube API (fake key `FAKE_YOUTUBE_KEY`): first delivery, replay via the HTTP trigger, an unlinked creator. Needs `cre` (logged in), bun, foundry. |
| `scripts/simulate-real-youtube.sh <wallet> <video id> <channel id> [campaign]` | Real YouTube read, delivered on a local fork. Needs `YOUTUBE_API_KEY_CRE` in `cre/.env`. |
| `scripts/arc-deploy.sh` | The owner runs it: deploys escrow and receiver to real Arc in simulation mode, creates and approves one 5 USDC PerView campaign, registers the demo creator as a human (attestor-signed), writes `scripts/.arc-deploy.env` (addresses only) and the receiver into `config.production.json`. Asks for the admin key, hidden. |
| `scripts/simulate-arc-real.sh <video id> <channel id>` | `cre workflow simulate --target production-settings --broadcast` on real Arc, real YouTube, deployed receiver. Uses a one-clip manifest from a local mock backend (the deployed manifest is empty until an approval day has finished) and the simulation wallet `CRE_ETH_PRIVATE_KEY` from `cre/.env`. Prints `reportedViews` and `credited` from the chain at the end. |
| `scripts/local-chain.sh` | Deploys MockUSDC, escrow and receiver on the local fork, seeds campaigns 1..12 (approves 7 and 12), links the fixture creators with `registerHuman`, patches `receiverAddress` in `config.staging.json`. |
| `scripts/mock-backend.mjs` | Local manifest and fake YouTube API. Modes: fixture, empty, stale, large, bump, unlinked, realyt. |
| `scripts/emulate-delivery.mts`, `scripts/capture-evidence.sh` | CLI-free supporting evidence (workflow code paths against the fork). NOT the CLI simulation. |

## Simulate

```
# real CLI simulation on a local anvil fork + mock backend + fake YouTube API (needs cre, bun, foundry, `cre login`)
bash scripts/simulate-local.sh
# live backend + real YouTube, no broadcast (needs a real YOUTUBE_API_KEY_CRE; npm run simulate:live)
# the deployed manifest is empty today, so a no-op is expected; this exact run was not repeated for v2
cre workflow simulate ./workflows/clippo-settlement --target production-settings --non-interactive --trigger-index 0
# REAL Arc testnet with --broadcast, reading the real YouTube API (after scripts/arc-deploy.sh; see ../docs/CRE_DEPLOY.md)
bash scripts/simulate-arc-real.sh <youtube video id> <youtube channel id>
```

`npm run simulate` and `npm run simulate:broadcast` use `staging-settings` with `--non-interactive --trigger-index 0`, so they need the local fork and mock backend that `simulate-local.sh` starts (see the manual steps in `../docs/tracks/CRE.md`, section 6). Trigger index 1 is the HTTP trigger (`--http-payload '{}'`).

For simulation, the CRE simulator's mock forwarder address must be set as `forwarder` on `ClippoReportReceiver` (`setForwarder`, or `FORWARDER_ADDRESS` at deploy) and the receiver registered once via `ClippoEscrow.setReportAdapter` (the deploy script does this). The mock forwarder passes no workflow metadata, so the receiver is deployed with `INSECURE_SKIP_WORKFLOW_CHECK=true` (or `setWorkflowCheckSkipped(true)`); while that flag is on, `onReport` also requires `tx.origin == expectedWorkflowOwner`, the key running the simulation. For production use the KeystoneForwarder address for the target chain from the CRE docs (Arc: `0x76c9cf548b4179F8901cda1f8623568b58215E62`), set `EXPECTED_WORKFLOW_OWNER` (required; the receiver fails closed without it), `setExpectedWorkflowId` after `cre workflow deploy`, `setWorkflowCheckSkipped(false)`, then `lockConfig()`. This production setup is NOT done. See `../contracts/README.md`.

## Status

Full detail, evidence and limits: `../docs/tracks/CRE.md`.

| Run | Result | Output |
| --- | --- | --- |
| Real Arc, real YouTube (`simulate-arc-real.sh`, CLI v1.39.0, `production-settings --broadcast`) | "youtube agreed: kept 1/1 clips", 1 report, 0 failed rows. Tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409` (https://explorer.testnet.arc.io/tx/0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409), receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd`, escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`. `cast call`: `reportedViews` 3, `credited` 30000 units (0.03 USDC) | `../docs/tracks/cre-simulation-real-arc.txt` |
| Local fork, real YouTube (`simulate-real-youtube.sh`) | Same read, delivered on a fork; `reportedViews` 3 | `../docs/tracks/cre-simulation-real-youtube.txt` |
| Local fork, mock backend (`simulate-local.sh`) | Ran green earlier (3 of 5 clips kept, 2 dropped, credited on the fork; per `../docs/BUILD_LOG.md`). Output not saved for v2 | n/a |
| Workflow v1 (before the nodes read YouTube; read `/api/snapshots/daily`) | Live feed without broadcast: "no-op: empty snapshot". On a fork: first delivery credits, replay credits 0, unlinked creator fails with `NotHuman()` | `../docs/tracks/cre-simulation-output.txt` |

The app side (Confirmed views from `ViewsReported`, the clip manifest route, the indexer) is documented in `../docs/tracks/CRE.md`; the deployed site https://clippo-cre.vercel.app shows the real-Arc result for campaign 1.

Not proven: it is a SIMULATION. The simulator runs a single node, so real multi-node consensus never ran; the report was sent by our own simulation wallet through Arc's Chainlink TEST forwarder, so no Chainlink nodes signed it and the receiver is not locked. The manifest in the real-Arc run came from a local mock backend, not from the deployed backend. No workflow is deployed (deploy needs CRE Early Access; `cre whoami` showed "Deploy Access: Not enabled"). `cre workflow simulate` needs `cre login`, and its API check timed out intermittently during the runs. The workflow reads the manifest `GET /api/snapshots/clips` and YouTube; it no longer reads view counts from Clippo.
