# World, Best Use of IDKit (sign-up verification)

Scope: creator sign-up proof of human with IDKit. The agent split approval now uses the OIDC step-up at `auth.world.org` (Agent Pass track, `docs/TRACKS.md`). IDKit is still used for a person's own ("Build it myself") split approval and for campaign approval (`clippo-approve-split`, `clippo-approve-campaign`).

## Status in one place (read this first)

- **Credential used:** the sign-up check asks for an Orb credential (`orbLegacy` preset, with `allow_legacy_proofs`). `NEXT_PUBLIC_WORLD_LEVEL=device` switches the build to `deviceLegacy`. Default is Orb. No `signal` is bound at sign-up (`WorldCheck.tsx`, `IDKitSheet.tsx`).
- **No real proof has run.** No QR has been scanned with the simulator or a World app, and no proof from the Developer Portal has been accepted by this code. The only runs so far are the setup checks in `docs/WORLD_SETUP_CHECK.md` (signed request, portal answers 400 on an empty proof) and unit/integration tests with a fake verifier or a stubbed `fetch`. The prize's World ID proofs are mocked fake identities, not production identities.
- **The contract does not verify a World ID proof.** `ClippoEscrow.registerHuman(wallet, proof)` checks an EIP-712 signature from `humanAttestor` (Clippo's backend key), then links one wallet to one `human` hash (`keccak256("clippo:human:v1|<nullifier>")`). A human can link one wallet and a wallet one human. Only linked wallets can be credited (`NotHuman` in `reportViews` and `_creditSplit`). The chain trusts the backend key to sign only after a real check. The escrow with this rule (commit `498f649`) is **not deployed**; the live site still points at an older escrow without it.
- **Scope of "one human":** the nullifier is per (person, app, action). It stops a second Clippo account and a second linked wallet for the same sign-up action. It does not ban a person across other apps, and the code has no ban list that follows a person.

## Prize requirements: what exists and what is open

Prize: "Best Use of IDKit", $2,500, up to 2 teams at $1,250 each (https://ethglobal.com/events/mumbai/prizes, read 2026-11-06). A Continuity-only twin has the same text and amount. Whether Clippo qualifies for the Continuity twin is not checked. The page lists five qualification requirements: (1) integrate IDKit in a working app or flow, (2) use at least one supported World ID credential and verify it on the server or onchain, (3) explain the product event that needs trust and why the chosen credential is the minimum sufficient assurance, (4) show a successful verification and one meaningful alternative path, (5) a short integration debrief. Items 1 and 2 exist in code but have not run with a real proof. Items 3 and 5 are open. Item 4 is open as a recording. The page's wording on the credential: it rewards the best-fitting credential, not the most credentials.

| Item | Status |
| --- | --- |
| Trust moment | Exists in code: creator sign-up gates channel proof, deals, submissions and claims (403 `NOT_VERIFIED`), and the escrow only credits linked wallets. Not shown to a judge yet: no real run, no recording. |
| Credential rationale | **Open.** Not written. Draft to write: Orb (unique person) because one person must mean one creator account and one payout wallet. It must also argue why Orb is the minimum sufficient credential (the prize page's requirement 3), for example against Passport/NFC or Selfie Check. |
| Successful path | Exists in code and tests with fake proofs. **Open:** a real run with a staging or sandbox app. |
| One alternative path | Exists in code: cancelled, expired, reused proof (409 `ALREADY_USED`), not configured, each leaves the account unverified. Credential-free `npm run e2e:world` covers the gating 403s, the not-configured sheet, and stubbed backend refusals. **Open:** capturing the cancel/expire/reuse paths with the real widget. |
| Debrief | **Open.** No IDKit debrief file exists. The template in `docs/TRACKS.md` is for Agent Pass. |

## Research notes (docs.world.org, read 2026-10-28)

- IDKit 4.x flow: backend signs an RP request (`signRequest`, never client side) giving `sig, nonce, created_at, expires_at`; client builds `rp_context {rp_id, nonce, created_at, expires_at, signature}` and renders `IDKitRequestWidget` with `app_id, action, environment, preset, allow_legacy_proofs`; backend forwards the IDKit result unmodified to `POST https://developer.world.org/api/v4/verify/{rp_id}` and accepts only `success === true` with matching `environment`.
- Environments for the request/verify body: `production` (default), `staging`, `sandbox`. The integrate page mentions the staging simulator (simulator.worldcoin.org); the Sandbox page says use `environment: sandbox` with the World ID (Sandbox) app (access requested in the Developer Portal; TestFlight / Play testing) and still post to the production verify endpoint.
- Nullifier: unique per (user, app/RP, action). Store it, reject reuse for the same action (docs suggest `NUMERIC(78,0)`). Docs recommend `handleVerify` so a backend refusal puts the widget in error (`failed_by_host_app`).
- Presets: `orbLegacy`, `proofOfHuman` documented; we use `orbLegacy` / `deviceLegacy` from the installed package with `allow_legacy_proofs`.
- Error codes (28) documented at /world-id/idkit/error-codes, incl. `user_rejected`, `max_verifications_reached`, `nullifier_replayed`, `rp_signature_expired`, `timeout`, `connection_failed`, `failed_by_host_app`.
- On-chain: v4 `WorldIDVerifier.verify(nullifier, action, rpId, nonce, signalHash, expiresAtMin, issuerSchemaId, credentialGenesisIssuedAtMin, uint256[5] proof)`; action = `keccak256(action) >> 8`. World Chain prod `0x00000000009E00F9FE82CfeeBB4556686da094d7`, staging `0x703a6316c975DEabF30b637c155edD53e24657DB`, **Arc prod (WorldIDSatellite) `0x304E14e4dC0508C0927e3b307a2C18422C07E394`**. Store nullifier in a mapping only after verify succeeds.
- Prize page: readable at https://ethglobal.com/events/mumbai/prizes (fetched 2026-11-06; the old `mumbai2026` paths return 404). Requirements are listed above. Server or onchain verification is accepted, so no on-chain deployment is required. The earlier Cannes 2026 analogue is no longer needed. Re-read the page before submission in case it changes.

## Requirement checklist

| Requirement | Source | Status |
| --- | --- | --- |
| Official IDKit 4.x integration (`@worldcoin/idkit` ^4.6) | PRD 6.2, docs | Done: `IDKitSheet.tsx` uses `IDKitRequestWidget` |
| RP context signed on the backend, key server-only | docs integrate | Done: `/api/worldid/rp-signature`, `createRpContext` |
| Proof validated server-side via `/api/v4/verify/{rp_id}`, `success` + environment checked | prize page req. 2, docs | Done in code (stubbed `fetch` in `web/src/lib/backend.integration.test.ts`); not run against a live portal with a real proof |
| Result forwarded unmodified; action/environment mismatch refused | docs verify API | Done: `RealWorldId`; refusals tested in `backend.integration.test.ts` |
| Account marked verified only after backend validation | PRD 6.2 | Done: `completeSignup` |
| One person one account: nullifier unique | PRD 6.2, docs nullifier | Done: `User.worldIdNullifier @unique`, normalised, P2002 race handled, 409 `ALREADY_USED`; swap on a verified account refused (`ACCOUNT_ALREADY_VERIFIED`) |
| World ID is a real constraint (gates features) | PRD 6.2, prize page "real trust moment" | Done: 403 `NOT_VERIFIED` on channel create/verify, deals, submissions, claim |
| Failure paths: cancelled, expired, already used, not configured leave action undone | PRD 6.2 | Done in UI text + backend; real widget error mapping in `IDKitSheet` |
| On-chain verification | docs (optional: the prize page accepts server or onchain) | Optional path built (`lib/worldid/onchain.ts`, env `WORLD_ID_ONCHAIN_VERIFIER`, `WORLD_ID_ONCHAIN_RPC_URL`), off unless both are set; arg mapping tested in `signup.integration.test.ts`; ABI types, rp id numeric form and the contract addresses above (copied from the docs) are unverified on a live contract. The escrow's `registerHuman` is a different, always-on rule: it checks the backend's signature, not a World ID proof (see above) |
| Escrow links wallet to human, only linked wallets are credited | commit `498f649` | Done in Solidity (`registerHuman`, `NotHuman`; Foundry tests exist, not re-run for this doc); backend calls it from `/api/worldid/verify` and a failure there is reported as `onchain.linked: false` but does not undo the DB verification. **Not deployed, not run on Arc.** |
| Verified-human badge | PRD | Done: `VerifiedMark` in Join and Account |
| Real run with staging/sandbox app and screenshots | judges | **Not done.** No real proof has run; needs a simulator or Sandbox app scan |
| Short integration debrief | PRD 6.2 | **Open.** No IDKit debrief written. `docs/TRACKS.md` has a template for Agent Pass only; write an IDKit one after the real run |
| Use `handleVerify` so backend refusal shows inside the widget | docs react | Not adopted; we verify after `onSuccess` and show our own message |
