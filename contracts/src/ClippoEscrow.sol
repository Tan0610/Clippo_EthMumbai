// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title ClippoEscrow
/// @notice Holds many independent USDC campaigns. Lifecycle: Funded -> Approved (admin) -> Closed,
///         or Funded -> Rejected (full refund incl. fee). Three settlement modes: PerView, HumanSplit, PoolShare.
///         Creators pull their payouts; fees accrue to the treasury.
/// @dev No privileged key can choose who gets paid:
///      - PerView credits and PoolShare weights come only from the report adapter (Chainlink CRE). It can be set once.
///      - HumanSplit credits need a fresh World ID approval, attested by `humanAttestor` and bound to the exact split.
///      - Only wallets linked to a unique World ID human can be credited.
///      Admins can approve or reject campaigns and settle disputes. Neither action can send funds to the admin.
contract ClippoEscrow is Ownable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------- types
    enum Mode {
        PerView,
        HumanSplit,
        PoolShare
    }

    enum State {
        None,
        Funded,
        Approved,
        Rejected,
        Closed
    }

    struct Campaign {
        address campaigner;
        Mode mode;
        State state;
        bool requireAdminApproval; // HumanSplit: both campaigner and an admin must approve a split
        uint16 campaignerFeeBps; // snapshot at creation
        uint16 creatorFeeBps; // snapshot at creation
        uint64 deadline;
        uint256 ratePer1kViews; // USDC base units per 1000 views (PerView)
        uint256 grossFunded; // total pulled from campaigner
        uint256 campaignerFee; // fee withheld from grossFunded
        uint256 pool; // grossFunded - campaignerFee
        uint256 allocated; // credited to creators so far (<= pool)
        string metadataURI;
        bool highValue; // pool > highValueThreshold at creation: campaign approval needs a human attestation
        uint64 retention; // PerView credit retention, snapshot at creation
        uint64 grace; // time after the deadline for final reports and splits, snapshot at creation
    }

    /// @dev PerView credit tranche; matures the campaign's `retention` after `at`.
    struct Tranche {
        uint64 at;
        uint192 amount;
    }

    struct PendingSplit {
        bytes32 hash;
        bool byCampaigner;
        bool byAdmin;
        bytes32 campaignerHuman;
        bytes32 adminHuman;
    }

    /// @dev A campaigner's challenge of a creator's unreleased PerView tranches [startIndex, endIndex).
    ///      Open while now <= resolveBy. If no admin settles it by then, the credits release on their normal schedule.
    struct Dispute {
        uint64 resolveBy;
        uint32 startIndex;
        uint32 endIndex;
    }

    /// @notice Signed by `humanAttestor` after the backend verifies a World ID result.
    /// @param human Stable hash of the World ID human for this action
    struct HumanProof {
        bytes32 human;
        uint64 expiresAt;
        bytes signature;
    }

    // -------------------------------------------------------------- storage
    uint16 public constant MAX_FEE_BPS = 50;
    uint256 public constant MAX_BATCH = 200;
    uint64 public constant MAX_GRACE = 7 days;
    uint8 public constant KIND_CAMPAIGN = 1;
    uint8 public constant KIND_SPLIT = 2;
    bytes32 private constant HUMAN_REGISTRATION_TYPEHASH =
        keccak256("HumanRegistration(address wallet,bytes32 human,uint64 expiresAt)");
    bytes32 private constant HUMAN_APPROVAL_TYPEHASH = keccak256(
        "HumanApproval(uint256 campaignId,uint8 kind,bytes32 subject,address approver,bytes32 human,uint64 expiresAt)"
    );

    IERC20 public immutable usdc;
    /// @notice Backend key that attests World ID results. It cannot move funds, and it cannot be replaced.
    address public immutable humanAttestor;
    address public treasury;
    uint16 public campaignerFeeBps = 25;
    uint16 public creatorFeeBps = 25;
    address public reportAdapter; // only address allowed to call reportViews
    uint256 public treasuryAccrued;
    uint256 public campaignCount;
    uint64 public constant MAX_RETENTION = 30 days;
    /// @notice PerView credits become claimable only this long after they are credited. The campaigner can dispute them
    ///         during this window. New campaigns snapshot this value.
    uint64 public retentionPeriod = 7 days;
    /// @notice Time after a campaign's deadline for final reports and splits. New campaigns snapshot this value.
    uint64 public gracePeriod = 1 days;
    /// @notice Pools strictly above this (USDC base units, default $1,000) are "high value".
    uint256 public highValueThreshold = 1_000e6;

    /// @notice World ID human linked to a wallet (zero = not linked). One human, one wallet.
    mapping(address => bytes32) public humanOf;
    mapping(bytes32 => address) public walletOfHuman;
    mapping(bytes32 => bool) public usedApproval; // EIP-712 digests already spent
    mapping(uint256 => mapping(address => Dispute)) public disputes;

    mapping(address => bool) public isAdmin;
    mapping(uint256 => Campaign) private _campaigns;
    mapping(uint256 => mapping(address => uint256)) public credited; // total credited to creator
    mapping(uint256 => mapping(address => uint256)) public claimed; // total gross claimed by creator
    mapping(uint256 => mapping(address => uint256)) public reportedViews; // PerView cumulative views
    mapping(uint256 => mapping(address => uint256)) public weights; // PoolShare weights
    mapping(uint256 => address[]) private _weightCreators;
    mapping(uint256 => uint256) public totalWeight;
    mapping(uint256 => PendingSplit) public pendingSplit;
    mapping(uint256 => bytes32) public approvalAttestation; // high-value campaign approval attestation
    mapping(uint256 => mapping(address => bytes32)) public splitAttestation; // id => approver => latest attestation
    mapping(uint256 => mapping(address => Tranche[])) private _tranches;
    mapping(uint256 => mapping(address => uint256)) private _nextTranche; // first tranche not yet released
    mapping(uint256 => mapping(address => uint256)) private _released; // gross amount of released (matured) tranches

    // --------------------------------------------------------------- events
    event AdminSet(address indexed admin, bool allowed);
    event FeesSet(uint16 campaignerFeeBps, uint16 creatorFeeBps);
    event TreasurySet(address indexed treasury);
    event ReportAdapterSet(address indexed adapter);
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed campaigner,
        Mode mode,
        uint256 ratePer1kViews,
        uint256 grossFunded,
        uint256 campaignerFee,
        uint256 pool,
        uint64 deadline,
        bool requireAdminApproval,
        string metadataURI
    );
    event CampaignApproved(uint256 indexed campaignId, address indexed admin, uint256 feeToTreasury);
    event CampaignRejected(uint256 indexed campaignId, address indexed admin, uint256 refunded);
    event ViewsReported(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 cumulativeViews,
        uint256 deltaViews,
        uint256 credited
    );
    event SplitProposed(uint256 indexed campaignId, address indexed approver, bytes32 splitHash);
    event SplitApproved(uint256 indexed campaignId, address indexed approver, bytes32 splitHash);
    event SplitFinalized(uint256 indexed campaignId, bytes32 splitHash, uint256 total);
    event CreatorCredited(uint256 indexed campaignId, address indexed creator, uint256 amount);
    event CampaignClosed(uint256 indexed campaignId, address indexed by, uint256 refundedToCampaigner);
    event Claimed(uint256 indexed campaignId, address indexed creator, uint256 gross, uint256 fee, uint256 net);
    event FeesWithdrawn(address indexed treasury, uint256 amount);
    event RetentionSet(uint64 retentionPeriod);
    event GraceSet(uint64 gracePeriod);
    event HighValueThresholdSet(uint256 threshold);
    /// @dev kind: 1 = campaign approval, 2 = split approval
    event HumanAttested(uint256 indexed campaignId, address indexed approver, bytes32 attestation, uint8 kind);
    event HumanRegistered(address indexed wallet, bytes32 indexed human);
    event CreditsDisputed(
        uint256 indexed campaignId, address indexed creator, uint256 amount, uint64 resolveBy, uint32 startIndex, uint32 endIndex
    );
    event DisputeResolved(uint256 indexed campaignId, address indexed creator, address indexed by, bool upheld, uint256 amount);

    // --------------------------------------------------------------- errors
    error NotAdmin();
    error NotAdapter();
    error NotApprover();
    error BadState(State current);
    error BadMode();
    error BadParams();
    error FeeTooHigh();
    error DeadlinePassed();
    error DeadlineNotReached();
    error NothingToClaim();
    error PoolExceeded();
    error NotCampaigner();
    error AttestationRequired();
    error AdapterAlreadySet();
    error NotHuman();
    error BadHumanProof();
    error HumanProofExpired();
    error HumanProofUsed();
    error HumanAlreadyLinked();
    error SameHuman();
    error DisputeOpen();
    error NoOpenDispute();
    error NothingToDispute();

    constructor(address usdc_, address treasury_, address owner_, address humanAttestor_)
        Ownable(owner_)
        EIP712("ClippoEscrow", "1")
    {
        if (usdc_ == address(0) || treasury_ == address(0) || humanAttestor_ == address(0)) revert BadParams();
        // Arc: the ERC-20 interface of USDC has 6 decimals (the native gas balance has 18). All amounts here are ERC-20 units.
        if (IERC20Metadata(usdc_).decimals() != 6) revert BadParams();
        usdc = IERC20(usdc_);
        humanAttestor = humanAttestor_;
        treasury = treasury_;
        isAdmin[owner_] = true;
        emit AdminSet(owner_, true);
    }

    modifier onlyAdmin() {
        if (!isAdmin[msg.sender]) revert NotAdmin();
        _;
    }

    // ---------------------------------------------------------------- admin
    function setAdmin(address admin, bool allowed) external onlyOwner {
        isAdmin[admin] = allowed;
        emit AdminSet(admin, allowed);
    }

    /// @notice Set per-side fees in bps (max 50 = 0.5%). Applies to campaigns created afterwards.
    function setFees(uint16 campaignerBps, uint16 creatorBps) external onlyOwner {
        if (campaignerBps > MAX_FEE_BPS || creatorBps > MAX_FEE_BPS) revert FeeTooHigh();
        campaignerFeeBps = campaignerBps;
        creatorFeeBps = creatorBps;
        emit FeesSet(campaignerBps, creatorBps);
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert BadParams();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    /// @notice Set the reporting adapter (the only caller of reportViews). It can be set only once, so the owner can
    ///         never swap Chainlink CRE out for its own reporter.
    function setReportAdapter(address adapter) external onlyOwner {
        if (reportAdapter != address(0)) revert AdapterAlreadySet();
        if (adapter == address(0)) revert BadParams();
        reportAdapter = adapter;
        emit ReportAdapterSet(adapter);
    }

    /// @notice Set the PerView retention window (0..30 days). Applies to campaigns created afterwards.
    function setRetentionPeriod(uint64 period) external onlyOwner {
        if (period > MAX_RETENTION) revert BadParams();
        retentionPeriod = period;
        emit RetentionSet(period);
    }

    /// @notice Set the post-deadline grace window (0..7 days). Applies to campaigns created afterwards.
    function setGracePeriod(uint64 period) external onlyOwner {
        if (period > MAX_GRACE) revert BadParams();
        gracePeriod = period;
        emit GraceSet(period);
    }

    /// @notice Set the high-value pool threshold (USDC base units). Applies to campaigns created afterwards.
    function setHighValueThreshold(uint256 threshold) external onlyOwner {
        highValueThreshold = threshold;
        emit HighValueThresholdSet(threshold);
    }

    function withdrawFees() external nonReentrant {
        uint256 amount = treasuryAccrued;
        if (amount == 0) revert NothingToClaim();
        treasuryAccrued = 0;
        usdc.safeTransfer(treasury, amount);
        emit FeesWithdrawn(treasury, amount);
    }

    // ---------------------------------------------------------- World ID humans
    /// @notice Link a wallet to a unique World ID human, using an attestation signed by `humanAttestor`. Anyone may relay it.
    ///         A human can link only one wallet, and a wallet only one human. Only linked wallets can be credited.
    function registerHuman(address wallet, HumanProof calldata proof) external {
        if (wallet == address(0) || proof.human == bytes32(0)) revert BadParams();
        if (block.timestamp > proof.expiresAt) revert HumanProofExpired();
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(HUMAN_REGISTRATION_TYPEHASH, wallet, proof.human, proof.expiresAt))
        );
        if (ECDSA.recover(digest, proof.signature) != humanAttestor) revert BadHumanProof();

        address linked = walletOfHuman[proof.human];
        bytes32 current = humanOf[wallet];
        if ((linked != address(0) && linked != wallet) || (current != bytes32(0) && current != proof.human)) {
            revert HumanAlreadyLinked();
        }
        humanOf[wallet] = proof.human;
        walletOfHuman[proof.human] = wallet;
        emit HumanRegistered(wallet, proof.human);
    }

    /// @dev Spends a one-time attestation that a fresh World ID check approved this exact action for msg.sender.
    function _useApproval(uint256 id, uint8 kind, bytes32 subject, HumanProof calldata proof) internal {
        if (proof.human == bytes32(0)) revert AttestationRequired();
        if (block.timestamp > proof.expiresAt) revert HumanProofExpired();
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(HUMAN_APPROVAL_TYPEHASH, id, kind, subject, msg.sender, proof.human, proof.expiresAt))
        );
        if (usedApproval[digest]) revert HumanProofUsed();
        if (ECDSA.recover(digest, proof.signature) != humanAttestor) revert BadHumanProof();
        usedApproval[digest] = true;
        emit HumanAttested(id, msg.sender, proof.human, kind);
    }

    // ------------------------------------------------------------- campaign
    /// @notice Fund a new campaign. Pulls `poolAmount` USDC from the caller; the campaigner fee is deducted
    ///         from it, so the usable pool is poolAmount - fee. Caller must have approved this contract.
    function createCampaign(
        Mode mode,
        uint256 ratePer1kViews,
        uint256 poolAmount,
        uint64 deadline,
        bool requireAdminApproval,
        string calldata metadataURI
    ) external nonReentrant returns (uint256 id) {
        if (poolAmount == 0 || deadline <= block.timestamp) revert BadParams();
        if (mode == Mode.PerView && ratePer1kViews == 0) revert BadParams();

        uint256 fee = (poolAmount * campaignerFeeBps) / 10_000;
        id = ++campaignCount;
        Campaign storage c = _campaigns[id];
        c.campaigner = msg.sender;
        c.mode = mode;
        c.state = State.Funded;
        c.requireAdminApproval = requireAdminApproval;
        c.campaignerFeeBps = campaignerFeeBps;
        c.creatorFeeBps = creatorFeeBps;
        c.deadline = deadline;
        c.ratePer1kViews = ratePer1kViews;
        c.grossFunded = poolAmount;
        c.campaignerFee = fee;
        c.pool = poolAmount - fee;
        c.metadataURI = metadataURI;
        c.highValue = c.pool > highValueThreshold;
        c.retention = retentionPeriod;
        c.grace = gracePeriod;

        usdc.safeTransferFrom(msg.sender, address(this), poolAmount);
        emit CampaignCreated(
            id, msg.sender, mode, ratePer1kViews, poolAmount, fee, c.pool, deadline, requireAdminApproval, metadataURI
        );
    }

    /// @notice Admin approves a funded campaign; the withheld campaigner fee accrues to the treasury.
    ///         High-value campaigns must use the HumanProof overload.
    function approveCampaign(uint256 id) external onlyAdmin {
        Campaign storage c = _campaigns[id];
        if (c.highValue) revert AttestationRequired();
        _approveCampaign(id, c);
    }

    /// @notice Approve with an attested fresh World ID check, verified and recorded on-chain. Required for high-value campaigns.
    function approveCampaign(uint256 id, HumanProof calldata proof) external onlyAdmin {
        Campaign storage c = _campaigns[id];
        _useApproval(id, KIND_CAMPAIGN, bytes32(0), proof);
        approvalAttestation[id] = proof.human;
        _approveCampaign(id, c);
    }

    function _approveCampaign(uint256 id, Campaign storage c) internal {
        if (c.state != State.Funded) revert BadState(c.state);
        if (block.timestamp > c.deadline) revert DeadlinePassed();
        c.state = State.Approved;
        treasuryAccrued += c.campaignerFee;
        emit CampaignApproved(id, msg.sender, c.campaignerFee);
    }

    /// @notice The campaigner takes back a campaign no admin approved before its deadline (full refund, fee included).
    function reclaimUnapproved(uint256 id) external nonReentrant {
        Campaign storage c = _campaigns[id];
        if (msg.sender != c.campaigner) revert NotCampaigner();
        if (c.state != State.Funded) revert BadState(c.state);
        if (block.timestamp <= c.deadline) revert DeadlineNotReached();
        c.state = State.Rejected;
        uint256 refund = c.grossFunded;
        usdc.safeTransfer(c.campaigner, refund);
        emit CampaignRejected(id, msg.sender, refund);
    }

    /// @notice Admin rejects a funded campaign; the campaigner is refunded in full, fee included.
    function rejectCampaign(uint256 id) external onlyAdmin nonReentrant {
        Campaign storage c = _campaigns[id];
        if (c.state != State.Funded) revert BadState(c.state);
        c.state = State.Rejected;
        uint256 refund = c.grossFunded;
        usdc.safeTransfer(c.campaigner, refund);
        emit CampaignRejected(id, msg.sender, refund);
    }

    // ----------------------------------------------- PerView and PoolShare modes
    /// @notice Called by the reporting adapter (Chainlink CRE) with a creator's cumulative verified views.
    ///         PerView: credits the delta since the last report, capped by the remaining pool.
    ///         PoolShare: the views become the creator's weight, and the pool is shared by weight at close.
    function reportViews(uint256 id, address creator, uint256 cumulativeViews) external {
        if (msg.sender != reportAdapter) revert NotAdapter();
        Campaign storage c = _campaigns[id];
        if (c.state != State.Approved) revert BadState(c.state);
        if (c.mode == Mode.HumanSplit) revert BadMode();
        if (block.timestamp > uint256(c.deadline) + c.grace) revert DeadlinePassed();
        if (humanOf[creator] == bytes32(0)) revert NotHuman();

        uint256 last = reportedViews[id][creator];
        if (cumulativeViews <= last) {
            emit ViewsReported(id, creator, last, 0, 0);
            return; // stale or duplicate report: idempotent no-op
        }
        uint256 delta = cumulativeViews - last;

        if (c.mode == Mode.PoolShare) {
            if (last == 0) {
                if (_weightCreators[id].length >= MAX_BATCH) revert BadParams();
                _weightCreators[id].push(creator);
            }
            reportedViews[id][creator] = cumulativeViews;
            weights[id][creator] = cumulativeViews;
            totalWeight[id] += delta;
            emit ViewsReported(id, creator, cumulativeViews, delta, 0);
            return;
        }
        reportedViews[id][creator] = cumulativeViews;

        uint256 amount = (delta * c.ratePer1kViews) / 1000;
        uint256 remaining = c.pool - c.allocated;
        if (amount > remaining) amount = remaining;
        if (amount > 0) {
            c.allocated += amount;
            credited[id][creator] += amount;
            _pushTranche(id, creator, amount);
            emit CreatorCredited(id, creator, amount);
        }
        emit ViewsReported(id, creator, cumulativeViews, delta, amount);
    }

    // ------------------------------------------------------ HumanSplit mode
    /// @notice Approve a split with an attested fresh World ID check bound to this exact split and this approver.
    ///         If requireAdminApproval is false, only the campaigner can approve, and that finalizes the split.
    ///         If true, the campaigner AND an admin (two different humans) must each submit the identical split.
    ///         Submitting a different split replaces the pending one and resets approvals.
    function approveSplit(uint256 id, address[] calldata creators, uint256[] calldata amounts, HumanProof calldata proof)
        external
    {
        Campaign storage c = _campaigns[id];
        if (c.state != State.Approved) revert BadState(c.state);
        if (c.mode != Mode.HumanSplit) revert BadMode();
        if (block.timestamp > uint256(c.deadline) + c.grace) revert DeadlinePassed();
        if (creators.length != amounts.length || creators.length == 0 || creators.length > MAX_BATCH) {
            revert BadParams();
        }
        bool asCampaigner = msg.sender == c.campaigner;
        if (!asCampaigner && !(c.requireAdminApproval && isAdmin[msg.sender])) revert NotApprover();

        bytes32 h = keccak256(abi.encode(creators, amounts));
        _useApproval(id, KIND_SPLIT, h, proof);
        splitAttestation[id][msg.sender] = proof.human;

        uint256 total;
        for (uint256 i; i < amounts.length; ++i) {
            total += amounts[i];
        }
        if (total > c.pool - c.allocated) revert PoolExceeded();

        PendingSplit storage p = pendingSplit[id];
        if (p.hash != h) {
            p.hash = h;
            p.byCampaigner = false;
            p.byAdmin = false;
            p.campaignerHuman = bytes32(0);
            p.adminHuman = bytes32(0);
            emit SplitProposed(id, msg.sender, h);
        }
        // campaigner takes precedence if also an admin
        if (asCampaigner) {
            if (proof.human == p.adminHuman) revert SameHuman();
            p.byCampaigner = true;
            p.campaignerHuman = proof.human;
        } else {
            if (proof.human == p.campaignerHuman) revert SameHuman();
            p.byAdmin = true;
            p.adminHuman = proof.human;
        }
        emit SplitApproved(id, msg.sender, h);

        bool ok = c.requireAdminApproval ? (p.byCampaigner && p.byAdmin) : true;
        if (!ok) return;

        delete pendingSplit[id];
        _creditSplit(id, creators, amounts);
        c.allocated += total;
        emit SplitFinalized(id, h, total);
    }

    function _creditSplit(uint256 id, address[] calldata creators, uint256[] calldata amounts) internal {
        for (uint256 i; i < creators.length; ++i) {
            if (creators[i] == address(0)) revert BadParams();
            if (humanOf[creators[i]] == bytes32(0)) revert NotHuman();
            credited[id][creators[i]] += amounts[i];
            emit CreatorCredited(id, creators[i], amounts[i]);
        }
    }

    // -------------------------------------------------------------- disputes
    /// @notice The campaigner disputes a creator's PerView credits that are still inside the retention window.
    ///         Those credits cannot be claimed while the dispute is open. A tranche can be disputed only once.
    function disputeCredits(uint256 id, address creator) external {
        Campaign storage c = _campaigns[id];
        if (msg.sender != c.campaigner) revert NotCampaigner();
        if (c.mode != Mode.PerView) revert BadMode();
        if (c.state != State.Approved && c.state != State.Closed) revert BadState(c.state);
        Dispute storage d = disputes[id][creator];
        if (_disputeActive(d)) revert DisputeOpen();

        _release(id, creator); // anything already matured stays with the creator
        Tranche[] storage t = _tranches[id][creator];
        uint256 start = _nextTranche[id][creator];
        if (d.endIndex > start) start = d.endIndex;
        uint256 amount;
        for (uint256 i = start; i < t.length; ++i) {
            amount += t[i].amount;
        }
        if (amount == 0) revert NothingToDispute();

        d.resolveBy = uint64(block.timestamp) + c.retention;
        d.startIndex = uint32(start);
        d.endIndex = uint32(t.length);
        emit CreditsDisputed(id, creator, amount, d.resolveBy, d.startIndex, d.endIndex);
    }

    /// @notice An admin settles an open dispute. Upheld: the disputed credits go back to the pool, or straight to the
    ///         campaigner if the campaign is closed. Not upheld: they release on schedule. Admins can never receive them.
    function resolveDispute(uint256 id, address creator, bool upheld) external onlyAdmin nonReentrant {
        Dispute storage d = disputes[id][creator];
        if (!_disputeActive(d)) revert NoOpenDispute();
        uint256 amount;
        if (upheld) {
            Tranche[] storage t = _tranches[id][creator];
            for (uint256 i = d.startIndex; i < d.endIndex; ++i) {
                amount += t[i].amount;
                t[i].amount = 0;
            }
            Campaign storage c = _campaigns[id];
            credited[id][creator] -= amount;
            c.allocated -= amount;
            if (c.state == State.Closed && amount > 0) usdc.safeTransfer(c.campaigner, amount);
        }
        d.resolveBy = 0;
        emit DisputeResolved(id, creator, msg.sender, upheld, amount);
    }

    function _disputeActive(Dispute storage d) internal view returns (bool) {
        return d.resolveBy != 0 && block.timestamp <= d.resolveBy;
    }

    // ---------------------------------------------------------------- close
    /// @notice Close a campaign after its deadline and grace window. Anyone can call this, so creators can force it.
    ///         PoolShare: distributes the whole pool by CRE-reported views (rounding dust is refunded).
    ///         All modes: unallocated pool returns to the campaigner. Creator credits stay claimable.
    function closeCampaign(uint256 id) external nonReentrant {
        Campaign storage c = _campaigns[id];
        if (c.state != State.Approved) revert BadState(c.state);
        if (block.timestamp <= uint256(c.deadline) + c.grace) revert DeadlineNotReached();
        c.state = State.Closed;

        if (c.mode == Mode.PoolShare && totalWeight[id] > 0) {
            address[] storage list = _weightCreators[id];
            uint256 tw = totalWeight[id];
            uint256 pool = c.pool;
            uint256 distributed;
            for (uint256 i; i < list.length; ++i) {
                uint256 share = (pool * weights[id][list[i]]) / tw;
                distributed += share;
                credited[id][list[i]] += share;
                emit CreatorCredited(id, list[i], share);
            }
            c.allocated += distributed;
        }

        uint256 refund = c.pool - c.allocated;
        if (refund > 0) usdc.safeTransfer(c.campaigner, refund);
        emit CampaignClosed(id, msg.sender, refund);
    }

    // ---------------------------------------------------------------- claim
    /// @notice Creator pulls everything credited so far, minus the creator-side fee.
    ///         PoolShare credits exist only after close; other modes are claimable while Approved or Closed.
    function claim(uint256 id) external nonReentrant returns (uint256 net) {
        net = _payOut(id, msg.sender);
    }

    /// @notice Send a creator's claimable money to that creator. Anyone can trigger it (Clippo's wallet does, and pays the
    ///         gas). The money can only go to `creator`, in the amount the contract already credited.
    function claimFor(uint256 id, address creator) external nonReentrant returns (uint256 net) {
        net = _payOut(id, creator);
    }

    function _payOut(uint256 id, address creator) internal returns (uint256 net) {
        Campaign storage c = _campaigns[id];
        if (c.state != State.Approved && c.state != State.Closed) revert BadState(c.state);
        uint256 gross;
        if (c.mode == Mode.PerView) {
            _release(id, creator);
            gross = _released[id][creator] - claimed[id][creator];
        } else {
            gross = credited[id][creator] - claimed[id][creator];
        }
        if (gross == 0) revert NothingToClaim();
        claimed[id][creator] += gross;

        uint256 fee = (gross * c.creatorFeeBps) / 10_000;
        net = gross - fee;
        treasuryAccrued += fee;
        usdc.safeTransfer(creator, net);
        emit Claimed(id, creator, gross, fee, net);
    }

    // ---------------------------------------------------------------- views
    function getCampaign(uint256 id) external view returns (Campaign memory) {
        return _campaigns[id];
    }

    /// @notice Gross amount the creator can claim right now (PerView: only credits past the retention window).
    function claimable(uint256 id, address creator) external view returns (uint256) {
        if (_campaigns[id].mode == Mode.PerView) {
            (uint256 matured,) = _maturedTranches(id, creator);
            return _released[id][creator] + matured - claimed[id][creator];
        }
        return credited[id][creator] - claimed[id][creator];
    }

    /// @notice Total credited but not yet claimed, including credits still inside the retention window.
    function pendingTotal(uint256 id, address creator) external view returns (uint256) {
        return credited[id][creator] - claimed[id][creator];
    }

    /// @notice PerView tranches (timestamp, gross amount) for a creator; each matures at `at + campaign.retention`.
    function tranches(uint256 id, address creator) external view returns (Tranche[] memory) {
        return _tranches[id][creator];
    }

    /// @dev Same-UTC-day credits share one tranche stamped with the latest credit time (never matures early).
    function _pushTranche(uint256 id, address creator, uint256 amount) internal {
        Tranche[] storage t = _tranches[id][creator];
        uint256 n = t.length;
        // a tranche already under dispute (or disputed before) never grows
        bool mergeable = n > 0 && n > _nextTranche[id][creator] && n > disputes[id][creator].endIndex;
        if (mergeable && t[n - 1].at / 1 days == block.timestamp / 1 days) {
            t[n - 1].amount += uint192(amount);
            t[n - 1].at = uint64(block.timestamp);
        } else {
            t.push(Tranche(uint64(block.timestamp), uint192(amount)));
        }
    }

    function _maturedTranches(uint256 id, address creator) internal view returns (uint256 sum, uint256 next) {
        Tranche[] storage t = _tranches[id][creator];
        next = _nextTranche[id][creator];
        uint64 ret = _campaigns[id].retention;
        Dispute storage d = disputes[id][creator];
        bool active = _disputeActive(d);
        while (next < t.length && uint256(t[next].at) + ret <= block.timestamp) {
            if (active && next >= d.startIndex) break; // disputed credits wait for the outcome
            sum += t[next].amount;
            ++next;
        }
    }

    function _release(uint256 id, address creator) internal {
        (uint256 sum, uint256 next) = _maturedTranches(id, creator);
        _released[id][creator] += sum;
        _nextTranche[id][creator] = next;
    }

    function remainingPool(uint256 id) external view returns (uint256) {
        Campaign storage c = _campaigns[id];
        return c.pool - c.allocated;
    }

    function weightCreators(uint256 id) external view returns (address[] memory) {
        return _weightCreators[id];
    }
}
