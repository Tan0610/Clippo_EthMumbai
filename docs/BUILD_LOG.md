# Clippo build log

A running record of what we changed, why, and how to go back. Newest entry at the top of "Log". Kept up to date by the rule in `CLAUDE.md`.

Branch: `feat/core-sponsor-integration`. Goal: win ETHGlobal Mumbai (deadline Sat 2026-11-07 09:00 IST) with Chainlink CRE, World (IDKit + Agent Pass) and Arc each at the core of the product, not as add-ons.

## How to go back

- See any step: `git show <hash>`
- Look at the project as it was then: `git checkout <hash>` (then `git checkout feat/core-sponsor-integration` to return)
- Undo one step safely: `git revert <hash>`
- Starting point before our work: `ce69f0a`

## Decisions (from you)

| Date | Decision |
| --- | --- |
| 2026-11-06 | Every reply is short and in simple language. |
| 2026-11-06 | Treat this as a fresh project. We don't raise ETHGlobal eligibility again, but we never rewrite git history or claim the old work was built at the event. |
| 2026-11-06 | Fix the contracts and redeploy them on Arc (through Arc Studio). You sign deploys with your own wallet. |
| 2026-11-06 | Commit in small steps and push to the feature branch. Nothing goes to `main` until you say so. |
| 2026-11-06 | Option 1 for payouts: Clippo's wallet triggers the payout and pays gas, but the contract can only send money to the creator who earned it. |
| 2026-11-06 | Keep this build log up to date after every step (this file). |
| 2026-11-06 | Chainlink CRE work happens on its own branch, `feat/cre-core`, starting with a plan before code. |

## Starting point (audit before our changes)

Ten inspectors plus four skeptics checked the project. Honest result at commit `ce69f0a`:

| Part | Done | Main problem |
| --- | --- | --- |
| Frontend | 70% | Looks good, but the live site was nearly empty (one $2 test campaign, Rickroll link). |
| Backend | 60% | 263 tests passed with fake services, but live had no `YOUTUBE_API_KEY`, so no clips, AI checks or views. |
| Contracts | 70% | 94 tests passed, but one admin key could send a pool to any wallet, and there was no dispute or clawback. |
| Web3 flow | 35% | Only fund and approve had ever run on Arc (one 2 USDC campaign). CRE, credits and claims had never run. |

Track status at the start:

| Track | Core? | Main problem |
| --- | --- | --- |
| Chainlink CRE | Partly | Simulation crashed (`Invalid url`), never run, production receiver address was `0x000`. |
| World Agent Pass | No | Repo used AgentKit, but the prize points to the OIDC product at `auth.world.org`. |
| World IDKit | Partly | Server blocked unverified creators, but the contract ignored World ID and no real run was recorded. |
| Arc | Partly | Real USDC escrow, but no Arc Studio project URL (every Arc prize requires one). |

## Log

### 12. Frontend: Confirmed vs Pending views, commit pending

- **What:** new `ConfirmedViews` component (table cell, stat block, line) with a Chainlink badge, Pending beneath and a proof link, plus one explainer line. Shown on the creator ledger (`LedgerDash`, `LedgerView`), the brand desk (`DeskView`, `DeskAnalytics`), clip detail (`SlipDetail`), and the channel screens (`JoinView`, `AccountView`: the `clippo:<wallet>` code with a copy button, a re-verify prompt using `upgrade-code`, and a hint when views are pending but nothing is confirmed). Views that are only Clippo's own count are relabelled "Clippo count". HUMAN_SPLIT hides the Confirmed block. The Desk table now takes views from `/api/dashboard/campaigner`.
- **Why:** the app must show users which views the Chainlink CRE workflow confirmed, since only those are paid.
- **Files:** `web/src/components/{ConfirmedViews.tsx,confirmed.css,api.ts,LedgerDash,LedgerView,DeskView,DeskAnalytics,SlipDetail,JoinView,AccountView}`, `web/src/ui-mocks/{data,market}.ts`.
- **Tests:** `npm run typecheck` clean; lint clean on the changed files (an old error in `BenchView.tsx` is not ours). The overflow check was run on the five changed screens in demo mode with a copied script: 270 width, theme and screen combinations passed after one fix at 360 px. Copy button and the re-verify flow were exercised in demo mode only.
- **Not proven:** nothing ran against the real backend routes, real proof links, or a real signed-in session. Demo mock data uses a placeholder proof marked as demo, not a real transaction. `/join` was only overflow-checked. The mixed-mode fallback total in the creator ledger can be off when the server omits `pendingViews`.

