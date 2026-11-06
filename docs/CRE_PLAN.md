# Chainlink CRE plan

Branch: `feat/cre-core` (from `feat/core-sponsor-integration` at `8c28d88`). Goal: the prize "Best workflow with CRE" ($1,500), with CRE in the core of Clippo. Rules and order of work for the whole project: `docs/FOCUS.md`. History: `docs/BUILD_LOG.md`.

Prize text (https://ethglobal.com/events/mumbai/prizes): build, simulate or deploy a CRE workflow that links a blockchain with an external API, data source, LLM or agent, shows a successful CLI simulation or a live deployment, and is meaningfully used in the project. Simulation is enough.

## 1. How CRE works in Clippo today (read from the code)

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

What is solid: the contract side. Nobody holds a key that can credit views except the CRE path. The workflow compiles, typechecks (checked on this branch, 9 unit tests pass), and was simulated: live feed gives an empty no-op, and a local fork of Arc credited mock creators (see `docs/tracks/cre-simulation-output.txt`).

## 2. The honest gaps

| # | Gap | Why it matters |
| --- | --- | --- |
| 1 | The "external data source" is Clippo's own server. | All nodes read the same server, so consensus proves nothing. Clippo can still invent view counts by writing its own database. A cron job with one key would do the same job. |
| 2 | Nobody using the app can see CRE. No component mentions it. | Removing it changes nothing a user can see. |
| 3 | Not deployed, never run on real Arc. `cre whoami` shows "Deploy Access: Not enabled". | Only simulation is available unless access is approved. The enforcing escrow is not deployed yet either (another track). |
| 4 | The channel verification code (`clippo-` + 4 random bytes) is not tied to the creator's wallet. | A node cannot check who owns a channel without trusting Clippo. |
| 5 | Secrets are not used (`secrets-path` is empty). | Needed for a YouTube API key. |
| 6 | The simulator runs one node. | Consensus disagreement and median behaviour are never exercised. We must say so. |

## 3. Target design: CRE reads the views itself

Clippo still decides WHICH clips qualify (brand, AI verdict, admin). CRE decides HOW MANY VIEWS each qualifying clip has, and whose clip it is.

1. **Manifest (Clippo says what to check).** New read-only route `GET /api/snapshots/clips`: for each approved, live, verdict-approved clip of a PerView or PoolShare campaign, return `{campaignId (onchain id), creator (wallet), videoId, channelId}`. Same filters as `web/src/lib/snapshots.ts`, including the `VIEW_ANOMALY` hold and deleted clips. No view counts in it.
2. **Wallet-bound channel code.** New channel codes become `clippo:<wallet>` (the full lowercase address). A creator who puts it in their YouTube channel bio has proved, in public, that the channel belongs to that wallet. Existing channels must re-verify.
3. **Each CRE node reads YouTube directly** with the YouTube Data API v3, key sent in the `x-goog-api-key` header (never in a URL or a log):
   - `videos.list` for up to 50 ids: `viewCount` and `channelId`. Use `fields=` so one response stays under the 250 KB limit.
   - `channels.list` for the clips' channels: bio text.
4. **Per-clip check on every node.** Keep a clip only if the video's channel matches the manifest and the bio contains `clippo:<creator wallet>`. Otherwise drop it and log why.
5. **Consensus.** One record: per clip a `median` of the view count, plus an `identical` list of kept clip keys. A node that sees a different set breaks consensus instead of being signed.
6. **Report and credit** as today (chunks of 25, receipt check). `reportViews` already ignores views that did not grow, so a drop in YouTube's count is harmless.
7. **Proof in the app.** On the clip slip and creator earnings, show "Views read by Chainlink CRE: N views, report tx 0x..." from the stored `ChainEvent` rows (they already keep `txHash`).

Limits checked (https://docs.chain.link/cre/service-quotas): 15 HTTP requests, 50 consensus calls, 25 KB per consensus observation, 250 KB per HTTP response, 5 minutes per run. This design needs about 3 HTTP requests and 1 or 2 consensus calls per run, so it fits.

**What this does and does not prove**
- After this change, no Clippo key and no Clippo database row can raise a view count or claim a channel for a wallet that did not publish its own code.
- Clippo still picks the qualifying clips, and bot views on YouTube still count.
- A single-node simulation cannot show the consensus benefit. We say so in the submission.

## 3b. Is it core? The honest check (added after review)

The design above only makes CRE a more honest courier. Checked in the code:

1. **Money depends on CRE, but only by construction.** `reportViews` accepts only `reportAdapter`, and `setReportAdapter(address)` takes any address. Swapping the receiver for one server key is one deploy parameter. Remove CRE and the product works the same, with a key to trust. That is an add-on test failure.
2. **The app never shows CRE's numbers.** Every view count a user sees (campaign totals, `lib/earnings.ts`, marketplace, analytics) is read from the backend `ViewSnapshot` table. Nothing reads the escrow's `ViewsReported` event. So even with CRE removed, the screens look identical.
3. **In a demo, CRE is our own key.** `simulate --broadcast` sends the report from our wallet through the mock forwarder, and the receiver in simulation mode only checks `tx.origin == expectedWorkflowOwner`. Until a workflow is really deployed, the "DON" is us. We may not claim trust-minimization from a simulation.
4. **Even deployed, the owner can change the workflow.** Unless the receiver pins `expectedWorkflowId` and calls `lockConfig`, we could ship different code later. That pin is the one thing a plain key cannot copy, and it needs deploy access (`cre whoami`: Not enabled).
5. **CRE does not touch HumanSplit** (one of three payout modes).

**What makes it core (three layers, all needed):**

| Layer | Change | What a user sees if CRE is removed |
| --- | --- | --- |
| Truth | Nodes read YouTube themselves (section 3). | Views can be faked again by whoever runs the server. |
| Visible | "Confirmed views" = the views CRE reported on-chain. Earnings, campaign totals and creator pages show them; Clippo's own YouTube poll shows only as "pending". Payouts follow confirmed views. | Confirmed views, badges and proof links disappear and nothing is payable. The app is visibly broken. |
| Immutable | After deploy, pin `expectedWorkflowId` and `lockConfig` on the receiver. | Anyone could swap the reporter or the logic. |

Score by layer: Truth only = 2 to 3 (hidden). Truth + Visible = 3 (strong feature). Truth + Visible + Immutable (deployed) = 4. Never 5: Clippo still chooses the clips and bot views still count. If deploy access is not granted, we stop at 3 and say so.

## 4. Plan, built around the scope

Scope, data shapes, file ownership and owner dependencies are fixed in `docs/CRE_SCOPE.md`. Summary: **no contract change**; backend, frontend and the CRE workflow are three tracks on disjoint files that build in parallel against one frozen data contract, then join.

Estimates are for one builder per track.

| Track | Work (ids from the scope file) | Est. |
| --- | --- | --- |
| Backend | B1 table + migration, B2 indexer, B3 service, B4 additive fields, B5 frozen manifest route, B6 wallet-bound code + upgrade route, B7 tests and API.md | 4.5 h |
| Frontend | F1 types + mocks, F2 `ConfirmedViews`, F3 creator ledger, F4 brand desk, F5 clip detail, F6 channel code + re-verify, F7 explainer, F8 checks | 4.5 h |
| CRE | C1 workflow v2, C2 secrets, C3 helpers + tests, C4 mock backend + fake YouTube, C5 config | 4.5 h |

Sync points:
- **S0 (now):** scope and data contract frozen. Contracts: no change.
- **S1 (about 45 min in):** FE has its types and mock data, so it builds without the backend.
- **S2 (about 3 h in):** backend routes work on a local database; FE switches from mocks to real calls.
- **S3 (about 5 h in):** CRE `simulate --broadcast` on the local Arc fork writes `ViewsReported`, the backend indexes it, and the creator ledger and brand desk show Confirmed with a tx link. All tracks join here. About 1 h for fixes.
- **S4:** real Arc run (needs owner items 6 to 8 in the scope file). About 1 h.
- **S5:** evidence and docs: real CLI output, `docs/tracks/CRE.md`, demo segment, build log. About 1 h.

Wall clock, if the three tracks run in parallel: about 8 hours from the owner's go, which fits before 09:00 with about 2 hours for sleep and buffer. One builder doing it all in sequence would not fit.

Cut list if late, in this order: F5 clip detail, F4 analytics totals (keep the campaign table column), B6 upgrade route (re-verify by hand), the 60-row test. Never cut: the frozen manifest, the bio-bound check, the indexer, the creator ledger, the brand desk column.

Immutable layer (pin and lock) happens only if deploy access is approved; otherwise we stop at "strong feature" and say so.

## 5. Owner dependencies (full list in the scope file, section 5)

Before we start: approve the scope; `cre account access`; a YouTube API key in `cre/.env` and `web/.env.local`; a test channel, one public video and a test wallet.
Before the real Arc run: deploy the escrow and receiver; a funded CRE key; the demo wallet registered as a human (World track).

## 6. Not doing

- CRE calling an LLM for clip verdicts: too large for the time left.
- Instagram and X views through CRE: YouTube only.
- Changing the contracts: the current escrow and receiver already fit this design. (Pinning the workflow id uses setters that already exist.)
- Claiming a live DON deployment unless one is really done.
