/**
 * Circles API Routes
 */
const express = require("express");
const router = express.Router();
const { getDb } = require("../database");
const { moderationMiddleware } = require("../services/moderation");
const { v4: uuidv4 } = require("uuid");

// ─────────────── CREATE CIRCLE ───────────────

router.post(
  "/",
  moderationMiddleware("name", "description"),
  (req, res) => {
    try {
      const { name, description, creatorWallet } = req.body;

      if (!name || !creatorWallet) {
        return res.status(400).json({ error: "Missing required fields: name, creatorWallet" });
      }

      const db = getDb();
      const inviteCode = uuidv4().slice(0, 8).toUpperCase();

      const result = db.prepare(`
        INSERT INTO circles (name, description, creator_wallet, invite_code)
        VALUES (?, ?, ?, ?)
      `).run(name, description || "", creatorWallet.toLowerCase(), inviteCode);

      // Add creator as first member
      db.prepare(`
        INSERT INTO circle_members (circle_id, wallet_address)
        VALUES (?, ?)
      `).run(result.lastInsertRowid, creatorWallet.toLowerCase());

      // Activity
      db.prepare(`
        INSERT INTO activity_feed (circle_id, wallet_address, action, details)
        VALUES (?, ?, 'circle_created', ?)
      `).run(result.lastInsertRowid, creatorWallet.toLowerCase(), name);

      const circle = db.prepare("SELECT * FROM circles WHERE id = ?").get(result.lastInsertRowid);
      res.status(201).json(circle);
    } catch (error) {
      console.error("Create circle error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ─────────────── JOIN CIRCLE BY INVITE CODE ───────────────

router.post("/join", (req, res) => {
  try {
    const { inviteCode, walletAddress } = req.body;

    if (!inviteCode || !walletAddress) {
      return res.status(400).json({ error: "Missing invite code or wallet" });
    }

    const db = getDb();
    const circle = db
      .prepare("SELECT * FROM circles WHERE invite_code = ?")
      .get(inviteCode.toUpperCase());

    if (!circle) {
      return res.status(404).json({ error: "Invalid invite code" });
    }

    // Check if already a member
    const existing = db
      .prepare("SELECT * FROM circle_members WHERE circle_id = ? AND wallet_address = ?")
      .get(circle.id, walletAddress.toLowerCase());

    if (existing) {
      return res.status(400).json({ error: "Already a member of this circle" });
    }

    db.prepare(`
      INSERT INTO circle_members (circle_id, wallet_address)
      VALUES (?, ?)
    `).run(circle.id, walletAddress.toLowerCase());

    db.prepare(`
      INSERT INTO activity_feed (circle_id, wallet_address, action, details)
      VALUES (?, ?, 'member_joined', 'Joined the circle')
    `).run(circle.id, walletAddress.toLowerCase());

    res.json({ success: true, circle });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── GET USER'S CIRCLES ───────────────

router.get("/user/:wallet", (req, res) => {
  try {
    const db = getDb();
    const wallet = req.params.wallet.toLowerCase();

    const circles = db.prepare(`
      SELECT c.*, COUNT(cm2.wallet_address) as member_count
      FROM circles c
      INNER JOIN circle_members cm ON cm.circle_id = c.id AND cm.wallet_address = ?
      LEFT JOIN circle_members cm2 ON cm2.circle_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all(wallet);

    res.json(circles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── GET CIRCLE DETAILS ───────────────

router.get("/:circleId", (req, res) => {
  try {
    const db = getDb();
    const circle = db.prepare("SELECT * FROM circles WHERE id = ?").get(req.params.circleId);

    if (!circle) {
      return res.status(404).json({ error: "Circle not found" });
    }

    const members = db.prepare(`
      SELECT cm.wallet_address, cm.joined_at, u.username, u.avatar_url
      FROM circle_members cm
      LEFT JOIN users u ON u.wallet_address = cm.wallet_address
      WHERE cm.circle_id = ?
    `).all(circle.id);

    const goalCount = db
      .prepare("SELECT COUNT(*) as count FROM goals WHERE circle_id = ?")
      .get(circle.id).count;

    res.json({ ...circle, members, goalCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── GET CIRCLE ACTIVITY FEED ───────────────

router.get("/:circleId/feed", (req, res) => {
  try {
    const db = getDb();
    const feed = db.prepare(`
      SELECT af.*, u.username, u.avatar_url
      FROM activity_feed af
      LEFT JOIN users u ON u.wallet_address = af.wallet_address
      WHERE af.circle_id = ?
      ORDER BY af.created_at DESC
      LIMIT 50
    `).all(req.params.circleId);

    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
