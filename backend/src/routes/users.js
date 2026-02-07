/**
 * Users API Routes
 */
const express = require("express");
const router = express.Router();
const { getDb } = require("../database");
const { moderationMiddleware } = require("../services/moderation");

// ─────────────── REGISTER / UPDATE USER ───────────────

router.post(
  "/register",
  moderationMiddleware("username", "bio"),
  (req, res) => {
    try {
      const { walletAddress, username, avatarUrl, bio } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }

      const db = getDb();

      // Upsert user
      const existing = db
        .prepare("SELECT * FROM users WHERE wallet_address = ?")
        .get(walletAddress.toLowerCase());

      if (existing) {
        db.prepare(`
          UPDATE users SET username = ?, avatar_url = ?, bio = ? WHERE wallet_address = ?
        `).run(
          username || existing.username,
          avatarUrl || existing.avatar_url,
          bio || existing.bio,
          walletAddress.toLowerCase()
        );
      } else {
        db.prepare(`
          INSERT INTO users (wallet_address, username, avatar_url, bio)
          VALUES (?, ?, ?, ?)
        `).run(walletAddress.toLowerCase(), username || null, avatarUrl || null, bio || null);
      }

      const user = db
        .prepare("SELECT * FROM users WHERE wallet_address = ?")
        .get(walletAddress.toLowerCase());

      res.json(user);
    } catch (error) {
      if (error.message?.includes("UNIQUE constraint failed: users.username")) {
        return res.status(400).json({ error: "Username already taken" });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

// ─────────────── GET USER PROFILE ───────────────

router.get("/:wallet", (req, res) => {
  try {
    const db = getDb();
    const wallet = req.params.wallet.toLowerCase();

    const user = db.prepare("SELECT * FROM users WHERE wallet_address = ?").get(wallet);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Stats
    const goalsCreated = db
      .prepare("SELECT COUNT(*) as count FROM goals WHERE creator_wallet = ?")
      .get(wallet).count;

    const goalsAchieved = db
      .prepare("SELECT COUNT(*) as count FROM goals WHERE creator_wallet = ? AND status = 'achieved'")
      .get(wallet).count;

    const totalStaked = db
      .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM positions WHERE wallet_address = ?")
      .get(wallet).total;

    const circleCount = db
      .prepare("SELECT COUNT(*) as count FROM circle_members WHERE wallet_address = ?")
      .get(wallet).count;

    res.json({
      ...user,
      stats: {
        goalsCreated,
        goalsAchieved,
        successRate: goalsCreated > 0 ? Math.round((goalsAchieved / goalsCreated) * 100) : 0,
        totalStaked,
        circleCount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── LEADERBOARD ───────────────

router.get("/leaderboard/top", (req, res) => {
  try {
    const db = getDb();

    const leaderboard = db.prepare(`
      SELECT 
        u.wallet_address,
        u.username,
        u.avatar_url,
        COUNT(CASE WHEN g.status = 'achieved' THEN 1 END) as goals_achieved,
        COUNT(g.id) as total_goals,
        COALESCE(SUM(p.total_staked), 0) as total_staked
      FROM users u
      LEFT JOIN goals g ON g.creator_wallet = u.wallet_address
      LEFT JOIN (
        SELECT wallet_address, SUM(amount) as total_staked FROM positions GROUP BY wallet_address
      ) p ON p.wallet_address = u.wallet_address
      GROUP BY u.wallet_address
      ORDER BY goals_achieved DESC, total_staked DESC
      LIMIT 20
    `).all();

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
