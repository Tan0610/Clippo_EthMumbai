# CRE scope: contract, backend, frontend, workflow, and what the owner provides

Branch `feat/cre-core`. Read with `docs/CRE_PLAN.md` (milestones) and `docs/FOCUS.md` (rules). This file is the agreed boundary: what changes where, the shared data shapes, who owns which files, and what we need from the owner before work starts.

Goal: CRE sits in the core in three layers (see CRE_PLAN section 3b): **truth** (nodes read YouTube), **visible** (the app shows views confirmed by CRE), **immutable** (workflow pinned and receiver locked after deploy).

## 1. Scope by layer

### 1.1 Smart contracts: NO CODE CHANGE

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
- `lockConfig` refuses while `workflowCheckSkipped` is on, so the immutable layer works only for a real deployed workflow, never for a simulation.

Owner actions on the contract side (no code): deploy the enforcing escrow and receiver (see section 5), and after a workflow deploy, the pin and lock transactions.

### 1.2 Backend (`web/src/app/api`, `web/src/lib`, `web/prisma`, `web/scripts`)

| # | Change | Notes |
| --- | --- | --- |
| B1 | New table `ViewsReport`: `campaignId`, `creatorId`, `cumulativeViews`, `deltaViews`, `credited`, `txHash`, `logIndex`, `blockNumber`, `reportedAt`; unique on `(txHash, logIndex)`. Prisma migration. | Append-only. "Confirmed" = the highest `cumulativeViews` per (campaign, creator). |
| B2 | Indexer handles `ViewsReported` (`web/src/lib/chain/indexer.ts`): look up campaign by on-chain id and creator by wallet, read the block time, insert a row. | A row for an unknown wallet is skipped with a reason, as `CreatorCredited` does. Runs through the existing `chain-sync` cron and `processReceipt`. |
| B3 | New `web/src/lib/confirmed.ts`: confirmed views per (campaign, creator), per campaign, per creator, and the latest report (proof). `pendingViews = max(0, polledViews - confirmedViews)` at creator-campaign level. | HUMAN_SPLIT campaigns return no confirmed data (CRE does not report them). |
| B4 | Additive fields on existing routes, no breaking change (shapes in section 2). | `dashboard/creator`, `dashboard/campaigner`, `creator/earnings`, `campaigns/[id]`, `chain/config` (`explorerBase`). |
| B5 | Manifest route `GET /api/snapshots/clips?day=YYYY-MM-DD`, frozen per UTC day with a hash, like `/daily`. | Lists approved, live, verdict-approved clips of PER_VIEW and POOL_SHARE campaigns, with the `VIEW_ANOMALY` hold applied. No view counts inside. Must be byte-identical for every node, so it is frozen by day (a live list could change between node fetches and break consensus). |
| B6 | Wallet-bound channel code: `web/src/app/api/channels/route.ts` creates `clippo:<wallet lowercase>`. Old-format channels: `needsReverify` flag in the list, and `POST /api/channels/:id/upgrade-code` rotates the code and sets `verified=false` until the bio check passes. | The manifest includes only channels whose code has the new format and are verified. |
| B7 | Tests (vitest) for B2 to B6; update `web/API.md`. | Existing suite must stay green. |

Not changing: `snapshots/daily` and `snapshots/latest` stay (the staging workflow and scripts still use `/daily`); `refreshSnapshots` stays (it still feeds fraud flags and "pending").

### 1.3 CRE workflow (`cre/`)

| # | Change |
| --- | --- |
| C1 | `main.ts` v2: fetch manifest (`identical` on its hash), read the YouTube Data API for videos and channels, check the channel bio holds `clippo:<wallet>`, take the `median` of the view counts, keep only agreed clips, then report as today. |
| C2 | Secret `YOUTUBE_API_KEY` via `cre/secrets.yaml` (maps to env var `YOUTUBE_API_KEY_CRE`) and `secrets-path` in `workflow.yaml`. Key sent in the `x-goog-api-key` header, never logged. |
| C3 | Pure helpers and unit tests (response parsing, bio match, row building, median record). `fields=` on YouTube calls keeps responses under 250 KB. |
| C4 | `mock-backend.mjs` also serves the manifest and a fake YouTube API (config field for the API base URL) so the local fork run is deterministic. |
| C5 | Config: `manifestPath`, `youtubeApiBase`, and keep `maxRowsPerReport`, `maxStalenessDays`. |

Budget check against CRE limits: about 3 HTTP requests (manifest, videos, channels) per 50 clips, 1 or 2 consensus calls, well under 15 and 50.

### 1.4 Frontend (`web/src/components`, `web/src/ui-mocks`)

