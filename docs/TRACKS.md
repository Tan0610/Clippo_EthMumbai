# Prize tracks to code

| Track | Where it lives | Status |
| --- | --- | --- |
| Chainlink, Best workflow with CRE | `cre/workflows/clippo-settlement/main.ts` (cron, HTTP read, consensus, signed report, `writeReport`), `snapshot.ts` (validate, canonicalise, ABI-encode), `workflow.yaml`, `config.staging.json`, `cre/project.yaml`; receiver `contracts/src/ClippoReportReceiver.sol`; data source `web/src/app/api/snapshots/{daily,latest,refresh}/route.ts`, `web/src/lib/snapshots.ts` | The workflow simulates with the CRE CLI (commit 6f74f7b). A run against the live feed exits 0 with an empty no-op. A local `--broadcast` run on an anvil fork of Arc credited creators (see `docs/tracks/CRE.md`). Not proven: nothing was broadcast to real Arc, no workflow is deployed, the simulator is single-node with no real consensus, and `config.production.json` still has a zero `receiverAddress`. The workflow reads Clippo's snapshot feed (`/api/snapshots/daily`), not YouTube directly. The receiver forwards to `reportViews`, the only way per-view credits and pool-share weights are set in the enforcing escrow (commit 498f649, not deployed). |
| World, Agent Pass | `web/src/app/api/campaigns/[id]/split/route.ts` (a fresh human check is required before the approval is signed), `web/src/lib/agentpass/stepup.ts` and `web/src/app/api/agentpass/stepup/{start,callback}/route.ts` (OIDC step-up at auth.world.org, commit 19205ba), `web/src/lib/chain/clippo-wallet.ts` (signs the approval as `humanAttestor`), `web/src/lib/worldid/index.ts`, `web/src/components/DeskView.tsx`, `WorldCheck.tsx` | The official Agent Pass product is the OIDC service at auth.world.org. Approving an agent's split needs a fresh step-up bound to the exact split. The backend issues a one-time token and signs a `HumanApproval` that `ClippoEscrow.approveSplit` verifies on-chain (enforcing escrow, not deployed). Not proven: the step-up has been tested against a local fake issuer only, never against the real issuer or in a browser. The older AgentKit/AgentBook code (`web/src/lib/agentpass/{agent,identity}.ts`) only attributes the proposal to an agent wallet and is not the official Agent Pass. World ID proofs for the prize are mocked fake identities, not for production. Also built: the agent is bound to a campaign at `/api/campaigns/:id/agent`, the AI proposes via `/split/propose` (attribution only), every refusal is logged in `AgentAudit` and shown in the "Agent Pass activity" panel (`AgentPassPanel`, desk and bench). See `docs/tracks/WORLD_AGENT_PASS.md`, `agent-pass-debrief.md`, `agent-pass-demo.md`. |
| World, Best Use of IDKit | `web/src/app/api/worldid/verify/route.ts` (validates server-side, stores unique nullifier, 409 `ALREADY_USED`), `lib/worldid/index.ts`, `components/{JoinView,AccountView,WorldCheck}.tsx`; `POST /api/submissions` requires a verified user | The IDKit v4 widget is wired in code (`components/IDKitSheet.tsx`, backend-signed request at `/api/worldid/rp-signature`). On a verified sign-up the backend calls `registerHuman` on the escrow so only linked wallets can be credited. Not proven: it has not been run against the real Developer Portal or in a browser with World App. See `docs/tracks/WORLD_IDKIT.md`. |
| Arc, Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio | `contracts/src/ClippoEscrow.sol` (PerView, HumanSplit, PoolShare, two-sided fees capped at 50 bps, reject refund, deadline, pool cap, `humanAttestor`-signed World ID approvals, `registerHuman`, CRE-only `reportViews`, disputes with automatic release, `claimFor`), `contracts/test/ClippoEscrow.t.sol`, `script/Deploy.s.sol`, `abi/` | Contract code is written and tested in Foundry (it was not built in Arc Studio). Two older-design escrows have code on Arc testnet: `0xd8453c22996bea11598a3dbf05112675b945c39c` (the live site `clippo-six.vercel.app/api/chain/config` points here) and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310` (an earlier version of `docs/SUBMISSION_ARC.md` cited it). The enforcing escrow (commit 498f649) is not deployed. Web wallet calls are real viem writes; the new web code has not run on real Arc, and the live site still runs the old build. Arc Studio project: not created yet (every Arc prize requires one). |

## Demo failure paths

Each path must leave the action undone. The backend enforces this; the UI shows the message.

| Path | How to trigger today | Expected result | Code |
| --- | --- | --- | --- |
| Cancelled | (Agent Pass also covers expired proposal, wrong approver, hash mismatch, already released: see `tracks/agent-pass-demo.md`.) In the IDKit sheet press Cancel or Esc (`cancelled`). Show it with the real IDKit staging simulator and, for the split, the real OIDC step-up build. Never record with `NEXT_PUBLIC_DEMO=1` (see `DEMO_SCRIPT.md`): its simulator buttons are for local UI checks only. The backend has no mock verifier any more, so an API call with `proof: "cancelled"` is sent to the real Developer Portal and refused | Creator stays unverified; or split not created (403 `WORLD_ID_DENIED`) | `WorldCheck.tsx` (`WORLD_FAIL`), `worldid/verify`, `split` routes |
| Expired | Let the IDKit check time out (`expired`) in the staging simulator | Same, nothing changed | same |
| Repeated | Real mode (staging simulator): the same human on a second account gives 409 `ALREADY_USED` (nullifier unique). A reused step-up or approval gives 409 `PROOF_REUSED` | Second account stays unverified | `AccountView/JoinView/DeskView.tsx`, `worldid/verify` route |

After a failure, show: user `verified` still false (`GET /api/auth/me`), and for split, `GET /api/creator/earnings` shows no new payouts and no on-chain `approveSplit` was sent. Note that in real World mode, replayed proofs for the split action are rejected by the Developer Portal per action/nullifier rules; confirm behavior with a real app before claiming it in the video.

Other safety paths worth showing: AI verdicts `NEEDS_HUMAN` for injection (test double id `inject...`), off-topic `REJECT` (`bad...`), `EXCEEDS_POOL`, and escrow reverts (`PoolExceeded`, `NotApprover`, `BadState`, `NotHuman`, `HumanProofUsed`, `HumanProofExpired`, `BadHumanProof`). The reverts in the new set only exist in the enforcing escrow, which is not deployed. The fake video ids `inject...` and `bad...` exist only in the test doubles (`web/src/test/doubles.ts`), not in the running app.

## Integration debrief template (World Agent Pass)

Copy into the submission and fill in after the real integration.

```
Project: Clippo
Product used: World Agent Pass (OIDC step-up at auth.world.org) (+ IDKit for creator sign-up)
Integration type: official / SDK version: ____

1. What the agent proposes: AI proposes a payout split for a HUMAN_SPLIT campaign.
2. Where the human check sits: before POST /api/campaigns/:id/split creates payouts / before escrow approveSplit.
3. Who verifies: campaigner (and admin if CAMPAIGNER_AND_ADMIN) with a fresh check per approval.
4. Backend validation: endpoint ____, what is verified (nullifier, action, signal = hash of split) ____.
5. Journey tested: success [ ] cancelled [ ] expired [ ] repeated/reused [ ]; each leaves action undone [ ].
6. Setup time: ____ ; Docs clarity (1-5): ____
7. What worked well: ____
8. Friction / bugs / missing docs: ____
9. Fake-identity limitation: Agent Pass proofs use fake identities; demo only.
10. What we would do next: run the step-up against the real issuer, deploy the enforcing escrow and run the split end to end on Arc. (Binding to the exact split and two-party state for CAMPAIGNER_AND_ADMIN are already built.)
```

For `CAMPAIGNER_AND_ADMIN`, the split stays PENDING until both approvers approve the identical split (`split/route.ts`; the contract enforces the same in `approveSplit`). Known limitation to disclose: this two-party path, the step-up and the new escrow have not been run end to end on real Arc or against the real issuer.
