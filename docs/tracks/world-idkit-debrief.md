# World, Best Use of IDKit: integration debrief (template)

STATUS (2026-11-07): template. Only facts that exist are filled in. Everything marked FILL AFTER A REAL RUN stays blank until a real verification has been run (staging simulator or World ID Sandbox app). No real World ID proof has been run in this repo, and the deployed app https://clippo-cre.vercel.app has `worldId: false`, so no number or friction from a proof run exists yet. Never fill a blank with an estimate. Proofs in the prize are mocked fake identities, not for production.

Prize page: https://ethglobal.com/events/mumbai/prizes/world . Track document: `WORLD_IDKIT.md`.

## What we built (in code; not run against World)

IDKit (`IDKitRequestWidget`, `proofOfHuman` preset, `web/src/components/IDKitSheet.tsx`) at creator sign-up. The RP context is signed on the backend (`/api/worldid/rp-signature`). The IDKit result is forwarded unmodified to the Developer Portal v4 verify endpoint (`/api/worldid/verify`, `RealWorldId` in `web/src/lib/worldid/index.ts`), the nullifier is stored unique on the user (`User.worldIdNullifier @unique`, 409 `ALREADY_USED`), and the backend attestor signs a `registerHuman` link so the Arc escrow credits only linked wallets (`NotHuman`). Tests use verifier doubles. The Agent Pass step-up is a different track: see `agent-pass-debrief.md`.

## Trust event and why this credential

- Trust event: a creator is about to be paid real USDC for clips; one person must not farm a campaign with many accounts or wallets.
- Credential: Proof of Human, the highest-assurance uniqueness credential in the list, chosen because the benefit is real money.
- Not Passport/NFC: it proves a document fact we do not need.
- Not Selfie Check: World calls it medium assurance. We did not test it or its `sybil_score`. It could fit a lower-value benefit.
- Limit: this limits duplicate accounts; it does not prove a person is honest.

## Paths to show

| Path | Expected | Run? | Recorded |
| --- | --- | --- | --- |
| Success | Account verified, features unlock, escrow link tx | not run | FILL AFTER A REAL RUN |
| Cancel | "You closed the check before it finished. Nothing was changed.", account unverified | not run | FILL AFTER A REAL RUN |
| Credential unavailable (viewer-only) | Notice, no unlock | not run; not confirmed that World returns `credential_unavailable` | FILL AFTER A REAL RUN |
| Second account, same human | 409 `ALREADY_USED` (or World refuses first), second account unverified | not run | FILL AFTER A REAL RUN |
| Not configured | "Not configured" sheet, nothing changed | not run on the deployment | FILL AFTER A REAL RUN |

## The four debrief items

### 1. Time to first success

FILL AFTER A REAL RUN. Record clock times, not estimates.

| Moment | Clock time |
| --- | --- |
| Started reading the IDKit docs | ____ |
| Developer Portal app, RP and action created (a teammate did this on 2026-11-06; duration was not recorded) | ____ |
| Variables set and app running | ____ |
| First QR shown | ____ |
| First `/api/worldid/verify` 200 | ____ |
| Total | ____ |

### 2. Friction encountered

Observed so far, Developer Portal setup only (recorded by a teammate on 2026-11-06; not re-observed):

- The portal flow differs from the docs: there is no 'Enable World ID 4.0' banner. You create the app, open its 'World ID Configuration' tab (shows 'RP ID: Not registered'), click 'Register relying party', save the private signing key in a 'Generate new key' dialog, and wait about 8 seconds for the RP ID.
- No app-type choice at creation (the dialog has only 'App name').
- No per-action verification limit in the UI: the action dialog has only 'Identifier' (lowercase, numbers, dashes, max 32 chars) and 'Short description'. The error code `max_verifications_reached` exists, but we could not set or see the limit, so portal defaults apply. Open question: do the defaults allow repeat verifications of an action? Unresolved.

Seen from reading the code and typings, not from a run (open questions, not friction yet):

- The `identifier` string a `proofOfHuman` result returns is unknown; our tests assume `proof_of_human`.
- Whether World App returns `credential_unavailable` for a user without the credential is unknown.
- Which layer refuses a second account with the same World ID (World or our database) is unknown.

Friction of the proof run: FILL AFTER A REAL RUN.

The auth.world.org portal access problem belongs to the Agent Pass track: see `agent-pass-debrief.md`.

### 3. Missing capability or documentation

Observed so far (teammate, 2026-11-06): the Developer Portal UI does not match the docs (no 4.0 banner, no app type); no per-action verification limit setting is shown or documented where we looked.

FILL AFTER A REAL RUN: anything else, for example the result `identifier` for `proofOfHuman`, behaviour when the credential is missing, simulator versus sandbox environment values (the earlier precheck reported `is_staging=false` while `WORLD_ID_ENVIRONMENT=staging`, unresolved).

### 4. The one improvement with the greatest impact

FILL AFTER A REAL RUN: ____

Write one improvement, from something that actually cost time or blocked us in the run.
