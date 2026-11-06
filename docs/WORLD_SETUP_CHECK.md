# World ID setup check (IDKit track)

No secret values appear here; only names, lengths and pass/fail. Track document: `docs/tracks/WORLD_IDKIT.md`.

## Status (2026-11-07)

- NOT set up on the deployment. `GET https://clippo-cre.vercel.app/api/health` returns `"worldId": false` (re-read 2026-11-07). The health check is true only when `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID` and `WORLD_ID_SIGNING_KEY` are all set (`web/src/app/api/health/route.ts`).
- Developer Portal: app 'Clippo', relying party and actions `clippo-creator-signup`, `clippo-approve-split`, `clippo-approve-campaign` were created on 2026-11-06 by a teammate (live, at developer.world.org). Not re-checked by the author of this update: no `web/.env.local` exists on this machine, only `.env.example` files. Only `clippo-creator-signup` is needed for the IDKit track.
- No real World ID proof has ever been run (not in the simulator, not on a phone). The dated results further down are from 2026-10-28, from an earlier app (portal name "Clipoo"), and were not re-run.

## Environment variable names (current code)

| Variable | Where | Secret | Needed for | Read by |
| --- | --- | --- | --- | --- |
| `WORLD_ID_APP_ID` | server | no | required for sign-up | `worldIdConfig` in `web/src/lib/worldid/index.ts` |
| `WORLD_ID_RP_ID` | server | no | required | same; also the verify URL `https://developer.world.org/api/v4/verify/{rp_id}` |
| `WORLD_ID_SIGNING_KEY` | server only | YES | required; signs the RP request | `normalizeSigningKey` (`signing-key.ts`) via `worldIdConfig` |
| `WORLD_ID_ACTION` | server | no | optional, default `clippo-creator-signup` | `worldIdAction` |
| `NEXT_PUBLIC_WORLD_ACTION` | browser | no | optional, default `clippo-creator-signup`; must equal `WORLD_ID_ACTION` | `ACTION` in `web/src/components/WorldCheck.tsx` |
| `WORLD_ID_ENVIRONMENT` | server | no | optional, default `production`; use `staging` for the simulator or `sandbox` for the World ID Sandbox app | `expectedEnv` in `index.ts`, also sent in the signed context |
| `WORLD_ID_ONCHAIN_VERIFIER`, `WORLD_ID_ONCHAIN_RPC_URL` | server | no | optional second check against a World verifier contract; off when unset; ABI not tested live | `web/src/lib/worldid/onchain.ts` |
| `ESCROW_ADDRESS` | server | no | turns on the onchain human link after a verified sign-up (`chainEnabled`) | `web/src/lib/chain/config.ts` |
| `HUMAN_ATTESTOR_PRIVATE_KEY` | server only | YES | signs `registerHuman`; its address is fixed in the escrow at deploy | `clippoWallet` in `web/src/lib/chain/clippo-wallet.ts` |
| `ARC_RPC_URL` | server | no | RPC for that link (default in `.env.example`) | `chainConfig` |
| `NEXT_PUBLIC_DEMO` | build | no | MUST be unset; `1` shows fake simulator buttons instead of IDKit | `DEMO` in `web/src/components/api.ts` |

Notes:

- `NEXT_PUBLIC_WORLD_LEVEL` is listed in `docs/DEPLOY_ENV.md`, but no code reads it (checked with `git grep`). Ignore it.
- The `WORLD_AUTH_*` variables are the auth.world.org step-up (Agent Pass). They are a separate registration from the Developer Portal app above. See `docs/tracks/WORLD_AGENT_PASS.md`, `docs/DEPLOY_ENV.md` and `docs/WORLD_USER_TODO.md`. Not checked here and not run live.

## Checklist before a live run

| # | Step | State |
| --- | --- | --- |
| 1 | Developer Portal app, relying party, action `clippo-creator-signup` exist | Done 2026-11-06 (teammate); not re-checked |
| 2 | Variables above set in `web/.env.local` | Not verified (file not present on this machine) |
| 3 | `cd web && npm run doctor` against the current app | Not run since the app was recreated on 2026-11-06 |
| 4 | Variables set on the Vercel project `clippo-cre` (Production), then redeploy | Not done |
| 5 | `curl https://clippo-cre.vercel.app/api/health` shows `"worldId": true` | Not done (now `false`) |
| 6 | Portal app/actions set for the environment you use (`staging` for the simulator). The 2026-10-28 precheck reported `is_staging=false` while `WORLD_ID_ENVIRONMENT=staging` | Unresolved |
| 7 | A phone with the World ID Sandbox app, or https://simulator.worldcoin.org with a fake identity | Not done |
| 8 | One real sign-up verification, then `GET /api/auth/me` shows `verified: true` and `humanOf(wallet)` on Arc is non-zero | Not done |
| 9 | Repeat with a second account and the same World ID: refused, second account unverified | Not done |

## Dated results (2026-10-28, earlier app 'Clipoo'; not re-run)

