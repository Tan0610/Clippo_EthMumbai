# Prize tracks to code

Status date: 2026-11-07, on `main` (`ab35b35`). Detailed status, evidence and open items are in each track document.

| Track | Where it lives | Status | Read |
| --- | --- | --- | --- |
| **Chainlink, Best workflow with CRE** ($1,500) | `cre/workflows/clippo-settlement/` (`main.ts`: cron and HTTP triggers, manifest, per-node YouTube read, median consensus, signed report, `writeReport`, receipt check; `youtube.ts`, `snapshot.ts`, `config.ts`); receiver `contracts/src/ClippoReportReceiver.sol`; escrow `reportViews` in `contracts/src/ClippoEscrow.sol`; manifest `web/src/lib/clip-manifest.ts` and `web/src/app/api/snapshots/clips/route.ts`; Confirmed views `web/src/lib/confirmed.ts`, the `ViewsReported` case in `web/src/lib/chain/indexer.ts`, `web/src/components/ConfirmedViews.tsx` | Built and simulated with the CRE CLI on real Arc, reading the real YouTube API: tx `0xa41f91da…c8409`, `reportedViews` 3. **Not** deployed on the CRE network; one node; our wallet sends the report through Chainlink's test forwarder; receiver not locked. | `tracks/CRE.md` |
| **World, Best Use of IDKit** ($2,500) | `web/src/components/IDKitSheet.tsx` (widget, `proofOfHuman` preset, credential rationale), `JoinView.tsx`, `AccountView.tsx`; `web/src/app/api/worldid/{rp-signature,verify}/route.ts`; `web/src/lib/worldid/*` (nullifier unique, 409 `ALREADY_USED`, error mapping); the on-chain link `registerHuman` via `web/src/lib/chain/clippo-wallet.ts`; the escrow refuses unlinked wallets (`NotHuman`) | Integrated and tested with doubles. **Not** run live: no real proof, `WORLD_ID_*` unset on the deployed site, debrief not filled. | `tracks/WORLD_IDKIT.md` |
| **World, Agent Pass** ($5,000; related, same partner pick) | Human gate: auth.world.org step-up (`web/src/lib/worldauth/*`, `POST /api/campaigns/:id/stepup/start`, `GET /api/auth/world/callback`, `GET /api/stepup/:attemptId`; body field `stepUpAttemptId`) guarding `POST /api/campaigns/:id/split` and `/attest`; after the gate passes the backend signs the proof the escrow checks | Written and tested against a local fake issuer. Never run against the real `auth.world.org`. | `tracks/WORLD_AGENT_PASS.md` |
| **Arc, Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio** ($3,000) | `contracts/src/ClippoEscrow.sol` (three payout modes, two-sided fees to a treasury, retention tranches, `disputeCredits` / `resolveDispute` with timeout release, `claim` / `claimFor`, `registerHuman` and signed approvals), `ClippoReportReceiver.sol`, `contracts/test/` (114 tests), `contracts/script/Deploy.s.sol`; web and API in `web/`; diagram `docs/architecture.svg` | Contracts, frontend and backend are real; the escrow is deployed on Arc testnet (simulation mode). Crosschain not built. **Arc Studio was not used by us** (Foundry and a forge script); the prize requires it. | `SUBMISSION_ARC.md`, `tracks/ARC.md` |

## Demo failure paths

Each path must leave the action undone. The backend enforces this; the UI shows the message.

| Path | How to trigger today | Expected result | Code |
| --- | --- | --- | --- |
| Cancelled | (Agent Pass also covers expired proposal, wrong approver, hash mismatch, already released, and the step-up rows below: see `tracks/agent-pass-demo.md`.) In the IDKit sheet press Cancel or Esc (`cancelled`). Show it with the real IDKit staging simulator and, for the split, the real auth.world.org step-up. Never record with `NEXT_PUBLIC_DEMO=1` (see `DEMO_SCRIPT.md`): its simulator buttons are for local UI checks only. The backend has no mock verifier any more, so an API call with `proof: "cancelled"` is sent to the real Developer Portal and refused | Creator stays unverified; or split not created (403 `WORLD_ID_DENIED`) | `WorldCheck.tsx` (`WORLD_FAIL`), `worldid/verify`, `split` routes |
| Expired | Let the IDKit check time out (`expired`) in the staging simulator | Same, nothing changed | same |
| Repeated | Real mode (staging simulator): the same human on a second account gives 409 `ALREADY_USED` (nullifier unique). A reused IDKit proof gives 409 `PROOF_REUSED`; a reused step-up gives 409 `STEPUP_CONSUMED` | Second account stays unverified | `AccountView/JoinView/DeskView.tsx`, `worldid/verify` route |
| Step-up cancelled at World | Press Cancel at the auth.world.org page | Split not released (403 `STEPUP_DENIED`) | `lib/worldauth/*`, callback route |
| Step-up expired | Let the attempt expire, then return | Split not released (410 `STEPUP_EXPIRED`) | same |
| Step-up identity mismatch | Complete with a different identity than the approver's | Split not released (403 `STEPUP_IDENTITY_MISMATCH`; same person approving as both campaigner and admin: `STEPUP_SAME_HUMAN`) | same |
| Step-up binding mismatch | Change the split after starting the attempt | Split not released (409 `STEPUP_BINDING_MISMATCH` for a human-built split; for an agent proposal the changed split is refused earlier with 409 `SPLIT_CHANGED`) | same |
| Unsupported assurance / stale auth | Return with a lower `acr` or an old auth time | Split not released (403 `STEPUP_ASSURANCE` / `STEPUP_STALE_AUTH`) | same |

The step-up rows are implemented in code and not yet run live.

After a failure, show: user `verified` still false (`GET /api/auth/me`), and for split, `GET /api/creator/earnings` shows no new payouts and no on-chain `approveSplit` was sent. Note that in real World mode, replayed proofs for the split action are rejected by the Developer Portal per action/nullifier rules; confirm behavior with a real app before claiming it in the video.

Other safety paths worth showing: AI verdicts `NEEDS_HUMAN` for injection (test double id `inject...`), off-topic `REJECT` (`bad...`), `EXCEEDS_POOL`, and escrow reverts (`PoolExceeded`, `NotApprover`, `BadState`, `NotHuman`, `HumanProofUsed`, `HumanProofExpired`, `BadHumanProof`). The reverts in the new set only exist in the enforcing escrow (deployed on Arc testnet in simulation mode at `0x1e05…26Ef`; these paths were not run there). The fake video ids `inject...` and `bad...` exist only in the test doubles (`web/src/test/doubles.ts`), not in the running app.

## Integration debrief (World ID Agent Pass, four required items)

Full drafts: `tracks/agent-pass-debrief.md` and `tracks/world-idkit-debrief.md`. Fill in only after a live run; do not invent numbers.

```
Project: Clippo
Product: World ID Agent Pass (auth.world.org step-up) as the human gate for releasing an AI-proposed split; IDKit for sign-up
1. Time to first success: FILL AFTER LIVE RUN
2. Friction encountered: FILL AFTER LIVE RUN
3. Missing capability or documentation: FILL AFTER LIVE RUN
4. The one improvement with the greatest impact: FILL AFTER LIVE RUN
```

Two-party release: for `CAMPAIGNER_AND_ADMIN`, the split route keeps a `SplitProposal` PENDING until both the campaigner and an admin approved the identical split (verified in `web/src/app/api/campaigns/[id]/split/route.ts`). Whether each approver needs a step-up result follows `WORLD_AUTH_POLICY`. Not run: this two-party path with the step-up against the real issuer, or the split flow end to end on real Arc.
