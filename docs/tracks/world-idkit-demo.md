# World IDKit demo clicks (about 30 seconds in the 4-minute video, plus the failure path)

STATUS (2026-11-07): scripted, not recorded, not run. No real World ID proof has ever been run in this repo. The deployed app https://clippo-cre.vercel.app reports `worldId: false` at `/api/health`, so the IDKit step cannot succeed there until the World ID variables are set and the site is redeployed. Do not show or claim a success that did not happen. Full track document: `WORLD_IDKIT.md`.

Say on camera: the World proofs are mocked fake identities (staging simulator or World ID Sandbox), not for production.

The video limit is 4 minutes (`docs/DEMO_SCRIPT.md` gives the World slot as 1:25 to 1:55, 30 seconds).

## Before recording (all not done yet)

1. Set `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID`, `WORLD_ID_SIGNING_KEY`, `WORLD_ID_ACTION=clippo-creator-signup`, `WORLD_ID_ENVIRONMENT=staging` (or `sandbox` for the Sandbox app). For the onchain link also `ESCROW_ADDRESS` and `HUMAN_ATTESTOR_PRIVATE_KEY`. Keep `NEXT_PUBLIC_DEMO` unset. Names and checks: `docs/WORLD_SETUP_CHECK.md`.
2. Local: `cd web && npm run doctor`. Deployed: set the variables on the `clippo-cre` Vercel project, redeploy, then `curl https://clippo-cre.vercel.app/api/health` must show `"worldId": true`.
3. Two wallets in the browser (A and B). One phone with the World ID Sandbox app, or the staging simulator at https://simulator.worldcoin.org with a fake identity.
4. A creator account that is NOT verified. The demo creator `0x8CF9...60e5` is verified by a seed script and linked on Arc by a stand-in, so do not use it for this segment.

## The 30-second path

| Time | Click | Say |
| --- | --- | --- |
| 0:00 | Wallet A: `/join`, "I clip", connect. Show step 1 "Prove you are a human" and step 2 dimmed. | "A creator is about to be paid real USDC. One person must not farm a campaign with many accounts or wallets, so the app asks for Proof of Human first." |
| 0:08 | Press "Verify with World ID (Proof of Human)". The IDKit QR opens. Press Cancel or close it. | "I cancel. Nothing changes: the account is still unverified." Show "Not verified. You closed the check before it finished. Nothing was changed." |
| 0:14 | Press verify again, approve in the World ID Sandbox app or simulator. | "Proof of Human is the minimum that gives one unique person per account. Passport proves a document, Selfie Check is medium assurance, we did not need either." |
| 0:24 | Badge "Verified with World ID", step 2 unlocks. | "The backend verified it with the Developer Portal, stored the nullifier as unique, and had the escrow on Arc link this wallet to the human. Wallets that are not linked revert `NotHuman`." |
| 0:30 | Stop. | |

Evidence to have ready (only from a real run): the `/api/worldid/verify` response (status 200, `onchain.linked`, `onchain.txHash`) and `cast call 0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef "humanOf(address)(bytes32)" <wallet A> --rpc-url $ARC_RPC_URL` returning a non-zero value. `onchain.linked` can be `false` if the attestor key or RPC is not set; the account is then verified but the escrow would still refuse to credit it. Say so if it happens.

If no real run is possible before recording: do not show a success. Show the "Not configured" sheet (it says "Nothing was changed"), the 403 `NOT_VERIFIED` from `POST /api/channels` or `/api/submissions`, and the passing test output, and say in one sentence that the IDKit flow was built and tested with doubles but not run against World.

## The failure paths (each leaves the account unverified; show `GET /api/auth/me` with `verified: false`)

Pick one or two for the video; the rest go in the written submission.

| # | Path | How | Expected text or code | State |
| --- | --- | --- | --- | --- |
| F1 | Cancelled | Close the sheet, or decline in World App | "You closed the check before it finished." / "You declined the request in World App." + "Nothing was changed." | unverified |
| F2 | Second account, same human | Wallet B: `/join`, "I clip", verify with the SAME World ID | Our server: 409 `ALREADY_USED`, "This World ID is already linked to another Clippo account. Nothing was changed." World may refuse first (`max_verifications_reached` / `nullifier_replayed`, or 403 `WORLD_ID_DENIED`); note which one appeared. Then show 403 `NOT_VERIFIED` on channel proof for B. | B unverified, A untouched |
| F3 | Credential unavailable | An identity without a Proof of Human credential | Notice "No Proof of Human credential." with "Get a credential" and "Continue without verifying (viewer only)" (only goes to `/wire`). Show a creator action still returning 403 `NOT_VERIFIED`. NOT confirmed that World App returns `credential_unavailable`; if you cannot reproduce it, say so. | unverified, nothing unlocked |
| F4 | Expired | Leave the QR until it times out | "The check timed out before it finished." + "Nothing was changed." | unverified |
| F5 | Not configured | Run where `WORLD_ID_*` is unset (the deployed site today) | Sheet "World ID · Not configured: World ID is not set up on this deployment, so the check cannot run. Nothing was changed." | unverified |

## Automated, credential-free

`cd web && npm run e2e:world` (`scripts/e2e-world-signup.mjs`): the 403 gate, the not-configured sheet, and `ALREADY_USED` / `WORLD_ID_DENIED` leaving the account unverified (those two responses are stubbed). It cannot scan a QR, so the success path and F1 to F4 in the real widget need a real app. Last recorded PASS: 2026-10-28; not re-run.

Tests: `cd web && npx vitest run src/lib/worldid` (the integration file needs the test database and uses a verifier double, not World).

## After the run

Fill `world-idkit-debrief.md` from what actually happened. Close the segment with one sentence of the debrief.
