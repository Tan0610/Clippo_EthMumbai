# Clippo

Clippo is a clipping-and-bounty marketplace. Brands fund a USDC pool, World-ID-verified creators post clips, an AI verifier checks each clip against the brand's story, and payouts settle on-chain (Arc) with views delivered by a Chainlink CRE workflow. Creators claim their own money; unspent funds return to the brand. An AI agent proposes, but never moves money alone. This describes the code in HEAD. A public test site runs at https://clippo-cre.vercel.app (deployed with the Vercel CLI from the feature branch; it will be redeployed from main after the merge).

Built for ETHGlobal Mumbai. Tracks: Chainlink "Best workflow with CRE", World "World ID Agent Pass", World "Best Use of IDKit", Arc "Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio". See `docs/TRACKS.md`. Every Arc prize requires an Arc Studio project. Arc Studio has not been used yet (see "Honest status").

| Doc | Purpose |
| --- | --- |
| `docs/FOCUS.md` | Plan and rules: the one rule for partners, the deadline, what to build next |
| `docs/BUILD_LOG.md` | Running record of every change, decisions, and how to go back |
| `docs/ARCHITECTURE.md` | Diagrams (architecture + money flow) |
| `docs/TRACKS.md` | Track to code mapping, failure paths, integration debrief template |
| `docs/DEMO_SCRIPT.md` | Video script. ETHGlobal rule: 2 to 4 minutes, anything over 4:00 is rejected, 720p or better, no AI voiceover, not sped up |
| `docs/RUNBOOK.md` | Deploy, env, CRE simulate, seed, what replaced the mocks |
| `docs/SUBMISSION_CHECKLIST.md` | What to submit |
| `docs/SUBMISSION_ARC.md` | Arc submission writeup and deploy runbook |
| `docs/DEPLOY.md` | Deploying the web app to Vercel (public test deployment) |
| `docs/DEPLOY_ENV.md` | Vercel env variables, including the do-not-set-on-Vercel list |
| `docs/CRE_DEPLOY.md` | Deploy sheet for the real Arc testnet CRE demo (wallets, steps, what was done on Vercel) |
| `docs/WORLD_USER_TODO.md` | Manual World steps only a person can do (auth.world.org client, Developer Portal) |
| `docs/E2E_CHAIN.md` | Local end-to-end money-flow test (stale, not updated for the enforcing escrow) |
| `docs/BACKEND_CONFORMANCE.md` | Audit of the backend against the PRD |
| `docs/WORLD_SETUP_CHECK.md` | World ID setup check (results from 2026-10-28, not re-run) |
| `docs/tracks/` | Per-track writeups, demo scripts and the saved CRE simulation output |
| `web/API.md` | Full HTTP API reference |
| `contracts/README.md`, `cre/README.md` | Contract and workflow details |

## Layout

```
contracts/  Foundry: ClippoEscrow, ClippoReportReceiver, ClippoReferral, ClippoCreatorProfile, MockUSDC, deploy scripts, tests
cre/        Chainlink CRE TypeScript workflow (clippo-settlement: cron + HTTP trigger) and local simulation scripts
web/        Next.js app + /api routes + Prisma (Postgres; PGlite via `npm run db:local` for dev)
docs/       Build log, architecture, track writeups, submission docs
scripts/    deploy-arc.mjs (deploy helper)
design/     Visual direction (DESIGN.md)
```

## Quickstart

Prereqs: Node 22.6+ (the cre tests use `node --experimental-strip-types`), Foundry, and for CRE the `cre` CLI and Bun.

