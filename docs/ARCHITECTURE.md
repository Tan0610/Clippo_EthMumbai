# Architecture

![Clippo architecture](architecture.svg)

`architecture.svg` is the picture of the design below. The two Mermaid diagrams (system, money flow) say the same thing in text form. Numbers 1 to 8 on the green arrows in the SVG are the money-flow steps.

Status in one line: the escrow, the receiver and one CRE report ran on real Arc testnet. The CRE workflow is simulated with the CLI and not deployed on the CRE network, the receiver is in simulation mode, the deployed site is seeded with labelled `[SEED]` rows, and World ID has not run against the real portal or issuer.

## System

```mermaid
flowchart LR
  subgraph Users
    BRAND["Brand (campaigner)"]
    CREATOR[Creator]
    ADMIN[Admin]
  end
  subgraph Web["Web app: Next.js on Vercel (clippo-cre.vercel.app)"]
    UI["Frontend (pages, IDKit sheet, viem wallet writes)"]
    API["API routes (web/src/app/api)"]
    DB[("Postgres on Neon, via Prisma")]
    IDX["Indexer (cron chain-sync)"]
    ATT["Clippo backend wallet (the attestor)"]
  end
  subgraph Services["Off-chain services"]
    AI["AI verifier (Claude or Gemini)"]
    IDK["World IDKit (proof of human)"]
    OIDC["World auth.world.org (OIDC step-up)"]
    YT["YouTube Data API (external)"]
  end
  subgraph Arc["Arc testnet (chain 5042002)"]
    ESC["ClippoEscrow"]
    USDC[("USDC")]
    RCV["ClippoReportReceiver (simulation mode)"]
    FWD["Chainlink forwarder (test forwarder)"]
  end
  subgraph ChainlinkCRE["Chainlink CRE (simulated with the CLI, not deployed)"]
    WF["clippo-settlement workflow"]
  end

  BRAND & CREATOR & ADMIN --> UI
  UI --> API
  API --> DB
  API -- "verdict on each clip" --> AI
  UI -. "proof" .-> IDK
  API -. "verify proof" .-> IDK
  UI -. "step-up redirect" .-> OIDC
  API -. "code exchange, ID token check" .-> OIDC
  API -. "own view poll (Pending views)" .-> YT
  API --> ATT
  ATT -- "registerHuman, claimFor" --> ESC
  UI -- "fund, approve, dispute, close, claim (user's own wallet)" --> ESC
  ESC --- USDC
  ESC -. "events" .-> IDX --> DB
  WF -- "GET /api/snapshots/clips (which clips)" --> API
  WF -. "videos and channels (key = CRE secret)" .-> YT
  WF -- "signed report" --> FWD --> RCV -- "reportViews (only caller)" --> ESC
```

Solid arrows are calls or transactions, dotted arrows are reads, polls or calls to services outside Clippo. An agent proposes, it never moves money alone: the AI verdict only gates a clip, and a HumanSplit needs a human step-up and a signed approval. The web-to-escrow calls are real viem transactions when `ESCROW_ADDRESS` is set. Without it the chain routes answer 503 `NOT_CONFIGURED`.

## Money flow

Per-view campaign (contract in `contracts/src/ClippoEscrow.sol`). Numbers in square brackets match the numbered arrows in `architecture.svg`.

```mermaid
sequenceDiagram
  participant B as Brand
  participant A as Admin
  participant C as Creator
  participant W as Web, API, DB
  participant V as AI verifier
  participant K as Clippo wallet (attestor)
  participant E as ClippoEscrow (Arc)
  participant R as CRE workflow and receiver
  participant Y as YouTube Data API

  B->>E: [1] approve USDC, createCampaign (pool funded, fee held)
  B->>W: POST /campaigns/:id/fund (receipt checked on-chain)
  C->>W: World ID check (IDKit), POST /worldid/verify
  W->>K: attest this human
  K->>E: registerHuman(wallet, proof) (only linked wallets can be credited)
  A->>W: POST /campaigns/:id/attest (fresh World ID, needed for high-value pools)
  A->>E: [2] approveCampaign(id, proof if needed) (fee goes to the treasury)
  C->>W: [3] POST /submissions (clip link)
  W->>V: [4] transcript and the brand's brief
  V-->>W: APPROVE, REJECT or NEEDS_HUMAN
  W->>W: store the verdict and a daily view snapshot (Pending views)
  R->>W: [5] GET /api/snapshots/clips (which clips to check)
  R->>Y: each node reads videos and channels
  R->>R: keep clips whose channel bio holds clippo:WALLET, take the median views
  R->>E: [5] signed report via forwarder and receiver, then reportViews
  Note over E: [6] credits are tranches that mature after the retention window (default 7 days)
  W->>E: indexer reads ViewsReported (shown as Confirmed views with a proof link)
  B->>E: disputeCredits(id, creator) inside the window
  A->>E: resolveDispute(id, creator, upheld) (an admin can never receive the funds)
  Note over E: if nobody settles in time, the credits release on schedule to the creator
  W->>K: [7] POST /payouts/:id/claim
  K->>E: claimFor(id, creator) (Clippo pays gas, money goes only to the creator)
  B->>E: [8] closeCampaign (anyone can call after deadline and grace, unspent pool returns to the brand)
```

