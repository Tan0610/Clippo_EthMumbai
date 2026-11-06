# CRE scope: contract, backend, frontend, workflow, and what the owner provides

> **Status banner, 2026-11-07.** This scope was agreed before the work and is now implemented and merged to `main` (PR #2, `ab35b35`). Contract: no code change (no diff under `contracts/src` since `8c28d88`). Backend, frontend and workflow items B1 to B7, F1 to F8 and C1 to C5 are built; each table below has a status column. Owner items 1 to 9 are done; item 10 (deploy the workflow, pin and lock the receiver) is NOT done, because deploy access is not enabled for our account. The workflow ran as a `cre workflow simulate --broadcast` on real Arc with the real YouTube API (tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`). Evidence, honest limits and the demo steps: `docs/tracks/CRE.md`. Test state on the merged tree: web 325 passed (1 skipped), CRE 26 passed, Foundry 114 passed.

Branch `feat/cre-core`. Read with `docs/CRE_PLAN.md` (milestones) and `docs/FOCUS.md` (rules). This file is the agreed boundary: what changes where, the shared data shapes, who owns which files, and what we need from the owner before work starts.

Goal: CRE sits in the core in three layers (see CRE_PLAN section 3b): **truth** (nodes read YouTube), **visible** (the app shows views confirmed by CRE), **immutable** (workflow pinned and receiver locked after deploy). State: truth built, visible built, immutable NOT done.

## 1. Scope by layer

### 1.1 Smart contracts: NO CODE CHANGE (held)

Checked in `contracts/src`:

| Need | Already there |
| --- | --- |
| Confirmed views for the app | `event ViewsReported(campaignId, creator, cumulativeViews, deltaViews, credited)` (indexed on campaign and creator) and `reportedViews[id][creator]` (public). |
| Only CRE can credit | `reportViews` needs `msg.sender == reportAdapter`; `setReportAdapter` is one-shot. |
| Receiver accepts only our workflow | `setExpectedWorkflowOwner`, `setExpectedWorkflowId`, `setExpectedWorkflowName`, `lockConfig`. |
| Simulation on real Arc | `workflowCheckSkipped` + `tx.origin == expectedWorkflowOwner`; `setForwarder` can later switch from the mock to the production forwarder. |
| Deploy | `contracts/script/Deploy.s.sol` reads `FORWARDER_ADDRESS`, `EXPECTED_WORKFLOW_OWNER`, `EXPECTED_WORKFLOW_ID`, `INSECURE_SKIP_WORKFLOW_CHECK`, `HUMAN_ATTESTOR_ADDRESS`. |

Limits we accept (would need a contract change, so out of scope):
- Chain data is per (campaign, creator), not per clip. The app shows confirmed views at campaign level for a creator. Per-clip views stay "pending" (Clippo's own count).
- The workflow id is only known after a workflow is deployed. Pinning it (`setExpectedWorkflowId`, then `lockConfig`) is a post-deploy step by the receiver owner, not a deploy-time parameter.
- `lockConfig` refuses while `workflowCheckSkipped` is on (`CannotLockWhileSkipping`), so the immutable layer works only for a real deployed workflow, never for a simulation.

Owner actions on the contract side (no code):
- Deploy the enforcing escrow and receiver. **Done 2026-11-07** (`cre/scripts/arc-deploy.sh`, `docs/CRE_DEPLOY.md`): escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`, receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd`, in simulation mode.
- After a workflow deploy, the pin and lock transactions. **Not done** (no deployed workflow). Read from Arc: `workflowCheckSkipped` true, `configLocked` false, `expectedWorkflowId` zero.

### 1.2 Backend (`web/src/app/api`, `web/src/lib`, `web/prisma`, `web/scripts`)

| # | Change | Notes | Status |
| --- | --- | --- | --- |
| B1 | New table `ViewsReport`: `campaignId`, `creatorId`, `cumulativeViews`, `deltaViews`, `credited`, `txHash`, `logIndex`, `blockNumber`, `reportedAt`; unique on `(txHash, logIndex)`. Prisma migration. | Append-only. "Confirmed" = the highest `cumulativeViews` per (campaign, creator). | Built (`web/prisma/schema.prisma` `ViewsReport`) |
| B2 | Indexer handles `ViewsReported` (`web/src/lib/chain/indexer.ts`): look up campaign by on-chain id and creator by wallet, read the block time, insert a row. | A row for an unknown wallet is skipped with a reason, as `CreatorCredited` does. Runs through the existing `chain-sync` cron and `processReceipt`. | Built (`ViewsReported` case) |
| B3 | New `web/src/lib/confirmed.ts`: confirmed views per (campaign, creator), per campaign, per creator, and the latest report (proof). `pendingViews = max(0, polledViews - confirmedViews)` at creator-campaign level. | HUMAN_SPLIT campaigns return no confirmed data (CRE does not report them). | Built (`foldReports`, `confirmedByPair`, `confirmedForCampaign`, `pendingViews`, `withPending`) |
| B4 | Additive fields on existing routes, no breaking change (shapes in section 2). | `dashboard/creator`, `dashboard/campaigner`, `creator/earnings`, `campaigns/[id]`, `chain/config` (`explorerBase`). | Built (documented in `web/API.md`) |
| B5 | Manifest route `GET /api/snapshots/clips?day=YYYY-MM-DD`, frozen per UTC day with a hash, like `/daily`. | Lists approved, live, verdict-approved clips of PER_VIEW and POOL_SHARE campaigns, with the `VIEW_ANOMALY` hold applied. No view counts inside. Must be byte-identical for every node, so it is frozen by day (a live list could change between node fetches and break consensus). | Built (`web/src/app/api/snapshots/clips/route.ts`, `web/src/lib/clip-manifest.ts` `frozenClipManifest`). Returns 400 for an unfinished day. Empty on the deployed site until the seeded approval day has ended (UTC) |
| B6 | Wallet-bound channel code: `web/src/app/api/channels/route.ts` creates `clippo:<wallet lowercase>`. Old-format channels: `needsReverify` flag in the list, and `POST /api/channels/:id/upgrade-code` rotates the code and sets `verified=false` until the bio check passes. | The manifest includes only channels whose code has the new format and are verified. | Built (`web/src/lib/channel-code.ts`, `web/src/app/api/channels/[id]/upgrade-code`) |
| B7 | Tests (vitest) for B2 to B6; update `web/API.md`. | Existing suite must stay green. | Built (`clip-manifest.integration.test.ts`, `chain/confirmed-views.integration.test.ts`, `chain/confirmed-views.e2e.test.ts`; `web/API.md` updated) |

Not changing: `snapshots/daily` and `snapshots/latest` stay (the staging workflow and scripts still use `/daily`); `refreshSnapshots` stays (it still feeds fraud flags and "pending"). Held. (The v2 workflow itself no longer reads `/daily`; only `cre/scripts/emulate-delivery.mts` does.)

### 1.3 CRE workflow (`cre/`)

| # | Change | Status |
| --- | --- | --- |
| C1 | `main.ts` v2: fetch manifest (`identical` on its hash), read the YouTube Data API for videos and channels, check the channel bio holds `clippo:<wallet>`, take the `median` of the view counts, keep only agreed clips, then report as today. | Built (`settle`, `fetchManifest`, `readYoutube`, `observationAggregation`). Ran on one simulated node |
| C2 | Secret `YOUTUBE_API_KEY` via `cre/secrets.yaml` (maps to env var `YOUTUBE_API_KEY_CRE`) and `secrets-path` in `workflow.yaml`. Key sent in the `x-goog-api-key` header, never logged. | Built |
| C3 | Pure helpers and unit tests (response parsing, bio match, row building, median record). `fields=` on YouTube calls keeps responses under 250 KB. | Built (`youtube.ts`, `youtube.test.ts`: 13 tests; `snapshot.test.ts`: 13 tests) |
| C4 | `mock-backend.mjs` also serves the manifest and a fake YouTube API (config field for the API base URL) so the local fork run is deterministic. | Built (modes fixture, empty, stale, large, bump, unlinked, realyt) |
| C5 | Config: `manifestPath`, `youtubeApiBase`, and keep `maxRowsPerReport`, `maxStalenessDays`. | Built. Also merged from a teammate (not in the original scope): `httpAuthorizedKeys` and `requireHttpAuthorizedKeys`; production lists the simulation wallet as the authorized key |

Budget check against CRE limits: about 3 HTTP requests (manifest, videos, channels) per 50 clips, 2 consensus calls, well under 15 and 50. A run is capped at 300 clips (`MAX_CLIPS` in `youtube.ts`).

### 1.4 Frontend (`web/src/components`, `web/src/ui-mocks`)

New idea shown to users: **Confirmed** (read from YouTube by Chainlink CRE and written on Arc; this is what is paid) versus **Pending** (Clippo's own count, not paid until confirmed).

| # | Change | Where | Status |
| --- | --- | --- | --- |
| F1 | Types and mappers for the new fields; matching mock data in `ui-mocks` so screens work in demo mode before the backend lands. | `components/api.ts`, `ui-mocks/*` | Built |
| F2 | One small component `ConfirmedViews` (variants: inline cell, stat block, line) with the badge, the number, the pending number and the proof link. Uses existing classes (`micro`, `fig`, `note`) and works in Paper and Night themes. | new `components/ConfirmedViews.tsx` | Built |
| F3 | Creator money view: confirmed and pending per campaign and in totals. | `LedgerDash.tsx`, `LedgerView.tsx` | Built |
| F4 | Brand views: campaign table column and analytics totals show Confirmed with Pending beneath; "Verified views" is relabelled where the number is only Clippo-polled. | `DeskView.tsx`, `DeskAnalytics.tsx` | Built |
| F5 | Clip detail: the creator's confirmed views for the campaign, the report link, and per-clip views labelled "Clippo count (pending)". | `SlipDetail.tsx` | Built (the deployed `/slips/<campaign id>` page shows "Confirmed views, all creators") |
| F6 | Channel proof: show the new code `clippo:<wallet>` with copy button and the instruction to paste it in the YouTube bio; a "re-verify" prompt when `needsReverify`; a hint on pending views when no clip is bound. | `JoinView.tsx`, `AccountView.tsx` | Built (copy button and re-verify were exercised in demo mode only) |
| F7 | One short explainer line: "Confirmed = read from YouTube by Chainlink CRE nodes and written on Arc. Pending = Clippo's own count." | inside `ConfirmedViews` | Built (`CONFIRMED_EXPLAINER`) |
| F8 | Checks: `npm run typecheck`, `npm run lint`, `npm run check:overflow` (phone widths, both themes). | | Run when built (typecheck clean; lint clean on the changed files; overflow checked in demo mode) per `docs/BUILD_LOG.md` entry 12; not re-run for this doc |

Out of scope for this round (they keep the Clippo count and their labels): leaderboard (`Standing.tsx`), profile and tiers (`ModulePages.tsx`), trending (`WireView.tsx`), HUMAN_SPLIT campaigns. Held.

## 2. Shared data contract (frozen: FE and BE both build to this)

```ts
type Proof = { txHash: string; blockNumber: number; reportedAt: string /* ISO */; explorerUrl: string } | null;

type ConfirmedFields = {
  confirmedViews: number;   // latest on-chain cumulative views for this creator in this campaign; 0 if none
  pendingViews: number;     // max(0, clippoViews - confirmedViews)
  proof: Proof;             // latest ViewsReported tx, null if none yet
};
```

| Route | Addition (all optional for old clients) |
| --- | --- |
| `GET /api/dashboard/creator` | `campaigns[i]`: `ConfirmedFields`; `totals`: `confirmedViews`, `pendingViews` |
| `GET /api/creator/earnings` | `campaigns[i]`: `ConfirmedFields` |
| `GET /api/dashboard/campaigner` | `campaigns[i]`: `confirmedViews`, `pendingViews`, `proof` (latest report in the campaign); `totals`: `confirmedViews`, `pendingViews` |
| `GET /api/campaigns/:id` | `performance`: `confirmedViews`, `pendingViews`, `proof` |
| `GET /api/chain/config` | `chain.explorerBase` (for example `https://explorer.testnet.arc.io`) |
| `GET /api/channels`, `POST /api/channels` | channel: `verificationCode` in the new format, `needsReverify: boolean` |
| `POST /api/channels/:id/upgrade-code` (new) | returns `{ channel }` with the new code and `verified: false` |
| `GET /api/snapshots/clips?day=` (new, for CRE) | `{ day, hash, clips: [{ campaignId: "12", creator: "0x..", videoId, channelId }] }` |

HUMAN_SPLIT campaigns: `confirmedViews = 0`, `proof = null`, and the UI hides the Confirmed block.

State: all of these are built and documented in `web/API.md`. The deployed `GET /api/campaigns/cmw5jiz940005scec1r7rcyaz` returns `performance.confirmedViews` 3, `pendingViews` 0 and a `proof` with the real transaction (re-read with curl).

## 3. Who owns which files (so tracks do not collide)

The tracks ran in parallel on these boundaries and are all merged.

| Track | Owns | Never touches |
| --- | --- | --- |
| Backend | `web/src/app/api/**`, `web/src/lib/**`, `web/prisma/**`, `web/src/test/**`, `web/scripts/**`, `web/API.md` | `web/src/components/**`, `cre/**` |
| Frontend | `web/src/components/**`, `web/src/ui-mocks/**`, `web/src/app/(site)/**` | `web/src/lib/**`, `web/src/app/api/**`, `cre/**` |
| CRE | `cre/**` | `web/**`, `contracts/**` |
| Docs (lead) | `docs/**`, root README | code |

Sync points: **S1** mocks ready (FE builds on mocks while BE builds). **S2** BE routes live on a local database (FE switches from mocks to real). **S3** the CRE `--broadcast` run on the local Arc fork writes `ViewsReported`, the BE indexes it, and the FE shows Confirmed (all three tracks join). **S4** real Arc run. All four are done; S4 is a simulation on real Arc (see `docs/CRE_PLAN.md` section 4 for the state of each).

## 4. Acceptance (what "done" means), with the state on 2026-11-07

| Criterion | State |
| --- | --- |
| Contract: no diff under `contracts/src`. Existing 114 Foundry tests untouched. | Met. `git diff 8c28d88 HEAD -- contracts/src` is empty; Foundry: 114 passed |
| Backend: new tests pass; whole `npm test` and `npm run typecheck` pass; migration applies on a clean database. | Met on the merged tree: web 325 passed, 1 skipped (the gated fork test); typecheck clean. The migration applied to the empty Neon database of the deployed site |
| Frontend: typecheck, lint and `check:overflow` pass; in demo mode and with real data the Confirmed and Pending numbers show and the proof link opens the right tx. | Met for typecheck and lint on the changed files, overflow in demo mode. Real data: the browser check on a local fork passed 14 of 14; the deployed campaign page shows Confirmed 3 and the proof link. The creator's own `/ledger` on the deployed site was not opened (sign-in there needs a wallet signature) |
| CRE: unit tests pass; `cre-compile` passes; local fork run credits creators and drops a clip with a wrong bio code; a unit test shows median selection. | Unit tests: 26 passed. Compile: WASM 2.6 MB. Fork run with a drop: recorded in `docs/BUILD_LOG.md` (3 of 5 clips kept, 2 dropped); that CLI output is not saved in `docs/tracks`. Median: `youtube.test.ts` "median record" |
| End to end (S3): after one run, the creator ledger shows Confirmed = what the chain reports, with a tx link. | Met on the local fork (14 of 14 browser checks). On real Arc and the deployed site the campaign page shows it |
| Docs: the build log has real outputs only; nothing claims a deploy that did not happen. | Held: no workflow deployment is claimed |

## 5. What the owner provides, and when (with state)

**A. Before we start (blocking)**
1. Approve this scope. Two product effects need a yes: (a) existing creators must re-verify their channel with the new `clippo:<wallet>` bio code; (b) the app now labels the Clippo-polled number "Pending" and only CRE-reported views "Confirmed". *Done: the work went ahead.*
2. Run `! cre account access` (browser) and tell us the result. It decides whether the immutable layer is possible. ***Open.** The result has not been reported. `cre whoami` showed "Deploy Access: Not enabled" when last checked.*
3. A YouTube Data API v3 key. Google Cloud: create or pick a project, enable "YouTube Data API v3", create an API key (no IP restriction, because CRE nodes have no fixed IP). Put it in `cre/.env` as `YOUTUBE_API_KEY_CRE=...` and in `web/.env.local` as `YOUTUBE_API_KEY=...`. Never paste it in chat. *Done (also set on the deployed site).*
4. A test YouTube channel you control, one public video on it, and a test creator wallet address. You paste `clippo:<that wallet, lowercase>` into the channel bio. *Done: channel @visualsbyanii (`UCIZw3qclbEDMa4TCFMAatww`), video `vWk4YV_dbsE`, wallet `0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5`; the bio line was checked through the API.*

**B. Before the local end-to-end run (S3)**
5. Nothing new: Foundry, anvil, the CRE CLI (logged in, v1.39.0) and bun are installed here. *Done.*

**C. Before the real Arc run (S4)**
6. Deploy the enforcing escrow and receiver on Arc testnet with your wallet. It needs: `HUMAN_ATTESTOR_ADDRESS` (the backend wallet address), `FORWARDER_ADDRESS` (the Arc simulation mock forwarder), `EXPECTED_WORKFLOW_OWNER` (the address of the key that runs the simulation), and `INSECURE_SKIP_WORKFLOW_CHECK=true` for simulation. *Done 2026-11-07 with `cre/scripts/arc-deploy.sh`: attestor `0x62EdCF9A14F0aB803Ee154EE9709323E56655074`, forwarder `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`, workflow owner `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6`. Escrow and receiver addresses are in section 1.1.*
7. A funded Arc testnet key for `CRE_ETH_PRIVATE_KEY` (USDC is gas; https://faucet.circle.com). Only in `cre/.env`. *Done: the simulation wallet is funded.*
8. The demo creator wallet must be registered as a human on-chain, or CRE rows fail with `NotHuman`. *Done by the attestor-signed registration script inside `arc-deploy.sh`. It is a stand-in for the World check, to be said plainly.*
9. Optional for the CRE prize, required for the live-site demo: deploy to Vercel with `DATABASE_URL`, `YOUTUBE_API_KEY`, `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, then run the migrations. *Done: a NEW project, https://clippo-cre.vercel.app (the old `clippo-six` is not in the owner's Vercel account). The exact steps are in `docs/CRE_DEPLOY.md` section 6. The CRE run itself did not use the deployed manifest.*

**D. Only if deploy access is approved**
10. Log in to run `cre workflow deploy` and `cre secrets create` (they open your browser), then the two receiver owner transactions: `setExpectedWorkflowId(<id>)` and `lockConfig()`. ***Not done.** Deploy access is not enabled, so the receiver stays in simulation mode. The steps are in `docs/tracks/CRE.md` Appendix C.*

## 6. Open questions

- Should "Verified views" on the leaderboard and profile also be renamed? Default: leave them for now. *Unchanged: left as they were.*
- Should payouts shown to creators wait for Confirmed? On-chain they already do; the UI only states it. *Unchanged.*
