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

### 25. Diagram exported to PNG; duplicate IDKit doc removed (pending commit)

- **What:** rendered `docs/architecture.svg` → `docs/architecture.png` (1200×1170 @2x, headless Chromium) for the submission form. Removed `docs/IDKIT_SUBMISSION.md` (added in entry 24) as a duplicate of the teammate's canonical, more-accurate `docs/tracks/WORLD_IDKIT.md` + `world-idkit-debrief.md`; those remain the IDKit source of truth.
- **Why:** owner asked to finish everything except the video; de-dupe the IDKit docs.
- **Still owner-only, NOT done:** make the Arc Studio URL public; run one live campaign on `0xc7b9588`; run a real IDKit proof (none has ever run — see `WORLD_IDKIT.md`) + an alternative path; fill the debrief numbers; record the video.

### 24. OpenAI LLM provider added; Arc submission refocused on the Studio-built escrow (pending commit)

- **What:**
  - Added an **OpenAI provider** to `web/src/lib/ai/llm.ts`: a fetch-based Chat Completions transport (JSON mode, no new dependency) next to Anthropic and Gemini, chosen with `LLM_PROVIDER=openai` + `OPENAI_API_KEY` (default `gpt-4o-mini`). `docs/DEPLOY_ENV.md` documents it. (Committed earlier to `main` as `bb2fbec` at the owner's request — noted here; not on the feature branch.)
  - Rewrote `docs/SUBMISSION_ARC.md` to be **solely about the Arc Studio-built `ClippoEscrow` `0xc7b9588`** (owner's decision: the Arc entry is the Studio-deployed contract, regardless of the live enforcing escrow `0x1e05373c`). Feature table re-mapped honestly to the 3-arg contract: it has conditional escrow + auto-release via retention, PerView/HumanSplit/PoolShare, two-sided fees + treasury, a high-value World ID attestation hook, adapter `reportViews`; it does **not** have disputes/`claimFor`/on-chain human registry. Requirement (a) "Built in Arc Studio" now **Met**.
  - Added `docs/IDKIT_SUBMISSION.md` (trust rationale + debrief). **Overlaps** the teammate's `docs/tracks/world-idkit-*.md` — de-duplicate before submitting.
- **Why:** owner chose to satisfy Arc's "Built in Arc Studio" requirement with the Studio-deployed contract, and to move the AI verifier to OpenAI.
- **Tests:** LLM unit tests 40/40; a real OpenAI call (gpt-4o-mini, JSON mode) returned valid JSON; `typecheck` clean after regenerating Next types; `e2e:chain` 48/48 on the merged tree.
- **Not proven:** no live campaign fund→claim run against `0xc7b9588` specifically on Arc (logic is Foundry/E2E-tested; the live site uses the enforcing escrow). OpenAI on the deployed site needs a redeploy from `main` + `OPENAI_API_KEY` / `LLM_PROVIDER=openai`.

### 22. PR #2 merged into main and the site redeployed from main, no repo commit

- **What:** PR #2 (`feat/cre-core` into `main`) was merged with a merge commit, `ab35b35`; `main` is identical to the tree tested on the branch (0 differing files). The teammate's migration `20261106000000_world_stepup` was applied to the `clippo-cre` Neon database first (without it the site would have broken). Then `https://clippo-cre.vercel.app` was redeployed with the Vercel CLI from a clean checkout of `main` (the project is not connected to GitHub, so every deploy is a CLI upload).
- **Checked on the live site after the deploy:** `/api/chain/config` shows the escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` and `explorerBase`; `/api/health`: db, chain, YouTube key and attestor wallet detected, dev bypass off, dangerous keys absent; `GET /api/campaigns/cmw5jiz940005scec1r7rcyaz` still returns `confirmedViews` 3, `pendingViews` 0 and the real CRE tx `0xa41f91da...c8409`; `/api/snapshots/clips` answers (empty until the approval day ends, UTC).
- **Not proven:** the teammate's World step-up is not configured on the site (no `WORLD_AUTH_*`) and has not run against the real issuer; the creator's own `/ledger` sign-in on production was not tried (needs a wallet signature).

### 23. Docs aligned with the three tracks, README rewritten, architecture diagram redrawn, commit pending

- **What:** the owner asked for all documents to be updated per the Arc, World IDKit and Chainlink CRE tracks, plus the README. Branch `docs/track-docs` from `main` (`ab35b35`); four agents each owned separate files and checked their claims against the code, then the lead rewrote the cross-track docs.
  - Arc: `docs/SUBMISSION_ARC.md`, `docs/tracks/ARC.md`, `docs/tracks/arc-studio-prompt.md`: the six prize bullets mapped to code (met, partly, not built), the four qualification requirements with honest status, chain facts read back with `cast`.
  - IDKit: `docs/tracks/WORLD_IDKIT.md`, `world-idkit-demo.md`, `world-idkit-debrief.md`, `docs/WORLD_SETUP_CHECK.md`: the trust moment, the credential (`proofOfHuman` preset) and why, server and on-chain verification, success and failure paths, debrief template left blank.
  - CRE: `docs/tracks/CRE.md`, `cre/README.md`, `docs/CRE_PLAN.md`, `docs/CRE_SCOPE.md`, `docs/CRE_DEPLOY.md`: requirement table, the "is it core" answer, the three-screen demo, reproduce commands, not-proven list; plan, scope and deploy sheet got dated status banners.
  - Diagram: `docs/architecture.svg` redrawn for the current design (validated with `xmllint`, rendered and checked in a browser) and `docs/ARCHITECTURE.md` rewritten.
  - Lead: `README.md` (overview, evidence table, the three tracks with status, AI use and project history), `docs/FOCUS.md`, `docs/DEMO_SCRIPT.md` (the three-screen CRE demo and what can really be shown live), `docs/TRACKS.md`, `docs/SUBMISSION_CHECKLIST.md`, and stale deploy statements in `docs/DEPLOY.md`, `docs/DEPLOY_ENV.md`, `docs/BACKEND_CONFORMANCE.md`, `web/API.md`, and the header of `docs/tracks/cre-simulation-real-arc.txt`.
- **Tests:** none run (docs only). Counts quoted in the docs (forge 114, web 325 + 1 skipped, CRE 26) are from the merged-tree run on 2026-11-07. Secret scan of the branch: no secret values, no key-like strings.
- **Found while writing (code gaps, not fixed here):** the Selfie Check and Passport wording in `IDKitSheet.tsx`, `lib/worldid/signup.ts` and `JoinView.tsx` is stronger than the installed typings support; the server does not enforce which credential was used; a failed on-chain wallet link is not shown to the user (`/api/worldid/verify` still answers 200 with `onchain.linked: false`); `reclaimUnapproved` and `withdrawFees` have no UI or API path; a stale `TODO(ItemFailed)` comment in `cre/workflows/clippo-settlement/main.ts`; `NEXT_PUBLIC_WORLD_LEVEL` is listed in `DEPLOY_ENV.md` but no code reads it.
- **Not proven:** the Mermaid diagrams were not rendered (preview them on GitHub); the v2 fork-run numbers (3 of 5 clips kept) are quoted from this log only; what the teammate's Arc Studio URL contains.

### 21. Merged main into this branch (teammate's World ID step-up), commit `248011f` (in main as `ab35b35`)

- **What:** `main` received a teammate's World ID step-up (`worldauth`, branch `feat/world-idkit-stepup-and-deploy-fixes`) after this work began, and it overlapped with ours. Trial merge: 36 files, about 100 conflict hunks. Decision (owner): keep main's step-up, drop ours.
  - Reverted our step-up commit `19205ba` in a normal revert commit `b157008` (history kept), then merged `origin/main`.
  - Adapted main's approve and split routes so that, after main's human gate passes, the backend signs the proof the enforcing escrow requires (`approveCampaign(id, proof)` / `approveSplit(..., proof)`); main's approve screen now sends that proof to the contract. Recipients of a split must have passed World ID at the real approval.
  - CRE: kept our v2 workflow (nodes read YouTube), took main's locked-down HTTP trigger (`config.ts`: `httpAuthorizedKeys`, `requireHttpAuthorizedKeys`); the production config now lists the simulation wallet `0x7149...01F6` as the authorized trigger key (was a TODO placeholder). The zero-receiver check stays at delivery time.
  - Kept the unused `worldIdpIdentity` column and migration `20261106000000_world_idp_identity` because the clippo-cre database already has it applied.
  - Docs: World docs taken from main; the other docs merged by hand, keeping our verified CRE, escrow and deploy facts.
- **Tested on the merged tree:** web typecheck clean and 325 tests passed (1 skipped); CRE typecheck clean, 26 tests passed, WASM compile ok; `forge test` 114 passed. Docs written before the merge still quote the old counts (311 web, 22 CRE).
- **Not proven:** the merged step-up has not run against the real auth.world.org issuer or in a browser; the new escrow's signed proof through main's step-up gate is covered by typecheck and the existing tests only, not by a live approval. The deployed site `clippo-cre.vercel.app` still runs the feature branch from before this merge. Main's docs say the older escrow was deployed from Arc Studio; we have not verified that. `docs/tracks/arc-studio-prompt.md` still says no Studio project exists.

### 20. Deployed to Vercel (new project) and the site shows the real CRE result, commit `0e9f7f8`

- **What:** the owner gave access to run the Vercel steps. The old `clippo-six` project is not in the owner's account, so a new project `clippo-cre` was created in `aniruddha1295s-projects`: https://clippo-cre.vercel.app. Neon database `clippo-cre-db` provisioned through the Vercel integration (owner accepted the terms), all migrations applied, 7 production variables set, production deploy ready (a local build passed first), seed script run (`--confirm`), then `/api/snapshots/refresh` and `/api/chain/sync`. `config.production.json` now points `backendUrl` at the new site.
- **Result (checked from the public site):** `/api/chain/config` shows the new escrow `0x1e05...26Ef` and `explorerBase`; `/api/health`: db, chain, YouTube key, attestor wallet detected, dev bypass off, dangerous keys absent. Refresh updated 1 clip from the real YouTube API; sync indexed 12 events and applied 2. `GET /api/campaigns/<seed id>`: `confirmedViews 3`, `pendingViews 0`, proof = the real CRE transaction `0xa41f91da...c8409`. A browser check of the campaign page shows "Confirmed views, all creators: 3", the Chainlink badge, the proof link and the TESTNET banner.
- **Not proven:** the creator's own `/ledger` was not opened (sign-in on production needs a wallet signature from `0x8CF9...60e5`); the owner must do that in the browser. The brand `/desk` cannot be signed into (placeholder campaigner). `/api/health` `ready` is false (LLM, World ID, admin wallets, blob storage not configured); not needed for the CRE demo. The manifest is empty until the day of the seeded approval ends (UTC). The records (user, channel, campaign, clip, approval) are seeded and labelled; views, credit and proof are real.

### 19. Vercel steps and a seed script for the deployed database, commit `9d098ef`

- **What:** the owner installed the Vercel CLI and logged in (2026-11-07). Wrote the Vercel steps into `docs/CRE_DEPLOY.md` (section 6) and `web/scripts/seed-cre-demo.mjs`: seeds a creator user, the `@visualsbyanii` channel, a campaign row linked to on-chain campaign 1 and one approved clip, all labelled `[SEED]`. It does NOT seed views, credits or the proof link: those come from the chain (indexer) and the YouTube API (`/api/snapshots/refresh`). It is a dry run unless `--confirm` is given, refuses to continue if an old-escrow campaign already holds on-chain id 1 unless `--retire-old` is given (that only clears the on-chain link of those rows), and is safe to re-run.
- **Why:** the live database may hold a campaign linked to id 1 of the OLD escrow; the new escrow's campaign 1 would be mixed up with it. The app also needs matching rows before it can show the real Confirmed views for the demo wallet.
- **Tested:** on a local database that held a stale campaign with on-chain id 1: dry run stops with a clear message; `--confirm` without `--retire-old` stops; `--confirm --retire-old` writes the seed rows and leaves one campaign with id 1; a re-run changes nothing.
- **Not proven:** nothing was run on the production database or on Vercel (the owner runs those steps). The brand `/desk` screen cannot be signed into on production with the placeholder campaigner.

### 18. First CRE report on REAL Arc, reading the REAL YouTube video, commit `c4d8e30`

- **What:** after the owner funded the simulation wallet (funding tx `0xc19bf62333ac5ffb3ac79a24734d2690c8589e296903f20ca0360bd22df1c707`, status success, 20 USDC), ran `bash scripts/simulate-arc-real.sh vWk4YV_dbsE UCIZw3qclbEDMa4TCFMAatww` (`cre workflow simulate --target production-settings --broadcast`, CLI v1.39.0). Manifest: one real clip from a local mock backend. YouTube: the real Data API.
- **Result:** "youtube agreed: kept 1/1 clips", 1 report, 0 failed rows. Transaction `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409` (block 71094857, status success): from the simulation wallet `0x7149...01F6`, to Arc's Chainlink simulation forwarder `0x6E9E...eDc1`, 4 logs: `CreatorCredited` and `ViewsReported` from the escrow, `ReportProcessed` from the receiver, and the forwarder's own event. Independent `cast call` on the escrow: `reportedViews(1, 0x8CF9...60e5)` = 3 (the video's real count), `credited` = 30000 units = 0.03 USDC. Explorer: https://explorer.testnet.arc.io/tx/0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409. Output: `docs/tracks/cre-simulation-real-arc.txt` (no API key in it).
- **Not proven:** it is a SIMULATION: one CRE node, the report is sent by our own simulation wallet through Arc's Chainlink TEST forwarder, so it does not show Chainlink nodes signing and the receiver is not locked. The manifest was served locally, not by the deployed backend. The deployed site and Vercel still run the old build and the old escrow, so the app does not show this yet. The creator's human registration is an attestor-signed stand-in for the World check.

### 17. Contracts deployed on real Arc testnet (simulation mode), commit `b1129d0`

- **What:** the owner ran `bash scripts/arc-deploy.sh` with the admin wallet. Result, read back from the chain by Claude:
  - ClippoEscrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` (creation tx `0xc65b42e4998cc93d4d9bb2a363d53acf11129329fd5426feaaeb004f9de5ba03`), deploy block 71094327.
  - ClippoReportReceiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` (creation tx `0x4d1369931084c290dc49b92f1231672f6106668815a8c109ebdd04a85b02e522`).
  - Escrow `reportAdapter` is the receiver; the receiver's escrow is the escrow; forwarder is Arc's Chainlink simulation forwarder `0x6E9E...eDc1`; expected workflow owner is the simulation wallet `0x7149...01F6`; `workflowCheckSkipped` is true and `configLocked` is false (simulation mode on purpose).
  - Escrow owner is the admin `0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5`; `humanAttestor` is `0x62Ed...5074`; campaign count is 1 (id 1: PerView, $10 per 1,000 views, 5 USDC pool, created and approved by the script); the creator wallet `0x8CF9...60e5` is registered as a human (attestor-signed stand-in for the World check).
  - `cre/workflows/clippo-settlement/config.production.json` now has the real receiver address.
- **Not proven:** no CRE report has been sent to this escrow yet: the simulation wallet had a balance of 0 when checked, so the run waits for the owner to fund it. The campaign's on-chain state was not decoded (the script ended with "campaign id 1 approved"). The web app and Vercel still point at the old escrow.

### 16. Deploy sheet for real Arc and two helper wallets, commit `1e9003c`

- **What:** wrote `docs/CRE_DEPLOY.md` and two scripts: `cre/scripts/arc-deploy.sh` (the owner runs it; asks for the admin key hidden; deploys escrow and receiver in simulation mode, creates and approves one 5 USDC PerView campaign, registers the creator wallet as a human via the attestor signature, writes addresses to the git-ignored `scripts/.arc-deploy.env` and the receiver into `config.production.json`) and `cre/scripts/simulate-arc-real.sh` (CRE `--broadcast` on real Arc reading the real YouTube video). The CRE project's production RPC now uses `rpc.testnet.arc.io`.
- **Decisions (owner, today):** helper keys generated locally; the owner runs the deploy with their own wallet; the creator is registered by an attestor-signed script (stands in for the World check in the CRE demo, to be said plainly); admin wallet = `0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5`.
- **Wallets (public addresses only):** CRE simulation wallet `0x7149dCB8f568794c7bed1a3Bd90A6f397EeF01F6` (key in `cre/.env`), backend attestor `0x62EdCF9A14F0aB803Ee154EE9709323E56655074` (key in `web/.env.local`). Both testnet-only, never printed, git-ignored.
- **Checked:** Arc RPCs healthy (chain 5042002), Arc USDC and both Chainlink forwarders have code, explorer up, 114 contract tests pass. Deploy script dry run on a local fork (public test key, mock USDC): 5 of 5 steps passed. The simulation script's dry run reached "kept 1/1 clips" (real YouTube); its write step hung on the fork because the public Arc RPC rate-limited it (429).
- **Not proven:** nothing ran on real Arc. Real Arc USDC in the campaign step is untested (a fork cannot emulate it). The owner still has to fund two wallets and run the deploy.

### 15. First real YouTube read through the workflow, on a local fork, commit `f54479a`

- **What:** the owner created a YouTube Data API key (saved in `cre/.env` and `web/.env.local`, both git-ignored; an extra pasted fragment was found and trimmed, the key itself never shown), used the test channel `@visualsbyanii` (UCIZw3qclbEDMa4TCFMAatww), and put `clippo:0x8cf9113b19aa9d169365ca7b1bb9d7b957b460e5` in its bio. Checked through the API: the exact line is in the bio and the video `vWk4YV_dbsE` ("FLOW FORTE HACK SUBMISSION") is public on that channel. Added `cre/scripts/simulate-real-youtube.sh` (local fork, mock manifest with one real clip, REAL YouTube API, `--config` override), a `realyt` mode in `mock-backend.mjs`, and `EXTRA_CREATORS` in `local-chain.sh`.
- **Result:** `cre workflow simulate --broadcast` on the local fork: manifest 1 clip, "youtube agreed: kept 1/1 clips", 1 report, 0 failed rows. `cast call` on the fork escrow: `reportedViews` = 3 (the video's real count at that time) and `credited` = 30000 units = 0.03 USDC at the fork's $10 per 1,000 views. No API key appears in the saved output. Output: `docs/tracks/cre-simulation-real-youtube.txt`.
- **Found:** two earlier attempts timed out at the write step because the public Arc RPC (`rpc.testnet.arc.network`) answered 429 rate limit to the local fork; the run passed through `rpc.testnet.arc.io` (set `ARC_RPC=https://rpc.testnet.arc.io`). The CRE CLI also timed out once reaching its own API; a retry worked.
- **Not proven:** this is still a local fork with a mock manifest, one CRE node, and a local simulation forwarder. Nothing ran on real Arc, against the deployed backend's manifest route, or on a deployed workflow. The video has only 3 views, so the amounts are tiny.

### 14. Browser end-to-end check of the frontend against the real backend, commit `ad3c7d9`

- **What:** ran the whole chain locally and checked the screens in a headless Chromium. Anvil fork of Arc, fresh contracts, `cre workflow simulate --broadcast` (3 of 5 clips kept, 1 report, 0 failed rows), a local database seeded with `web/scripts/e2e-confirmed-seed.mjs`, `next dev` pointed at the fork, `POST /api/chain/sync` (real indexer), then `web/scripts/e2e-confirmed-ui.mjs` (new; signs in with the dev wallet bypass).
- **Result:** 14 of 14 checks passed. Creator b: API confirmed 5300 / pending 750; the proof link is the exact delivery tx of the CRE run. Brand: confirmed 6500 / pending 1050. The ledger and desk show Confirmed, Pending, a Chainlink badge, a proof link and the one-line explainer. The clip slip shows Confirmed with a proof link. An old-format verified channel is flagged `needsReverify`; the Account screen offers "Get my new code"; after the click the wallet-bound code `clippo:<wallet>` is on screen and the API shows the channel unverified until the bio check.
- **Found and fixed:** the first run crashed the slip page on a seed campaign with an empty story (`mustSay` undefined). That was seed data, not the screen; the seed now has a proper story.
- **Files:** `web/scripts/e2e-confirmed-seed.mjs`, `web/scripts/e2e-confirmed-ui.mjs`. Screenshots stay out of the repo (they show a fork transaction).
- **Not proven:** the `/join` channel step was not reached, because it sits behind a World ID check that this local run does not configure; the Account re-verify path was tested instead. Fake YouTube data and a local fork only, one CRE node. The ledger's "Still accruing" estimate (and cost per 1,000 views on the desk) still uses Clippo's own count, so it includes pending views. In the seed the desk's "pool used" shows $0 because no payout rows exist for the credits.

### 13. End-to-end on a local fork: CRE report -> indexer -> Confirmed views, commit `0c3e401`

- **What:** added `web/src/lib/chain/confirmed-views.e2e.test.ts`, skipped unless `E2E_CRE_FORK=1`. Ran the full chain locally: anvil fork of Arc, `cre/scripts/local-chain.sh` (fresh MockUSDC, escrow, receiver, linked creators), the mock backend with a FAKE YouTube key, then `cre workflow simulate --broadcast`. The workflow kept 3 of 5 clips and delivered 1 batch of 3 rows (0 failed). Then the real `syncChain` read the real `ViewsReported` logs into the test database.
- **Result:** the test passed. Confirmed views from the chain events: campaign 7 creator 0x1111... = 1200, campaign 7 creator 0xabcd... = 300, campaign 12 creator 0xabcd... = 5000; the proof tx hash is a real hash from the fork; `creatorEarnings` totals confirmed = 5300. This also shows the web ABI decodes the freshly built contract's event.
- **Run command:** `E2E_CRE_FORK=1 ESCROW_ADDRESS=<escrow> ARC_RPC_URL=http://127.0.0.1:8545 ESCROW_DEPLOY_BLOCK=<block before deploy> npx vitest run src/lib/chain/confirmed-views.e2e.test.ts`.
- **Normal suite:** `npm test` 311 passed, 1 skipped (this test); typecheck clean. Fork, mock server and patched files were cleaned up afterwards.
- **Not proven:** the browser screens were not checked against this data; the fork is local (no real Arc, no real YouTube, one CRE node); the proof link points at a fork transaction that does not exist on the explorer.

### 12. Frontend: Confirmed vs Pending views, commit `0cb93b7`

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

1. **Arc Studio:** open the Studio URL on file (`https://studio.arc.io/app/34ef3b95-32bd-48f9-9310-b8135e1d92ce`), make it public with Share, and tell Claude what it holds; or import the current contract into Studio. The prize requires it.
2. **IDKit live run:** set `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID`, `WORLD_ID_SIGNING_KEY` on the Vercel project `clippo-cre`, redeploy, run one real proof and one failure path, then fill `docs/tracks/world-idkit-debrief.md`.
3. **CRE deploy access:** run `! cre account access` and tell Claude the result (optional for the prize).
4. **Sign in** at https://clippo-cre.vercel.app with `0x8CF9...60e5` as a creator and open /ledger to see the Confirmed views.
5. **Record the demo video** (under 4 minutes; `docs/DEMO_SCRIPT.md`) and submit before 09:00 IST.
6. Merge the docs PR (branch `docs/track-docs`).

## Coming next

1. UI work, on a new branch from `main`.
2. Fix the IDKit code gaps listed in entry 23 (credential wording, server-side credential check, show a failed on-chain link).
3. Run dispute, claim and close on real Arc (the retention window is 7 days, so this needs a short retention campaign), and one funded campaign through the UI.
4. If CRE deploy access is approved: deploy the workflow, pin its id and lock the receiver.

## Known gaps

- On real Arc only a CRE report and the deploy script's campaign setup have run; funding through the UI, dispute, claim, close and the split approvals have not.
- The CRE run is a simulation: one node, our wallet sends the report through Chainlink's test forwarder, the receiver is not locked, nothing is deployed on the CRE network.
- The deployed site is seeded (labelled `[SEED]`) and has no LLM, World ID, admin list or blob storage configured (`/api/health` `ready: false`).
- No real World proof has run; the step-up has never run against the real issuer.
- Arc Studio was not used by us; what the teammate's Studio URL holds is unverified.
- `docs/E2E_CHAIN.md` and `web/scripts/e2e-chain.mjs` still describe the old escrow.
- The Vercel project is not connected to GitHub: every deploy is a CLI upload.
- Read `docs/FOCUS.md` before starting new work.
