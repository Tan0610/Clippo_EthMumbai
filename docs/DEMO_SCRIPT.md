# Demo script (target 3:25, hard cap 4:00)

ETHGlobal rule: 2 to 4 minutes, 720p or better, no AI voiceover, not sped up. Anything over 4:00 is rejected. The rows below add up to 3:25, which leaves 35 s of slack. They are a plan and have not been rehearsed: time a real take and cut rows if it runs past 3:45. The old 4:30 / 5:00 targets were wrong.

Setup before recording: `cd web && npm run db:local` (or a real Postgres), `npx prisma migrate deploy`, `npm run doctor`, then **stop anything else holding the single local DB connection** and seed: `node --env-file-if-exists=.env.local --env-file-if-exists=.env scripts/seed-demo.mjs --reset` (add `--ui-only` on a local DB to lay out screens without a chain), then `npm run dev`. Three browser profiles or sessions: Campaigner, Creator, Admin (admin wallet = a value from `ADMIN_WALLETS`). Be honest on camera about anything not exercised live (see the README status table). Never record with `NEXT_PUBLIC_DEMO=1`.

## What can be shown live today

| Segment | Can be shown live? | Why |
| --- | --- | --- |
| Arc: explorer, escrow, receiver, contract functions | Yes | Deployed on Arc testnet (`docs/CRE_DEPLOY.md`). |
| CRE: terminal, explorer tx, site proof | Yes | Real Arc transaction `0xa41f91da…c8409`; the deployed site shows it. |
| IDKit success and failure paths | **No, not yet** | `WORLD_ID_*` is not set on `clippo-cre.vercel.app`, and no real proof has run. Show it only after a live run; otherwise say it is integrated and tested with doubles. |
| AI verdict, campaign wizard | **No, not on the deployed site** | No LLM key is configured there. Record it locally with `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`, or leave it out. |
| Step-up (Agent Pass) | **No, not yet** | Never run against the real `auth.world.org`. |
| Claim | **No** | PerView credits wait out the 7-day retention window; no matured campaign exists. |

Say plainly in the video what is simulated, seeded or not run. Do not show a step as working that answered 503.

## Timeline (target 3:50)

| Time | Screen | Say / do |
| --- | --- | --- |
| 0:00 | Landing | One line: brands fund a USDC pool, verified humans clip, an AI checks, Chainlink CRE confirms the views, the escrow on Arc pays. An agent never moves money alone. (15 s) |
| 0:15 | Arc explorer: escrow `0x1e05…26Ef` and receiver `0x6b0f…C0cd` | USDC is the settlement and gas token. Name what the contract does: three payout modes, a 7-day retention window, on-chain disputes with automatic release, fee splits to a treasury, signed human approvals, one receiver for CRE reports (`docs/SUBMISSION_ARC.md`). **Arc Studio:** show it only if a project really holds this contract (open the URL on file first). If not, say the contracts were written and tested in Foundry and deployed with a forge script. (30 s) |
| 0:45 | Architecture diagram `docs/architecture.svg` | Walk the money flow 1 to 8 in one breath. (15 s) |
| 1:00 | IDKit on `/join` (only if run live) | State the trust moment: a creator gets paid real USDC, so one person must not farm campaigns with many accounts. Credential: Proof of Human is the minimum that gives per-human uniqueness. Press Cancel: the account stays unverified. Then verify: the account is verified and the wallet is linked on-chain. Say the prize proofs are mocked fake identities. If it has not run live, say "integrated and tested; not run live" and skip the clicks. (30 s) |
| 1:30 | Local build only (needs an LLM key): submit a clip, AI verdict with the reason; open the seeded NEEDS_HUMAN and REJECT slips | Optional. Skip it if there is no key. (20 s) |
| 1:50 | **CRE, screen 1: terminal** in `cre/` | Show the saved output (`docs/tracks/cre-simulation-real-arc.txt`) or run `bash scripts/simulate-arc-real.sh vWk4YV_dbsE UCIZw3qclbEDMa4TCFMAatww`. Point at four lines: `kept 1/1 clips`, `batch 1/1: receiver processed 1 rows, 0 failed`, and the `delivered … txs=0xa41f91da…` line. Cut the compile wait; do not speed it up. Say: "run with the official CRE command-line tool; a simulation, one node". (15 s) |
| 2:05 | **CRE, screen 2: Arc explorer** | Open https://explorer.testnet.arc.io/tx/0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409 : status success, the three events (`ViewsReported`, `CreatorCredited`, `ReportProcessed`). Say the escrow only accepts calls from that receiver. (15 s) |
| 2:20 | **CRE, screen 3: the site** `https://clippo-cre.vercel.app/slips/cmw5jiz940005scec1r7rcyaz` | "Confirmed views: 3", the Chainlink badge, and the proof link: click it, it opens the same transaction. One hash in three places. Say the user, channel and campaign are seeded; the views, credit and proof are real. (15 s) |
| 2:35 | Why CRE is core | Honest line: without CRE no view can be credited; Clippo's own count shows as "Pending" and is not paid. Say what is not done: not deployed on the CRE network, so the receiver is not locked. (15 s) |
| 2:50 | Step-up on `/desk` (only if run live) | Agent proposes a split; the human step-up gates the release. Show Cancel: split not released. Skip if not run live. (20 s) |
| 3:10 | Close | Repo, the three tracks, and what is open. (15 s) |
| 3:25 | Slack | Leave it empty. The hard cap is 4:00. |

Click path summary: `/desk/new` -> `/desk/[id]/fund` -> (admin) `/bench` approve -> (creator) `/join` -> `/wire` browse and submit -> `/slips/[id]` verdict and appeal -> `/desk` split -> `/ledger` claim -> close.

Seeded data (`web/scripts/seed-demo.mjs`, everything labelled `[SEED]`, wallets `0x5eed...`):
- Users: admin `0x5eed...01` (add to `ADMIN_WALLETS` to act as admin), campaigners `...02`/`...03`, five creators `...11`-`...15` (four World-verified with verified YouTube channels, one deliberately unverified to show the gate). Sign in as any of them with the dev sign-in outside production.
- Campaigns: one DRAFT always; per-view, human-split, pool-share (+ one rejected) only with `ESCROW_ADDRESS` configured or `--ui-only` (local DB, no chain fields, not fundable or claimable).
- Verdicts: APPROVE, REJECT (with a pending appeal), NEEDS_HUMAN, plus seven days of view snapshots for the approved clips.
- A hire workspace (brief, three creators in proposed/approved states, share link) and a shortlist; the script prints their share URLs.
- Not seeded, by design: tx hashes, funded pools, payouts, claims. Do those live: fund on Arc testnet, approve, then `POST /api/chain/sync` and `POST /api/snapshots/refresh`.
- Real integrations (World ID, Claude, YouTube) need their keys; without them those steps answer 503 NOT_CONFIGURED and must not be shown as working. The mock links (`bad...`, `inject...`) of the old script no longer exist: show the seeded REJECT and NEEDS_HUMAN verdicts on `/slips/[id]`, or submit real clips if keys are set.

Fallback: if the API is down the UI shows an error with retry (sample data only exists with `NEXT_PUBLIC_DEMO=1`, for screenshots, not for recording).
