// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GoalToken.sol";
import "./FriendCircle.sol";

/**
 * @title GoalMarket
 * @notice The core prediction market for personal goals.
 *
 *  MECHANISM (No-Arbitrage Design):
 *  1. Creator stakes tokens as commitment (separate from YES/NO pools)
 *  2. Friends buy YES (believe) or NO (doubt) positions
 *  3. Max total betting pool is capped at POT_MULTIPLIER x creator's stake
 *  4. When deadline passes, creator submits proof; circle verifies
 *
 *  PAYOUTS ON SUCCESS (goal achieved):
 *    - Creator:   gets stake back + entire NO pool (minus fee)
 *    - YES bets:  get their tokens back (they supported - no loss)
 *    - NO bets:   lose everything (funds go to creator)
 *
 *  PAYOUTS ON FAILURE (goal not achieved):
 *    - Creator:   loses entire stake (distributed to NO bettors)
 *    - YES bets:  lose everything (funds go to NO bettors)
 *    - NO bets:   get tokens back + proportional share of (creator stake + YES pool) minus fee
 *
 *  ZERO-SUM: total payouts + fees = total deposits. No arbitrage possible.
 */
contract GoalMarket is Ownable, ReentrancyGuard {
    GoalToken public token;
    FriendCircle public friendCircle;

    enum GoalStatus { Active, ProofSubmitted, Achieved, Failed, Disputed }

    struct Goal {
        uint256 id;
        uint256 circleId;
        address creator;
        string title;
        string description;
        uint256 deadline;
        uint256 creatorStake;     // Creator's commitment (separate pot)
        uint256 yesPool;          // Total tokens staked on YES by friends
        uint256 noPool;           // Total tokens staked on NO by friends
        uint256 maxPool;          // Max total YES+NO pool (proportional to stake)
        GoalStatus status;
        string proofURI;          // IPFS/URL to proof of achievement
        uint256 verifyYes;        // Number of verify-yes votes
        uint256 verifyNo;         // Number of verify-no votes
        uint256 createdAt;
        uint256 resolvedAt;
    }

    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    uint256 public nextGoalId = 1;
    uint256 public constant MIN_STAKE = 10 * 10 ** 18;       // 10 GSTK minimum stake
    uint256 public constant PLATFORM_FEE_BPS = 200;          // 2% platform fee
    uint256 public constant VERIFICATION_QUORUM_BPS = 5000;  // 50% of circle must verify
    uint256 public constant POT_MULTIPLIER = 5;              // Max pool = 5x creator stake

    // goalId => Goal
    mapping(uint256 => Goal) public goals;
    // goalId => user => Position
    mapping(uint256 => mapping(address => Position)) public positions;
    // goalId => user => hasVerified
    mapping(uint256 => mapping(address => bool)) public hasVerified;
    // All goal IDs for a circle
    mapping(uint256 => uint256[]) public circleGoals;
    // All goal IDs for a user
    mapping(address => uint256[]) public userGoals;

    event GoalCreated(
        uint256 indexed goalId,
        uint256 indexed circleId,
        address indexed creator,
        string title,
        uint256 deadline,
        uint256 stake,
        uint256 maxPool
    );
    event PositionTaken(
        uint256 indexed goalId,
        address indexed user,
        bool isYes,
        uint256 amount
    );
    event ProofSubmitted(uint256 indexed goalId, string proofURI);
    event GoalVerified(uint256 indexed goalId, address indexed verifier, bool approved);
    event GoalResolved(uint256 indexed goalId, GoalStatus status);
    event Claimed(uint256 indexed goalId, address indexed user, uint256 payout);
    event AwardGiven(uint256 indexed goalId, address indexed from, address indexed to, uint256 amount);

    constructor(address _token, address _friendCircle) Ownable(msg.sender) {
        token = GoalToken(_token);
        friendCircle = FriendCircle(_friendCircle);
    }

    // ─────────────────────── GOAL CREATION ───────────────────────

    /// @notice Create a new goal and stake tokens as commitment
    /// @dev Creator's stake goes into a separate pot, NOT into YES/NO pools
    function createGoal(
        uint256 circleId,
        string calldata title,
        string calldata description,
        uint256 deadline,
        uint256 stakeAmount
    ) external nonReentrant returns (uint256) {
        require(friendCircle.isMember(circleId, msg.sender), "GoalMarket: not in circle");
        require(deadline > block.timestamp, "GoalMarket: deadline must be future");
        require(stakeAmount >= MIN_STAKE, "GoalMarket: stake too low");
        require(bytes(title).length > 0 && bytes(title).length <= 200, "GoalMarket: invalid title");

        // Transfer creator's stake into the contract
        require(token.transferFrom(msg.sender, address(this), stakeAmount), "GoalMarket: transfer failed");

        uint256 goalId = nextGoalId++;

        Goal storage goal = goals[goalId];
        goal.id = goalId;
        goal.circleId = circleId;
        goal.creator = msg.sender;
        goal.title = title;
        goal.description = description;
        goal.deadline = deadline;
        goal.creatorStake = stakeAmount;
        goal.yesPool = 0;            // Friends bet separately
        goal.noPool = 0;
        goal.maxPool = stakeAmount * POT_MULTIPLIER;  // Cap proportional to stake
        goal.status = GoalStatus.Active;
        goal.createdAt = block.timestamp;

        circleGoals[circleId].push(goalId);
        userGoals[msg.sender].push(goalId);

        emit GoalCreated(goalId, circleId, msg.sender, title, deadline, stakeAmount, goal.maxPool);

        return goalId;
    }

    // ─────────────────────── TRADING ───────────────────────────

    /// @notice Buy a YES or NO position on a goal (friends only, not creator)
    function takePosition(
        uint256 goalId,
        bool isYes,
        uint256 amount
    ) external nonReentrant {
        Goal storage goal = goals[goalId];
        require(goal.status == GoalStatus.Active, "GoalMarket: goal not active");
        require(block.timestamp < goal.deadline, "GoalMarket: deadline passed");
        require(friendCircle.isMember(goal.circleId, msg.sender), "GoalMarket: not in circle");
        require(msg.sender != goal.creator, "GoalMarket: creator cannot bet on own goal");
        require(amount > 0, "GoalMarket: zero amount");

        // Enforce single-side betting: user can only bet on one side
        Position storage existingPos = positions[goalId][msg.sender];
        if (isYes) {
            require(existingPos.noAmount == 0, "GoalMarket: already have NO position, cannot bet YES");
        } else {
            require(existingPos.yesAmount == 0, "GoalMarket: already have YES position, cannot bet NO");
        }

        // Enforce max pool cap (proportional to creator stake)
        require(
            goal.yesPool + goal.noPool + amount <= goal.maxPool,
            "GoalMarket: would exceed max pool size"
        );

        require(token.transferFrom(msg.sender, address(this), amount), "GoalMarket: transfer failed");

        if (isYes) {
            goal.yesPool += amount;
            positions[goalId][msg.sender].yesAmount += amount;
        } else {
            goal.noPool += amount;
            positions[goalId][msg.sender].noAmount += amount;
        }

        emit PositionTaken(goalId, msg.sender, isYes, amount);
    }

    // ─────────────────────── MARKET PRICING ───────────────────────────

    /// @notice Get the implied probability of goal achievement (0-10000 bps)
    function getImpliedProbability(uint256 goalId) external view returns (uint256) {
        Goal storage goal = goals[goalId];
        uint256 total = goal.yesPool + goal.noPool;
        if (total == 0) return 5000; // 50% default
        return (goal.yesPool * 10000) / total;
    }

    /// @notice Get current YES and NO pool sizes
    function getPoolSizes(uint256 goalId) external view returns (uint256 yesPool, uint256 noPool) {
        return (goals[goalId].yesPool, goals[goalId].noPool);
    }

    /// @notice Get remaining capacity in the betting pool
    function getRemainingPoolCapacity(uint256 goalId) external view returns (uint256) {
        Goal storage goal = goals[goalId];
        uint256 used = goal.yesPool + goal.noPool;
        if (used >= goal.maxPool) return 0;
        return goal.maxPool - used;
    }

    // ─────────────────────── PROOF & VERIFICATION ───────────────────────

    /// @notice Goal creator submits proof of achievement
    function submitProof(uint256 goalId, string calldata proofURI) external {
        Goal storage goal = goals[goalId];
        require(msg.sender == goal.creator, "GoalMarket: not creator");
        require(
            goal.status == GoalStatus.Active || goal.status == GoalStatus.ProofSubmitted,
            "GoalMarket: invalid status"
        );
        require(bytes(proofURI).length > 0, "GoalMarket: empty proof");

        goal.proofURI = proofURI;
        goal.status = GoalStatus.ProofSubmitted;

        emit ProofSubmitted(goalId, proofURI);
    }

    /// @notice Circle members verify whether the goal was achieved
    function verifyGoal(uint256 goalId, bool approved) external {
        Goal storage goal = goals[goalId];
        require(goal.status == GoalStatus.ProofSubmitted, "GoalMarket: no proof submitted");
        require(friendCircle.isMember(goal.circleId, msg.sender), "GoalMarket: not in circle");
        require(msg.sender != goal.creator, "GoalMarket: creator cannot verify self");
        require(!hasVerified[goalId][msg.sender], "GoalMarket: already verified");

        hasVerified[goalId][msg.sender] = true;

        if (approved) {
            goal.verifyYes++;
        } else {
            goal.verifyNo++;
        }

        emit GoalVerified(goalId, msg.sender, approved);

        // Check if quorum reached
        uint256 memberCount = friendCircle.getMemberCount(goal.circleId);
        uint256 totalVotes = goal.verifyYes + goal.verifyNo;
        uint256 quorum = (memberCount * VERIFICATION_QUORUM_BPS) / 10000;

        if (totalVotes >= quorum && totalVotes > 0) {
            _resolveGoal(goalId);
        }
    }

    /// @notice Auto-resolve goals past deadline with no proof
    function resolveExpired(uint256 goalId) external {
        Goal storage goal = goals[goalId];
        require(goal.status == GoalStatus.Active, "GoalMarket: not active");
        require(block.timestamp > goal.deadline, "GoalMarket: deadline not passed");

        goal.status = GoalStatus.Failed;
        goal.resolvedAt = block.timestamp;
        emit GoalResolved(goalId, GoalStatus.Failed);
    }

    function _resolveGoal(uint256 goalId) internal {
        Goal storage goal = goals[goalId];

        if (goal.verifyYes > goal.verifyNo) {
            goal.status = GoalStatus.Achieved;
        } else {
            goal.status = GoalStatus.Failed;
        }

        goal.resolvedAt = block.timestamp;
        emit GoalResolved(goalId, goal.status);
    }

    // ─────────────────────── CLAIMS & PAYOUTS ───────────────────────
    //
    //  ACHIEVED (success):
    //    Creator  -> creatorStake + noPool - fee(noPool)
    //    YES bets -> get yesAmount back (supported the creator)
    //    NO bets  -> lose everything (funds go to creator)
    //
    //  FAILED:
    //    Creator  -> loses creatorStake
    //    YES bets -> lose everything
    //    NO bets  -> noAmount back + proportional share of (creatorStake + yesPool) - fee
    //
    //  Zero-sum: totalPayout + fees = creatorStake + yesPool + noPool
    //

    /// @notice Creator claims payout after goal is resolved
    function claimCreator(uint256 goalId) external nonReentrant {
        Goal storage goal = goals[goalId];
        require(
            goal.status == GoalStatus.Achieved || goal.status == GoalStatus.Failed,
            "GoalMarket: not resolved"
        );
        require(msg.sender == goal.creator, "GoalMarket: not creator");

        // Use the position's claimed flag for the creator too
        Position storage pos = positions[goalId][msg.sender];
        require(!pos.claimed, "GoalMarket: already claimed");
        pos.claimed = true;

        uint256 payout = 0;

        if (goal.status == GoalStatus.Achieved) {
            // Creator WINS: gets stake back + all NO pool (minus fee on winnings)
            uint256 winnings = goal.noPool;
            uint256 fee = (winnings * PLATFORM_FEE_BPS) / 10000;
            payout = goal.creatorStake + winnings - fee;
        }
        // If Failed: creator gets nothing (loses entire stake)

        if (payout > 0) {
            require(token.transfer(msg.sender, payout), "GoalMarket: payout failed");
        }

        emit Claimed(goalId, msg.sender, payout);
    }

    /// @notice Friends claim payout after goal is resolved
    function claim(uint256 goalId) external nonReentrant {
        Goal storage goal = goals[goalId];
        require(
            goal.status == GoalStatus.Achieved || goal.status == GoalStatus.Failed,
            "GoalMarket: not resolved"
        );
        require(msg.sender != goal.creator, "GoalMarket: creator must use claimCreator");

        Position storage pos = positions[goalId][msg.sender];
        require(!pos.claimed, "GoalMarket: already claimed");
        require(pos.yesAmount > 0 || pos.noAmount > 0, "GoalMarket: no position");

        pos.claimed = true;

        uint256 payout = 0;

        if (goal.status == GoalStatus.Achieved) {
            // ── YES holders win ──
            // They get their tokens back (supported the creator)
            if (pos.yesAmount > 0) {
                payout = pos.yesAmount;
            }
            // NO holders: lose everything (no payout)
        } else {
            // ── FAILED: NO holders win ──
            if (pos.noAmount > 0 && goal.noPool > 0) {
                // Losers' funds to distribute: creatorStake + entire yesPool
                uint256 loserFunds = goal.creatorStake + goal.yesPool;
                uint256 fee = (loserFunds * PLATFORM_FEE_BPS) / 10000;
                uint256 distributable = loserFunds - fee;

                // Each NO bettor gets: their stake back + proportional share of loser funds
                uint256 bonus = (pos.noAmount * distributable) / goal.noPool;
                payout = pos.noAmount + bonus;
            }
            // YES holders: lose everything (no payout)
        }

        if (payout > 0) {
            require(token.transfer(msg.sender, payout), "GoalMarket: payout failed");
        }

        emit Claimed(goalId, msg.sender, payout);
    }

    // ─────────────────────── SOCIAL AWARDS ───────────────────────

    /// @notice Goal achiever can award bonus tokens to supporters
    function awardSupporter(uint256 goalId, address supporter, uint256 amount) external nonReentrant {
        Goal storage goal = goals[goalId];
        require(goal.status == GoalStatus.Achieved, "GoalMarket: goal not achieved");
        require(msg.sender == goal.creator, "GoalMarket: not creator");
        require(friendCircle.isMember(goal.circleId, supporter), "GoalMarket: supporter not in circle");
        require(amount > 0, "GoalMarket: zero amount");

        require(token.transferFrom(msg.sender, supporter, amount), "GoalMarket: transfer failed");

        emit AwardGiven(goalId, msg.sender, supporter, amount);
    }

    // ─────────────────────── VIEW FUNCTIONS ───────────────────────

    function getGoal(uint256 goalId) external view returns (Goal memory) {
        return goals[goalId];
    }

    function getPosition(uint256 goalId, address user) external view returns (Position memory) {
        return positions[goalId][user];
    }

    function getCircleGoals(uint256 circleId) external view returns (uint256[] memory) {
        return circleGoals[circleId];
    }

    function getUserGoals(address user) external view returns (uint256[] memory) {
        return userGoals[user];
    }
}