> Arc tooling note: Arc docs recommend `arc-forge` / `arc-cast` (Arc Foundry fork, https://docs.arc.io/arc/tutorials/install-arc-foundry.md), e.g. `arc-forge create src/X.sol:X --rpc-url $ARC_TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast`. Plain `forge` may work for tests, but deployment should use `arc-forge` per Arc docs (not run here). Arc requires `maxFeePerGas >= 20 Gwei`; see `docs/tracks/ARC.md`.

```bash
# get the code with the contracts/lib submodules (OpenZeppelin, forge-std)
git clone --recurse-submodules <REPO_URL> && cd Clippo_EthMumbai
# already cloned without them: git submodule update --init --recursive

# Foundry (once)
curl -L https://foundry.paradigm.xyz | bash && foundryup

# contracts
cd contracts && forge build && forge test

# web
cd web && cp .env.example .env.local && npm install
npx prisma migrate deploy
npm run dev            # http://localhost:3000, (run `npm run doctor` first: every integration is real)
npm test && npm run typecheck

# cre
cd cre && cp .env.example .env   # fill CRE_ETH_PRIVATE_KEY (only to broadcast) and YOUTUBE_API_KEY_CRE (only for a real YouTube read)
npm install && npm run typecheck && npm test
# real CRE simulation on a local anvil fork of Arc with a mock backend and a fake YouTube API (needs cre CLI + `cre login`, bun, foundry):
bash scripts/simulate-local.sh
# live backend + real YouTube, no broadcast (needs a real YOUTUBE_API_KEY_CRE; the manifest is empty until an approval day has finished, so it can be a no-op):
npm run simulate:live
# real Arc testnet, after cre/scripts/arc-deploy.sh (see docs/CRE_DEPLOY.md):
bash scripts/simulate-arc-real.sh <youtube video id> <youtube channel id>
```

## Environment variables

| Var | Where | Purpose | Default / if missing |
| --- | --- | --- | --- |
| `DATABASE_URL` | web | Prisma DB (Postgres) | required; `npm run db:local` prints a local URL |
| `SESSION_SECRET` | web | Cookie HMAC secret | required in production |
| `ADMIN_WALLETS` | web | Comma list of wallets that become ADMIN | placeholder in example |
| `ALLOW_WALLET_HEADER` | web | Listed in `.env.example` but not read by the app code. The dev `x-wallet` header is accepted whenever `NODE_ENV` is not production | n/a |
| `CRON_SECRET` | web | Lets cron/CRE call `POST /api/snapshots/refresh` | empty |
| `LLM_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | web | AI verifier + campaign writer + assistants. Free Gemini key: https://aistudio.google.com/apikey (default model `gemini-3.5-flash-lite`). Auto: only one key -> that provider; both -> anthropic | neither set: 503 NOT_CONFIGURED |
| `LLM_RPM_LIMIT`, `LLM_MAX_CONCURRENCY`, `LLM_MAX_RETRIES`, `LLM_CACHE_TTL_SECONDS`, `LLM_MAX_INPUT_CHARS` | web | Free-tier protection (throttle, queue, backoff, cache, truncation); on quota exhaustion the UI shows "AI quota exceeded, try again" and the verifier sends clips to human review | sensible defaults |
| `VERIFIER_CONFIDENCE_THRESHOLD` | web | Below this, verdict is NEEDS_HUMAN | `0.75` |
| `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID`, `WORLD_ID_SIGNING_KEY`, `WORLD_ID_ACTION`, `WORLD_ID_ENVIRONMENT` | web | World ID (IDKit v4) verify. The Portal also needs the actions `clippo-approve-campaign` and `clippo-approve-split` | missing: 503 NOT_CONFIGURED; action `clippo-creator-signup`; environment `production` |
| `WORLD_AUTH_CLIENT_ID`, `WORLD_AUTH_CLIENT_SECRET`, `WORLD_AUTH_REDIRECT_URI`, `WORLD_AUTH_ISSUER`, `WORLD_AUTH_TOKEN_AUTH`, `WORLD_AUTH_ACR`, `WORLD_AUTH_POLICY` | web | World Agent Pass step-up (OIDC at auth.world.org) that gates releasing an agent-proposed split. The redirect URI is `https://<host>/api/auth/world/callback` (exact HTTPS URL). The first three are required | missing: step-up routes answer 503 NOT_CONFIGURED; issuer defaults to `https://auth.world.org`, token auth to `basic`, policy to `agent-required` |
| `AGENT_PASS_PRIVATE_KEY`, `AGENT_PASS_DEMO`, `WORLD_CHAIN_RPC_URL` | web | The agent's wallet and AgentBook lookup (attributes the proposal to a registered agent). `AGENT_PASS_DEMO=1` uses a local wallet and a fake human, labelled demo | missing: not configured |
| `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, `ARC_RPC_URL`, `ARC_CHAIN_ID`, `USDC_ADDRESS` | web | Chain mode. Setting `ESCROW_ADDRESS` turns it on. `ESCROW_DEPLOY_BLOCK` is required with the new escrow | missing: money-moving calls refuse with 503 |
| `HUMAN_ATTESTOR_PRIVATE_KEY` | web | Clippo's backend wallet. Signs World ID approvals, links wallets on-chain (`registerHuman`), sends `claimFor`, pays gas. Its address is fixed in the escrow at deploy. Required for the core loop | required with the escrow |
| `UPDATER_PRIVATE_KEY` | web | Optional. Only the profile and referral modules use it | optional |
| `DEPLOYER_PRIVATE_KEY` | `scripts/deploy-arc.mjs` | Deployer key (testnet only) for that script. Never set it on Vercel | required by the script |
| `YOUTUBE_API_KEY` | web | YouTube Data API v3 | missing: 503 NOT_CONFIGURED |
| `CRE_ETH_PRIVATE_KEY` | cre | Key for `simulate --broadcast` (testnet only). `scripts/simulate-local.sh` uses the public anvil key | empty |
| `YOUTUBE_API_KEY_CRE` | cre | YouTube Data API key the workflow nodes read as the CRE secret `YOUTUBE_API_KEY` (see `cre/secrets.yaml`). Never commit it | empty |
| `PRIVATE_KEY` (or `DEPLOYER_PRIVATE_KEY`) | contracts (shell) | Deploy key, passed to forge `--private-key` (not read by Deploy.s.sol); a keystore `--account` works too | key required |
| `ARC_RPC_URL` | `scripts/deploy-arc.mjs` | RPC for the deploy helper | `https://rpc.testnet.arc.io` |
| `ADMIN_ADDRESS`, `FORWARDER_ADDRESS`, `UPDATER_ADDRESS`, `HUMAN_ATTESTOR_ADDRESS` | contracts (shell) | Owner and admin, CRE forwarder, profile updater, World ID attestor (cannot be changed after deploy) | required; a missing one reverts |
| `EXPECTED_WORKFLOW_OWNER` | contracts (shell) | CRE workflow owner the receiver accepts | required unless `INSECURE_SKIP_WORKFLOW_CHECK=true` (simulation only) |
| `USDC_ADDRESS` | contracts (shell) | USDC token | Arc testnet USDC `0x3600...0000`. `Deploy.s.sol` never deploys MockUSDC (`DeployMock.s.sol` does, for anvil) |
| `TREASURY_ADDRESS`, `RECORDER_ADDRESS`, `GUARDIAN_ADDRESS` | contracts (shell) | Fee sink, referral recorder, guardian | `ADMIN_ADDRESS` / `UPDATER_ADDRESS` / `ADMIN_ADDRESS` |
| `CAMPAIGNER_FEE_BPS`, `CREATOR_FEE_BPS` | contracts (shell) | Fees, max 50 bps each | 25 / 25 |
| `RETENTION_SECONDS`, `GRACE_SECONDS`, `HIGH_VALUE_THRESHOLD` | contracts (shell) | Defaults snapshotted by new campaigns | 604800 / 86400 / 1000000000 |

## Honest status

As of Sat 2026-11-07, after the work in `docs/BUILD_LOG.md` (entries 17 to 20: the real Arc deployment, the first CRE report on real Arc, the Vercel deployment). "Verified" below means exercised in this repo (unit/integration tests against stubbed HTTP, or by running the app or tools locally), or read back from Arc testnet or the deployed site where a row says so. Nothing here was exercised against live third-party credentials unless stated.

| Area | Status |
| --- | --- |
| Escrow contracts (3 modes, fees, reject refund, deadlines) | `ClippoEscrow` in HEAD is the enforcing escrow (`498f649`): PerView credits and PoolShare weights only from the one-time report adapter (CRE), HumanSplit needs a fresh World ID approval signed by `humanAttestor`, only wallets linked to a unique human can be credited, per-campaign retention and grace, on-chain disputes, `reclaimUnapproved`, `claimFor`. There are 114 Foundry test functions in `contracts/test`; `docs/BUILD_LOG.md` records them passing (not re-run for this edit). **Deployed on real Arc testnet in simulation mode** (BUILD_LOG 17, read back from the chain): escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` (deploy block 71094327), receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd`. The deploy script created and approved campaign 1 ($10 per 1,000 views, 5 USDC pool) with the plain `approveCampaign(id)`, and linked the demo creator wallet with an attestor-signed `registerHuman` (a stand-in for the World check). Not proven on real Arc: approvals with a signed World ID `proof` (`approveCampaign(id, proof)`, `approveSplit`), disputes, `claimFor`, the retention window. Two escrows from the OLD design (before enforcement) also exist on Arc testnet: `0xd8453c22996bea11598a3dbf05112675b945c39c` (what the old clippo-six site pointed at) and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310` (cited in `docs/SUBMISSION_ARC.md`); neither has the HEAD code. No broadcast record is committed (`contracts/broadcast` is absent); `contracts/.gitignore` lets only `broadcast/Deploy.s.sol/5042002/run-latest.json` through, so the record of a real deploy can be committed. |
| `ClippoReportReceiver` (IReceiver adapter) | Real code, tested with a stand-in forwarder. In HEAD the owner can freeze all settings with `lockConfig`, and in simulation mode, when a workflow owner is set, only transactions whose `tx.origin` is that owner can report. Ran on an anvil fork of Arc and on real Arc through Arc's MockKeystoneForwarder (see CRE row). On real Arc it is NOT locked: simulation forwarder, our simulation wallet as workflow owner, `workflowCheckSkipped` true. Not tested against a live KeystoneForwarder. |
| CRE workflow | Workflow v2: the nodes read YouTube themselves. Clippo only says WHICH clips to check (`GET /api/snapshots/clips`); a clip counts only if the channel bio holds `clippo:<wallet>`; the nodes agree on the median view count. It simulates: `bash scripts/simulate-local.sh` (CLI v1.39.0, local anvil fork of Arc, mock backend, fake YouTube API) kept 3 of 5 clips and credited creators on the fork; a real YouTube read ran on a local fork; and `cre workflow simulate --broadcast` on **real Arc testnet** (`docs/tracks/cre-simulation-real-arc.txt`) read the real YouTube API ("kept 1/1 clips", 1 report, 0 failed rows) and delivered tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409` to the escrow; `cast call` read back `reportedViews` 3 and `credited` 30000 units (0.03 USDC). Not proven: it is a simulation. One CRE node, and the report was sent by our own simulation wallet through Arc's Chainlink TEST forwarder, so no Chainlink nodes signed it and no multi-node consensus ran. The manifest for that run came from a local mock backend. No workflow is deployed (deploy needs CRE Early Access). `config.production.json` has the real receiver and `backendUrl` `https://clippo-cre.vercel.app`. `cd cre && npm test` and `npm run typecheck` pass (not re-run after the merge with main). |
| Backend API + Prisma (Postgres) | Real. `npm test` runs the API against a throwaway Postgres (`docs/BUILD_LOG.md` records 311 web tests passing, 1 skipped, at `0c3e401`; not re-run after the merge with main). Session auth is SIWE in production; the unsigned dev sign-in only works outside production. |
| AI verifier / campaign writer | Real Claude or Gemini calls (`LLM_PROVIDER`; Gemini runs on the free AI Studio key, limits in docs/RUNBOOK.md; AI video generation is paid-tier only); without a key the endpoints answer 503 `NOT_CONFIGURED` (no keyword mock). Exercised against stubbed responses only. |
| World ID (IDKit) | IDKit widget + backend `rp-signature` / `verify` (v4) are wired. After a verify, the backend links the wallet to the human on-chain (`registerHuman`, signed by `HUMAN_ATTESTOR_PRIVATE_KEY`). Needs `WORLD_ID_*`; not run against the live Developer Portal, and the on-chain link has not run on real Arc. World ID proofs for the prize are mocked fake identities, not for production. |
| World Agent Pass | The official product is the OIDC service at `auth.world.org`. Releasing an agent-proposed split goes through a World step-up (`web/src/lib/worldauth/*`; routes `POST /api/campaigns/:id/stepup/start`, `GET /api/auth/world/callback`, `GET /api/stepup/:attemptId`; the approve calls take `stepUpAttemptId`). The backend does the code exchange, validates the ID token, binds the result to the exact split, and only then records the approval and signs the proof the escrow checks. Needs `WORLD_AUTH_*` (without them the step-up routes answer 503 `NOT_CONFIGURED`). Implemented in code and covered by tests with doubles only: it has not run against the real issuer, because the auth.world.org client registration is blocked (see `docs/tracks/WORLD_AGENT_PASS.md` and `docs/WORLD_USER_TODO.md`). The AgentKit / AgentBook code (`agent.ts`, `identity.ts`) is NOT the official Agent Pass; it only attributes a proposal to a registered agent wallet, and no live AgentBook lookup was run. |
| Web to escrow (fund / claim / close) | Wallet transactions through viem when `ESCROW_ADDRESS` is set, then server-side receipt verification. Claims are sent by Clippo's wallet through `claimFor` (it pays gas; the money can only reach the creator), or the creator can claim from their own wallet and report the tx. Needs `HUMAN_ATTESTOR_PRIVATE_KEY`. Hire funding no longer takes a client-supplied on-chain id. Without `ESCROW_ADDRESS` money-moving calls refuse with 503. The deployed site reads the enforcing escrow on real Arc (`/api/chain/config`, see Backend to chain), but fund, approve and claim from a user wallet have not been run on it. The only fake tx hashes are behind the explicit `NEXT_PUBLIC_DEMO=1` flag (`hooks.ts` `demoTx`); do not record with it on. |
| Backend to chain | `src/lib/chain`: Clippo's wallet signs World ID approvals, links wallets and sends `claimFor` (`clippo-wallet.ts`); the indexer reads escrow events (`POST /api/chain/sync`, `POST /api/chain/report`). Approve, reject, close, dispute and split transactions come from the user's wallet in the browser. The indexer ran against the enforcing escrow on real Arc from the deployed site (`POST /api/chain/sync` indexed 12 events and applied 2, BUILD_LOG 20). The signing paths (World ID approvals, `registerHuman` from the app, `claimFor`) have not run on real Arc. `web/scripts/e2e-chain.mjs` was not updated for the new contract. |
| Platforms | YouTube (Data API), X (API v2), Instagram (creator OAuth) are real clients, each needing its key; tested against stubs only, except YouTube: the deployed test site has a `YOUTUBE_API_KEY`, and `POST /api/snapshots/refresh` read one real clip's view count from the YouTube API (BUILD_LOG 20). |
| Views to chain | The CRE workflow reads the clip manifest `GET /api/snapshots/clips` (`{day, hash, clips}`: numeric on-chain campaign id, creator, video id, channel id) and the view counts from YouTube itself, not Clippo's own counts. The app shows Confirmed views (what a CRE report put on-chain, with a proof link to the transaction and a Chainlink badge) next to Pending views (Clippo's own count, not yet confirmed). Read from the public site (BUILD_LOG 20): the seeded campaign shows "Confirmed views, all creators: 3", the Chainlink badge and the proof link for the real-Arc CRE transaction. Not proven: the real-Arc CRE run used a manifest from a local mock backend, because the deployed manifest lists a clip only after its approval day has ended (UTC) and is empty until then; the creator's own `/ledger` was not opened on the deployed site. The records behind it (user, channel, campaign, clip, approval) are seeded and labelled; the views, the credit and the proof are real. |
| UI | Paper and Night themes, mobile-first. `npm run check:overflow` (no horizontal overflow across routes x widths x themes) and the screenshot script `web/scripts/shoot-senior.mjs` (its output folder `design/shots/senior` is not in the repo). With `NEXT_PUBLIC_DEMO=1` and no API the UI falls back to `src/ui-mocks` and shows a demo flag. Creator ledger, brand desk and clip detail show Confirmed and Pending views; the channel screens show the wallet-bound bio code `clippo:<wallet>`. |
| Seed data | `web/scripts/seed-demo.mjs` writes clearly labelled `[SEED]` rows through Prisma (campaigns, verified creators, verdicts incl. approve/reject/needs-human, an appeal, view snapshots, a hire workspace). Chain-dependent rows only with `ESCROW_ADDRESS` or the local-only `--ui-only` flag; no tx hashes or payouts are invented. `web/scripts/seed-cre-demo.mjs` seeds the labelled `[SEED]` records the deployed CRE demo needs (creator, channel, a campaign linked to on-chain campaign 1, one approved clip); it does not seed views, credits or the proof link, and it is a dry run unless `--confirm` is given. |
| Arc Studio | Not used yet. `ClippoEscrow.sol` was written and tested in Foundry, not in Arc Studio. No Studio work is recorded in this repo. Every Arc prize requires a Studio project and URL: `docs/SUBMISSION_CHECKLIST.md` still has a placeholder, and `docs/SUBMISSION_ARC.md` has a Studio URL added on main (`943779e`) that is not verified here. |
| Demo video | Not recorded. ETHGlobal rule: 2 to 4 minutes, anything over 4:00 is rejected, 720p or better, no AI voiceover, not sped up. |