| Check | Result |
|---|---|
| doctor: `WORLD_ID_APP_ID` / `RP_ID` / `SIGNING_KEY` / `ENVIRONMENT` | OK (set) |
| doctor: RP signing key | OK, can sign an RP request |
| doctor: Developer Portal rp_id | OK, portal answered 400 on an empty proof (rp_id exists) |
| Signing key format | OK: `0x` + 64 hex chars (66 total), no quotes, whitespace or PEM. The earlier "non-hex" error was from before the values were pasted. |
| `WORLD_ID_ENVIRONMENT` | `staging` |
| `/api/worldid/rp-signature` (real key, SIWE session) | PASS for the default action, `clippo-approve-split`, `clippo-approve-campaign` |
| Portal: app exists (precheck) | PASS (app resolves; portal name "Clipoo") |
| Portal: each action exists | NOT VERIFIABLE remotely (see below) |
| `npm run e2e:world` | PASS against a production build; dev server hangs (see below) |
| vitest `src/lib/worldid` | passed on 2026-10-28 (the integration file needs the test database); not re-run for this update. As reported 2026-11-07 the whole web suite is 325 passed, 1 skipped, and forge is 114 passed (not re-run here). |
| tsc / eslint | clean on 2026-10-28; not re-run |

## rp-signature shape (2026-10-28)

Keys: `app_id`, `rp_id`, `action`, `environment`, `nonce`, `created_at`, `expires_at`, `signature`. `app_id` starts `app_`, `rp_id` starts `rp_`, `action` equals the requested action, `environment` is `staging`, `signature` is 0x-hex of length 132 (65-byte ECDSA), `nonce` is 0x + 64 hex, TTL 300 s. Matches the IDKit docs. The route only accepts `clippo-approve-campaign` and `clippo-approve-split` as other actions; anything else becomes the sign-up action (`web/src/app/api/worldid/rp-signature/route.ts`).

## Portal action check (2026-10-28)

- `POST developer.world.org/api/v1/precheck/{app_id}` returns 200 for the app, but it also returns 200 for a deliberately nonexistent action, so it cannot prove an action exists.
- `POST /api/v4/verify/{rp_id}` with a well-formed zero proof fails with `invalid_merkle_root` identically for all three actions and a nonexistent one. Proof checks run before the action lookup, so it cannot tell actions apart either.
- `staging-developer.worldcoin.org` answers 404 for the app id (apps live on developer.world.org).
- The action names can only be confirmed by a real proof.

## Code (signing key handling)

- `web/src/lib/worldid/signing-key.ts` (`normalizeSigningKey`): accepts bare or 0x hex (any case), trims whitespace, strips one layer of quotes and an accidental `WORLD_ID_SIGNING_KEY=` prefix, returns `0x` + lowercase. Errors name the problem (empty, PEM, base64, non-hex, wrong length, inner whitespace, all zeros) and never echo the value. Test: `signing-key.test.ts`.
- `worldIdConfig()` uses it; a bad key gives a 503 `NOT_CONFIGURED` with that message.
- `web/scripts/doctor.mjs` applies a similar normalisation and reports length-only diagnostics. Known gap: its `WORLD_ID_SIGNING_KEY=` prefix strip is a malformed regex (`s*` instead of `\s*`), so that one case is not stripped by doctor the way `normalizeSigningKey` does.

## Known issue

`npm run dev` (Next 16 dev) keeps re-compiling and reloading pages in headless Chromium, so `e2e:world` times out waiting for `networkidle` on `/join`. The same script passes against `next build` + `next start`. Not caused by World ID changes.

## Manual steps still open

1. Set the variables (table above) locally and on Vercel; `WORLD_ID_ENVIRONMENT=staging` with the simulator.
2. `npm run build && npm start` (or `npm run dev`), sign in with a wallet, open Account (or Join), press "Verify with World ID (Proof of Human)".
3. Scan the QR code with the simulator or the Sandbox app and approve. Keep the evidence listed in `docs/tracks/WORLD_IDKIT.md` open item 2.
4. Verify a second account with the same identity: it must be refused (409 `ALREADY_USED`, or refused by World first). Note which.
5. The approve actions `clippo-approve-split` and `clippo-approve-campaign` belong to the approval flows (Agent Pass and high-value attest), not to this track. Their portal default for repeat verifications is unresolved.

## Developer Portal setup, as observed 2026-11-06 (teammate; differs from the docs)

- No 'Enable World ID 4.0' banner and no app-type choice; the create dialog has only 'App name'.
- 'World ID Configuration' tab shows the App ID and 'RP ID: Not registered'. 'Register relying party' opens a 'Generate new key' dialog (private key, 'Download key file (.json)', 'I have saved my private key securely'). After about 8 seconds the RP ID (`rp_...`) and signer address appear, with 'Rotate signer key', 'Switch to self-managed', 'Delete app'.
- The action dialog has only 'Identifier' and 'Short description': no max-verifications or uniqueness setting, so portal defaults apply. Unresolved: whether the defaults allow repeat verifications.
- Login is an Auth0 passwordless email code, or 'Continue with World'. No Google.
