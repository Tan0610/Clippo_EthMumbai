# World, Best Use of IDKit (creator proof of human)

Prize: Best Use of IDKit, $2,500 (up to 2 teams get $1,250). Page: https://ethglobal.com/events/mumbai/prizes/world . Docs: https://docs.world.org/world-id/idkit/integrate , https://docs.world.org/world-id/idkit/credentials , https://docs.world.org/world-id/credentials/1 , Developer Portal https://developer.worldcoin.org .

Related, not this track: the auth.world.org step-up and Agent Pass release gate. See `WORLD_AGENT_PASS.md`.

## STATUS (2026-11-07)

- Built in code and covered by tests that use test doubles. NOT run: no real World ID proof has ever been run in this repo (not in the simulator, not on a phone). Nothing below says otherwise.
- The deployed app https://clippo-cre.vercel.app (main `ab35b35`) reports `"worldId": false` at `/api/health` (re-read 2026-11-07). The `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID` and `WORLD_ID_SIGNING_KEY` variables are not set there, so the IDKit sheet on that site can only show the "Not configured" sheet.
- The demo creator `0x8CF9113b19Aa9D169365CA7B1BB9d7b957B460e5` is NOT an IDKit result. Two stand-ins exist: (1) the seed script `web/scripts/seed-cre-demo.mjs` creates the creator row with `verified: true` and a placeholder nullifier `seed-cre-demo-<wallet>`; (2) the wallet was linked as a human on the real Arc escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef` by an attestor-signed script (`docs/BUILD_LOG.md`, "stand-in for the World check"). Say so on camera.
- Prize proofs are mocked fake identities, not for production.
- Tests, as reported 2026-11-07 (not re-run by this doc's author): web 325 passed, 1 skipped; forge 114 passed.
- Developer Portal setup was recorded by a teammate on 2026-11-06: app 'Clippo', relying party, actions `clippo-creator-signup`, `clippo-approve-split`, `clippo-approve-campaign`. I could not re-check it: there is no `web/.env.local` on this machine, only `.env.example` files. Only `clippo-creator-signup` is used by this track.

## 1. The product event that needs trust

A creator is about to be paid real USDC for clips. If one person can open many accounts or wallets, one person can farm a campaign's pool. So the product must know "this is one unique person" before it lets the account do money-adjacent things.

Where that is enforced:

| Layer | What it refuses | Code |
| --- | --- | --- |
| App | An unverified creator cannot prove a channel, take a deal, submit a clip or claim. Response: 403 `NOT_VERIFIED`, "Verify with World ID before you use submissions. Open Account and press "Verify with World ID"." | `assertVerifiedHuman` in `web/src/lib/worldid/signup.ts`, called in `web/src/app/api/submissions/route.ts`, `channels/route.ts`, `channels/[id]/verify/route.ts`, `channels/[id]/upgrade-code/route.ts`, `campaigns/[id]/deal/route.ts`, `payouts/[id]/claim/route.ts`. Also `campaignEligibility` in `web/src/lib/workspace/eligibility.ts` lists `NOT_VERIFIED`. |
| Escrow (Arc) | A wallet that is not linked to a human cannot be credited. Revert `NotHuman()`. | `ClippoEscrow.reportViews` (PerView and PoolShare) and `_creditSplit` (HumanSplit), `contracts/src/ClippoEscrow.sol`. |
| Escrow (Arc) | One human, one wallet. Revert `HumanAlreadyLinked()`. | `ClippoEscrow.registerHuman`, same file. |

UI: `JoinView.tsx` step 1 "Prove you are a human" must pass before step 2 "Prove a channel" is usable (step 2 is `inert` and dimmed until `s.verified`). `AccountView.tsx` shows the same button and a "Human check" row.

## 2. The credential, and why it is the minimum sufficient

Chosen: Proof of Human. In `web/src/components/IDKitSheet.tsx`: `preset={proofOfHuman({ signal })}` with `allow_legacy_proofs` on. In `@worldcoin/idkit-core` 4.6.0 (`dist/index.d.cts`) the preset is documented as "ProofOfHuman preset for World ID 4.0 with legacy Orb fallback", which is why `allow_legacy_proofs` stays on.

Reasoning (our judgment, partly from World's credentials page, read 2026-11-07 through a page fetch; check the wording before quoting it in the video):

| Credential | What World says it is | Why we did not need it |
| --- | --- | --- |
| Proof of Human (chosen) | "The user is a unique human, backed by anonymous biometric verification by the Orb." | The property we defend is one unique person per account and per wallet, and the benefit is real money, so a wrong "yes" costs money. This is the highest-assurance uniqueness credential in the list. |
| Passport/NFC | "The user holds a verified NFC passport credential." | It proves a document fact. We do not need a document fact, and it excludes people without an NFC passport. |
| Selfie Check | "A medium-assurance biometric credential using the device camera for liveness and facial similarity." Anyone with the World App can complete it. | Medium assurance. We did not test it and did not read its `sybil_score`. For a lower-value benefit it could be the proportionate pick, and it would let more people in. |

Correction to wording in the code. `IDKitSheet.tsx` (header comment), `lib/worldid/signup.ts` (comment) and `JoinView.tsx` (`WhyProofOfHuman`) say Selfie Check "does not give uniqueness" or "not one-person-one-account", and Passport "not cross-population uniqueness". That is too strong. The installed typings show that Selfie Check and Passport results also carry an RP-scoped `nullifier` (`SelfieCheckResponseItemV4`, `ResponseItemV4`), and World's page says a one-time Selfie Check action can be completed once per user. The defensible claim is the one in the table: we picked the highest assurance because the benefit is money. Those code strings were not edited here (not part of this change). See open items.

What this limits and what it does not: it limits duplicate accounts. It does not prove a person is honest or that their views are real (said in the `IDKitSheet.tsx` comment).

## 3. How the check works, and where it is verified

Server side (primary check):

| Step | Code |
| --- | --- |
| Backend signs the request. The signing key never reaches the browser. | `POST /api/worldid/rp-signature` -> `createRpContext` -> `signRequest` (`web/src/app/api/worldid/rp-signature/route.ts`, `web/src/lib/worldid/index.ts`). Needs a signed-in user. 503 `NOT_CONFIGURED` if `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID` or `WORLD_ID_SIGNING_KEY` is missing. Only `clippo-approve-campaign` and `clippo-approve-split` are accepted as other actions; anything else becomes the sign-up action. |
| Widget | `IDKitRequestWidget` in `IDKitSheet.tsx` (`app_id`, `action`, `environment`, `rp_context`, `allow_legacy_proofs`, `preset`). It reports a proof or a failure kind and decides nothing. `handleVerify` is not used: the caller sends the proof to the backend after `onSuccess`. |
| Verify | `POST /api/worldid/verify` (`web/src/app/api/worldid/verify/route.ts`): rate limit 30 per hour, `requireUser`, `proofSchema.parse`, then `completeSignup`. |
| Real verifier | `getWorldId()` returns `RealWorldId` (tests can swap it with `setOverride`, which production refuses: `web/src/lib/config.ts`). `RealWorldId.verify` forwards the IDKit result unmodified to `POST https://developer.world.org/api/v4/verify/{rp_id}`. It refuses a proof made for another action or environment, and it accepts only `success === true` with a matching `environment`. |
| One person, one account | `completeSignup` (`web/src/lib/worldid/signup.ts`): nullifier lower-cased (`normalizeNullifier`), looked up, 409 `ALREADY_USED` if another account holds it, 409 `ACCOUNT_ALREADY_VERIFIED` if a verified account tries a different nullifier. The database backstop is `User.worldIdNullifier String? @unique` (`web/prisma/schema.prisma`); a race gives Prisma `P2002`, mapped to 409 `ALREADY_USED`. Nothing is written on any refusal. |