New idea shown to users: **Confirmed** (read from YouTube by Chainlink CRE and written on Arc; this is what is paid) versus **Pending** (Clippo's own count, not paid until confirmed).

| # | Change | Where |
| --- | --- | --- |
| F1 | Types and mappers for the new fields; matching mock data in `ui-mocks` so screens work in demo mode before the backend lands. | `components/api.ts`, `ui-mocks/*` |
| F2 | One small component `ConfirmedViews` (variants: inline cell, stat block, line) with the badge, the number, the pending number and the proof link. Uses existing classes (`micro`, `fig`, `note`) and works in Paper and Night themes. | new `components/ConfirmedViews.tsx` |
| F3 | Creator money view: confirmed and pending per campaign and in totals. | `LedgerDash.tsx`, `LedgerView.tsx` |
| F4 | Brand views: campaign table column and analytics totals show Confirmed with Pending beneath; "Verified views" is relabelled where the number is only Clippo-polled. | `DeskView.tsx`, `DeskAnalytics.tsx` |
| F5 | Clip detail: the creator's confirmed views for the campaign, the report link, and per-clip views labelled "Clippo count (pending)". | `SlipDetail.tsx` |
| F6 | Channel proof: show the new code `clippo:<wallet>` with copy button and the instruction to paste it in the YouTube bio; a "re-verify" prompt when `needsReverify`; a hint on pending views when no clip is bound. | `JoinView.tsx`, `AccountView.tsx` |
| F7 | One short explainer line: "Confirmed = read from YouTube by Chainlink CRE nodes and written on Arc. Pending = Clippo's own count." | inside `ConfirmedViews` |
| F8 | Checks: `npm run typecheck`, `npm run lint`, `npm run check:overflow` (phone widths, both themes). | |

Out of scope for this round (they keep the Clippo count and their labels): leaderboard (`Standing.tsx`), profile and tiers (`ModulePages.tsx`), trending (`WireView.tsx`), HUMAN_SPLIT campaigns.

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

## 3. Who owns which files (so tracks do not collide)

| Track | Owns | Never touches |
| --- | --- | --- |
| Backend | `web/src/app/api/**`, `web/src/lib/**`, `web/prisma/**`, `web/src/test/**`, `web/scripts/**`, `web/API.md` | `web/src/components/**`, `cre/**` |
| Frontend | `web/src/components/**`, `web/src/ui-mocks/**`, `web/src/app/(site)/**` | `web/src/lib/**`, `web/src/app/api/**`, `cre/**` |
| CRE | `cre/**` | `web/**`, `contracts/**` |
| Docs (lead) | `docs/**`, root README | code |

Sync points: **S1** mocks ready (FE builds on mocks while BE builds). **S2** BE routes live on a local database (FE switches from mocks to real). **S3** the CRE `--broadcast` run on the local Arc fork writes `ViewsReported`, the BE indexes it, and the FE shows Confirmed (all three tracks join). **S4** real Arc run.

## 4. Acceptance (what "done" means)

- Contract: no diff under `contracts/src`. Existing 114 Foundry tests untouched.
- Backend: new tests pass; whole `npm test` and `npm run typecheck` pass; migration applies on a clean database.
- Frontend: typecheck, lint and `check:overflow` pass; in demo mode and with real data the Confirmed and Pending numbers show and the proof link opens the right tx.
- CRE: unit tests pass; `cre-compile` passes; local fork run credits creators and drops a clip with a wrong bio code; a unit test shows median selection.
- End to end (S3): after one run, the creator ledger shows Confirmed = what the chain reports, with a tx link.
- Docs: the build log has real outputs only; nothing claims a deploy that did not happen.

## 5. What the owner provides, and when

**A. Before we start (blocking)**
1. Approve this scope. Two product effects need a yes: (a) existing creators must re-verify their channel with the new `clippo:<wallet>` bio code; (b) the app now labels the Clippo-polled number "Pending" and only CRE-reported views "Confirmed".
2. Run `! cre account access` (browser) and tell us the result. It decides whether the immutable layer is possible.
3. A YouTube Data API v3 key. Google Cloud: create or pick a project, enable "YouTube Data API v3", create an API key (no IP restriction, because CRE nodes have no fixed IP). Put it in `cre/.env` as `YOUTUBE_API_KEY_CRE=...` and in `web/.env.local` as `YOUTUBE_API_KEY=...`. Never paste it in chat.
4. A test YouTube channel you control, one public video on it, and a test creator wallet address. You will paste `clippo:<that wallet, lowercase>` into the channel bio once the code format ships (we tell you the exact string).

**B. Before the local end-to-end run (S3)**
5. Nothing new: Foundry, anvil, the CRE CLI (logged in, v1.39.0) and bun are installed here.

**C. Before the real Arc run (S4)**
6. Deploy the enforcing escrow and receiver on Arc testnet with your wallet. We prepare the exact command sheet; it needs: `HUMAN_ATTESTOR_ADDRESS` (the backend wallet address), `FORWARDER_ADDRESS` (the Arc simulation mock forwarder; see `docs/tracks/CRE.md`), `EXPECTED_WORKFLOW_OWNER` (the address of the key that runs the simulation), and `INSECURE_SKIP_WORKFLOW_CHECK=true` for simulation. Send us the escrow and receiver addresses.
7. A funded Arc testnet key for `CRE_ETH_PRIVATE_KEY` (USDC is gas; https://faucet.circle.com). Only in `cre/.env`.
8. The demo creator wallet must be registered as a human on-chain, or CRE rows fail with `NotHuman`. This crosses into the World track: either a real or simulated World ID verification through the app (the backend signs `registerHuman`), or we run the attestor-signed registration script. Tell us which you prefer.
9. Optional for the CRE prize, required for the live-site demo: deploy this branch to Vercel with `DATABASE_URL`, `YOUTUBE_API_KEY`, `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, then run `npm run db:migrate`. A CRE simulation can read the manifest from a local backend, so this is not blocking the prize.

**D. Only if deploy access is approved**
10. Log in to run `cre workflow deploy` and `cre secrets create` (they open your browser), then the two receiver owner transactions: `setExpectedWorkflowId(<id>)` and `lockConfig()`.

## 6. Open questions

- Should "Verified views" on the leaderboard and profile also be renamed? Default: leave them for now.
- Should payouts shown to creators wait for Confirmed? On-chain they already do; the UI only states it.
