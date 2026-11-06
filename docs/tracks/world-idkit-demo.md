# World IDKit demo clicks (full walkthrough, about 90 seconds)

**Status: not rehearsed.** No real World ID proof has run in this repo, so steps 3 to 5 have never been done with a real scan. This is the full walkthrough. The submission video uses the cut-down 30 s World ID segment from `docs/DEMO_SCRIPT.md` (one failure, then verify), which also owns the video rule (2 to 4 minutes, hard cap 4:00, 720p or better, no AI voiceover, not sped up). The proofs here come from a simulator or Sandbox identity, not a production identity. The credential asked for is Orb (default; `NEXT_PUBLIC_WORLD_LEVEL=device` changes it).

Prereq: `.env.local` has `WORLD_ID_APP_ID`, `WORLD_ID_RP_ID`, `WORLD_ID_SIGNING_KEY`, `WORLD_ID_ACTION=clippo-creator-signup`, `WORLD_ID_ENVIRONMENT=staging` (or `sandbox`), and `NEXT_PUBLIC_DEMO` unset. Never record the failure paths (or anything else) with `NEXT_PUBLIC_DEMO=1`: that mode shows sample data. Two wallets in the browser, one phone with the staging simulator or the World ID Sandbox app.

1. Wallet A: open /join, pick "I clip", connect. Show step 2 greyed out. Optionally show `POST /api/channels` returning 403 `NOT_VERIFIED`.
2. Press "Verify with World ID". Show the IDKit QR. Close the widget: it shows "You closed the check before it finished. Nothing was changed." (declining in World App shows "You declined the request in World App."). Account still unverified (`/api/auth/me`).
3. Press again, approve in the simulator/World app. Badge "Verified with World ID" appears, step 2 unlocks. Show the backend call: `/api/worldid/verify` 200, response `mode: real` plus an `onchain` field. `onchain.linked` is `true` only if the backend wallet (`HUMAN_ATTESTOR_PRIVATE_KEY`) and a deployed enforcing escrow are configured; otherwise it is `false` with a reason, and the account is still verified in the database.
4. Prove a channel, submit a clip: allowed.
5. Wallet B (new account): /join, verify with the same World ID. Show "This World ID is already linked to another Clippo account", account B unverified, channel proof refused (403).
6. Optional: expired (let the QR time out) shows "The check timed out before it finished."; unset `WORLD_ID_APP_ID` shows the "not configured" sheet.
7. Close with the debrief and, if enabled, the on-chain check (`WORLD_ID_ONCHAIN_VERIFIER`). Open items: the IDKit debrief and the credential rationale are not written yet (see `docs/tracks/WORLD_IDKIT.md`). The enforcing escrow (`registerHuman`, only linked wallets are credited) is not deployed, so do not show it as live.

Automated, credential-free: `npm run e2e:world` (dev server + DB running) checks gating 403s and the not-configured sheet, and that backend refusals leave the account unverified. It cannot scan a QR: steps 3 and 5 need a real app.

Tests: `npx vitest run src/lib/worldid` (uses the `FakeWorldId` double and needs the local test database). The stubbed-`fetch` check of the Developer Portal call is in `src/lib/backend.integration.test.ts`. Neither was re-run for this edit.