### 11. CRE workflow v2: nodes read YouTube themselves, commit `d954f67`

- **What:** `cre/workflows/clippo-settlement/main.ts` now fetches the clip manifest (`/api/snapshots/clips`), reads the YouTube key from the CRE secret `YOUTUBE_API_KEY`, and every node calls `videos.list` and `channels.list` (key in the `x-goog-api-key` header only). A clip is kept only if its video sits on the manifest's channel and the channel bio holds `clippo:<wallet>`. View counts go through `median` consensus in one flat record (`kept` identical plus `v0..vN` medians). The rest (cron and HTTP triggers, staleness and zero-receiver guards, chunking, receipt check) is unchanged.
- **Why:** the earlier workflow only read Clippo's own server, so consensus proved nothing.
- **Files:** `cre/workflows/clippo-settlement/{main.ts,youtube.ts,youtube.test.ts,config.*.json,workflow.yaml}`, `cre/secrets.yaml`, `cre/scripts/{mock-backend.mjs,simulate-local.sh}`, `cre/package.json`, `cre/.env.example`, `cre/README.md`.
- **Tests:** `npm run typecheck` clean; `npm test` 22 pass (9 old, 13 new); `npm run compile` builds a 2.6 MB WASM. `bash scripts/simulate-local.sh` (local anvil fork of Arc, mock backend, FAKE YouTube key) exited 0: 5 clips in the manifest, 3 kept, 2 dropped with a logged reason (wrong bio code; video on another channel); `cast call` showed campaign 7 creators credited 1200 and 300 views, campaign 12 capped by the pool; a replay credited nothing more; an unlinked wallet failed with `NotHuman`.
- **Not proven:** nothing ran against real YouTube or a real key; the real `/api/snapshots/clips` route was not used by this run (the mock served the contract shape); the simulator is one node, so median and `identical` never ran across nodes; a wrong-key or YouTube-5xx run end to end was not done; nothing on real Arc.

### 10. Backend: confirmed views, clip manifest, wallet-bound channel codes, commit `f61084b`

- **What:** new `ViewsReport` table and migration; the indexer stores each on-chain `ViewsReported` event; `web/src/lib/confirmed.ts` computes Confirmed (highest reported cumulative) and Pending (Clippo count minus confirmed) with a proof link; additive fields `confirmedViews`, `pendingViews`, `proof` on creator earnings, creator and campaigner dashboards and `GET /api/campaigns/:id`; `chain.explorerBase` in `/api/chain/config`; new `GET /api/snapshots/clips` (day-frozen manifest for CRE); channel codes are now `clippo:<wallet>`, with `needsReverify` and `POST /api/channels/:id/upgrade-code`. No contract change.
- **Why:** the app must show the views CRE confirmed, and CRE needs a list of clips plus a wallet-bound way to prove channel ownership.
- **Files:** `web/prisma/schema.prisma`, `web/prisma/migrations/20261106120000_views_report/`, `web/src/lib/{confirmed,channel-code,clip-manifest,earnings}.ts`, `web/src/lib/workspace/marketplace.ts`, `web/src/lib/chain/{indexer,config}.ts`, `web/src/app/api/{campaigns/[id],channels,channels/[id]/upgrade-code,snapshots/clips}`, `web/API.md`, `web/.env.example`, tests below.
- **Tests:** 2 new integration test files (7 tests) plus 1 old assertion updated to the new code format. Full `npm test`: 311 tests, all pass after that update (the one failure before it was the old `clippo-` prefix check). `npm run typecheck` clean, lint clean on the changed files. Migration applies on the throwaway Postgres used by the tests.
- **Not proven:** nothing ran against a real database other than the test Postgres, a deployed backend, or real on-chain events (the tests feed decoded events). Existing verified channels get `needsReverify`; no screen uses it yet (frontend track).

### 9. CRE scope defined, commit `caff4e2`