Onchain side (what is credited):

1. After `completeSignup` succeeds, and only if `ESCROW_ADDRESS` is set (`chainEnabled()`), the verify route calls `clippoWallet().ensureHuman(wallet, nullifier)` (`web/src/lib/chain/clippo-wallet.ts`). It hashes the nullifier with `humanHash`, reads `humanOf(wallet)` on the escrow, and if empty signs an EIP-712 `HumanRegistration(wallet, human, expiresAt)` with `HUMAN_ATTESTOR_PRIVATE_KEY` and sends `registerHuman`. The backend pays the gas.
2. `ClippoEscrow.registerHuman` accepts the link only if the signature recovers to the immutable `humanAttestor`. One human links one wallet and one wallet one human (`HumanAlreadyLinked`).
3. The escrow credits only linked wallets (`NotHuman`). Forge tests: `test_unverifiedWallet_cannotBeCreditedAnyWay` and `test_registerHuman_oneHumanOneWallet` in `contracts/test/ClippoEscrow.t.sol`. A local anvil-fork CRE simulation also recorded an unlinked wallet failing with `NotHuman` (`docs/BUILD_LOG.md`; local fork, not real Arc).

Honest limits of the server and onchain checks:

- The escrow does not verify the World proof itself. It trusts a signature from Clippo's attestor key, which is only given after the Developer Portal accepted the proof. The attestor cannot move funds (`contracts/src/ClippoEscrow.sol`, `humanAttestor` comment).
- An optional second check re-verifies a 4.0 uniqueness proof against a World verifier contract (`lib/worldid/onchain.ts`, `WORLD_ID_ONCHAIN_VERIFIER`, `WORLD_ID_ONCHAIN_RPC_URL`). It is off by default. Its ABI is transcribed from the docs and was not tested against a live contract. The arg mapping is unit tested (`signup.integration.test.ts`).
- The server does not pin the credential. `unknownIdentifiers` in `lib/worldid/index.ts` only logs a warning, and `ACCEPTED_IDENTIFIERS` includes weaker legacy names (`device`, `document`). Proof of Human is requested by the widget preset, but the server forwards whatever identifier it gets. The exact identifier a `proofOfHuman` result returns has not been observed (the tests assume `proof_of_human`).
- If the onchain link fails (for example the attestor key is missing or the RPC is down), `/api/worldid/verify` still returns 200 with `onchain: { linked: false, reason }`, the account is verified in the database, but the escrow still refuses to credit that wallet. `session.worldVerify` in `web/src/components/api.ts` returns only `r.user`, so the UI does not show this. A second `POST /api/worldid/verify` with the same human retries the link; the split approval also links its recipients (`campaigns/[id]/split/route.ts`).
- The sign-up proof is not bound to the wallet with a `signal` (`JoinView`/`AccountView` pass none). The account binding comes from the signed-in session only.

