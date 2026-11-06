# Submission checklist

| Item | Value / status |
| --- | --- |
| Repo link | https://github.com/Tan0610/Clippo_EthMumbai (the `origin` remote; one repo; `contracts/lib/*` are git submodules, so clone with `--recurse-submodules`; `contracts/`, `web/` and `cre/` have no `.git` of their own). DONE: the repository is public (checked 2026-11-07) and the work is merged into `main` (PR #2, `ab35b35`), the default branch the judges see. Contracts, web and CRE are all in this one repo. |
| Arc Studio project URL | https://studio.arc.io/app/34ef3b95-32bd-48f9-9310-b8135e1d92ce (from main's commit `943779e`; required, show Studio in the video). OPEN: not verified by us. Open it, make it public with the Studio **Share** button, and check what it holds before relying on it. |
| Deployed escrow (Arc testnet explorer) | https://explorer.testnet.arc.io/address/0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef DONE: the enforcing escrow on Arc testnet, simulation mode; receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd`. Older 3-arg escrows, not the enforcing design: `0xd8453c22996bea11598a3dbf05112675b945c39c` and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`. |
| Demo video (2 to 4 min, hard cap 4:00; 720p or better; no AI voiceover; not sped up) | `<VIDEO_URL>` OPEN. Not recorded. Script in `docs/DEMO_SCRIPT.md`. |
| Architecture diagram | DONE: `docs/architecture.svg` is redrawn for the current design (2026-11-07: enforcing escrow, receiver, CRE reading YouTube, indexer, Confirmed views, status chips for what is simulated or unproven), and `docs/ARCHITECTURE.md` has the Mermaid versions. OPEN: export the SVG to PNG for the form (open it in a browser and screenshot it, or `npx -y svgexport docs/architecture.svg docs/architecture.png 2x`). |
| Live app URL (optional) | https://clippo-cre.vercel.app: a separate Vercel project and database, deployed by the Vercel CLI from `main` at `ab35b35` (the project is not connected to GitHub, so redeploys are CLI uploads), pointing at the enforcing escrow. Demo page: `/slips/cmw5jiz940005scec1r7rcyaz` (3 Confirmed views, proof link). The user, channel, campaign and clip behind it are seeded and labelled `[SEED]`; views, credit and proof are real. `/api/health` shows `ready: false` because the LLM, World ID, admin wallets and blob storage are not configured. |

## Per track

