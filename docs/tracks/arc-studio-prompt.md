# Arc Studio prompt and import kit for the current Clippo escrow

Purpose: meet prize requirement (a), "Built in Arc Studio ... shareable Arc Studio project URL ... show Studio in your demo", for the bounty "Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio" ($3,000).

## Status (2026-11-07)
- We have NOT used Arc Studio to write, test or deploy the current contract. `contracts/src/ClippoEscrow.sol` was written and tested in Foundry and deployed with a forge script. Nothing in this file has been run in Studio.
- A Studio project URL is on file from a teammate's commit `943779e`: https://studio.arc.io/app/34ef3b95-32bd-48f9-9310-b8135e1d92ce. We have not opened it and cannot say what it holds. Open it first (step 1 below).
- The current contract is already on Arc testnet: escrow `0x1e05373c199D764f7dE0353d58AFEa2b4C6326Ef`, receiver `0x6b0f6C0f324C615Add6BfcA5EE0b8eeD66F2C0cd`. A Studio deploy would be a NEW escrow, so the web app, the receiver pairing and the CRE config would not point at it. Decide before deploying: (a) import, compile, test and share in Studio but keep the forge-deployed escrow as the one the app uses, or (b) deploy from Studio and redo the wiring (`docs/tracks/ARC.md`, "Point the app at the deployed contract").
- Wording rule for the demo and the form: say "written and tested in Foundry, then imported into Arc Studio" only if that is what you did. Never say it was "built in Arc Studio" unless Studio generated it and you can show that.

## Steps
1. Open the URL above while logged in. Note what it contains (contracts, deploys, chat). Press **Share** and check it loads logged out. If it holds an older escrow, do not reuse its claims.
2. Start a project (new, or the existing one) and paste Prompt 1 (below). It is under the 10,000 character chat limit.
3. When Studio shows its contract, replace it with the reviewed one: use the Code editor (the chat caps pastes at about 10k characters) to add `contracts/src/ClippoEscrow.sol` and `contracts/src/MockUSDC.sol` (for the sandbox), then ask: "Replace your escrow with this contract, compile it, and run these tests." Add `contracts/test/ClippoEscrow.t.sol` and `contracts/test/HumanHelper.sol` if Studio runs Foundry tests. UNVERIFIED: nobody has tried that, and we do not know whether Studio resolves the OpenZeppelin v5.7 imports. If it does not, ask Studio to exercise the flows in its sandbox with real testnet transactions instead.
4. Deploy to Arc testnet from Studio (testnet only). The constructor needs `(usdc, treasury, owner, humanAttestor)`. `humanAttestor` is immutable, so choose it first. Use Arc USDC `0x3600000000000000000000000000000000000000`. Get testnet USDC from Studio's faucet or https://faucet.circle.com (USDC is the gas token).
5. Paste Prompt 2 (below) to connect a small web app to the deployed contract inside Studio. The full app stays in `web/`; Studio's app is the "connect to a web app without leaving Studio" part of the prize.
6. Record: the public Studio project URL, the deployed address, the compile, test and deploy results, and a screenshot. Write them into `docs/SUBMISSION_ARC.md` (requirement a) and `docs/BUILD_LOG.md`. Until then those fields stay "OPEN".
7. Show Studio on screen in the demo video.

### CLI alternative
Syntax is from https://docs.arc.io/ai/arc-studio-cli.md; we have not run it.
```bash
npm install -g @circle-fin/arc-studio-cli   # Node 20+
arc-studio login
arc-studio run "<paste Prompt 1>" \
  --file contracts/src/ClippoEscrow.sol --file contracts/src/MockUSDC.sol \
  --file contracts/test/ClippoEscrow.t.sol --file contracts/test/HumanHelper.sol --output json
arc-studio deployments
arc-studio pull --out ./onchain --paths "contracts/**"
```
Limits per the docs: 100 files, 1 MB each, 10 MB total, prompt at most 10,000 characters, `.env` refused. Check `docs/tracks/ARC.md` for the import options.

