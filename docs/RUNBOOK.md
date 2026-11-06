# Runbook

Commands are from `contracts/README.md`, `cre/README.md` and `web/API.md`. Items marked UNVERIFIED were not executed when this was written. There are no mock modes for the main integrations: they answer 503 `NOT_CONFIGURED` ("not configured: set X") until their credentials are set. The one demo path is `AGENT_PASS_DEMO=1` (a local agent wallet counted as a fake human). World ID with `WORLD_ID_ENVIRONMENT=staging` uses the simulator, which gives fake identities. Run `cd web && npm run doctor` at any time to see what is missing and to ping every service.

## 1. Deploy contracts to Arc testnet

Follow `contracts/README.md` (exact commands, env table, post-deploy checklist). In short:
> Arc tooling note: Arc docs recommend `arc-forge` / `arc-cast` (Arc Foundry fork, https://docs.arc.io/arc/tutorials/install-arc-foundry.md), e.g. `arc-forge create src/X.sol:X --rpc-url $ARC_TESTNET_RPC_URL --private-key $PRIVATE_KEY --broadcast`. Plain `forge` may work for tests, but deployment should use `arc-forge` per Arc docs (not run here). Arc requires `maxFeePerGas >= 20 Gwei`; see `docs/tracks/ARC.md`.

```bash
cd contracts && forge build && forge test
export ADMIN_ADDRESS=0x... FORWARDER_ADDRESS=0x... UPDATER_ADDRESS=0x... HUMAN_ATTESTOR_ADDRESS=0x... EXPECTED_WORKFLOW_OWNER=0x...   # all required (EXPECTED_WORKFLOW_OWNER can be replaced by INSECURE_SKIP_WORKFLOW_CHECK=true, simulation only)
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.io --chain-id 5042002 --broadcast --private-key $PRIVATE_KEY   # PRIVATE_KEY: testnet-only key, read by forge, not by Deploy.s.sol
# or from the repo root: node scripts/deploy-arc.mjs --deploy   (checks most of the same env names, not HUMAN_ATTESTOR_ADDRESS, then writes web/.env.local and the local-fork CRE config.staging.json)
cd ../web && npm run abi:sync
```

`HUMAN_ATTESTOR_ADDRESS` is the address of the backend key you will set as `HUMAN_ATTESTOR_PRIVATE_KEY`. It is fixed in the escrow at deploy and cannot be changed later; the script reverts without it. The script prints `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, `REFERRAL_ADDRESS`, `PROFILE_ADDRESS`, `REPORT_RECEIVER_ADDRESS`, `HUMAN_ATTESTOR_ADDRESS`, `EXPECTED_WORKFLOW_OWNER`, `USDC_ADDRESS`: paste the ones the app reads into `web/.env.local`. `DEPLOYER_PRIVATE_KEY` is read only by `scripts/deploy-arc.mjs` on your machine: never set it on Vercel. The CRE forwarder address for Arc testnet must be taken from the Chainlink CRE docs (UNVERIFIED, not invented here). Arc gas is USDC: use the Circle faucet (https://faucet.circle.com).

Status: the enforcing escrow (commit 498f649: World ID and CRE enforced in the contract, disputes, `claimFor`, `humanAttestor`) is deployed on Arc testnet in simulation mode (`docs/BUILD_LOG.md` entry 17, `docs/CRE_DEPLOY.md`): escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`, receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd`. The receiver is not locked (Arc's simulation forwarder, our simulation wallet as workflow owner). The deployed test site https://clippo-cre.vercel.app points at this escrow. Two escrows of the old design also exist on Arc testnet: `0xd8453c22996bea11598a3dbf05112675b945c39c` (what the old clippo-six site used) and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310` (cited in `docs/SUBMISSION_ARC.md`); neither has the new rules. `scripts/deploy-arc.mjs --deploy` does not check `HUMAN_ATTESTOR_ADDRESS`; forge fails without it.

## 2. Environment (complete list in `web/.env.example`)

1. **Postgres (Neon).** Create a project, copy the pooled connection string into `DATABASE_URL`, then `cd web && npx prisma migrate deploy`. No Postgres at hand for local dev: `npm run db:local` (PGlite on :5433) and use the URL printed in `.env.example`.
2. **Core:** `SESSION_SECRET`, `ADMIN_WALLETS`, `CRON_SECRET`.
3. **Chain:** `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, `HUMAN_ATTESTOR_PRIVATE_KEY` (required; Clippo's backend wallet, its address must equal the escrow's `humanAttestor`; it signs World ID approvals, links wallets and sends `claimFor`, so it needs testnet USDC for gas), optional `CAMPAIGN_DEADLINE_SECONDS`, `PROFILE_ADDRESS`, `REFERRAL_ADDRESS`, `REPORT_RECEIVER_ADDRESS` (informational), `UPDATER_PRIVATE_KEY` (optional: only for the optional profile/referral modules; testnet-only key registered with `setUpdater`; not needed for the core loop).
4. **World ID 4.0:** Developer Portal -> create the app, enable World ID 4.0 (RP registration), keep `app_id`, `rp_id`, `signing_key`; create actions `clippo-creator-signup`, `clippo-approve-campaign`, `clippo-approve-split` (unlimited verifications for the two approval actions). Set `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID`, `WORLD_ID_SIGNING_KEY` (use `WORLD_ID_ENVIRONMENT=staging` with the simulator). Agent wallet: `AGENT_PASS_DEMO=1` (fake human, demo only) or `AGENT_PASS_PRIVATE_KEY` registered with AgentBook. AgentKit/AgentBook is not the official Agent Pass.
   Agent Pass step-up is configured separately: auth.world.org step-up (`WORLD_AUTH_CLIENT_ID`, `WORLD_AUTH_CLIENT_SECRET`, `WORLD_AUTH_ISSUER`, `WORLD_AUTH_REDIRECT_URI`, `WORLD_AUTH_TOKEN_AUTH`, `WORLD_AUTH_ACR`, `WORLD_AUTH_POLICY`; see `DEPLOY_ENV.md`) is a SEPARATE registration from the Developer Portal app used for IDKit (`WORLD_ID_*`). The redirect URI must be registered exactly as `https://<host>/api/auth/world/callback` (localhost over http is likely unsupported: use an HTTPS tunnel or the deployed URL). Sandbox client IDs have a lead time of about 1 hour via a World contact. Nothing here has been run live. Full list of manual steps: `docs/WORLD_USER_TODO.md`.
5. **AI (text: verifier, campaign writer, assistants):** either provider, switch with `LLM_PROVIDER=gemini|anthropic`.
   - **Free option, no credit card:** create a key at <https://aistudio.google.com/apikey> and set `GEMINI_API_KEY` (optionally `GEMINI_TEXT_MODEL`, default `gemini-3.5-flash-lite`). With only this key set, Gemini is selected automatically.
   - **Claude:** `ANTHROPIC_API_KEY` (`ANTHROPIC_MODEL`). If both keys are set and `LLM_PROVIDER` is empty, Anthropic is used. If neither is set the AI endpoints answer 503 `NOT_CONFIGURED` naming both options.
   - **Free-tier limits** ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [pricing](https://ai.google.dev/gemini-api/docs/pricing)): limits are per project (not per key), measured in requests/min, input tokens/min and requests/day; RPD resets at midnight Pacific. Google no longer prints per-model numbers in the docs: read yours at <https://aistudio.google.com/rate-limit>; preview models are stricter. Free-tier prompts and responses may be used by Google to improve its products (do not send secrets/PII; for end-user products in the EEA/UK/CH a paid key is required). The app therefore queues (`LLM_MAX_CONCURRENCY`, default 2), throttles (`LLM_RPM_LIMIT`, default 10/min on Gemini), retries 429/5xx with exponential backoff and Retry-After (`LLM_MAX_RETRIES`), caches identical requests (`LLM_CACHE_TTL_SECONDS`) and truncates long transcripts (`LLM_MAX_INPUT_CHARS`). When quota is exhausted the UI gets `429 AI_QUOTA_EXCEEDED` ("AI quota exceeded, try again"); the verifier never approves on a provider/quota error: the clip goes to NEEDS_HUMAN.
6. **Platforms:** `YOUTUBE_API_KEY` (Google Cloud, YouTube Data API v3); `X_BEARER_TOKEN` (X developer app; tier must allow reads); Instagram: Meta app with "Instagram API with Instagram Login", add `INSTAGRAM_REDIRECT_URI = https://<site>/api/channels/instagram/oauth/callback` and set `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` (creators must be Business/Creator accounts; Meta app review is required for non-tester accounts).
7. **AI video:** `GEMINI_API_KEY` (Google AI Studio); model `GEMINI_VIDEO_MODEL` (default `gemini-omni-1.1-flash`). Per the [pricing page](https://ai.google.dev/gemini-api/docs/pricing), `gemini-omni-1.1-flash` is "Not available" on the Free tier (paid tier only, about $0.10 per second of 720p video): the free key works for text, but video generation needs billing enabled on the same project (prepay at least $5 in AI Studio). Without billing, video jobs fail with the provider error; everything else keeps working.
8. **On-ramp:** Transak partner dashboard (staging) -> `TRANSAK_API_KEY`, `TRANSAK_API_SECRET`, whitelist the server IP, register `https://<site>/api/onramp/webhook`.
9. **Storage:** `STORAGE_DIR` on a persistent disk (local disk is ephemeral on serverless hosts); upload cap `SOURCE_MAX_BYTES` (default 500 MB).
10. `cre/.env`: `CRE_ETH_PRIVATE_KEY` (testnet only) and `YOUTUBE_API_KEY_CRE` (the YouTube key the workflow nodes read as the CRE secret `YOUTUBE_API_KEY`, see `cre/secrets.yaml`). `cre/workflows/clippo-settlement/config.staging.json`: `backendUrl`, `youtubeApiBase`, `evm.receiverAddress`, `chainSelectorName` `arc-testnet`. `cre/project.yaml`: RPC per target (`staging-settings` is a local anvil fork at 127.0.0.1:8545, `production-settings` is Arc testnet); it has no owner field. `scripts/deploy-arc.mjs` writes `receiverAddress` only into `config.staging.json` (the local anvil fork). `config.production.json` already holds the real Arc receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` and `backendUrl` `https://clippo-cre.vercel.app` (written by `cre/scripts/arc-deploy.sh`); for any other deploy, edit it by hand.

## 3. Run CRE simulate

```bash
cd cre && npm install && npm run typecheck && npm test   # npm test = snapshot and YouTube tests
cre login
bash scripts/simulate-local.sh  # real CLI against a local anvil fork of Arc + mock backend + fake YouTube API (needs anvil, bun, cre CLI)
npm run simulate:live           # production-settings: dry run, no broadcast; the manifest is empty until an approval day has finished
bash scripts/arc-deploy.sh      # you run this: deploys escrow + receiver on REAL Arc testnet in simulation mode (see docs/CRE_DEPLOY.md)
bash scripts/simulate-arc-real.sh <youtube video id> <youtube channel id>   # --broadcast on real Arc, reads the real YouTube API
```

`npm run simulate` and `npm run simulate:broadcast` use `staging-settings`, which points at `http://127.0.0.1:8545` (anvil fork) and a backend on `127.0.0.1:8787`, so start `scripts/local-chain.sh` and `scripts/mock-backend.mjs` first (or use `simulate-local.sh`). They never touch real Arc.

Prerequisites: `escrow.setReportAdapter(receiver)` (done by the deploy script) and the receiver's forwarder. Workflow v2: the nodes read YouTube themselves. They read the clip manifest `/api/snapshots/clips` (`manifestPath`) from Clippo, then the view counts from the YouTube Data API (secret `YOUTUBE_API_KEY`), keep a clip only if the channel bio holds `clippo:<wallet>`, and agree on the median. The manifest emits the numeric on-chain `campaignId` (campaigns without an `onchainId` are skipped). The escrow credits only wallets linked to a unique human, so unlinked creators fail per row (`ItemFailed`, `NotHuman`).

What has run: `simulate-local.sh` (local fork, fake YouTube); a real YouTube read on a local fork; and one `--broadcast` run on REAL Arc (`docs/tracks/cre-simulation-real-arc.txt`): "kept 1/1 clips", 1 report, 0 failed rows, tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`, `reportedViews` 3 read back with `cast call`. Not proven: it is a simulation (one node, our own simulation wallet sent the report through Arc's Chainlink test forwarder, the manifest came from a local mock backend), no workflow is deployed (needs CRE Early Access), and the receiver is not locked.

## 4. Run the app

```bash
cd web && npm install && npx prisma migrate deploy && npm run doctor && npm run dev
```

Tests: `npm test` (spins up its own throwaway Postgres; no setup). Production build: `npm run build`.

## 5. Seed / first run

Demo data: `cd web && node --env-file-if-exists=.env.local --env-file-if-exists=.env scripts/seed-demo.mjs [--reset] [--ui-only]` writes clearly labelled `[SEED]` rows through Prisma (see the header of that script; chain-dependent rows only with `ESCROW_ADDRESS`, no invented tx hashes; never run it against the production DB). For the deployed CRE demo, `node scripts/seed-cre-demo.mjs` (dry run) then `--confirm` seeds a creator, the channel, a campaign linked to on-chain campaign 1 and one approved clip; it does not seed views, credits or the proof link (`docs/CRE_DEPLOY.md` section 6). For a real first run, sign in with a real wallet (SIWE); in development only, `x-wallet` / unsigned sign-in works for quick checks.

1. Admin signs in (`ADMIN_WALLETS`). Campaigner and creators sign in.
2. Creator: World ID check through IDKit (`POST /api/worldid/rp-signature`, then `POST /api/worldid/verify` with the IDKit result). The backend links the verified wallet to its human on-chain with the Clippo wallet; the escrow only credits linked wallets.
3. Creator: `POST /api/channels`, put the code in the bio, `POST /api/channels/:id/verify` (Instagram: `POST /api/channels/instagram/oauth/start`).
4. Campaigner: wizard, `POST /api/campaigns`, fund on-chain (buy USDC with `POST /api/onramp/session`, or the Circle faucet), then `POST /api/campaigns/:id/fund {txHash}`.
5. Admin: `POST /api/campaigns/:id/attest` with a fresh World ID proof (or an authorized step-up, `stepUpAttemptId`) returns a signed `proof` (it also returns `attestation`, the database record); call `approveCampaign(id, proof)` on-chain (the plain `approveCampaign(id)` reverts for high-value campaigns), then `POST /api/campaigns/:id/approve`.
6. Creator submits real clip links; cron/admin `POST /api/snapshots/refresh`; check `GET /api/snapshots/latest`. Payouts: `POST /api/payouts/:id/claim` makes the Clippo wallet call `claimFor` (a creator may also claim from their own wallet and pass `txHash`).

The escrow is on Arc testnet, but steps 4 to 6 have not been run from the app against it (the deploy script created and approved the one demo campaign, and one CRE report plus the indexer sync have run). The e2e script (`npm run e2e:chain`) is stale for the new contract, see `docs/E2E_CHAIN.md`.

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

Real credentials were not available, so the real-service code paths were exercised only against stubbed HTTP in tests: World ID v4 verify, YouTube captions scraping, X, Instagram OAuth/insights, Gemini Omni video and Gemini text generation via the Interactions API (request/response shapes taken from the docs; no live key was available), Transak session/webhook, on-chain signer writes, the World auth step-up (auth.world.org; never run against the real issuer), and most of the new escrow flow on real Arc (only the deploy steps, one CRE report and the indexer sync have run). `npm run doctor` pings the ones that can be pinged with a key.
