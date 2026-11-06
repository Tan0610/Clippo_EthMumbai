# Architecture

## System

```mermaid
flowchart LR
  subgraph Users
    CAMP[Campaigner]
    CRE_USER[Creator]
    ADM[Admin]
  end
  subgraph Web["web/ (Next.js)"]
    UI[Frontend pages + components]
    API["/api routes"]
    DB[(Prisma DB<br/>Postgres)]
    AI["AI verifier + campaign writer<br/>(Claude or Gemini)"]
    WID["World ID verifier<br/>(Developer Portal v4)"]
    PLAT["Platform adapter<br/>YouTube, X, Instagram (need API keys)"]
    ATT["Clippo backend wallet<br/>= humanAttestor"]
  end
  subgraph Arc["Arc testnet"]
    ESC[ClippoEscrow]
    RCV[ClippoReportReceiver]
    USDC[(USDC)]
    FWD[CRE Forwarder]
  end
  CRE["Chainlink CRE workflow<br/>clippo-settlement (cron)"]
  WORLD["World: IDKit (sign-up, approvals)"]
  IDP["World IdP OIDC step-up<br/>auth.world.org (agent's split)"]
  YT[YouTube Data API]

  CAMP & CRE_USER & ADM --> UI
  UI --> API
  API --> DB
  API --> AI
  API --> PLAT --> YT
  UI -. proof .-> WORLD
  UI -. step-up .-> IDP
  API --> WID --> WORLD
  API -. token check .-> IDP
  API --> ATT
  ATT -- "registerHuman, claimFor" --> ESC
  ATT -. "signed World ID approvals" .-> UI
  UI -- "fund, approveSplit, dispute, close (user wallet)" --> ESC
  ESC --- USDC
  CRE -- "GET /api/snapshots/daily" --> API
  CRE -- "signed report" --> FWD --> RCV -- "reportViews (only caller)" --> ESC
```

Dotted links have not been run against the real World Developer Portal or the real auth.world.org issuer. The CRE workflow has been simulated only (single node, local fork), not deployed. Nothing in this diagram has run end to end on real Arc with the enforcing escrow, which is not deployed.

Diagram note: `docs/architecture.svg` still shows the older design (no humanAttestor, registerHuman, disputes or OIDC step-up in the drawing; only the footer text mentions claimFor). Only its false text was fixed. Use the diagrams on this page for the current design.

## Money flow

Per-view campaign, current design (contract in `contracts/src/ClippoEscrow.sol`, commit 498f649).

```mermaid
sequenceDiagram
  autonumber
  participant B as Campaigner
  participant W as Web/API/DB
  participant K as Clippo wallet (humanAttestor)
  participant E as ClippoEscrow (Arc)
  participant A as Admin
  participant V as AI verifier
  participant C as Creator
  participant R as CRE + Receiver

  B->>W: Create campaign (DRAFT)
  B->>E: approve USDC, createCampaign (Funded, fee held)
  B->>W: POST /campaigns/:id/fund (receipt checked on-chain)
  C->>W: World ID check (IDKit), POST /worldid/verify
  W->>K: attest this human
  K->>E: registerHuman(wallet, proof) (only linked wallets can be credited)
  A->>W: POST /campaigns/:id/attest (fresh World ID, needed for high-value pools)
  A->>E: approveCampaign(id [, proof]) (Approved, fee to treasury)
  C->>W: POST /submissions (link)
  W->>V: transcript + story
  V-->>W: APPROVE / REJECT / NEEDS_HUMAN
  W->>W: store verdict + daily view snapshot
  R->>W: GET /snapshots/daily (cron)
  R->>E: report via forwarder -> reportViews (CRE-only caller, credits delta, capped by pool)
  Note over E: credits are tranches that mature after the retention window (default 7 days)
  B->>E: disputeCredits(id, creator) inside the window
  A->>E: resolveDispute(id, creator, upheld) (admin can never receive the funds)
  Note over E: if nobody settles in time, the credits release on schedule
  W->>K: POST /payouts/:id/claim
  K->>E: claimFor(id, creator) (Clippo pays gas, money goes only to the creator)
  B->>E: closeCampaign (after deadline + grace, anyone may call, unspent returns to campaigner)
```

HumanSplit campaigns have no CRE step. The credits come from `approveSplit`:

```mermaid
sequenceDiagram
  autonumber
  participant G as AI agent proposer
  participant P as Approver (campaigner, admin if two-party)
  participant W as Web/API
  participant I as auth.world.org (OIDC)
  participant K as Clippo wallet (humanAttestor)
  participant E as ClippoEscrow (Arc)

  G->>W: POST /campaigns/:id/split/propose (split hash)
  P->>I: step-up for this exact split (IDKit proof if the approver built the split)
  I-->>W: ID token (callback)
  W->>W: one-time token bound to user, campaign, split hash
  P->>W: POST /campaigns/:id/split (token)
  W->>K: sign HumanApproval(campaign, split hash, approver)
  K-->>P: signed proof
  P->>E: approveSplit(id, creators, amounts, proof) from own wallet
  Note over E: checks the humanAttestor signature, expiry, one-time use, and that each creator is a linked human
```