- **What:** wrote `docs/CRE_SCOPE.md` and rebuilt the milestone section of `docs/CRE_PLAN.md` around it. Decisions in the scope: no smart contract change (the `ViewsReported` event, `reportedViews`, and the workflow pin and lock setters already exist); backend adds a `ViewsReport` table, indexer case, additive API fields, a day-frozen clip manifest route and wallet-bound channel codes; frontend adds one `ConfirmedViews` component and shows Confirmed vs Pending on the creator ledger, brand desk, clip detail and channel screens; the CRE workflow reads YouTube itself. Three tracks on disjoint files with a frozen data contract and sync points S0 to S5, plus the list of what the owner provides and when.
- **Why:** the owner asked to fix the scope across frontend, backend and contract first, run frontend and backend in parallel, and list owner dependencies before building.
- **Files:** `docs/CRE_SCOPE.md` (new), `docs/CRE_PLAN.md`, this log. No code changed.
- **Not proven:** the design is unbuilt. Estimates are guesses. Needs from the owner (access request, YouTube key, test channel, deploy) are open.

### 8. CRE plan revised after a "is it core?" review, commit `c8e11ae`

- **What:** the owner asked whether CRE is core or an add-on. Checked the code and answered: as first planned it was a courier, not core. Updated `docs/CRE_PLAN.md` with section 3b (five findings, a three-layer fix: truth, visible, immutable) and a new milestone order that builds "confirmed views" in the app first (M4').
- **Findings, from the code:** `setReportAdapter` accepts any address; no screen reads `ViewsReported` (all views shown come from the backend `ViewSnapshot`); in a simulation the report is sent from our own wallet; the workflow is only locked if a deployed workflow id is pinned.
- **Files:** `docs/CRE_PLAN.md`, this log. No code changed.
- **Not proven:** none of the three layers is built. Deploy access is not enabled, so the immutable layer may not be possible.

### 7. CRE branch and plan, commit `7977884`

- **What:** created branch `feat/cre-core` (from `feat/core-sponsor-integration` at `8c28d88`, in its own git worktree at `.worktrees/cre` so the other checkout is not switched). Read how CRE is wired and wrote `docs/CRE_PLAN.md`: how it works today, six gaps, a target design where CRE nodes read YouTube views themselves, milestones M0 to M6 with a cut line, and what we need from the owner.
- **Why:** the earlier review scored CRE 2 of 5 because the workflow only reads Clippo's own server, so a cron job with one key would do the same, and nothing in the app shows CRE.
- **Files:** `docs/CRE_PLAN.md` (new), this log. No code changed.
- **Checked:** on the new branch `npm run typecheck` is clean and the 9 CRE unit tests pass (cre/ `npm ci` first). CRE CLI v1.39.0 is installed and logged in; `cre whoami` says Deploy Access: Not enabled. CRE limits read from docs.chain.link/cre/service-quotas.
- **Not proven:** the target design has not been built or run. The Early Access request, a YouTube key for the nodes, and the escrow deploy are still open.

### 6. Docs corrected and a focus guide added, commit `7a93a2c`

- **What:** two review passes fixed false and stale claims in the README, the track write-ups, the Arc submission file, the architecture text, the API reference and the deploy docs. Then a second pass removed contradictions between the docs. Added `docs/FOCUS.md` (plan, rules, what we may claim, order of work, prize checklists). Merged `main`'s two docs commits into this branch (`a7b30b9`) so their Arc claims could be corrected here.
- **Main corrections:**
  - Arc Studio: nothing was built or deployed with it. The contracts were written and tested in Foundry. The docs now say Studio is not created yet.
  - Video: the limit is 2 to 4 minutes (was written as 5, and 4:30 for the script).
  - Escrow: two OLD escrows are on Arc (`0xd845...c39c` is what the live site uses; `0xc7b9...e310` was cited in the Arc file). The new enforcing escrow is not deployed. No doc calls either old one "the" deployed contract.
  - World Agent Pass: the official product is the OIDC service at `auth.world.org`. The AgentKit code is not it.
  - CRE: the workflow now simulates; the docs say what ran (empty live feed, local fork credit) and what did not. The feed is `/api/snapshots/daily`.
  - AI verifier: Claude or Gemini (`LLM_PROVIDER`), not Claude only.
- **Files:** `README.md`, `contracts/README.md`, `cre/README.md`, `web/API.md`, `docs/*.md`, `docs/tracks/*.md`, `docs/architecture.svg` (text only), new `docs/FOCUS.md`.
- **How checked:** each edit was read against the code by a second reviewer, and a cross-doc pass compared all files. Nothing was run or deployed. Test counts are copied from this log, not re-run.
- **Not proven / left open:**
  - `docs/architecture.svg` still draws the older design (no humanAttestor, registerHuman, disputes, OIDC step-up). It needs a redraw.
  - `web/scripts/e2e-chain.mjs` and `e2e-api.mjs` still target the old design.
  - The demo script timings (3:50 total) were never rehearsed, and the claim step in it has no live path yet.
  - `main` carries these docs but not the feature-branch code, so some docs describe code that is only on `feat/core-sponsor-integration`.
  - No LICENSE file; the owner must choose one.

### 5. Official World Agent Pass step-up, commit `19205ba`

- **What:** approving an agent's split now needs a fresh OIDC step-up at `auth.world.org` (code flow with PKCE). The backend checks the ID token, issues a one-time token bound to the exact split, and signs the approval the escrow checks. IDKit stays only for "Build it myself" splits.
- **Why:** the Agent Pass prize needs the official product, a real denied path, and backend validation.
- **Files:** `web/src/lib/agentpass/stepup.ts`, routes under `web/src/app/api/agentpass/stepup/`, `web/src/components/stepup-client.ts`, split route, `DeskView`, `AdminSplits`, a new `User.worldIdpIdentity` column with a migration, `jose` dependency.
- **Tests:** 304 web tests pass (42 new, using a local fake issuer). Build succeeds, typecheck clean.
- **Not proven:** never run against the real issuer or in a browser. Which issuer and credential level the prize's mocked proofs use is unknown (ask World staff). A rejected wallet popup after the World ID check blocks a retry of that split.
- **Needs from you:** portal client, callback URL, env vars (see "Waiting on you").

### 4. CRE workflow fixed and simulated, commit `6f74f7b`

- **What:** removed the startup crash (strict URL check), refuse a zero receiver once there are rows, read the receipt because the forwarder hides a failed `onReport`. Replaced the old fake evidence with real `cre` CLI output. Local scripts now work on macOS and register creators as humans.
- **Why:** the Chainlink prize needs a real simulation, and a lost report must not look like success.
- **Files:** `cre/workflows/clippo-settlement/*`, `cre/scripts/*`, `docs/tracks/cre-simulation-output.txt`, `docs/tracks/CRE.md`.
- **Proof:** live-feed run exits 0 with an empty no-op. A local `--broadcast` run on an anvil fork of Arc credited creators in the escrow (checked with `cast call`), and an unlinked wallet was refused. 9 CRE tests pass.
- **Not proven:** nothing broadcast to real Arc, no deployed workflow, single-node simulator (no real consensus), pool-share not run through the CLI. `config.production.json` still has the zero receiver until we deploy.
- **Watch out:** the CRE CLI timed out reaching its API three times before passing on retry. Record the CRE part of the demo in advance.

### 3. Dispute screens and hire-funding fix, commit `dfd0d51`

- **What:** campaigners can dispute per-view credits and admins can settle them from the app. Hire funding no longer accepts a client-supplied on-chain id.
- **Why:** it closed a real hole: a fake campaign id could be used to drain another brand's pool.
- **Files:** `web/src/components/OnchainDisputes.tsx`, `web/src/app/api/chain/disputes/route.ts`, `DeskView`, `BenchView`, `web/src/lib/workspace/hires.ts`.
- **Tests:** 262 web tests pass.

### 2. App connected to the new contract, commit `292d107`

- **What:** the backend signs World ID approvals that the contract verifies, links verified wallets on-chain, and sends payouts through `claimFor`. Pool share uses CRE views only. New credits show right after a transaction, and sync errors no longer fail a claim after money moved.
- **Why:** the new contract changed how approvals, credits and payouts work.
- **Files:** `web/src/lib/chain/clippo-wallet.ts` (new), `client.ts`, `indexer.ts`, split, attest, approve and claim routes, `web/src/app/api/chain/report/route.ts` (new), regenerated ABI. Removed the old pool-share route.
- **Tests:** 262 web tests pass (some tests changed on purpose to match the new rules).
- **New env:** `HUMAN_ATTESTOR_PRIVATE_KEY` (Clippo's backend wallet), optional `CAMPAIGN_DEADLINE_SECONDS`.

### 1. Contracts enforce World ID and CRE, commit `498f649`

- **What:** no key can choose who gets paid.
  - PerView credits and PoolShare weights come only from the CRE report adapter, which can be set once.
  - HumanSplit credits need a fresh World ID approval signed by `humanAttestor` and bound to the exact split. Two-party splits need two different humans.
  - Only wallets linked to a unique human (`registerHuman`) can be credited.
  - Campaigners can dispute unreleased PerView credits. Admins settle them (upheld credits go back to the pool or brand, never to an admin). If nobody settles in time they release to the creator.
  - Retention and grace are fixed per campaign. Anyone can close a campaign after the deadline plus grace. Brands can reclaim a campaign nobody approved.
  - `claimFor` lets Clippo's wallet trigger a payout that can only reach the creator.
  - The report receiver can lock its settings for good (`lockConfig`), and in simulation mode only the workflow owner can report.
- **Why:** the audit showed one admin key could drain funds and skip World ID and CRE, which made both add-ons.
- **Files:** `contracts/src/ClippoEscrow.sol`, `ClippoReportReceiver.sol`, `contracts/script/Deploy.s.sol` (now needs `HUMAN_ATTESTOR_ADDRESS`), tests and `contracts/test/HumanHelper.sol`.
- **Tests:** 114 contract tests pass (was 94).
- **Not proven:** not deployed. The World ID check on-chain relies on a signature from Clippo's backend key, so that key must be trusted to sign honestly (it cannot move money by itself).

### 0. Audit and setup

- Built a scratch copy of the repo to run builds and tests without touching your code.
- Fetched the live Mumbai prize rules and checked the live site, the contracts and the explorer.
- Saved the project rules in Claude's memory.

## Waiting on you

0. CRE: run `cre account access` and report the result; put a YouTube Data API key only in `cre/.env` and Vercel; confirm that existing channels must re-verify with a wallet-bound code.
1. **Clippo backend wallet:** create a new wallet, fund it with testnet USDC, and send me only its address. The address is fixed at deploy. The private key goes in Vercel as `HUMAN_ATTESTOR_PRIVATE_KEY`.
2. **Arc Studio:** `npm i -g @circle-fin/arc-studio-cli`, then `arc-studio login`.
3. **World portal (`auth.world.org/portal`):** create a client. Callback URL `https://clippo-six.vercel.app/api/agentpass/stepup/callback`, client auth `client_secret_basic`, and the same environment (production or sandbox) for portal, credentials and issuer.
4. **Vercel env:** `YOUTUBE_API_KEY`, `HUMAN_ATTESTOR_PRIVATE_KEY`, `WORLD_IDP_CLIENT_ID`, `WORLD_IDP_CLIENT_SECRET`, `WORLD_IDP_REDIRECT_URI`, `SESSION_SECRET` (32+ characters).
5. **Ask World staff:** which issuer and credential level do the prize's mocked proofs use?

## Coming next

CRE (branch `feat/cre-core`, see `docs/CRE_PLAN.md`): M1 manifest route and wallet-bound channel code, M2 workflow reads YouTube, M3 local end-to-end, then M4 to M6.

Project-wide:

1. Deploy the new contracts on Arc (you sign), then set the real receiver in `cre/.../config.production.json`, the new addresses in Vercel, and `ESCROW_DEPLOY_BLOCK`.
2. Build and show the work in Arc Studio, and get the shareable project URL.
3. Run one full real flow on Arc: fund, approve, CRE report, claim, dispute. Save the transaction hashes here.
4. Write the IDKit credential rationale and debrief (only after a real run), and redraw `docs/architecture.svg` for the new design.
5. Record the demo video (under 4 minutes), fill `docs/SUBMISSION_CHECKLIST.md`, submit before the deadline.

## Known gaps

- Nothing from our changes has run on real Arc yet.
- The live site still has no `YOUTUBE_API_KEY` and still runs the old build.
- `e2e-chain.mjs` was not updated for the new contract.
- `docs/architecture.svg` still shows the older design; the e2e scripts still target the old escrow.
- Read `docs/FOCUS.md` before starting new work.
