# Clippo

Clippo is a clipping-and-bounty marketplace. Brands fund a USDC pool, World-ID-verified creators post clips, an AI verifier checks each clip against the brand's story, and payouts settle on-chain (Arc) with views delivered by a Chainlink CRE workflow. Creators claim their own money; unspent funds return to the brand. An AI agent proposes, but never moves money alone. This describes the code in HEAD. The live site (clippo-six.vercel.app) still runs the older build.

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

```bash
# contracts
cd contracts && forge build && forge test

# web
cd web && cp .env.example .env.local && npm install
npx prisma migrate deploy
npm run dev            # http://localhost:3000, (run `npm run doctor` first: every integration is real)
npm test && npm run typecheck

# cre
cd cre && npm install && npm run typecheck && npm test
# real CRE simulation on a local anvil fork of Arc with a mock feed (needs cre CLI + `cre login`, bun, foundry):
bash scripts/simulate-local.sh
# live feed, no broadcast (the live feed is empty today, so this is a no-op):
npm run simulate:live
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
| `WORLD_IDP_ISSUER`, `WORLD_IDP_CLIENT_ID`, `WORLD_IDP_CLIENT_SECRET`, `WORLD_IDP_REDIRECT_URI`, `WORLD_IDP_TOKEN_AUTH_METHOD`, `WORLD_IDP_ACR_VALUES` | web | World Agent Pass step-up (OIDC at auth.world.org) that gates the agent's split | missing: step-up routes answer 503 NOT_CONFIGURED; issuer defaults to `https://auth.world.org` |
| `AGENT_PASS_PRIVATE_KEY`, `AGENT_PASS_DEMO`, `WORLD_CHAIN_RPC_URL` | web | The agent's wallet and AgentBook lookup (attributes the proposal to a registered agent). `AGENT_PASS_DEMO=1` uses a local wallet and a fake human, labelled demo | missing: not configured |
| `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, `ARC_RPC_URL`, `ARC_CHAIN_ID`, `USDC_ADDRESS` | web | Chain mode. Setting `ESCROW_ADDRESS` turns it on. `ESCROW_DEPLOY_BLOCK` is required with the new escrow | missing: money-moving calls refuse with 503 |
| `HUMAN_ATTESTOR_PRIVATE_KEY` | web | Clippo's backend wallet. Signs World ID approvals, links wallets on-chain (`registerHuman`), sends `claimFor`, pays gas. Its address is fixed in the escrow at deploy. Required for the core loop | required with the escrow |
| `UPDATER_PRIVATE_KEY` | web | Optional. Only the profile and referral modules use it | optional |
| `DEPLOYER_PRIVATE_KEY` | `scripts/deploy-arc.mjs` | Deployer key (testnet only) for that script. Never set it on Vercel | required by the script |
| `YOUTUBE_API_KEY` | web | YouTube Data API v3 | missing: 503 NOT_CONFIGURED |
| `CRE_ETH_PRIVATE_KEY` | cre | Key for `simulate --broadcast` (testnet only). `scripts/simulate-local.sh` uses the public anvil key | empty |
| `PRIVATE_KEY` | contracts (shell) | Deployer key, only if you pass `--private-key $PRIVATE_KEY` (a keystore `--account` works too) | optional |
| `ARC_RPC_URL` | `scripts/deploy-arc.mjs` | RPC for the deploy helper | `https://rpc.testnet.arc.io` |
| `ADMIN_ADDRESS`, `FORWARDER_ADDRESS`, `UPDATER_ADDRESS`, `HUMAN_ATTESTOR_ADDRESS` | contracts (shell) | Owner and admin, CRE forwarder, profile updater, World ID attestor (cannot be changed after deploy) | required; a missing one reverts |
| `EXPECTED_WORKFLOW_OWNER` | contracts (shell) | CRE workflow owner the receiver accepts | required unless `INSECURE_SKIP_WORKFLOW_CHECK=true` (simulation only) |
| `USDC_ADDRESS` | contracts (shell) | USDC token | Arc testnet USDC `0x3600...0000`. `Deploy.s.sol` never deploys MockUSDC (`DeployMock.s.sol` does, for anvil) |
| `TREASURY_ADDRESS` | contracts (shell) | Fee sink | `ADMIN_ADDRESS` |
| `CAMPAIGNER_FEE_BPS`, `CREATOR_FEE_BPS` | contracts (shell) | Fees, max 50 bps each | 25 / 25 |
| `RETENTION_SECONDS`, `GRACE_SECONDS`, `HIGH_VALUE_THRESHOLD` | contracts (shell) | Defaults snapshotted by new campaigns | 604800 / 86400 / 1000000000 |

## Honest status

As of Fri 2026-11-06 evening IST, after commits `498f649` to `19205ba` (details in `docs/BUILD_LOG.md`). "Verified" below means exercised in this repo (unit/integration tests against stubbed HTTP, or by running the app or tools locally). Nothing from the new work has run on real Arc yet. The live site still runs the old build and has no `YOUTUBE_API_KEY`. Nothing here was exercised against live third-party credentials unless stated.

