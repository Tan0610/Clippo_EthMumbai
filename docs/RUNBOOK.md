# Runbook

Commands are from `contracts/README.md`, `cre/README.md` and `web/API.md`. Items marked UNVERIFIED were not executed when this was written. There are no mock modes for the main integrations: they answer 503 `NOT_CONFIGURED` ("not configured: set X") until their credentials are set. The one demo path is `AGENT_PASS_DEMO=1` (a local agent wallet counted as a fake human). World ID with `WORLD_ID_ENVIRONMENT=staging` uses the simulator, which gives fake identities. Run `cd web && npm run doctor` at any time to see what is missing and to ping every service.

## 1. Deploy contracts to Arc testnet

Follow `contracts/README.md` (exact commands, env table, post-deploy checklist). In short:

```bash
cd contracts && forge build && forge test
export ADMIN_ADDRESS=0x... FORWARDER_ADDRESS=0x... UPDATER_ADDRESS=0x... HUMAN_ATTESTOR_ADDRESS=0x... EXPECTED_WORKFLOW_OWNER=0x...   # all required (EXPECTED_WORKFLOW_OWNER can be replaced by INSECURE_SKIP_WORKFLOW_CHECK=true, simulation only)
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.network --broadcast --private-key $PRIVATE_KEY
cd ../web && npm run abi:sync
```