HumanSplit campaigns have no CRE step. The credits come from `approveSplit`:

```mermaid
sequenceDiagram
  participant G as AI agent proposer
  participant C as Creator
  participant P as Approver (brand, plus admin if two-party)
  participant W as Web, API
  participant I as auth.world.org (OIDC)
  participant K as Clippo wallet (attestor)
  participant E as ClippoEscrow (Arc)

  G->>W: POST /campaigns/:id/split/propose (split hash)
  P->>W: POST /campaigns/:id/stepup/start (this exact split)
  W-->>P: attemptId and authorizeUrl (state, nonce, PKCE)
  P->>I: step-up at auth.world.org (fresh login)
  I-->>W: GET /api/auth/world/callback (code)
  W->>W: exchange the code, validate the ID token, bind the attempt to user, campaign and split hash
  P->>W: POST /campaigns/:id/split (stepUpAttemptId, or worldIdProof if the approver built the split)
  W->>K: sign HumanApproval(campaign, split hash, approver)
  K-->>P: signed proof
  P->>E: approveSplit(id, creators, amounts, proof) from their own wallet
  Note over E: checks the attestor signature, expiry, one-time use, and that each creator is a linked human
  C-->>E: creator or Clippo wallet claims with claim or claimFor
```

## What is real, simulated, seeded or unproven

