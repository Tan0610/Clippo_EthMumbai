# Clippo contracts

Foundry project. `ClippoEscrow` holds many independent USDC (6 decimals) campaigns; `ClippoReportReceiver` is the reporting adapter that Chainlink CRE writes to.

**Status.** This README describes the enforcing escrow in HEAD (commit `498f649`): no admin or owner key can choose who gets paid. It is **not deployed anywhere**. The two escrows on Arc testnet (`0xd8453c22996bea11598a3dbf05112675b945c39c`, which the live site uses, and `0xc7b9588ee0a4bff31e17ece1141ea404ad05e310`, cited by `docs/SUBMISSION_ARC.md`) are the OLD design and have none of the World ID, CRE, dispute or `claimFor` logic below. The contracts were written and tested in Foundry; Arc Studio has not been used yet.

```
forge build && forge test
forge inspect ClippoEscrow abi --json > abi/ClippoEscrow.json   # ABI export (already committed in abi/)
```

Deps (git submodules under `lib/`): OpenZeppelin v5.7, forge-std. Solc 0.8.28 (pragma `^0.8.24`).

## Lifecycle

```
Funded --admin approve (before deadline)--> Approved --close (anyone, after deadline + grace)--> Closed
   |--admin reject--> Rejected (terminal, full refund incl. fee)
   \--campaigner reclaimUnapproved (after deadline)--> Rejected (full refund incl. fee)
```

Admin reject is available any time after funding and before approval; the campaigner gets back `grossFunded` (pool **and** fee) and nothing is accrued to the treasury. If no admin approves before the deadline, the campaigner takes the money back with `reclaimUnapproved`. High-value campaigns can be rejected without any attestation.

