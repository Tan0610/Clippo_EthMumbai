# Submission checklist

| Item | Value / status |
| --- | --- |
| Repo link | https://github.com/Tan0610/Clippo_EthMumbai (the `origin` remote). `contracts/`, `web/` and `cre/` have no nested `.git`. OPEN: confirm the branch with the latest work (`feat/core-sponsor-integration`) is pushed or merged to the branch the judges see. |
| Arc Studio project URL | `<ARC_STUDIO_PROJECT_URL>` OPEN. Not created yet (every Arc prize requires one; show Studio in the video). |
| Deployed escrow (Arc testnet explorer) | `<ARCSCAN_ESCROW_URL>` OPEN. The enforcing escrow (commit `498f649`) is not deployed. Two old-design escrows exist on Arc testnet: `0xd8453c22996bea11598a3dbf05112675b945c39c` (used by the live site) and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`. |
| Demo video (2 to 4 min, hard cap 4:00; 720p or better; no AI voiceover; not sped up) | `<VIDEO_URL>` OPEN. Not recorded. Script in `docs/DEMO_SCRIPT.md`. |
| Architecture diagram | `docs/architecture.svg` and `docs/ARCHITECTURE.md` (export to PNG for the form; not exported yet; the SVG still shows the older design, update it first; `ARCHITECTURE.md` is current) |
| Live app URL (optional) | `<APP_URL>`. Candidate: https://clippo-six.vercel.app. It runs the old build, points at an old escrow and has no `YOUTUBE_API_KEY`. |

## Per track

- [ ] Chainlink CRE: DONE: the workflow simulates (commit `6f74f7b`); a live-feed run exits 0 with an empty no-op; a local `--broadcast` run on an anvil fork of Arc credited creators. OPEN: capture the simulate output (screenshot or log) for the form; nothing broadcast to real Arc; no workflow deployed; `config.production.json` still has a zero receiver; the simulator is single-node (no real consensus); CRE reads Clippo's snapshot feed, not YouTube directly; the id gap in `ARCHITECTURE.md` is closed in code (`292d107`: the feed emits the numeric `onchainId`), but nothing has run with real rows through a deployed receiver.
- [ ] World Agent Pass: DONE in code: OIDC step-up for the agent's split (commit `19205ba`, `web/src/lib/agentpass/stepup.ts`). OPEN: never run against the real issuer (auth.world.org) or in a browser; the older AgentKit/AgentBook code is not the official Agent Pass; full journey with denied path not shown; backend validation not shown; integration debrief not filled (`docs/TRACKS.md`).
- [ ] World IDKit: the IDKit widget and v4 backend verify are wired. OPEN: run once with real `WORLD_ID_*` and capture the failure paths (cancel, expire, reuse). World ID proofs for the prize are mocked fake identities, not for production.
- [ ] Arc ("Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio", $3,000; name copied from the live prize page on 2026-11-06): OPEN: build in Arc Studio (not used yet; the contract was written and tested in Foundry), Studio URL shown, deploy the enforcing escrow to Arc testnet (not deployed), run the app against it. DONE: frontend + backend code connected to the enforcing escrow (commits `292d107`, `dfd0d51`). Not proven on real Arc: funding to claim with the new escrow.

## Before submitting

- [ ] Re-run `forge test`, `npm test`, `npm run lint`, `npm run typecheck` (web and cre).
- [ ] No secrets committed (`web/.env`, `web/.env.local`, `cre/.env` excluded).
- [ ] README status table matches reality (updated after the UI/demo pass; re-check after any live run).
- [ ] Demo data: `node scripts/seed-demo.mjs --reset` ran clean; no `[SEED]` rows in the production DB.
- [ ] Responsive: `npm run check:overflow` passes; device screenshots reviewed (`web/scripts/shoot-senior.mjs`, output goes to `design/shots/senior`, which does not exist yet: not run).
- [ ] Video is 2 to 4 min (hard cap 4:00) and states what was not run live: Arc Studio (not used), the new escrow (not deployed), CRE on real Arc (simulation only), the Agent Pass OIDC step-up against the real issuer, live World ID (proofs are mocked), platform APIs if keys are missing.
- [ ] `NEXT_PUBLIC_DEMO` is unset in the recorded build.