- (Chainlink CRE items are in the verified block below.)
- World ID Agent Pass (prize page: https://ethglobal.com/events/mumbai/prizes/world ; checked live, re-read before submitting). None of these has been run live yet:
  - [ ] auth.world.org client registered (sandbox): `WORLD_AUTH_CLIENT_ID` / `WORLD_AUTH_CLIENT_SECRET` (BLOCKED as of 2026-11-06: portal needs an enterprise Google account, personal Gmail gets `account_not_eligible`; ask a World mentor, see `docs/WORLD_USER_TODO.md` 'Blocker: auth.world.org access'; if it stays blocked and the demo uses `WORLD_AUTH_POLICY=either`, say in the video and debrief that it is a fallback, not the official Agent Pass integration)
  - [ ] Redirect URI(s) registered, exact HTTPS URL = `WORLD_AUTH_REDIRECT_URI` (tunnel or deployed host)
  - [ ] Sandbox World ID (fake identity) created
  - [ ] `npm run doctor` shows the world-auth block green (discovery document fetched)
  - [ ] Recorded: success, cancelled, expired, and one denied path (split changed or wrong identity), each showing the split NOT released
  - [ ] `docs/tracks/agent-pass-debrief.md` four items filled (time to first success, friction, missing capability/docs, one improvement)
- World Best Use of IDKit:
  - [x] Developer Portal app 'Clippo', relying party and actions `clippo-creator-signup`, `clippo-approve-split`, `clippo-approve-campaign` created (2026-11-06; no proof run yet)
  - [ ] Check whether default action settings allow repeat verifications for the approve actions (second approval; note the result)
  - [ ] Real `WORLD_ID_*` run with a supported credential (Proof of Human) verified server-side
  - [ ] Recorded: success plus one alternative path (cancel, credential unavailable, or second account `ALREADY_USED`)
  - [ ] Trust event and minimum-credential rationale said in the video (see `docs/tracks/WORLD_IDKIT.md`)
  - [ ] `docs/tracks/world-idkit-debrief.md` four items filled
  - Note: World ID proofs for the prize are mocked fake identities, not for production.
  - `WORLD_ID_*` is NOT set on the deployed site (`/api/health` shows `worldId: false`), so nothing can be run live there until it is set and redeployed.
  - Known gaps found while documenting (details in `docs/tracks/WORLD_IDKIT.md` section 8): the Selfie Check and Passport wording in the code comments and the `WhyProofOfHuman` text is stronger than the typings support; the server does not enforce which credential was used; a failed on-chain wallet link is not shown to the user.
- Arc and Chainlink prize pages RE-CHECKED live 2026-11-06 (https://ethglobal.com/events/mumbai/prizes/arc and /chainlink); verified items below. Re-read once more right before submitting.
- Arc, "Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio" ($3,000). Every Arc prize requires Arc Studio as the starting point:
  - [ ] State the bounty name exactly in the submission (written in `docs/SUBMISSION_ARC.md`; type it into the form)
  - [x] Enforcing escrow deployed to Arc testnet: `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` (simulation mode), written and tested in Foundry and deployed with a forge script (`cre/scripts/arc-deploy.sh`)
  - [ ] Contracts written/tested/deployed in Arc Studio (see `docs/tracks/ARC.md` Arc Studio plan). Not proven: main's docs say the older 3-arg escrow was compiled and deployed from Studio, which we did not verify; the enforcing escrow was deployed with a forge script, not from Studio
  - [ ] Shareable Arc Studio project URL that judges can open (on file in the table above from main's commit `943779e`; make it public with Share and check it loads)
  - [ ] Studio shown in the demo video
  - [ ] Functional MVP: working frontend and backend, campaign shown funding to claim (site is deployed on the new escrow and shows the real CRE result; funding to claim through the app on real Arc is not run)
  - [x] Architecture diagram (`docs/architecture.svg`, redrawn 2026-11-07; export to PNG for the form)
  - [ ] Video demonstration + presentation (effective use of Arc Studio and Circle developer tools)
  - [ ] Link to GitHub/Replit repo
- Chainlink "Best workflow with CRE" ($1,500; verified 2026-11-06):
  - [x] Successful `cre workflow simulate` via the CRE CLI. DONE: workflow v2 ran with `--broadcast` on REAL Arc and read the real YouTube API: tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409` (`docs/tracks/cre-simulation-real-arc.txt`). It is a simulation: one node, our own wallet sent the report through Arc's Chainlink test forwarder
  - [x] Workflow integrates a blockchain with an external API/data source and is meaningfully used (see `docs/tracks/CRE.md`). DONE: each node reads YouTube itself, results go through median consensus, the escrow credits only from the receiver; the site shows Confirmed views and the proof link
  - [ ] OPEN: no deployed workflow (deploy is not required); the receiver is not locked; no multi-node consensus; the real-Arc run read its manifest from a local mock backend (the deployed site's `/api/snapshots/clips` is empty until the approval day ends, UTC); capture the output for the form

## Before submitting

- [ ] Re-run `forge test`, `npm test`, `npm run lint`, `npm run typecheck` (web and cre).
- [ ] No secrets committed (`web/.env`, `web/.env.local`, `cre/.env` excluded).
- [ ] README status table matches reality (updated after the UI/demo pass; re-check after any live run).
- [ ] Demo data: `(cd web && node --env-file-if-exists=.env.local scripts/seed-demo.mjs --reset)` ran clean; no other `[SEED]` rows in the production DB. The CRE demo site holds `[SEED]` rows from `web/scripts/seed-cre-demo.mjs` on purpose (labelled user, channel, campaign and clip); only its views, credit and proof are real.
- [ ] Responsive: `npm run check:overflow` passes; device screenshots reviewed (`web/scripts/shoot-senior.mjs`, output goes to `design/shots/senior`, which does not exist yet: not run).
- [ ] Video is 2 to 4 min (hard cap 4:00) and states what was not run live: what Arc Studio was and was not used for (the enforcing escrow was deployed with a forge script), that the CRE run on real Arc is a simulation (one node, our wallet sends the report, no deployed workflow), funding to claim through the app on real Arc, the auth.world.org step-up and live World ID (not run; proofs are mocked fake identities), platform APIs if keys are missing. State plainly anything that was not run live.
- [ ] `NEXT_PUBLIC_DEMO` is unset in the recorded build.