| Area | Status |
| --- | --- |
| Escrow contracts (3 modes, fees, reject refund, deadlines) | `ClippoEscrow` in HEAD is the enforcing escrow (`498f649`): PerView credits and PoolShare weights only from the one-time report adapter (CRE), HumanSplit needs a fresh World ID approval signed by `humanAttestor`, only wallets linked to a unique human can be credited, per-campaign retention and grace, on-chain disputes, `reclaimUnapproved`, `claimFor`. There are 114 Foundry test functions in `contracts/test`; `docs/BUILD_LOG.md` records them passing (not re-run for this edit). **Not deployed anywhere.** Two escrows from the OLD design (before enforcement) exist on Arc testnet: the live site's `/api/chain/config` points to `0xd8453c22996bea11598a3dbf05112675b945c39c`, and `docs/SUBMISSION_ARC.md` cites `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`. Neither has the HEAD code. No broadcast record is committed (`contracts/broadcast` is absent). |
| `ClippoReportReceiver` (IReceiver adapter) | Real code, tested with a stand-in forwarder. In HEAD the owner can freeze all settings with `lockConfig`, and in simulation mode, when a workflow owner is set, only transactions whose `tx.origin` is that owner can report. Ran on an anvil fork of Arc through Arc's MockKeystoneForwarder (see CRE row). Not tested against a live KeystoneForwarder. |
| CRE workflow | Simulates. `cre workflow simulate` (CLI v1.39.0) ran against the live feed (exit 0, empty no-op, no broadcast), and `--broadcast` on a local anvil FORK of Arc credited creators in the escrow (output in `docs/tracks/cre-simulation-output.txt`). Nothing was broadcast to real Arc, no workflow is deployed, and the simulator is single-node, so real consensus was not exercised. `config.production.json` still has a zero receiver until deploy; `config.staging.json` points at a local fork address. The workflow does not read YouTube directly; it reads Clippo's frozen snapshot feed. `cd cre && npm test` (9 tests) and `npm run typecheck` pass. |
| Backend API + Prisma (Postgres) | Real. `npm test` runs the API against a throwaway Postgres (`docs/BUILD_LOG.md` records 304 web tests passing at `19205ba`; not re-run for this edit). Session auth is SIWE in production; the unsigned dev sign-in only works outside production. |
| AI verifier / campaign writer | Real Claude or Gemini calls (`LLM_PROVIDER`; Gemini runs on the free AI Studio key, limits in docs/RUNBOOK.md; AI video generation is paid-tier only); without a key the endpoints answer 503 `NOT_CONFIGURED` (no keyword mock). Exercised against stubbed responses only. |
| World ID (IDKit) | IDKit widget + backend `rp-signature` / `verify` (v4) are wired. After a verify, the backend links the wallet to the human on-chain (`registerHuman`, signed by `HUMAN_ATTESTOR_PRIVATE_KEY`). Needs `WORLD_ID_*`; not run against the live Developer Portal, and the on-chain link has not run on real Arc. World ID proofs for the prize are mocked fake identities, not for production. |
| World Agent Pass | The official product is the OIDC service at `auth.world.org`. Approving an agent's split now needs a fresh OIDC step-up there (`19205ba`: `web/src/lib/agentpass/stepup.ts`, routes under `web/src/app/api/agentpass/stepup/`); the backend validates the ID token, issues a one-time token bound to the exact split, and signs the approval the escrow checks. Never run against the real issuer or in a browser; tested only against a local fake issuer. The older AgentKit / AgentBook code (`agent.ts`, `identity.ts`) is NOT the official Agent Pass; it only attributes a proposal to a registered agent wallet, and no live AgentBook lookup was run. |
| Web to escrow (fund / claim / close) | Wallet transactions through viem when `ESCROW_ADDRESS` is set, then server-side receipt verification. Claims are sent by Clippo's wallet through `claimFor` (it pays gas; the money can only reach the creator), or the creator can claim from their own wallet and report the tx. Needs `HUMAN_ATTESTOR_PRIVATE_KEY`. Hire funding no longer takes a client-supplied on-chain id. Without `ESCROW_ADDRESS` money-moving calls refuse with 503. Not run against a deployed enforcing escrow. The only fake tx hashes are behind the explicit `NEXT_PUBLIC_DEMO=1` flag (`hooks.ts` `demoTx`); do not record with it on. |
| Backend to chain | `src/lib/chain`: Clippo's wallet signs World ID approvals, links wallets and sends `claimFor` (`clippo-wallet.ts`); the indexer reads escrow events (`POST /api/chain/sync`, `POST /api/chain/report`). Approve, reject, close, dispute and split transactions come from the user's wallet in the browser. Not exercised on a live chain. `web/scripts/e2e-chain.mjs` was not updated for the new contract. |
| Platforms | YouTube (Data API), X (API v2), Instagram (creator OAuth) are real clients, each needing its key; tested against stubs only. The live site has no `YOUTUBE_API_KEY`. |
| Views to chain | The CRE workflow reads the frozen feed `GET /api/snapshots/daily` (`{day, hash, rows}`), not `/api/snapshots/latest`. Rows carry the numeric on-chain campaign id (shared fixture test). The live feed is empty today. A live CRE broadcast on real Arc has not run. |
| UI | Paper and Night themes, mobile-first. `npm run check:overflow` (no horizontal overflow across routes x widths x themes) and the screenshot script `web/scripts/shoot-senior.mjs` (its output folder `design/shots/senior` is not in the repo). With `NEXT_PUBLIC_DEMO=1` and no API the UI falls back to `src/ui-mocks` and shows a demo flag. |
| Seed data | `web/scripts/seed-demo.mjs` writes clearly labelled `[SEED]` rows through Prisma (campaigns, verified creators, verdicts incl. approve/reject/needs-human, an appeal, view snapshots, a hire workspace). Chain-dependent rows only with `ESCROW_ADDRESS` or the local-only `--ui-only` flag; no tx hashes or payouts are invented. |
| Arc Studio | Not used yet. `ClippoEscrow.sol` was written and tested in Foundry, not in Arc Studio. No Studio project exists and no project URL (every Arc prize requires one); the URL is a placeholder in `docs/SUBMISSION_CHECKLIST.md` and `docs/SUBMISSION_ARC.md`. |
| Demo video | Not recorded. ETHGlobal rule: 2 to 4 minutes, anything over 4:00 is rejected, 720p or better, no AI voiceover, not sped up. |
