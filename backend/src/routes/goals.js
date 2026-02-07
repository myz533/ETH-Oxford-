/**
 * Goals API Routes
 */
const express = require("express");
const router = express.Router();
const { getDb } = require("../database");
const { moderationMiddleware } = require("../services/moderation");
const { v4: uuidv4 } = require("uuid");

// ─────────────── CREATE GOAL ───────────────

router.post(
  "/",
  moderationMiddleware("title", "description"),
  (req, res) => {
    try {
      const { circleId, title, description, category, deadline, stakeAmount, creatorWallet } = req.body;

      if (!circleId || !title || !deadline || !creatorWallet) {
        return res.status(400).json({ error: "Missing required fields: circleId, title, deadline, creatorWallet" });
      }

      const db = getDb();

      // Verify user is in circle
      const membership = db
        .prepare("SELECT * FROM circle_members WHERE circle_id = ? AND wallet_address = ?")
        .get(circleId, creatorWallet.toLowerCase());

      if (!membership) {
        return res.status(403).json({ error: "Not a member of this circle" });
      }

      const stake = stakeAmount || 10;
      const maxPool = stake * 5; // Max total YES+NO pool = 5x creator stake

      // Check creator has enough balance
      const creator = db
        .prepare("SELECT * FROM users WHERE wallet_address = ?")
        .get(creatorWallet.toLowerCase());

      if (!creator) {
        return res.status(404).json({ error: "User not found. Connect wallet first." });
      }
      if ((creator.balance || 0) < stake) {
        return res.status(400).json({ error: `Insufficient balance. You have ${creator.balance} GSTK but need ${stake} GSTK.` });
      }

      const result = db.prepare(`
        INSERT INTO goals (circle_id, creator_wallet, title, description, category, deadline, stake_amount, yes_pool, no_pool, max_pool, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'active')
      `).run(circleId, creatorWallet.toLowerCase(), title, description || "", category || "general", deadline, stake, maxPool);

      // Creator's stake is a separate commitment — NOT in YES/NO pools

      // Deduct creator's stake from their balance
      db.prepare("UPDATE users SET balance = balance - ? WHERE wallet_address = ?")
        .run(stake, creatorWallet.toLowerCase());

      const newBalance = db.prepare("SELECT balance FROM users WHERE wallet_address = ?")
        .get(creatorWallet.toLowerCase()).balance;

      db.prepare(`
        INSERT INTO balance_history (wallet_address, change_amount, balance_after, reason, goal_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(creatorWallet.toLowerCase(), -stake, newBalance, 'goal_created', result.lastInsertRowid);

      // Activity feed
      db.prepare(`
        INSERT INTO activity_feed (circle_id, goal_id, wallet_address, action, details)
        VALUES (?, ?, ?, 'goal_created', ?)
      `).run(circleId, result.lastInsertRowid, creatorWallet.toLowerCase(), title);

      const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(result.lastInsertRowid);
      res.status(201).json(goal);
    } catch (error) {
      console.error("Create goal error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ─────────────── GET GOALS BY CIRCLE ───────────────

router.get("/circle/:circleId", (req, res) => {
  try {
    const db = getDb();
    const goals = db
      .prepare("SELECT * FROM goals WHERE circle_id = ? ORDER BY created_at DESC")
      .all(req.params.circleId);

    // Enrich with position counts
    const enriched = goals.map((goal) => {
      const positions = db
        .prepare("SELECT is_yes, SUM(amount) as total FROM positions WHERE goal_id = ? GROUP BY is_yes")
        .all(goal.id);

      const yesTotal = positions.find((p) => p.is_yes)?.total || 0;
      const noTotal = positions.find((p) => !p.is_yes)?.total || 0;
      const totalPool = yesTotal + noTotal;
      const probability = totalPool > 0 ? Math.round((yesTotal / totalPool) * 100) : 50;
      const maxPool = goal.max_pool || (goal.stake_amount * 5);

      return { ...goal, yesTotal, noTotal, totalPool, maxPool, probability };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── GET SINGLE GOAL ───────────────

router.get("/:goalId", (req, res) => {
  try {
    const db = getDb();
    const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(req.params.goalId);

    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Get positions
    const positions = db
      .prepare("SELECT * FROM positions WHERE goal_id = ? ORDER BY created_at DESC")
      .all(goal.id);

    // Get verifications
    const verifications = db
      .prepare("SELECT * FROM verifications WHERE goal_id = ?")
      .all(goal.id);

    const yesPool = positions.filter((p) => p.is_yes).reduce((sum, p) => sum + p.amount, 0);
    const noPool = positions.filter((p) => !p.is_yes).reduce((sum, p) => sum + p.amount, 0);
    const totalPool = yesPool + noPool;
    const probability = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
    const maxPool = goal.max_pool || (goal.stake_amount * 5);
    const remainingCapacity = Math.max(0, maxPool - totalPool);

    // Check if current user has already claimed
    const claims = db
      .prepare("SELECT * FROM claims WHERE goal_id = ?")
      .all(goal.id);

    res.json({
      ...goal,
      positions,
      verifications,
      claims,
      yesPool,
      noPool,
      totalPool,
      maxPool,
      remainingCapacity,
      probability,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── TAKE POSITION (BUY YES/NO) ───────────────

router.post("/:goalId/position", (req, res) => {
  try {
    const { walletAddress, isYes, amount } = req.body;
    const goalId = req.params.goalId;

    if (!walletAddress || isYes === undefined || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }

    const db = getDb();
    const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(goalId);

    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (goal.status !== "active") return res.status(400).json({ error: "Goal is not active" });
    if (new Date(goal.deadline) < new Date()) return res.status(400).json({ error: "Deadline passed" });

    // Creator cannot bet on their own goal
    if (goal.creator_wallet === walletAddress?.toLowerCase()) {
      return res.status(400).json({ error: "Creator cannot bet on their own goal" });
    }

    // Check circle membership
    const membership = db
      .prepare("SELECT * FROM circle_members WHERE circle_id = ? AND wallet_address = ?")
      .get(goal.circle_id, walletAddress.toLowerCase());

    if (!membership) {
      return res.status(403).json({ error: "Not a member of the goal's circle" });
    }

    // ── SINGLE-SIDE BETTING: user can only bet on one side ──
    const existingPositions = db
      .prepare("SELECT is_yes, SUM(amount) as total FROM positions WHERE goal_id = ? AND wallet_address = ? GROUP BY is_yes")
      .all(goalId, walletAddress.toLowerCase());

    const hasYes = existingPositions.some(p => p.is_yes === 1 && p.total > 0);
    const hasNo = existingPositions.some(p => p.is_yes === 0 && p.total > 0);

    if ((isYes && hasNo) || (!isYes && hasYes)) {
      const existingSide = hasYes ? "YES" : "NO";
      return res.status(400).json({
        error: `You already have a ${existingSide} position. You can only bet on one side per goal.`
      });
    }

    // Check user has enough balance
    const bettor = db
      .prepare("SELECT * FROM users WHERE wallet_address = ?")
      .get(walletAddress.toLowerCase());

    if (!bettor) {
      return res.status(404).json({ error: "User not found. Connect wallet first." });
    }
    if ((bettor.balance || 0) < amount) {
      return res.status(400).json({ error: `Insufficient balance. You have ${bettor.balance} GSTK but need ${amount} GSTK.` });
    }

    // Enforce max pool cap (proportional to creator stake)
    const currentTotal = (goal.yes_pool || 0) + (goal.no_pool || 0);
    const maxPool = goal.max_pool || (goal.stake_amount * 5);
    if (currentTotal + amount > maxPool) {
      const remaining = Math.max(0, maxPool - currentTotal);
      return res.status(400).json({
        error: `Would exceed max pool size. Remaining capacity: ${remaining} GSTK`,
        remainingCapacity: remaining
      });
    }

    // Record position
    db.prepare(`
      INSERT INTO positions (goal_id, wallet_address, is_yes, amount)
      VALUES (?, ?, ?, ?)
    `).run(goalId, walletAddress.toLowerCase(), isYes ? 1 : 0, amount);

    // Update pool
    if (isYes) {
      db.prepare("UPDATE goals SET yes_pool = yes_pool + ? WHERE id = ?").run(amount, goalId);
    } else {
      db.prepare("UPDATE goals SET no_pool = no_pool + ? WHERE id = ?").run(amount, goalId);
    }

    // Deduct from user's balance
    db.prepare("UPDATE users SET balance = balance - ? WHERE wallet_address = ?")
      .run(amount, walletAddress.toLowerCase());

    const updatedBalance = db.prepare("SELECT balance FROM users WHERE wallet_address = ?")
      .get(walletAddress.toLowerCase()).balance;

    db.prepare(`
      INSERT INTO balance_history (wallet_address, change_amount, balance_after, reason, goal_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(walletAddress.toLowerCase(), -amount, updatedBalance, isYes ? 'bet_yes' : 'bet_no', goalId);

    // Activity feed
    db.prepare(`
      INSERT INTO activity_feed (circle_id, goal_id, wallet_address, action, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      goal.circle_id,
      goalId,
      walletAddress.toLowerCase(),
      isYes ? "position_yes" : "position_no",
      `Staked ${amount} GSTK on ${isYes ? "YES" : "NO"}`
    );

    const updated = db.prepare("SELECT * FROM goals WHERE id = ?").get(goalId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── SUBMIT PROOF ───────────────

router.post(
  "/:goalId/proof",
  moderationMiddleware("proofDescription"),
  (req, res) => {
    try {
      const { walletAddress, proofUrl, proofDescription } = req.body;
      const goalId = req.params.goalId;

      const db = getDb();
      const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(goalId);

      if (!goal) return res.status(404).json({ error: "Goal not found" });
      if (goal.creator_wallet !== walletAddress?.toLowerCase()) {
        return res.status(403).json({ error: "Only the goal creator can submit proof" });
      }

      db.prepare(`
        UPDATE goals SET status = 'proof_submitted', proof_url = ?, proof_description = ? WHERE id = ?
      `).run(proofUrl || "", proofDescription || "", goalId);

      db.prepare(`
        INSERT INTO activity_feed (circle_id, goal_id, wallet_address, action, details)
        VALUES (?, ?, ?, 'proof_submitted', 'Proof submitted for verification')
      `).run(goal.circle_id, goalId, walletAddress.toLowerCase());

      const updated = db.prepare("SELECT * FROM goals WHERE id = ?").get(goalId);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─────────────── VERIFY GOAL ───────────────

router.post("/:goalId/verify", (req, res) => {
  try {
    const { walletAddress, approved, comment } = req.body;
    const goalId = req.params.goalId;

    const db = getDb();
    const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(goalId);

    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (goal.status !== "proof_submitted") {
      return res.status(400).json({ error: "No proof submitted yet" });
    }
    if (goal.creator_wallet === walletAddress?.toLowerCase()) {
      return res.status(400).json({ error: "Cannot verify your own goal" });
    }

    // Check if already verified
    const existing = db
      .prepare("SELECT * FROM verifications WHERE goal_id = ? AND wallet_address = ?")
      .get(goalId, walletAddress.toLowerCase());

    if (existing) {
      return res.status(400).json({ error: "Already verified" });
    }

    db.prepare(`
      INSERT INTO verifications (goal_id, wallet_address, approved, comment)
      VALUES (?, ?, ?, ?)
    `).run(goalId, walletAddress.toLowerCase(), approved ? 1 : 0, comment || "");

    // Update counts
    if (approved) {
      db.prepare("UPDATE goals SET verify_yes = verify_yes + 1 WHERE id = ?").run(goalId);
    } else {
      db.prepare("UPDATE goals SET verify_no = verify_no + 1 WHERE id = ?").run(goalId);
    }

    // Check quorum (50% of circle members)
    const memberCount = db
      .prepare("SELECT COUNT(*) as count FROM circle_members WHERE circle_id = ?")
      .get(goal.circle_id).count;
    const totalVotes = db
      .prepare("SELECT COUNT(*) as count FROM verifications WHERE goal_id = ?")
      .get(goalId).count;

    const quorum = Math.ceil((memberCount - 1) / 2); // -1 because creator can't vote
    if (totalVotes >= quorum) {
      const updatedGoal = db.prepare("SELECT * FROM goals WHERE id = ?").get(goalId);
      const newStatus = updatedGoal.verify_yes > updatedGoal.verify_no ? "achieved" : "failed";

      db.prepare("UPDATE goals SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(newStatus, goalId);

      db.prepare(`
        INSERT INTO activity_feed (circle_id, goal_id, wallet_address, action, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(goal.circle_id, goalId, walletAddress.toLowerCase(), `goal_${newStatus}`, `Goal ${newStatus}!`);
    }

    const updated = db.prepare("SELECT * FROM goals WHERE id = ?").get(goalId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── AWARD SUPPORTER ───────────────

router.post(
  "/:goalId/award",
  moderationMiddleware("message"),
  (req, res) => {
    try {
      const { fromWallet, toWallet, amount, message } = req.body;
      const goalId = req.params.goalId;

      const db = getDb();
      const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(goalId);

      if (!goal) return res.status(404).json({ error: "Goal not found" });
      if (goal.status !== "achieved") return res.status(400).json({ error: "Goal not achieved" });
      if (goal.creator_wallet !== fromWallet?.toLowerCase()) {
        return res.status(403).json({ error: "Only goal creator can award" });
      }
      if (!toWallet || !amount || amount <= 0) {
        return res.status(400).json({ error: "Valid recipient wallet and positive amount required" });
      }

      const sender = db.prepare("SELECT * FROM users WHERE wallet_address = ?")
        .get(fromWallet.toLowerCase());
      if (!sender) return res.status(404).json({ error: "Sender not found" });
      if ((sender.balance || 0) < amount) {
        return res.status(400).json({ error: `Insufficient balance. You have ${sender.balance} GSTK but are trying to send ${amount} GSTK.` });
      }

      // Ensure recipient user exists (auto-create if needed)
      let recipient = db.prepare("SELECT * FROM users WHERE wallet_address = ?")
        .get(toWallet.toLowerCase());
      if (!recipient) {
        db.prepare("INSERT INTO users (wallet_address, balance) VALUES (?, 5000)")
          .run(toWallet.toLowerCase());
        recipient = db.prepare("SELECT * FROM users WHERE wallet_address = ?")
          .get(toWallet.toLowerCase());
      }

      // Deduct from sender
      db.prepare("UPDATE users SET balance = balance - ? WHERE wallet_address = ?")
        .run(amount, fromWallet.toLowerCase());

      const senderNewBalance = db.prepare("SELECT balance FROM users WHERE wallet_address = ?")
        .get(fromWallet.toLowerCase()).balance;

      db.prepare(`
        INSERT INTO balance_history (wallet_address, change_amount, balance_after, reason, goal_id)
        VALUES (?, ?, ?, 'award_given', ?)
      `).run(fromWallet.toLowerCase(), -amount, senderNewBalance, goalId);

      // Credit to recipient
      db.prepare("UPDATE users SET balance = balance + ? WHERE wallet_address = ?")
        .run(amount, toWallet.toLowerCase());

      const recipientNewBalance = db.prepare("SELECT balance FROM users WHERE wallet_address = ?")
        .get(toWallet.toLowerCase()).balance;

      db.prepare(`
        INSERT INTO balance_history (wallet_address, change_amount, balance_after, reason, goal_id)
        VALUES (?, ?, ?, 'award_received', ?)
      `).run(toWallet.toLowerCase(), amount, recipientNewBalance, goalId);

      // Record the award
      db.prepare(`
        INSERT INTO awards (goal_id, from_wallet, to_wallet, amount, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(goalId, fromWallet.toLowerCase(), toWallet.toLowerCase(), amount, message || "");

      db.prepare(`
        INSERT INTO activity_feed (circle_id, goal_id, wallet_address, action, details)
        VALUES (?, ?, ?, 'award_given', ?)
      `).run(goal.circle_id, goalId, fromWallet.toLowerCase(), `Awarded ${amount} GSTK to ${toWallet}`);

      res.json({ success: true, senderBalance: senderNewBalance, recipientBalance: recipientNewBalance });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ─────────────── CLAIM PAYOUT ───────────────

const PLATFORM_FEE_BPS = 200; // 2%

router.post("/:goalId/claim", (req, res) => {
  try {
    const { walletAddress } = req.body;
    const goalId = req.params.goalId;

    if (!walletAddress) {
      return res.status(400).json({ error: "Missing walletAddress" });
    }

    const db = getDb();
    const wallet = walletAddress.toLowerCase();
    const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(goalId);

    if (!goal) return res.status(404).json({ error: "Goal not found" });
    if (goal.status !== "achieved" && goal.status !== "failed") {
      return res.status(400).json({ error: "Goal is not resolved yet" });
    }

    // Check if already claimed
    const existingClaim = db
      .prepare("SELECT * FROM claims WHERE goal_id = ? AND wallet_address = ?")
      .get(goalId, wallet);
    if (existingClaim) {
      return res.status(400).json({ error: "Already claimed" });
    }

    // Get this user's positions
    const userPositions = db
      .prepare("SELECT is_yes, SUM(amount) as total FROM positions WHERE goal_id = ? AND wallet_address = ? GROUP BY is_yes")
      .all(goalId, wallet);

    const yesAmount = userPositions.find(p => p.is_yes === 1)?.total || 0;
    const noAmount = userPositions.find(p => p.is_yes === 0)?.total || 0;

    const isCreator = goal.creator_wallet === wallet;

    // Get pool totals
    const allPositions = db
      .prepare("SELECT is_yes, SUM(amount) as total FROM positions WHERE goal_id = ? GROUP BY is_yes")
      .all(goalId);
    const yesPool = allPositions.find(p => p.is_yes === 1)?.total || 0;
    const noPool = allPositions.find(p => p.is_yes === 0)?.total || 0;

    let payout = 0;

    if (isCreator) {
      // ── CREATOR PAYOUT ──
      if (goal.status === "achieved") {
        // Creator WINS: gets stake back + all NO pool (minus fee on winnings)
        const winnings = noPool;
        const fee = (winnings * PLATFORM_FEE_BPS) / 10000;
        payout = goal.stake_amount + winnings - fee;
      }
      // If failed: creator gets nothing (loses entire stake)
    } else {
      // ── FRIEND PAYOUT ──
      if (yesAmount === 0 && noAmount === 0) {
        return res.status(400).json({ error: "No position to claim" });
      }

      if (goal.status === "achieved") {
        // YES holders: get their tokens back
        if (yesAmount > 0) {
          payout = yesAmount;
        }
        // NO holders: lose everything
      } else {
        // FAILED: NO holders win
        if (noAmount > 0 && noPool > 0) {
          // Losers' funds: creator stake + yes pool
          const loserFunds = goal.stake_amount + yesPool;
          const fee = (loserFunds * PLATFORM_FEE_BPS) / 10000;
          const distributable = loserFunds - fee;

          // NO bettor gets: their stake back + proportional share of loser funds
          const bonus = (noAmount * distributable) / noPool;
          payout = noAmount + bonus;
        }
        // YES holders: lose everything
      }
    }

    // Record the claim
    db.prepare(`
      INSERT INTO claims (goal_id, wallet_address, payout)
      VALUES (?, ?, ?)
    `).run(goalId, wallet, payout);

    // Credit payout to user's balance
    if (payout > 0) {
      db.prepare("UPDATE users SET balance = balance + ? WHERE wallet_address = ?")
        .run(payout, wallet);

      const updatedBalance = db.prepare("SELECT balance FROM users WHERE wallet_address = ?")
        .get(wallet).balance;

      db.prepare(`
        INSERT INTO balance_history (wallet_address, change_amount, balance_after, reason, goal_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(wallet, payout, updatedBalance, 'payout_claimed', goalId);
    }

    // Activity feed
    db.prepare(`
      INSERT INTO activity_feed (circle_id, goal_id, wallet_address, action, details)
      VALUES (?, ?, ?, 'payout_claimed', ?)
    `).run(goal.circle_id, goalId, wallet, `Claimed ${Math.round(payout * 100) / 100} GSTK`);

    res.json({ success: true, payout: Math.round(payout * 100) / 100, status: goal.status });
  } catch (error) {
    console.error("Claim error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── GET USER GOALS ───────────────

router.get("/user/:wallet", (req, res) => {
  try {
    const db = getDb();
    const wallet = req.params.wallet.toLowerCase();

    const created = db
      .prepare("SELECT * FROM goals WHERE creator_wallet = ? ORDER BY created_at DESC")
      .all(wallet);

    const staked = db
      .prepare(`
        SELECT DISTINCT g.* FROM goals g
        INNER JOIN positions p ON p.goal_id = g.id
        WHERE p.wallet_address = ? AND g.creator_wallet != ?
        ORDER BY g.created_at DESC
      `)
      .all(wallet, wallet);

    res.json({ created, staked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