| Piece | Status |
| --- | --- |
| Contracts: `ClippoEscrow` and `ClippoReportReceiver` | Real. Foundry tests (114 passed, BUILD_LOG 21) and built with `forge script`, not Arc Studio. Deployed on Arc testnet: escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`, receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd` (BUILD_LOG 17, read back from the chain). Two older escrows from the earlier design (no attestor, disputes or `claimFor`) are also on Arc testnet and are not used: `0xd8453c22996bea11598a3dbf05112675b945c39c`, `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`. |
| Receiver | Simulation mode. It trusts Arc's Chainlink test forwarder and our own simulation wallet as the workflow owner, and its workflow check is skipped for the mock forwarder. It is not locked. The locked setup (real forwarder, workflow id, `lockConfig`) needs a deployed workflow. |
| CRE workflow | Simulated with the CRE CLI, not deployed on the CRE network. One report ran on real Arc testnet through the receiver (tx `0xa41f91daf5431332ecaf1fbdfbf7f8ca13a38d39de8c41d0c1291f229f5c8409`, BUILD_LOG 18, reading the real YouTube video and channel bio). It was one node, the report was sent by our simulation wallet through the test forwarder, and the manifest came from a local mock backend. `cre/workflows/clippo-settlement/config.production.json` holds the real receiver and the deployed site URL. |
| Deployed site (https://clippo-cre.vercel.app) | Real code on Vercel with a Neon database, reading the real escrow on Arc. The user, channel, campaign, clip and approval rows are seeded and labelled `[SEED]` (`web/scripts/seed-cre-demo.mjs`). The views, the credit and the proof link are real: the campaign page shows Confirmed views from the real CRE transaction (BUILD_LOG 20). The AI verifier, World ID, admin list and blob storage are not configured there. It was redeployed from `main` at `ab35b35` on 2026-11-07 (after the merge with the teammate's World ID step-up; that migration is applied on its database). The live manifest lists a clip only after its approval day has ended (UTC). |
| Confirmed and Pending views | The indexer reads `ViewsReported` events. Pages show Confirmed views (on-chain, with a proof link to the Arc explorer) next to Pending views (Clippo's own YouTube poll, not yet confirmed). Proven on a local fork and on the deployed site. |
| Wallet transactions from the app | Real viem calls when `ESCROW_ADDRESS` is set. Fund, approve and claim from the app have not run against real Arc. Fake hashes (`0xdemo...`) appear only in a `NEXT_PUBLIC_DEMO=1` build with no escrow. The server reads every receipt on-chain before it updates the DB. |
| `registerHuman`, approvals with proof, disputes, `claimFor`, HumanSplit | In the contracts, tested, and wired in the web code. Not run end to end on real Arc. |
| World IDKit (proof of human) | Wired in code (`IDKitSheet.tsx`, `/api/worldid/rp-signature`, `/api/worldid/verify`). Not run against the real Developer Portal. World ID proofs for the prize are mocked or staging identities, not for production. |
| World auth.world.org OIDC step-up | Implemented and tested with doubles only. It has not run against the real issuer, because the client registration is blocked. |
| AI verifier | Code and tests. Not configured on the deployed site. |
| Not built or not used | Crosschain transfers, Arc Studio, a mobile app. `ClippoReferral` and `ClippoCreatorProfile` modules exist but are off by default (feature flags) and are not part of this design. |

Who can move money:

- `reportViews` accepts only the report adapter (the CRE receiver, set once). The receiver accepts only the Chainlink forwarder plus its workflow checks.
- HumanSplit credits need an attestor signature bound to the exact split. The attestor (`humanAttestor`) is fixed at deploy and cannot move funds or choose who gets paid.
- Only wallets linked to a human (`registerHuman`, `humanOf`) can be credited.
- A payout, by `claim` or `claimFor`, can only reach the creator who earned it. Admins approve, reject and settle disputes but can never receive funds.
- PerView credits are tranches that wait the retention window (7 days by default). The brand can dispute them in that window. If nobody settles a dispute in time, the credits release to the creator.
- Reject refunds the full pool including the held fee. `reclaimUnapproved` does the same after the deadline if no admin approved. `closeCampaign` returns the unspent pool to the brand.

## Components to files

| Component | Files |
| --- | --- |
| Frontend | `web/src/app/(site)/*`, `web/src/components/*`, data seam `components/api.ts`, wallet writes `components/hooks.ts` (`useEscrow()`) and `web/src/lib/chain/client.ts` |
| API | `web/src/app/api/**/route.ts`, `web/src/lib/{auth,http,domain,earnings,snapshots}.ts` |
| Database | `web/prisma/schema.prisma` (Postgres, Neon in production; models include User, Channel, Campaign, Submission, Verdict, ViewSnapshot, ViewsReport, Payout and more) |
| AI verifier | `web/src/lib/ai/{verifier,llm,duplicates,campaign-writer}.ts` (provider switch `LLM_PROVIDER`: Anthropic or Gemini) |
| World IDKit | `web/src/lib/worldid/index.ts`, `web/src/app/api/worldid/{verify,rp-signature}/route.ts`, `components/{WorldCheck,IDKitSheet}.tsx` |
| World OIDC step-up | `web/src/lib/worldauth/*`, `web/src/app/api/campaigns/[id]/stepup/start/route.ts`, `web/src/app/api/auth/world/callback/route.ts`, `web/src/app/api/stepup/[attemptId]/route.ts`, `components/StepUpApprove.tsx` |
| Clippo backend wallet (attestor) | `web/src/lib/chain/clippo-wallet.ts` (signs approvals and `registerHuman`, sends `claimFor`, key `HUMAN_ATTESTOR_PRIVATE_KEY`), used by `web/src/app/api/payouts/[id]/claim/route.ts` and `web/src/app/api/campaigns/[id]/split/route.ts` |
| Own view poll | `web/src/lib/youtube/index.ts`, `web/src/lib/platforms/{index,x,instagram}.ts` (Pending views) |
| Escrow and receiver | `contracts/src/ClippoEscrow.sol`, `ClippoReportReceiver.sol`, `MockUSDC.sol` (tests only), `script/Deploy.s.sol` (Foundry + `forge script`) |
| Disputes | `contracts/src/ClippoEscrow.sol` (`disputeCredits`, `resolveDispute`), `web/src/app/api/chain/disputes/route.ts`, `components/OnchainDisputes.tsx` |
| CRE workflow | `cre/workflows/clippo-settlement/{main,config,snapshot,youtube}.ts`, manifest `web/src/app/api/snapshots/clips/route.ts` (the older frozen feed `web/src/app/api/snapshots/daily/route.ts` is no longer read by the workflow) |
| Indexer and Confirmed views | `web/src/lib/chain/indexer.ts` (reads escrow events, run by the `chain-sync` cron and `POST /api/chain/sync`), `web/src/lib/confirmed.ts`, `web/src/components/ConfirmedViews.tsx` |
| Deployed-site seed | `web/scripts/seed-cre-demo.mjs`, steps in `docs/CRE_DEPLOY.md` |
