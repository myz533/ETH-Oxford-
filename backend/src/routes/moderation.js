/**
 * Moderation API Routes - for testing AI content filter
 */
const express = require("express");
const router = express.Router();
const { moderateContent, localModeration } = require("../services/moderation");

// ─────────────── CHECK TEXT ───────────────

router.post("/check", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await moderateContent(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── QUICK LOCAL CHECK ───────────────

router.post("/quick-check", (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = localModeration(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