What is real in these flows:

- Contract: all steps above exist in `ClippoEscrow.sol` and have Foundry tests. The enforcing escrow (commit 498f649) is not deployed anywhere. The live site (`clippo-six.vercel.app/api/chain/config`) points at the older escrow `0xd8453c22996bea11598a3dbf05112675b945c39c`, which has no humanAttestor, disputes or claimFor. A second older escrow, `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`, also has code on Arc testnet (an earlier version of `docs/SUBMISSION_ARC.md` cited it). Both are the older design.
- Web: wallet transactions are real viem writes (`web/src/lib/chain/client.ts`, `useEscrow()` in `components/hooks.ts`). Fake tx hashes (`0xdemo...`) appear only in a `NEXT_PUBLIC_DEMO=1` build with no escrow configured. Without `ESCROW_ADDRESS` and without that flag, money-moving calls refuse with an error. The server reads every receipt on-chain before it updates the DB. The web code for the enforcing escrow (292d107, dfd0d51) has not run against real Arc. The live site still runs the older build.
- Who can move money: `reportViews` accepts only the report adapter (the CRE receiver). HumanSplit credits need a `humanAttestor` signature bound to the exact split. `humanAttestor` is fixed at deploy. Admins approve, reject and settle disputes but cannot send funds to themselves.
- World ID: IDKit v4 is wired in code (`IDKitSheet.tsx`, `/api/worldid/rp-signature`, `/api/worldid/verify`). It has not been run against the real Developer Portal. The OIDC step-up (`web/src/lib/agentpass/stepup.ts`, `/api/agentpass/stepup/*`) was tested against a local fake issuer only, not against auth.world.org and not in a browser. World ID proofs for the prize are mocked fake identities, not for production.
- HumanSplit: the backend does not send `approveSplit`. Each approver sends it from their own wallet. The DB split is `AWAITING_CHAIN` until the `SplitFinalized` event is read.
- Reject path: `rejectCampaign` on-chain refunds the full pool including the held fee. `reclaimUnapproved` does the same for the campaigner after the deadline if no admin approved.
- CRE: the workflow reads Clippo's frozen daily snapshot feed (`/api/snapshots/daily`), not YouTube directly. It simulates (6f74f7b). A live-feed run exits 0 with an empty no-op. A local `--broadcast` run on an anvil fork of Arc credited creators. Nothing was broadcast to real Arc, no workflow is deployed, and the simulator is single-node with no real consensus. `cre/workflows/clippo-settlement/config.production.json` still has a zero `receiverAddress`.
- Feed ids: the feed emits the numeric `onchainId` as `campaignId` (`web/src/lib/snapshots.ts`, 292d107), so the old id gap is closed in code. A run with real rows through a deployed receiver has not been done.

## Components to files

| Component | Files |
| --- | --- |
| Frontend | `web/src/app/(site)/*`, `web/src/components/*`, data seam `components/api.ts` |
| API | `web/src/app/api/**/route.ts`, `web/src/lib/{auth,http,domain,earnings,snapshots}.ts` |
| DB | `web/prisma/schema.prisma` (User, Channel, Campaign, Submission, Verdict, ViewSnapshot, Payout, and more) |
| AI verifier | `web/src/lib/ai/{verifier,llm,duplicates,campaign-writer}.ts` |
| World ID | `web/src/lib/worldid/index.ts`, `web/src/app/api/worldid/{verify,rp-signature}/route.ts`, `components/{WorldCheck,IDKitSheet}.tsx`; OIDC step-up: `web/src/lib/agentpass/stepup.ts`, `web/src/app/api/agentpass/stepup/{start,callback}/route.ts` |
| Backend wallet (humanAttestor) | `web/src/lib/chain/clippo-wallet.ts` (signs approvals, `registerHuman`, `claimFor`; key `HUMAN_ATTESTOR_PRIVATE_KEY`) |
| Platforms | `web/src/lib/platforms/{index,x,instagram}.ts`, `web/src/lib/youtube/index.ts` |
| Escrow | `contracts/src/ClippoEscrow.sol`, `ClippoReportReceiver.sol`, `MockUSDC.sol`, `script/Deploy.s.sol` |
| CRE | `cre/workflows/clippo-settlement/{main,snapshot}.ts`, feed `web/src/app/api/snapshots/daily/route.ts` |