`HUMAN_ATTESTOR_ADDRESS` is the address of the backend key you will set as `HUMAN_ATTESTOR_PRIVATE_KEY`. It is fixed in the escrow at deploy and cannot be changed later; the script reverts without it. The script prints `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, `REFERRAL_ADDRESS`, `PROFILE_ADDRESS`, `REPORT_RECEIVER_ADDRESS`, `HUMAN_ATTESTOR_ADDRESS`, `EXPECTED_WORKFLOW_OWNER`, `USDC_ADDRESS`: paste the ones the app reads into `web/.env.local`. `DEPLOYER_PRIVATE_KEY` is read only by `scripts/deploy-arc.mjs` on your machine: never set it on Vercel. The CRE forwarder address for Arc testnet must be taken from the Chainlink CRE docs (UNVERIFIED, not invented here). Arc gas is USDC: use the Circle faucet (https://faucet.circle.com).

Status: the new enforcing escrow (commit 498f649: World ID and CRE enforced in the contract, disputes, `claimFor`, `humanAttestor`) is NOT deployed anywhere yet. The live site (clippo-six.vercel.app) still runs the old build, and `/api/chain/config` there points at the old-design escrow `0xd8453c22996bea11598a3dbf05112675b945c39c`. Another old-design escrow, `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`, is cited in `docs/SUBMISSION_ARC.md`. Neither has the new rules. `scripts/deploy-arc.mjs --deploy` does not check `HUMAN_ATTESTOR_ADDRESS`; forge fails without it.

## 2. Environment (complete list in `web/.env.example`)

1. **Postgres (Neon).** Create a project, copy the pooled connection string into `DATABASE_URL`, then `cd web && npx prisma migrate deploy`. No Postgres at hand for local dev: `npm run db:local` (PGlite on :5433) and use the URL printed in `.env.example`.
2. **Core:** `SESSION_SECRET`, `ADMIN_WALLETS`, `CRON_SECRET`.
3. **Chain:** `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, `HUMAN_ATTESTOR_PRIVATE_KEY` (required; Clippo's backend wallet, its address must equal the escrow's `humanAttestor`; it signs World ID approvals, links wallets and sends `claimFor`, so it needs testnet USDC for gas), optional `CAMPAIGN_DEADLINE_SECONDS`, `PROFILE_ADDRESS`, `REFERRAL_ADDRESS`, `REPORT_RECEIVER_ADDRESS` (informational), `UPDATER_PRIVATE_KEY` (optional: only for the optional profile/referral modules; testnet-only key registered with `setUpdater`; not needed for the core loop).
4. **World ID 4.0:** Developer Portal -> create the app, enable World ID 4.0 (RP registration), keep `app_id`, `rp_id`, `signing_key`; create actions `clippo-creator-signup`, `clippo-approve-campaign`, `clippo-approve-split` (unlimited verifications for the two approval actions). Set `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID`, `WORLD_ID_SIGNING_KEY` (use `WORLD_ID_ENVIRONMENT=staging` with the simulator). Agent split step-up (OIDC at auth.world.org): register a client in the World IdP portal and set `WORLD_IDP_CLIENT_ID`, `WORLD_IDP_CLIENT_SECRET`, `WORLD_IDP_REDIRECT_URI` (`<site>/api/agentpass/stepup/callback`, HTTPS), optional `WORLD_IDP_ISSUER`, `WORLD_IDP_TOKEN_AUTH_METHOD`, `WORLD_IDP_ACR_VALUES`. Not proven: this has never been run against the real issuer or in a browser. Agent wallet: `AGENT_PASS_DEMO=1` (fake human, demo only) or `AGENT_PASS_PRIVATE_KEY` registered with AgentBook. AgentKit/AgentBook is not the official Agent Pass.
5. **AI (text: verifier, campaign writer, assistants):** either provider, switch with `LLM_PROVIDER=gemini|anthropic`.
   - **Free option, no credit card:** create a key at <https://aistudio.google.com/apikey> and set `GEMINI_API_KEY` (optionally `GEMINI_TEXT_MODEL`, default `gemini-3.5-flash-lite`). With only this key set, Gemini is selected automatically.
   - **Claude:** `ANTHROPIC_API_KEY` (`ANTHROPIC_MODEL`). If both keys are set and `LLM_PROVIDER` is empty, Anthropic is used. If neither is set the AI endpoints answer 503 `NOT_CONFIGURED` naming both options.
   - **Free-tier limits** ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [pricing](https://ai.google.dev/gemini-api/docs/pricing)): limits are per project (not per key), measured in requests/min, input tokens/min and requests/day; RPD resets at midnight Pacific. Google no longer prints per-model numbers in the docs: read yours at <https://aistudio.google.com/rate-limit>; preview models are stricter. Free-tier prompts and responses may be used by Google to improve its products (do not send secrets/PII; for end-user products in the EEA/UK/CH a paid key is required). The app therefore queues (`LLM_MAX_CONCURRENCY`, default 2), throttles (`LLM_RPM_LIMIT`, default 10/min on Gemini), retries 429/5xx with exponential backoff and Retry-After (`LLM_MAX_RETRIES`), caches identical requests (`LLM_CACHE_TTL_SECONDS`) and truncates long transcripts (`LLM_MAX_INPUT_CHARS`). When quota is exhausted the UI gets `429 AI_QUOTA_EXCEEDED` ("AI quota exceeded, try again"); the verifier never approves on a provider/quota error: the clip goes to NEEDS_HUMAN.
6. **Platforms:** `YOUTUBE_API_KEY` (Google Cloud, YouTube Data API v3); `X_BEARER_TOKEN` (X developer app; tier must allow reads); Instagram: Meta app with "Instagram API with Instagram Login", add `INSTAGRAM_REDIRECT_URI = https://<site>/api/channels/instagram/oauth/callback` and set `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` (creators must be Business/Creator accounts; Meta app review is required for non-tester accounts).
7. **AI video:** `GEMINI_API_KEY` (Google AI Studio); model `GEMINI_VIDEO_MODEL` (default `gemini-omni-1.1-flash`). Per the [pricing page](https://ai.google.dev/gemini-api/docs/pricing), `gemini-omni-1.1-flash` is "Not available" on the Free tier (paid tier only, about $0.10 per second of 720p video): the free key works for text, but video generation needs billing enabled on the same project (prepay at least $5 in AI Studio). Without billing, video jobs fail with the provider error; everything else keeps working.
8. **On-ramp:** Transak partner dashboard (staging) -> `TRANSAK_API_KEY`, `TRANSAK_API_SECRET`, whitelist the server IP, register `https://<site>/api/onramp/webhook`.
9. **Storage:** `STORAGE_DIR` on a persistent disk (local disk is ephemeral on serverless hosts); upload cap `SOURCE_MAX_BYTES` (default 500 MB).
10. `cre/.env`: `CRE_ETH_PRIVATE_KEY` (testnet only). `cre/workflows/clippo-settlement/config.staging.json`: `backendUrl`, `evm.receiverAddress`, `chainSelectorName` `arc-testnet`. `cre/project.yaml`: RPC per target (`staging-settings` is a local anvil fork at 127.0.0.1:8545, `production-settings` is Arc testnet); it has no owner field. `scripts/deploy-arc.mjs` writes `receiverAddress` only into `config.staging.json` (the local anvil fork). `config.production.json` still has a zero `receiverAddress`: edit it by hand with the real receiver before any deployed run.

## 3. Run CRE simulate

```bash
cd cre && npm install && npm run typecheck && npm test   # npm test = snapshot contract test
cre login
bash scripts/simulate-local.sh  # real CLI against a local anvil fork of Arc + mock backend (needs anvil, bun, cre CLI)
npm run simulate:live           # production-settings: dry run, no broadcast; currently an empty no-op
```

`npm run simulate` and `npm run simulate:broadcast` use `staging-settings`, which points at `http://127.0.0.1:8545` (anvil fork) and a backend on `127.0.0.1:8787`, so start `scripts/local-chain.sh` and `scripts/mock-backend.mjs` first (or use `simulate-local.sh`). They never touch real Arc.

Prerequisites: `escrow.setReportAdapter(receiver)` (done by the deploy script) and the receiver's forwarder. The workflow reads the frozen feed `/api/snapshots/daily` (`feedPath`), not `/api/snapshots/latest`. Both emit the numeric on-chain `campaignId` (campaigns without an `onchainId` are skipped), and `cre/.../snapshot.ts` normalises that envelope; the shared fixture is `cre/workflows/clippo-settlement/fixtures/snapshot-feed.json`. The escrow now credits only wallets linked to a unique human, so unlinked creators fail per row (`ItemFailed`, `NotHuman`).

What has run (commit 6f74f7b, `docs/tracks/CRE.md`): a live-feed run exits 0 as an empty no-op; a local `--broadcast` run on an anvil fork credited creators. Not proven: nothing was broadcast to real Arc, no workflow is deployed, the simulator is single-node (no real consensus), and `config.production.json` still has a zero `receiverAddress` (set it by hand, the deploy script does not touch it; the workflow refuses a zero receiver once rows exist). CRE does not read YouTube directly; it reads Clippo's snapshot feed.

## 4. Run the app

```bash
cd web && npm install && npx prisma migrate deploy && npm run doctor && npm run dev
```

Tests: `npm test` (spins up its own throwaway Postgres; no setup). Production build: `npm run build`.

## 5. Seed / first run

`web/scripts/seed-demo.mjs` writes clearly labelled `[SEED]` rows (see its header; chain-dependent rows only with `ESCROW_ADDRESS`, no invented tx hashes). Otherwise sign in with a real wallet (SIWE); in development only, `x-wallet` / unsigned sign-in works for quick checks.

1. Admin signs in (`ADMIN_WALLETS`). Campaigner and creators sign in.
2. Creator: World ID check through IDKit (`POST /api/worldid/rp-signature`, then `POST /api/worldid/verify` with the IDKit result). The backend links the verified wallet to its human on-chain with the Clippo wallet; the escrow only credits linked wallets.
3. Creator: `POST /api/channels`, put the code in the bio, `POST /api/channels/:id/verify` (Instagram: `POST /api/channels/instagram/oauth/start`).
4. Campaigner: wizard, `POST /api/campaigns`, fund on-chain (buy USDC with `POST /api/onramp/session`, or the Circle faucet), then `POST /api/campaigns/:id/fund {txHash}`.
5. Admin: `POST /api/campaigns/:id/attest` with a fresh World ID proof returns a signed `proof`; call `approveCampaign(id, proof)` on-chain (the plain `approveCampaign(id)` reverts for high-value campaigns), then `POST /api/campaigns/:id/approve`.
6. Creator submits real clip links; cron/admin `POST /api/snapshots/refresh`; check `GET /api/snapshots/latest`. Payouts: `POST /api/payouts/:id/claim` makes the Clippo wallet call `claimFor` (a creator may also claim from their own wallet and pass `txHash`).

None of steps 4 to 6 has been run against the new escrow on real Arc: it is not deployed. The e2e script (`npm run e2e:chain`) is stale for the new contract, see `docs/E2E_CHAIN.md`.

## 6. What changed from the old mocks

| Old mock | Now |
| --- | --- |
| `ALLOW_MOCK_CHAIN`, mirrored funding/claims | removed: chain verification is mandatory, 503 without `ESCROW_ADDRESS` |
| mock World ID verifier | removed: Developer Portal v4 verify; 503 without `WORLD_ID_*`. Staging uses the World simulator (fake identities, not for production) |
| mock YouTube/X/Instagram | removed: Data API v3, X API v2, Instagram creator OAuth |
| mock LLM / templated writer | removed: Claude or Gemini (`LLM_PROVIDER`); 503 without the key for the chosen provider (`ANTHROPIC_API_KEY` or `GEMINI_API_KEY`) |
| mock video generator | removed: Gemini Interactions API (polled, stored) or HTTP provider |
| SQLite | Postgres (Neon) + migrations |
| UI widgets | `WorldCheck` (IDKit 4 / `rp-signature`) and wallet escrow calls live in `web/src/components` (UI agent) |

## 7. Not verified here

Real credentials were not available, so the real-service code paths were exercised only against stubbed HTTP in tests: World ID v4 verify, YouTube captions scraping, X, Instagram OAuth/insights, Gemini Omni video and Gemini text generation via the Interactions API (request/response shapes taken from the docs; no live key was available), Transak session/webhook, on-chain signer writes, the World IdP step-up (never run against the real issuer), and the whole new escrow flow on real Arc. `npm run doctor` pings the ones that can be pinged with a key.