## Prompt 1: the contract
Describes `contracts/src/ClippoEscrow.sol` as of commit `498f649` (the last commit that changed that file as of main `ab35b35`).
```text
Build a USDC escrow for a clipping-campaign marketplace on Arc testnet.

Token: USDC at 0x3600000000000000000000000000000000000000. Use ONLY the ERC-20 interface, which has 6 decimals (the native gas balance has 18; never mix them). The constructor is constructor(usdc, treasury, owner, humanAttestor) and must revert if decimals() != 6 or usdc, treasury or humanAttestor is zero. Use SafeERC20, ReentrancyGuard, Ownable and EIP-712 (domain "ClippoEscrow", version "1"); creators pull payouts.

Roles: owner (also an admin from construction), admins (owner-managed), campaigner (funds a campaign), creators (earn), a reportAdapter (the only caller of reportViews; the owner can set it once and never change it), a treasury, and an immutable humanAttestor (a backend key that signs World ID results; it cannot move funds and cannot be replaced). No privileged key may choose who gets paid. Admins can approve or reject campaigns and settle disputes, and can never receive creator funds. Owner setters: setAdmin, setFees, setTreasury, setReportAdapter (once), setRetentionPeriod (0 to 30 days), setGracePeriod (0 to 7 days), setHighValueThreshold. Retention, grace and fees apply to campaigns created afterwards and are snapshotted per campaign.

World ID humans: registerHuman(wallet, proof) links a wallet to a unique human using an EIP-712 HumanRegistration(wallet, human, expiresAt) signature from the humanAttestor. Anyone may relay it. One human links one wallet and one wallet one human (HumanAlreadyLinked otherwise). Only linked wallets can be credited (NotHuman otherwise).

Lifecycle: Funded -> Approved (admin) -> Closed, or Funded -> Rejected (admin rejectCampaign refunds the full gross including fee). If no admin approves before the deadline, the campaigner calls reclaimUnapproved for a full refund. createCampaign(mode, ratePer1kViews, poolAmount, deadline, requireAdminApproval, metadataURI) pulls poolAmount; the campaigner fee (bps of poolAmount) is held in escrow and only accrues to the treasury on approval; usable pool = poolAmount - fee. Nothing can be credited or claimed before approval.

Three modes:
1. PerView: reportViews(id, creator, cumulativeViews), callable only by the reportAdapter (Chainlink CRE), credits (delta * ratePer1kViews / 1000), capped at the remaining pool, ignores non-increasing reports, accepted until deadline + grace. Credits are kept as tranches (same-UTC-day credits merge into one) and become claimable only after the campaign's retention period (default 7 days, max 30).
2. HumanSplit: approveSplit(id, creators[], amounts[], proof) by the campaigner, or by an admin if requireAdminApproval; at most 200 creators. Each call needs a one-time EIP-712 HumanApproval(campaignId, kind, subject, approver, human, expiresAt) signature from the humanAttestor, bound to the exact split hash and to msg.sender. Sum <= remaining pool. If requireAdminApproval, the campaigner and an admin must submit the identical split with two different humans (SameHuman otherwise); a different split resets approvals. Accepted until deadline + grace.
3. PoolShare: reportViews from the reportAdapter sets each creator's weight to their cumulative views. closeCampaign splits the whole pool pro rata by weight, rounding dust is refunded to the campaigner, no weights means a full refund. Claims open after close. There is no setWeights; weights come only from reports.

Disputes (PerView only): while a campaign is Approved or Closed, the campaigner calls disputeCredits(id, creator) on that creator's tranches not yet released (already matured credits stay with the creator). They cannot be claimed while the dispute is open. An admin calls resolveDispute(id, creator, upheld). Upheld: the disputed credits go back to the pool (or straight to the campaigner if the campaign is closed). Not upheld, or not settled within one retention period after the dispute was opened: they release on the normal schedule. A tranche can be disputed only once.

Fees: two-sided, in bps, owner-set, hard cap 50 bps each (default 25/25). The creator fee is deducted from the gross at claim. withdrawFees() sends accrued fees to the treasury.

Claims: claim(id) pays msg.sender. claimFor(id, creator) lets anyone trigger the payout, but the money can only go to that creator.

Close and refunds: closeCampaign can be called by anyone after deadline + grace period (default 1 day, max 7). It returns the unallocated pool to the campaigner. Creator credits stay claimable.

High-value campaigns (pool after fee strictly above an owner-set threshold, default 1000 USDC) must use approveCampaign(id, proof) with a humanAttestor-signed approval, recorded on-chain with a HumanAttested event. Smaller campaigns use approveCampaign(id).

Add events for every state change, custom errors, and views getCampaign, claimable, pendingTotal, tranches, remainingPool, weightCreators. Write Foundry tests covering all three modes, fee math at 0 and 50 bps, rejection refund, deadline refund, pool cap, reentrancy, access control, World ID registration and approval replay, disputes, claimFor, and a fuzz test that total paid out never exceeds funded.
```

## Prompt 2: connect a web app inside Studio
Use after the contract is deployed from Studio. Fill in the address.
```text
Build a small web app for the deployed ClippoEscrow at <ADDRESS> on Arc testnet (chain id 5042002, RPC https://rpc.testnet.arc.io). USDC is 0x3600000000000000000000000000000000000000; use only its ERC-20 interface with 6 decimals for every amount and balance, and show it as USDC. Connect a browser wallet; keep no private keys in the app.
Pages:
1. Fund: approve USDC, then createCampaign(mode, ratePer1kViews, poolAmount, deadline, requireAdminApproval, metadataURI). Show the campaigner fee and net pool before sending.
2. Campaign: getCampaign, remainingPool, and the state (Funded, Approved, Rejected, Closed).
3. Creator: claimable, pendingTotal, tranches (credit time and release time) and a claim button that calls claim(id).
4. Campaigner: disputeCredits(id, creator). Admin: resolveDispute(id, creator, upheld), approveCampaign, rejectCampaign.
5. Close: closeCampaign once the deadline plus grace has passed.
Show every transaction hash with a link to https://explorer.testnet.arc.io/tx/<hash>. Show custom errors as plain messages (NothingToClaim, DisputeOpen, DeadlineNotReached).
```

## What to say to judges
- The contract is `contracts/src/ClippoEscrow.sol`; the deployed Arc testnet address and the tests are in `docs/SUBMISSION_ARC.md`.
- Say exactly what Studio did: for example "imported, compiled and tested in Studio", not "built in Studio" unless it was.
- The full app is in `web/` and is deployed at https://clippo-cre.vercel.app. The Studio app is a smaller front end for the same contract.

## Local reference
Final Solidity: `contracts/src/ClippoEscrow.sol`. Receiver: `contracts/src/ClippoReportReceiver.sol`. Tests: `contracts/test/ClippoEscrow.t.sol` (71 test functions; 114 across the five suites, passing on 2026-11-07). ABI: `contracts/abi/ClippoEscrow.json`. Run `cd contracts && forge test`.