## 4. Success path and alternative paths

Success: Join -> "I clip" -> connect wallet -> "Verify with World ID (Proof of Human)" -> IDKit QR -> approve in World App or the staging simulator -> `onProof` -> `POST /api/worldid/verify` 200 -> badge "Verified with World ID", step 2 unlocks. Evidence for this path today: none from a real run. With a test double (`FakeWorldId`, `web/src/test/doubles.ts`): `signup.integration.test.ts`, "verifies one human once".

Alternative paths. Every row leaves the account unverified and changes nothing else (no write happens before a refusal). The UI text comes from `errors.ts` (`FAIL_OF`), `WorldCheck.tsx` (`WORLD_FAIL`, `worldFailText`) and `JoinView.tsx`; widget-side messages get " Nothing was changed." appended.

| Path | Trigger | Code or kind | Text the user sees | Account after |
| --- | --- | --- | --- | --- |
| Cancelled (closed widget) | Close the sheet before an answer | kind `cancelled`, `IDKitSheet` `onOpenChange` | "Not verified. You closed the check before it finished. Nothing was changed." | unverified |
| Cancelled (declined in World App) | Decline in World App | `verification_rejected`, `user_rejected` | "You declined the request in World App. Nothing was changed." | unverified |
| Cancelled (client code) | IDKit client `cancelled` | `cancelled` | "You cancelled the check. Nothing was changed." | unverified |
| Expired | Timeout, dropped connection, stale request | `timeout`, `connection_failed`, `rp_signature_expired` | "The check timed out before it finished." / "The connection to World App dropped before the check finished." / "The check request expired before it was answered." (+ "Nothing was changed.") | unverified |
| Repeated at World | World says the check was used | `max_verifications_reached`, `nullifier_replayed` | "World ID says this check was already used the maximum number of times for this action." / "World ID says this proof was already used." (+ "Nothing was changed.") | unverified |
| Repeated at our server (second account, same human) | Another Clippo account already holds the nullifier | HTTP 409 `ALREADY_USED` | "This World ID is already linked to another Clippo account. Nothing was changed." | second account unverified, first account untouched |
| Different human on a verified account | Verified account tries another nullifier | HTTP 409 `ACCOUNT_ALREADY_VERIFIED` | "This account is already verified with a different World ID. Nothing was changed." | unchanged |
| Rejected by World's verify | Invalid proof, wrong action, wrong environment | HTTP 403 `WORLD_ID_DENIED` | "<reason>. Nothing was changed, and the proof was not consumed." | unverified |
| Credential unavailable | The user has no Proof of Human credential | `credential_unavailable` -> kind `unavailable` | Notice "No Proof of Human credential." + "Your World ID has no Proof of Human credential. You can browse as a viewer but cannot join campaigns as a creator." + link "Get a credential" (https://docs.world.org/world-id/idkit/credentials) + button "Continue without verifying (viewer only)" which only navigates to `/wire` | unverified, nothing unlocked (still 403 `NOT_VERIFIED` on creator actions) |
| Unconfigured | `WORLD_ID_*` missing; `rp-signature` answers 503 `NOT_CONFIGURED` | kind `unconfigured` | Sheet "World ID · Not configured": "World ID is not set up on this deployment, so the check cannot run. Nothing was changed. An operator needs to add the World ID app, RP id and signing key." Close, then "Not verified. World ID is not configured on this deployment, so nothing was checked. Nothing was changed." | unverified |
| Unknown widget error | Any other IDKit code | kind `failed` | "World ID could not complete the check (<code>). Nothing was changed." | unverified |

What has and has not been checked for these paths:

- `credential_unavailable` exists in the installed IDKit 4.6.0 error codes (`IDKitErrorCodes.CredentialUnavailable`, asserted in `errors.test.ts`). Whether World App actually returns it for a user without the credential is NOT confirmed.
- Which layer refuses a second account first is NOT confirmed. If the portal limits the action to one verification per human, the second account may be stopped by World (`max_verifications_reached`/`nullifier_replayed`, or 403 `WORLD_ID_DENIED`) before our 409 `ALREADY_USED`. The Developer Portal action dialog has no max-verifications setting (teammate, 2026-11-06), so the default is unknown. Both outcomes leave the second account unverified; the database unique index is the backstop.
- Tests with doubles: `errors.test.ts` (4 tests, error-code mapping), `signup.integration.test.ts` (8 tests: denied proofs, one human once, case-insensitive 409, no nullifier swap, DB unique race, `NOT_VERIFIED` gate on channels, submissions and claims, onchain arg mapping, proof-shaped result). It needs the test database and uses `FakeWorldId`, not the Developer Portal. `prd-conformance.test.ts` also checks `NOT_VERIFIED` on `/api/channels`.
- `npm run e2e:world` (`web/scripts/e2e-world-signup.mjs`): unverified gate (403), not-configured sheet, and `ALREADY_USED` / `WORLD_ID_DENIED` leaving the account unverified. The rp-signature and verify responses are stubbed in the browser for the last two. It cannot scan a QR. The last recorded PASS is dated 2026-10-28 (production build); not re-run.
- `NEXT_PUBLIC_DEMO=1` shows a local Simulator sheet (`WorldCheck.tsx`, `Simulator`) with fake buttons. Never use it for the video.

## 5. Requirement status

| # | Prize requirement | Status | Evidence and gap |
| --- | --- | --- | --- |
| 1 | Integrate IDKit in a functioning application, mini app or onchain flow | Partly | `IDKitRequestWidget` + `proofOfHuman` in `IDKitSheet.tsx`; app deployed at https://clippo-cre.vercel.app. The deployed app has `worldId: false`, so the flow cannot run there yet, and it has not run anywhere. |
| 2 | Use at least one supported credential and verify the result on the server or onchain | Not proven | Code path complete (`RealWorldId` -> Developer Portal v4; `registerHuman` link on Arc). No real proof has been verified. Tests use a double for the verifier. |
| 3 | Explain the product event and why the chosen credential is the minimum sufficient assurance | Done, with a wording fix pending | Sections 1 and 2 above. Some code and UI strings overstate the case against Selfie Check and Passport (open item). |
| 4 | Show a successful verification and one meaningful alternative path | Not proven | All paths are built and tested with doubles and stubs. No recorded success, cancel or credential-unavailable run. The "Not configured" sheet is the only path that should be showable on the current deployment (not run there). |
| 5 | Short integration debrief | Partly | Template with only the facts we have: `world-idkit-debrief.md`. Time to first success and the run friction are blank until a real run. |

## 6. Paste-ready submission text (short)

Clippo pays creators real USDC for views on their clips. The trust moment: before a creator account can submit clips or be credited, the product must know it is one unique person, or one person could farm a campaign's pool with many accounts and wallets.

We use IDKit (`IDKitRequestWidget`, `proofOfHuman` preset). The backend signs the request and forwards the IDKit result to the World Developer Portal v4 verify endpoint. It stores the nullifier as unique on the user, so a second account from the same person is refused (409 `ALREADY_USED`). After a successful check, Clippo's attestor key signs a `registerHuman` link on the Arc escrow. The escrow credits only linked wallets and reverts `NotHuman` for any other.

Why Proof of Human: the benefit is real money paid per person, so we chose the highest-assurance uniqueness credential. Passport/NFC proves a document fact we do not need. Selfie Check is medium assurance and could fit a lower-value benefit; we did not test it.

Alternative paths: cancel or decline, timeout, a proof already used, a second account with the same World ID, no Proof of Human credential (viewer-only), and World ID not configured. Each leaves the account unverified and changes nothing else.

Status, stated plainly: the integration is built and covered by tests with test doubles. [FILL AFTER A REAL RUN: one sentence on the first real verification, or keep the next sentence.] As of 2026-11-07 no real World ID proof has been run, and the deployed demo does not have the World ID variables set, so the IDKit step is not demonstrated live there. The demo creator is linked on Arc by an attestor-signed stand-in, not through IDKit.

## 7. Debrief status

`world-idkit-debrief.md` is a template. Filled: what we built, the trust event and credential, the paths table (all "not run"), and the Developer Portal setup friction a teammate observed on 2026-11-06. Blank until a real run: time to first success, the friction of the proof run, the missing documentation seen during the run, and the one improvement with the greatest impact.

## 8. Open items

1. Set `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID`, `WORLD_ID_SIGNING_KEY`, `WORLD_ID_ENVIRONMENT=staging` on the `clippo-cre` Vercel project (Production), redeploy, and check `/api/health` shows `worldId: true`. Not done.
2. Run one real verification (staging simulator or World ID Sandbox app) and keep evidence: the `/api/worldid/verify` 200 body (`onchain.linked`, `txHash`), `humanOf(wallet)` on Arc, and the account row. Not done.
3. Run and record the alternative paths: cancel, second account with the same World ID (note which layer refused), credential unavailable (confirm World returns `credential_unavailable`), unconfigured.
4. Log the real `identifier` of a `proofOfHuman` result, then pin the accepted identifier on the server (`ACCEPTED_IDENTIFIERS`, `unknownIdentifiers` in `lib/worldid/index.ts`) so the credential is enforced and not only requested.
5. Check the portal default for repeat verifications on `clippo-creator-signup` (teammate TODO, unresolved).
6. Align the Selfie Check and Passport wording in `IDKitSheet.tsx`, `lib/worldid/signup.ts` and `JoinView.tsx` (`WhyProofOfHuman`) with section 2. Read the Selfie Check docs and its `sybil_score` before comparing.
7. Surface `onchain.linked: false` in the UI or retry the link on the next sign-in; today it is only in the API response.
8. Optional: bind the sign-up proof to the wallet with a `signal`; decide whether to adopt `handleVerify` so a backend refusal shows inside the widget.
9. Optional: test the onchain World verifier path (`WORLD_ID_ONCHAIN_VERIFIER`) against a live contract before claiming it.

## 9. Reference notes (docs.world.org, read 2026-10-28 by a teammate; fetched again 2026-11-07 for the credentials and integrate pages)

- IDKit 4.x flow: backend signs an RP request (never client side) giving `sig, nonce, created_at, expires_at`; client builds `rp_context` and renders `IDKitRequestWidget`; backend forwards the result unmodified to `POST https://developer.world.org/api/v4/verify/{rp_id}` and checks the environment. The integrate page says: "The same person verifying the same action always produces the same nullifier" and "your backend must check that the nullifier hasn't been used before".
- Environments: `production`, `staging` (simulator), `sandbox`. Reject proofs from other environments in production.
- Error codes are listed at /world-id/idkit/error-codes; the installed 4.6.0 enum has 29 values including `user_rejected`, `credential_unavailable`, `max_verifications_reached`, `nullifier_replayed`, `rp_signature_expired`, `timeout`, `cancelled`.
- On-chain verifier addresses quoted by the teammate from the docs (not verified by us): World Chain prod `0x00000000009E00F9FE82CfeeBB4556686da094d7`, staging `0x703a6316c975DEabF30b637c155edD53e24657DB`, Arc prod (WorldIDSatellite) `0x304E14e4dC0508C0927e3b307a2C18422C07E394`.
- Developer Portal as observed by a teammate on 2026-11-06 (differs from the docs): no 'Enable World ID 4.0' banner; the create-app dialog has only 'App name'; the 'World ID Configuration' tab shows 'RP ID: Not registered' until 'Register relying party' -> 'Generate new key' (save the key) -> about 8 seconds -> RP ID and signer address; actions are created from the Dashboard tab and the dialog has only 'Identifier' (lowercase letters, numbers, dashes, max 32) and 'Short description'. Login: Auth0 passwordless email code or 'Continue with World'.