**No admin or owner key can choose who gets paid** (the campaigner picks HumanSplit recipients, and the `humanAttestor` decides which wallets count as humans; see the `@dev` note in `ClippoEscrow.sol`):
- PerView credits and PoolShare weights come only from the report adapter (Chainlink CRE). The adapter can be set once (`AdapterAlreadySet`), so the owner cannot swap CRE for its own reporter.
- HumanSplit credits need a fresh World ID approval, signed by the immutable `humanAttestor` (Clippo's backend key) and bound to the exact split and the approver.
- Only wallets linked to a unique World ID human (`registerHuman`) can be credited (`NotHuman`).
- Admins approve or reject campaigns and settle disputes. Neither can send funds to an admin.

The World ID check itself happens off-chain. The contract verifies an EIP-712 signature from `humanAttestor`, so that key must be trusted to sign honestly. It cannot move money by itself.

- `createCampaign` pulls `poolAmount` USDC from the campaigner (needs prior `approve`). The campaigner fee (`feeBps` of `poolAmount`) is deducted from it: usable pool = `poolAmount - fee`.
- The fee is held in escrow while `Funded` and only accrues to the treasury on approval, so rejection refunds the full `poolAmount`.
- Nothing can be reported, split or claimed before approval.
- Fees: per side, in bps, owner-set, **max 50 (0.5%)**, default 25/25. Each campaign snapshots the rates at creation.
- Retention (default 7 days) and grace (default 1 day) are also snapshotted per campaign at creation, so the owner cannot change a live campaign.
- Reports and splits are accepted until `deadline + grace`. Close: anyone, after `deadline + grace` (so creators can force it). Unallocated pool returns to the campaigner. Creator credits remain claimable after close.

## Modes

| Mode | Credit rule |
| --- | --- |
| `PerView` (0) | Adapter calls `reportViews(id, creator, cumulativeViews)`. Credits `(delta * ratePer1kViews) / 1000`, capped by remaining pool. Stale/duplicate (non-increasing) reports are no-ops. The creator must be a linked human. Reports rejected after `deadline + grace`. **Retention window:** each credit is a tranche that becomes claimable only `retention` (campaign snapshot of `retentionPeriod`, default 7 days, owner-configurable 0..30 days) after it was credited; `claimable()` and `claim()` only count matured tranches (same-UTC-day credits share one tranche stamped with the latest credit time, so they never mature early, except that a disputed tranche never grows). Credits still count against the pool (`pendingTotal` = credited - claimed). HumanSplit/PoolShare credits are not delayed. The campaigner can dispute unreleased tranches (see Disputes). |
| `HumanSplit` (1) | `approveSplit(id, creators[], amounts[], proof)`, sum <= remaining pool, every creator a linked human. Always needs a World ID `HumanProof` for this exact split. If `requireAdminApproval` is false the campaigner alone finalizes (an admin who is not the campaigner cannot); if true, the campaigner AND an admin must each submit the identical split with proofs from two different humans (`SameHuman`). A different split replaces the pending one and resets approvals. Multiple rounds allowed within the pool. |
| `PoolShare` (2) | The adapter's `reportViews` sets each creator's weight to their cumulative views (there is no `setWeights` any more). At `closeCampaign` the pool is split pro rata; rounding dust is refunded to the campaigner; no weights = full refund. Claims open only after close. |

## Disputes

`disputeCredits(id, creator)`: the campaigner challenges a creator's PerView credits that are still inside the retention window (state `Approved` or `Closed`). Disputed credits cannot be claimed while the dispute is open. A tranche can be disputed only once. Credits that already matured stay with the creator.

`resolveDispute(id, creator, upheld)`: an admin settles it. Upheld: the disputed credits go back to the pool, or straight to the campaigner if the campaign is already closed. Not upheld: they release on their normal schedule. The dispute stays open for one retention period (`resolveBy`). If no admin settles it by then, it lapses and the credits release to the creator on schedule (automatic release). An admin can never receive the disputed funds.

## ClippoEscrow

State-changing

| Function | Access |
| --- | --- |
| `createCampaign(Mode mode, uint256 ratePer1kViews, uint256 poolAmount, uint64 deadline, bool requireAdminApproval, string metadataURI) returns (uint256 id)` | anyone |
| `registerHuman(wallet, HumanProof proof)` | anyone may relay; proof signed by `humanAttestor` (EIP-712 `HumanRegistration`). One human, one wallet |
| `approveCampaign(id)` | admin; reverts `AttestationRequired` on high-value campaigns |
| `approveCampaign(id, HumanProof proof)` | admin; spends a one-time World ID approval (EIP-712 `HumanApproval`), records it (`approvalAttestation[id]`, event `HumanAttested` kind 1). Mandatory when `getCampaign(id).highValue` |
| `rejectCampaign(id)` | admin (state `Funded`) |
| `reclaimUnapproved(id)` | campaigner, after the deadline, if still `Funded` |
| `reportViews(id, creator, cumulativeViews)` | `reportAdapter` only |
| `approveSplit(id, creators[], amounts[], HumanProof proof)` | campaigner (or an admin when `requireAdminApproval`); proof is mandatory and bound to the split hash and the caller (`splitAttestation[id][approver]`, `HumanAttested` kind 2) |
| `disputeCredits(id, creator)` | campaigner (PerView only) |
| `resolveDispute(id, creator, upheld)` | admin |
| `closeCampaign(id)` | anyone, after `deadline + grace` |
| `claim(id) returns (uint256 net)` | creator; pays all claimable credit minus creator fee |
| `claimFor(id, creator) returns (uint256 net)` | anyone (Clippo's wallet does and pays the gas); the money can only go to `creator` |
| `withdrawFees()` | anyone; sends `treasuryAccrued` to `treasury` |
| `setAdmin(addr, bool)`, `setFees(campaignerBps, creatorBps)`, `setTreasury(addr)` | owner |
| `setReportAdapter(addr)` | owner, once only |
| `setRetentionPeriod(seconds)` (max 30 days), `setGracePeriod(seconds)` (max 7 days), `setHighValueThreshold(usdcUnits)` | owner; apply to campaigns created afterwards |

**High-value flag.** At creation `getCampaign(id).highValue = pool > highValueThreshold` (net pool, default `1_000e6` = $1,000; snapshotted per campaign). A high-value campaign cannot be approved without a World ID `HumanProof`. The contract cannot run World ID itself: the backend verifies a fresh World ID result off-chain and signs the proof with `humanAttestor`. The approver submits it on-chain, where the signature is checked, the digest is marked used (`HumanProofUsed` on replay), and the proof's human hash is stored and emitted, so the human confirmation is auditable and cannot be skipped by calling the plain functions.

Views: `getCampaign(id)` (struct ends with `bool highValue, uint64 retention, uint64 grace`), `claimable(id, creator)` (matured only for PerView), `pendingTotal(id, creator)`, `tranches(id, creator)`, `disputes(id, creator)`, `humanOf(wallet)`, `walletOfHuman(human)`, `usedApproval(digest)`, `humanAttestor`, `approvalAttestation(id)`, `splitAttestation(id, approver)`, `retentionPeriod`, `gracePeriod`, `highValueThreshold`, `MAX_RETENTION`, `MAX_GRACE`, `MAX_FEE_BPS`, `MAX_BATCH`, `remainingPool(id)`, `weightCreators(id)`, `credited`, `claimed`, `reportedViews`, `weights`, `totalWeight`, `pendingSplit`, `isAdmin`, `campaignCount`, `treasuryAccrued`, `campaignerFeeBps`, `creatorFeeBps`, `reportAdapter`, `treasury`, `usdc`.

Events

`AdminSet`, `FeesSet`, `TreasurySet`, `ReportAdapterSet`, `CampaignCreated(id, campaigner, mode, rate, grossFunded, campaignerFee, pool, deadline, requireAdminApproval, metadataURI)`, `CampaignApproved`, `CampaignRejected`, `ViewsReported(id, creator, cumulativeViews, deltaViews, credited)`, `SplitProposed`, `SplitApproved`, `SplitFinalized`, `CreatorCredited`, `CampaignClosed(id, by, refundedToCampaigner)`, `Claimed(id, creator, gross, fee, net)`, `FeesWithdrawn`, `RetentionSet(retentionPeriod)`, `GraceSet(gracePeriod)`, `HighValueThresholdSet(threshold)`, `HumanAttested(campaignId, approver, attestation, kind)` (kind 1 = campaign approval, 2 = split approval), `HumanRegistered(wallet, human)`, `CreditsDisputed(id, creator, amount, resolveBy, startIndex, endIndex)`, `DisputeResolved(id, creator, by, upheld, amount)`. (`WeightsSet` no longer exists.)

Errors: `NotAdmin`, `NotAdapter`, `NotApprover`, `NotCampaigner`, `BadState(State)`, `BadMode`, `BadParams`, `FeeTooHigh`, `DeadlinePassed`, `DeadlineNotReached`, `NothingToClaim`, `PoolExceeded`, `AttestationRequired`, `AdapterAlreadySet`, `NotHuman`, `BadHumanProof`, `HumanProofExpired`, `HumanProofUsed`, `HumanAlreadyLinked`, `SameHuman`, `DisputeOpen`, `NoOpenDispute`, `NothingToDispute`.

Security: `ReentrancyGuard` on all fund-moving functions, `SafeERC20`, pull payments, checks-effects-interactions, EIP-712 signatures from `humanAttestor`.

## ClippoReportReceiver (reporting adapter)

Implements Chainlink's `IReceiver` (`onReport(bytes metadata, bytes report)` + ERC165). `report = abi.encode((uint256 campaignId, address creator, uint256 cumulativeViews)[])`. Each item is passed to `ClippoEscrow.reportViews` in a try/catch: bad items emit `ItemFailed` and do not block the batch; `ReportProcessed(items, failed)` is emitted per report. ABI: `abi/ClippoReportReceiver.json`.

**Authentication (follows Chainlink's `ReceiverTemplate`).** The production KeystoneForwarder forwards reports from ANY workflow of ANY user, so `msg.sender == forwarder` is not enough. `onReport` checks, in order: (1) `msg.sender == forwarder` (`NotForwarder`); (2) `expectedWorkflowOwner` must be set, else revert `WorkflowOwnerNotConfigured` (fail closed); (3) `metadata.length >= 62` (`BadMetadata`; the production forwarder passes 64 bytes); (4) decoded workflow owner == `expectedWorkflowOwner` (`InvalidWorkflowOwner`); (5) if set, workflow id == `expectedWorkflowId` (`InvalidWorkflowId`); (6) if set, workflow name == `expectedWorkflowName` (`InvalidWorkflowName`). Metadata layout: `[0:32)` workflowId bytes32, `[32:42)` workflowName bytes10, `[42:62)` workflowOwner address, `[62:64)` reportId bytes2. Owner-only setters, each emitting an event: `setForwarder` (`ForwarderSet`), `setExpectedWorkflowOwner` (`ExpectedWorkflowOwnerSet`), `setExpectedWorkflowId` (`ExpectedWorkflowIdSet`, 0 = off), `setExpectedWorkflowName(bytes10)` (`ExpectedWorkflowNameSet`, 0 = off), `setWorkflowCheckSkipped` (`WorkflowCheckSkippedSet`). Constructor: `(escrow, forwarder, owner, expectedWorkflowOwner, insecureSkipWorkflowCheck)`. ERC165: `IReceiver` and `IERC165`.

**Simulation guard and lock.** While `workflowCheckSkipped` is on, steps (2) to (6) are replaced by one check: if `expectedWorkflowOwner` is set, `tx.origin` must equal it (`NotSimulationOperator`), so only the key running `cre workflow simulate --broadcast` can push reports through the open mock forwarder. `lockConfig()` (owner, once) freezes every setter for good (`ConfigIsLocked`) and reverts with `CannotLockWhileSkipping` unless the skip flag is off and a workflow owner is set. Note that the forwarder swallows an `onReport` revert, so the CRE workflow reads the receipt for `ReportProcessed` (see `../cre/README.md`).

Workflow name bytes10: `0x` + hex of the first 10 hex chars of `sha256(name)` as ASCII, e.g. `echo -n "clippo-settlement" | sha256sum | cut -c1-10 | xxd -p` (name is only meaningful together with the owner, which is always required).

Simulation vs production:
- **Production** (KeystoneForwarder, e.g. Arc `0x76c9cf548b4179F8901cda1f8623568b58215E62`): set `EXPECTED_WORKFLOW_OWNER` to the address of the CRE account that deploys the workflow (shown by `cre whoami` / the workflow owner in the CRE dashboard), plus `EXPECTED_WORKFLOW_ID` (known after `cre workflow deploy`; set later via `setExpectedWorkflowId` since the id is only known after deploy). Leave `workflowCheckSkipped` false.
- **Simulation** (`cre workflow simulate --broadcast` through the Arc MockKeystoneForwarder `0x6E9EE680ef59ef64Aa8C7371279c27E496b5eDc1`): per the CRE docs the mock forwarder does NOT supply workflow metadata, so metadata validation cannot pass. Deploy with `INSECURE_SKIP_WORKFLOW_CHECK=true` (or call `setWorkflowCheckSkipped(true)`), then before going live call `setForwarder(<KeystoneForwarder>)`, `setExpectedWorkflowOwner(...)` and `setWorkflowCheckSkipped(false)`. The sender check still applies in simulation mode, plus the `tx.origin` check above when an owner is set. Local anvil/mock scripts pass `ALLOW_ANY_CHAIN=true`, which defaults the skip flag to true so they keep working unchanged.

## Deploy (Arc testnet)

Network: RPC `https://rpc.testnet.arc.network`, chain id `5042002`. USDC (6 decimals) is the native-ERC20 at `0x3600000000000000000000000000000000000000` (script default). `script/Deploy.s.sol` deploys ALL production contracts in one run: `ClippoEscrow` (constructor `(usdc, treasury, owner, humanAttestor)`), `ClippoReportReceiver` (wired as the escrow reportAdapter, forwarder from env), `ClippoReferral` (recorder/guardian set) and `ClippoCreatorProfile` (updater set). It never deploys MockUSDC. Ownership of every contract is handed to `ADMIN_ADDRESS` at the end (deployer admin right is revoked).

Env (required first):

| Var | Default | Meaning |
| --- | --- | --- |
| `ADMIN_ADDRESS` | REQUIRED | Owner + escrow admin |
| `FORWARDER_ADDRESS` | REQUIRED | Chainlink CRE KeystoneForwarder for Arc testnet. Must be supplied (look it up in Chainlink CRE docs / forwarder directory); not hardcoded |
| `UPDATER_ADDRESS` | REQUIRED | Backend signer allowed to sync profiles (`ClippoCreatorProfile.updaters`) |
| `HUMAN_ATTESTOR_ADDRESS` | REQUIRED | Address of Clippo's backend key (`HUMAN_ATTESTOR_PRIVATE_KEY` in the web app) that signs World ID attestations. Immutable in the escrow, cannot be changed after deploy |
| `EXPECTED_WORKFLOW_OWNER` | REQUIRED (unless the skip flag is true) | CRE workflow owner address the receiver accepts reports from |
| `EXPECTED_WORKFLOW_ID` / `EXPECTED_WORKFLOW_NAME` | unset | Optional bytes32 / bytes10 hex allowlist entries |
| `INSECURE_SKIP_WORKFLOW_CHECK` | `false` (`true` if `ALLOW_ANY_CHAIN=true`) | TEST/SIMULATION ONLY: skip workflow metadata validation (mock forwarders pass none) |
| `USDC_ADDRESS` | `0x3600...0000` | USDC token |
| `TREASURY_ADDRESS` | `ADMIN_ADDRESS` | Fee recipient |
| `RECORDER_ADDRESS` / `GUARDIAN_ADDRESS` | updater / admin | Referral roles |
| `CAMPAIGNER_FEE_BPS` / `CREATOR_FEE_BPS` | 25 / 25 | Max 50 each |
| `RETENTION_SECONDS` | 604800 | PerView retention (max 30d) |
| `GRACE_SECONDS` | 86400 | Time after the deadline for final reports and splits (max 7d) |
| `HIGH_VALUE_THRESHOLD` | 1000000000 | USDC base units ($1,000) |
| `REFERRAL_CUT_BPS` / `REFERRAL_CAP` / `REFERRAL_COOLDOWN` | 500 / 100000000 / 86400 | Referral params |

A missing required var reverts with `Deploy: missing required env <NAME>`.

```
cd contracts
export ADMIN_ADDRESS=0x... FORWARDER_ADDRESS=0x... UPDATER_ADDRESS=0x... HUMAN_ATTESTOR_ADDRESS=0x... EXPECTED_WORKFLOW_OWNER=0x...
# dry run (simulation only)
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.network
# broadcast with a raw key ...
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.network --chain-id 5042002 --broadcast --private-key $PRIVATE_KEY
# ... or a keystore account (cast wallet import deployer --interactive)
forge script script/Deploy.s.sol --rpc-url https://rpc.testnet.arc.network --chain-id 5042002 --broadcast --account deployer
```

The deployer needs Arc testnet gas (Arc pays gas in USDC; use the Circle faucet). The console ends with a ready-to-paste block (`ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, `REFERRAL_ADDRESS`, `PROFILE_ADDRESS`, `REPORT_RECEIVER_ADDRESS`, `USDC_ADDRESS`, `HUMAN_ATTESTOR_ADDRESS`, `EXPECTED_WORKFLOW_OWNER`). After a real run, forge also writes addresses and blocks to `broadcast/Deploy.s.sol/5042002/run-latest.json`; no such record is committed in this repo today (no deploy of this contract has been run).

Verification: add `--verify --verifier <etherscan|blockscout|custom> --verifier-url <Arc explorer API URL>` (explorer API URL not verified here; check the Arc explorer docs), or run `forge verify-contract` per address with `--constructor-args` from `cast abi-encode`.

Local testing only: `script/DeployMock.s.sol` deploys a MockUSDC (anvil); pass its address as `USDC_ADDRESS`.

### Post-deploy checklist
1. Sync ABIs: `cd web && npm run abi:sync`.
2. Fill web env: `ESCROW_ADDRESS`, `ESCROW_DEPLOY_BLOCK`, `REFERRAL_ADDRESS`, `PROFILE_ADDRESS`, `REPORT_RECEIVER_ADDRESS`, `USDC_ADDRESS`; plus the backend signer key `HUMAN_ATTESTOR_PRIVATE_KEY` (required for the core loop; must match `HUMAN_ATTESTOR_ADDRESS`; it needs testnet USDC for gas). `UPDATER_PRIVATE_KEY` (matches `UPDATER_ADDRESS`) is optional: only the profile and referral modules use it. Check `web/.env.example` for exact names.
3. CRE: set `receiverAddress` = `REPORT_RECEIVER_ADDRESS` in `cre/workflows/clippo-settlement/config.production.json` by hand. (`scripts/deploy-arc.mjs` writes it only into `config.staging.json`, the local anvil fork config.) To change the forwarder later (as owner/`ADMIN_ADDRESS`): `cast send $REPORT_RECEIVER_ADDRESS "setForwarder(address)" $NEW_FORWARDER --rpc-url https://rpc.testnet.arc.network --account admin`.
4. Fund the referral pool (`ClippoReferral.fund`) if referrals are enabled (feature flags stay off pending legal review).
5. Confirm on-chain: `escrow.reportAdapter()` = receiver, `receiver.forwarder()` = forwarder, `escrow.owner()` = admin.

## Tests

There are 114 `test*` functions across `test/` (counted from source: `ClippoEscrow.t.sol` 71, `ClippoReportReceiver.t.sol` 19, `ClippoReferral.t.sol` 15, `ClippoCreatorProfile.t.sol` 8, `Deploy.t.sol` 1). `docs/BUILD_LOG.md` records all 114 passing at `498f649`; `forge test` was not re-run for this README edit.

`test/ClippoEscrow.t.sol`: all three modes, fee math (both sides, snapshotting, zero fee, max 50 bps), reject refund incl. fee, `reclaimUnapproved`, pool cap, deadline and grace (anyone can close after grace), access control (admin/owner/adapter/forwarder/approver), double claim, dust handling, PerView retention (default 7d, tranche maturity, claim after close, bounds, owner cannot shorten a live campaign), high-value attestation, HumanSplit with fresh World ID approvals (two approvers must be two humans), `registerHuman` (one human, one wallet), unlinked wallets cannot be credited, admin cannot finalize a split alone or swap the CRE adapter, `claimFor` pays only the creator, disputes (upheld, denied, lapse, after close, access), fuzz invariants (allocated <= pool, fund conservation, disputes keep the books balanced). `test/HumanHelper.sol` signs the attestations the backend would sign. The shared `setUp` runs with retention 0, grace 0 and the high-value threshold disabled; the specific tests enable them explicitly. `test/ClippoReportReceiver.t.sol`: forwarder and workflow-metadata checks, simulation operator guard, `lockConfig`. `test/Deploy.t.sol`: deploy wiring.

## Optional modules (OFF by default, see LEGAL_REVIEW.md)

Do not enable until legal review (India and US) is complete. Backend flags: `FEATURE_REFERRAL`, `FEATURE_TOKENIZATION`, `FEATURE_STATUS_LADDER`.

```
forge inspect ClippoReferral abi --json > abi/ClippoReferral.json
forge inspect ClippoCreatorProfile abi --json > abi/ClippoCreatorProfile.json
```

### ClippoReferral
Separate USDC reward pool (never touches escrow funds). A referrer earns `cutBps` (max 1000 = 10%) of activity a shared campaign brings in, pull-claimed via `claim()`.

- Roles: owner; `recorders` (backend/CRE) call `setUniqueHuman`, `registerReferral(referrer, referee, campaignId)`, `recordActivity(referee, activity)`; `guardians` may `setFrozen`.
- Fraud limits: referee must be an attested unique human; one referrer per referee (first wins); no self-referral or 2-cycles; `perReferrerCap` lifetime credit cap; `cooldown` between credits; per-referrer freeze (blocks earning and claiming); global `setPaused`; credits cannot exceed the funded balance.
- Other: `fund(amount)` (anyone), `setParams(cutBps, cap, cooldown)`, `recoverUnowed(to, amount)` (never touches owed amounts), view `claimable(referrer)`.
- Errors: `NotRecorder`, `NotGuardian`, `IsPaused`, `BadParams`, `SelfReferral`, `AlreadyReferred`, `NotHuman`, `NotReferred`, `ReferrerFrozen`, `CooldownActive`, `CapReached`, `NothingToClaim`, `Underfunded`.

### ClippoCreatorProfile
Non-transferable (soulbound-style) opt-in profile and track record. Not a token: no ERC-20/721 interface, no transfer, no market. Creator calls `optIn()` / `optOut()`; an authorized `updater` calls `updateProfile(creator, tier 0-4, approvedClips, rejectedClips, totalViews, totalEarnedUsdc, metadataURI)`; owner may `revoke(creator)`. Views: `getProfile`, `hasProfile`, `tierOf`. `transfer` always reverts `NonTransferable`.

Tests: `test/ClippoReferral.t.sol`, `test/ClippoCreatorProfile.t.sol`.
