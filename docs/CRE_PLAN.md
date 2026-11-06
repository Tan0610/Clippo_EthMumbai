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

**Removal test, honest result.** Without CRE, a server key that reads YouTube would do the same work, and users would have to trust that key. So CRE is a strong feature at the trust boundary (score 3 of 5), not something the product cannot exist without. Showing the proof in the app (step 7) is what makes the difference visible to a user.

## 4. Milestones

Estimates are for one builder. Cut line: if M3 is not green after about 7 hours, ship the current workflow plus the honest notes, and stop.

| M | Work | Est. | Done when |
| --- | --- | --- | --- |
| M0 | Branch, worktree, install, baseline | 15 min | **Done.** `npm run typecheck` ok, 9 tests pass on `feat/cre-core`. |
| M0b | Owner asks for CRE deploy access (`cre account access`) in the background | 5 min, owner | Request sent. Do not wait for it. |
| M1 | Manifest route + wallet-bound channel code, with vitest tests | 1.5 h | `GET /api/snapshots/clips` returns only qualifying clips; new codes include the wallet; web tests and typecheck pass. |
| M2 | Workflow v2: secrets, YouTube reads, binding check, median consensus. Pure helpers in `snapshot.ts` or a new file, with unit tests. Mock YouTube added to `cre/scripts/mock-backend.mjs` via a config base URL. | 3 h | Unit tests pass; `cre-compile` passes; simulate against the mock prints kept and dropped clips. |
| M3 | Local end-to-end on the anvil fork, with `--broadcast` | 1 h | Creators credited (checked with `cast call`). Negative cases show: wrong bio code dropped, unmapped wallet `NotHuman`, no growth credits 0, 60 rows make 3 reports. |
| M4 | Proof line in the app | 1.5 h | Slip shows views, the CRE report tx and a link. Optional if time is short. |
| M5 | Real Arc: simulate `--broadcast` against the deployed escrow and a receiver in simulation mode | 1 h | Needs the enforcing escrow deployed (owner signs). Real tx hashes saved in the build log. |
| M6 | Evidence and docs: real CLI output, `docs/tracks/CRE.md`, demo segment in `docs/DEMO_SCRIPT.md`, build log | 45 min | Nothing in the docs claims more than was run. |

Order: M1 then M2 then M3. M4 and M5 can start once M3 is green. M0b first, because approval takes time.

## 5. Needed from the owner

1. Run `cre account access` (browser) and tell us the result. Deploy is optional for the prize.
2. A YouTube Data API key, placed only in `cre/.env` and the Vercel env (never in chat, never committed). One real public video on a channel whose bio you can edit, to test the real read.
3. Agree that existing channels must re-verify with the new code.
4. For M5: the enforcing escrow deployed on Arc (tracked in `docs/FOCUS.md`, step 1), then the receiver address.

## 6. Not doing

- CRE calling an LLM for clip verdicts: too large for the time left.
- Instagram and X views through CRE: YouTube only.
- Changing the contracts: the current escrow and receiver already fit this design.
- Claiming a live DON deployment unless one is really done.
