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

      const result = db.prepare(`
        INSERT INTO goals (circle_id, creator_wallet, title, description, category, deadline, stake_amount, yes_pool, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(circleId, creatorWallet.toLowerCase(), title, description || "", category || "general", deadline, stake, stake);

      // Creator auto-takes YES position
      db.prepare(`
        INSERT INTO positions (goal_id, wallet_address, is_yes, amount)
        VALUES (?, ?, 1, ?)
      `).run(result.lastInsertRowid, creatorWallet.toLowerCase(), stake);

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

      return { ...goal, yesTotal, noTotal, totalPool, probability };
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

    res.json({
      ...goal,
      positions,
      verifications,
      yesPool,
      noPool,
      totalPool,
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

    // Check circle membership
    const membership = db
      .prepare("SELECT * FROM circle_members WHERE circle_id = ? AND wallet_address = ?")
      .get(goal.circle_id, walletAddress.toLowerCase());

    if (!membership) {
      return res.status(403).json({ error: "Not a member of the goal's circle" });
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

      db.prepare(`
        INSERT INTO awards (goal_id, from_wallet, to_wallet, amount, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(goalId, fromWallet.toLowerCase(), toWallet.toLowerCase(), amount, message || "");

      db.prepare(`
        INSERT INTO activity_feed (circle_id, goal_id, wallet_address, action, details)
        VALUES (?, ?, ?, 'award_given', ?)
      `).run(goal.circle_id, goalId, fromWallet.toLowerCase(), `Awarded ${amount} GSTK to ${toWallet}`);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

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
