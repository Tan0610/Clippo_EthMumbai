# Chainlink CRE plan

> **Status banner, 2026-11-07.** This plan was written before the work. Most of it is now built and merged to `main` (PR #2, `ab35b35`). Built: workflow v2 (nodes read YouTube themselves, bio check, median consensus), the clip manifest route, wallet-bound channel codes, the `ViewsReported` indexer and "Confirmed views" with a proof link in the app, the enforcing escrow and receiver on real Arc (simulation mode), and a `cre workflow simulate --broadcast` run on real Arc with the real YouTube API (tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`, 0.03 USDC credited), also shown on the deployed site https://clippo-cre.vercel.app. NOT done: a workflow deployment on the CRE network (deploy access is not enabled for our account), and therefore pinning the workflow id and locking the receiver (the "immutable" layer). Multi-node consensus never ran (the simulator has one node). The evidence, the honest score and the demo steps are in `docs/tracks/CRE.md`; this file keeps the plan and now marks what became of each item.

Branch: `feat/cre-core` (from `feat/core-sponsor-integration` at `8c28d88`), merged to `main` as PR #2. Goal: the prize "Best workflow with CRE" ($1,500), with CRE in the core of Clippo. Rules and order of work for the whole project: `docs/FOCUS.md`. History: `docs/BUILD_LOG.md`.

Prize text (https://ethglobal.com/events/mumbai/prizes): build, simulate or deploy a CRE workflow that links a blockchain with an external API, data source, LLM or agent, shows a successful CLI simulation or a live deployment, and is meaningfully used in the project. Simulation is enough.

## 1. How CRE worked at the start (workflow v1, read from the code before the work)

```
Clippo DB  --(daily freeze)-->  GET /api/snapshots/daily  {day, hash, rows:[{campaignId(onchain), creator, cumulativeViews}]}
                                        |
        CRE workflow (cre/workflows/clippo-settlement/main.ts), cron 00:30 UTC + HTTP trigger
          each node: fetch feed -> normalize -> {day, hash, rows}  -> consensus (all 3 fields identical)
          staleness check -> chunk 25 rows -> runtime.report -> EVMClient.writeReport -> read receipt
                                        |
        KeystoneForwarder -> ClippoReportReceiver.onReport (forwarder + workflow owner/id/name checks)
                                        |
        ClippoEscrow.reportViews  (only the receiver, set once as reportAdapter, can call it)
          PerView: credit = delta views x rate, capped by the pool; PoolShare: views become weights
          needs humanOf[creator] (registerHuman) or the row fails with NotHuman
```

At the start the contract side was solid and the workflow compiled, typechecked (9 unit tests) and was simulated: a live feed gave an empty no-op, and a local fork of Arc credited mock creators (`docs/tracks/cre-simulation-output.txt`).

**How it works now (v2, in the code on `main`):**

```
Clippo DB --(approved, live, verdict-approved clips on a channel whose code is clippo:<wallet>)--> GET /api/snapshots/clips?day=
        {day, hash, clips:[{campaignId(onchain), creator, videoId, channelId}]}   no view counts
                                        |
        CRE workflow, cron 00:30 UTC + HTTP trigger (production config: authorized keys required)
          each node: fetch manifest (all fields identical)
                  -> YouTube Data API videos.list + channels.list (key = CRE secret YOUTUBE_API_KEY, header x-goog-api-key)
                  -> keep a clip only if the channel matches and the bio holds clippo:<wallet>
                  -> record {kept (identical), v0..vN (median)}
          sum per (campaign, creator) -> chunks of 25 -> runtime.report -> EVMClient.writeReport -> read receipt
                                        |
        Forwarder -> ClippoReportReceiver.onReport -> ClippoEscrow.reportViews (only the receiver)
                                        |
        web indexer: ViewsReported -> ViewsReport table -> "Confirmed views" + proof link in the app
```

## 2. The honest gaps, and what became of each

| # | Gap | Why it matters | Status 2026-11-07 |
| --- | --- | --- | --- |
| 1 | The "external data source" is Clippo's own server. | All nodes read the same server, so consensus proves nothing. Clippo can still invent view counts by writing its own database. | **Fixed in code.** Nodes read YouTube themselves (`main.ts` `readYoutube`). Clippo still picks which clips qualify. |
| 2 | Nobody using the app can see CRE. | Removing it changes nothing a user can see. | **Fixed.** "Confirmed views" with a Chainlink badge and a proof link (`web/src/components/ConfirmedViews.tsx`, shown in `SlipDetail`, `LedgerView`, `LedgerDash`, `DeskView`, `DeskAnalytics`, `AccountView`). |
| 3 | Not deployed, never run on real Arc. `cre whoami` shows "Deploy Access: Not enabled". | Only simulation is available unless access is approved. | **Partly.** The enforcing escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` and receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` are on real Arc (simulation mode), and one simulation with `--broadcast` ran on real Arc. The workflow itself is NOT deployed; the owner has not reported the result of `cre account access`. |
| 4 | The channel verification code (`clippo-` + 4 random bytes) is not tied to the creator's wallet. | A node cannot check who owns a channel without trusting Clippo. | **Fixed.** New codes are `clippo:<wallet lowercase>` (`web/src/lib/channel-code.ts`); old channels show `needsReverify` and `POST /api/channels/:id/upgrade-code` rotates the code. |
| 5 | Secrets are not used (`secrets-path` is empty). | Needed for a YouTube API key. | **Fixed.** `cre/secrets.yaml` maps `YOUTUBE_API_KEY` to the env var `YOUTUBE_API_KEY_CRE`; `workflow.yaml` points both targets at it. |
| 6 | The simulator runs one node. | Consensus disagreement and median behaviour are never exercised. We must say so. | **Unchanged.** Still true, and said in `docs/tracks/CRE.md`. |

## 3. Target design: CRE reads the views itself (built)

Clippo still decides WHICH clips qualify (brand, AI verdict, admin). CRE decides HOW MANY VIEWS each qualifying clip has, and whose clip it is.

1. **Manifest (Clippo says what to check). BUILT.** `GET /api/snapshots/clips` (`web/src/app/api/snapshots/clips/route.ts`, `web/src/lib/clip-manifest.ts` `frozenClipManifest`): for each approved, live, verdict-approved clip of a PerView or PoolShare campaign, `{campaignId (onchain id), creator (wallet), videoId, channelId}`. Clips under an open or confirmed `VIEW_ANOMALY` flag are left out. No view counts. Frozen per completed UTC day.
2. **Wallet-bound channel code. BUILT.** New channel codes are `clippo:<wallet>` (the full lowercase address). A creator who puts it in their YouTube channel bio has proved, in public, that the channel belongs to that wallet. Existing channels must re-verify.
3. **Each CRE node reads YouTube directly. BUILT.** YouTube Data API v3, key sent in the `x-goog-api-key` header (never in a URL or a log):
   - `videos.list` for up to 50 ids: `viewCount` and `channelId`. `fields=` keeps one response under the 250 KB limit.
   - `channels.list` for the clips' channels: bio text.
4. **Per-clip check on every node. BUILT.** Keep a clip only if the video's channel matches the manifest and the bio contains `clippo:<creator wallet>`. Otherwise drop it and log why (`youtube.ts` `evaluateClips`).
5. **Consensus. BUILT, one node only.** One flat record: `kept` (the kept clip indexes, `identical`) and per clip a `median` view count. A node that sees a different set breaks consensus instead of being signed. Not proven across nodes.
6. **Report and credit as before. BUILT.** Chunks of 25, receipt check. `reportViews` ignores views that did not grow, so a drop in YouTube's count is harmless.
7. **Proof in the app. BUILT, differently from the plan.** The proof comes from a new append-only table `ViewsReport` (written by the indexer from `ViewsReported` events), not from stored `ChainEvent` rows. `web/src/lib/confirmed.ts` computes Confirmed and Pending; the screens are listed in gap 2 above.

Limits checked (https://docs.chain.link/cre/service-quotas): 15 HTTP requests, 50 consensus calls, 25 KB per consensus observation, 250 KB per HTTP response, 5 minutes per run. The built design needs about 3 HTTP requests per 50 clips and 2 consensus calls per run, so it fits (`normalizeManifest` caps a run at 300 clips).

**What this does and does not prove**
- After this change, no Clippo key and no Clippo database row can raise a view count or claim a channel for a wallet that did not publish its own code.
- Clippo still picks the qualifying clips, and bot views on YouTube still count.
- A single-node simulation cannot show the consensus benefit. We say so in the submission.

## 3b. Is it core? The honest check (added after review)

The design above only makes CRE a more honest courier. Checked in the code, with what became of each point:

1. **Money depends on CRE, but only by construction.** `reportViews` accepts only `reportAdapter`, and `setReportAdapter(address)` takes any address once. Swapping the receiver for one server key is one deploy parameter. Remove CRE and the product works the same, with a key to trust. That is an add-on test failure. *Still true.*
2. **The app never shows CRE's numbers.** Every view count a user sees was read from the backend `ViewSnapshot` table; nothing read `ViewsReported`. *Fixed: the indexer and `ConfirmedViews` now show the chain's numbers as Confirmed, and Clippo's own poll as Pending.*
3. **In a demo, CRE is our own key.** `simulate --broadcast` sends the report from our wallet through the mock forwarder, and the receiver in simulation mode only checks `tx.origin == expectedWorkflowOwner`. Until a workflow is really deployed, the "DON" is us. We may not claim trust-minimization from a simulation. *Still true; the real-Arc run is exactly this case.*
4. **Even deployed, the owner can change the workflow.** Unless the receiver pins `expectedWorkflowId` and calls `lockConfig`, we could ship different code later. That pin is the one thing a plain key cannot copy, and it needs deploy access. *Not done: deploy access is not enabled. On Arc now: `workflowCheckSkipped` true, `configLocked` false, `expectedWorkflowId` zero.*
5. **CRE does not touch HumanSplit** (one of three payout modes). *Still true.*

**What makes it core (three layers, all needed):**

| Layer | Change | What a user sees if CRE is removed | Status 2026-11-07 |
| --- | --- | --- | --- |
| Truth | Nodes read YouTube themselves (section 3). | Views can be faked again by whoever runs the server. | Built; ran on one simulated node |
| Visible | "Confirmed views" = the views CRE reported on-chain. Earnings, campaign totals and creator pages show them; Clippo's own YouTube poll shows only as "pending". Payouts follow confirmed views. | Confirmed views, badges and proof links disappear and nothing is payable. The app is visibly broken. | Built; shown on the deployed site |
| Immutable | After deploy, pin `expectedWorkflowId` and `lockConfig` on the receiver. | Anyone could swap the reporter or the logic. | **Not done** (needs a deployed workflow) |

Score by layer: Truth only = 2 to 3 (hidden). Truth + Visible = 3 (strong feature). Truth + Visible + Immutable (deployed) = 4. Never 5: Clippo still chooses the clips and bot views still count. **We are at 3**, because deploy access was not granted. We say so.

## 4. Plan, built around the scope

Scope, data shapes, file ownership and owner dependencies are fixed in `docs/CRE_SCOPE.md`. Summary: **no contract change** (confirmed: no diff under `contracts/src` since `8c28d88`); backend, frontend and the CRE workflow were three tracks on disjoint files that built in parallel against one frozen data contract, then joined.

The estimates below were made before the work (one builder per track).

| Track | Work (ids from the scope file) | Est. | Status |
| --- | --- | --- | --- |
| Backend | B1 table + migration, B2 indexer, B3 service, B4 additive fields, B5 frozen manifest route, B6 wallet-bound code + upgrade route, B7 tests and API.md | 4.5 h | Built (commit `f61084b`) |
| Frontend | F1 types + mocks, F2 `ConfirmedViews`, F3 creator ledger, F4 brand desk, F5 clip detail, F6 channel code + re-verify, F7 explainer, F8 checks | 4.5 h | Built (commit `0cb93b7`) |
| CRE | C1 workflow v2, C2 secrets, C3 helpers + tests, C4 mock backend + fake YouTube, C5 config | 4.5 h | Built (commit `d954f67`) |

Sync points and what happened:
- **S0:** scope and data contract frozen. Contracts: no change. *Done (commit `caff4e2`).*
- **S1:** FE has its types and mock data, so it builds without the backend. *Done.*
- **S2:** backend routes work on a local database; FE switches from mocks to real calls. *Done.*
- **S3:** CRE `simulate --broadcast` on the local Arc fork writes `ViewsReported`, the backend indexes it, and the creator ledger and brand desk show Confirmed with a tx link. *Done on a local fork (commit `0c3e401`); a browser check against the real backend passed 14 of 14 checks (commit `ad3c7d9`).*
- **S4:** real Arc run. *Done as a simulation on 2026-11-07 (commit `c4d8e30`): tx `0xa41f91da...c8409`. The manifest came from a local mock backend, because the deployed manifest lists a clip only after its approval day has ended (UTC). Not a deployment.*
- **S5:** evidence and docs: real CLI output, `docs/tracks/CRE.md`, demo segment, build log. *Done: the real CLI outputs are in `docs/tracks/cre-simulation-*.txt`, the 3-screen demo is in `docs/tracks/CRE.md` section 5, and entries are in `docs/BUILD_LOG.md`.*

Original wall-clock estimate (before the work): about 8 hours from the owner's go if the three tracks run in parallel. One builder in sequence would not have fit.

Cut list if late, in this order: F5 clip detail, F4 analytics totals (keep the campaign table column), B6 upgrade route (re-verify by hand), the 60-row test. Never cut: the frozen manifest, the bio-bound check, the indexer, the creator ledger, the brand desk column. *Outcome: nothing on the list was cut, except that the 60-row case ran only through the CLI-free emulation script (`cre/scripts/capture-evidence.sh`), not the CLI.*

Immutable layer (pin and lock) happens only if deploy access is approved. *It was not approved, so we stopped at "strong feature" and say so.*

## 5. Owner dependencies (full list in the scope file, section 5), with state

Before we started:
- Approve the scope. *Done.*
- `cre account access`. *Open: the result has not been reported; `cre whoami` showed "Deploy Access: Not enabled" when last checked.*
- A YouTube API key in `cre/.env` and `web/.env.local`. *Done (also set on the deployed site).*
- A test channel, one public video and a test wallet. *Done: @visualsbyanii, video `vWk4YV_dbsE`, wallet `0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5`, bio holds `clippo:<wallet>` (checked through the API).*

Before the real Arc run:
- Deploy the escrow and receiver. *Done 2026-11-07 with `cre/scripts/arc-deploy.sh` (`docs/CRE_DEPLOY.md`).*
- A funded CRE key. *Done: the simulation wallet `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6` was funded.*
- The demo wallet registered as a human (World track). *Done by an attestor-signed script: a stand-in for the World check, to be said plainly.*

## 6. Not doing

- CRE calling an LLM for clip verdicts: too large for the time left.
- Instagram and X views through CRE: YouTube only.
- Changing the contracts: the current escrow and receiver already fit this design. (Pinning the workflow id uses setters that already exist.) *Held: no contract change.*
- Claiming a live DON deployment unless one is really done. *Held: none is done.*
