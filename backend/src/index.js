/**
 * GoalStake Backend API Server
 *
 * Express server providing REST API for the GoalStake platform.
 * Handles user management, circles, goals, positions, and AI moderation.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────── MIDDLEWARE ───────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─────────────── ROUTES ───────────────

app.use("/api/users", require("./routes/users"));
app.use("/api/circles", require("./routes/circles"));
app.use("/api/goals", require("./routes/goals"));
app.use("/api/moderation", require("./routes/moderation"));

// ─────────────── SERVE FRONTEND (production) ───────────────
// In production / single-server mode, serve the built React app
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
const fs = require("fs");
if (fs.existsSync(frontendDist)) {
  console.log("📦 Serving frontend from", frontendDist);
  app.use(express.static(frontendDist));
}

// ─────────────── HEALTH CHECK ───────────────

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "GoalStake API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ─────────────── PLATFORM STATS ───────────────

app.get("/api/stats", (req, res) => {
  try {
    const { getDb } = require("./database");
    const db = getDb();

    const users = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const circles = db.prepare("SELECT COUNT(*) as count FROM circles").get().count;
    const goals = db.prepare("SELECT COUNT(*) as count FROM goals").get().count;
    const achieved = db
      .prepare("SELECT COUNT(*) as count FROM goals WHERE status = 'achieved'")
      .get().count;
    const totalStaked = db
      .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM positions")
      .get().total;

    res.json({
      users,
      circles,
      goals,
      achieved,
      successRate: goals > 0 ? Math.round((achieved / goals) * 100) : 0,
      totalStaked: Math.round(totalStaked),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────── ERROR HANDLING ───────────────

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// SPA fallback — serve index.html for all non-API routes (client-side routing)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }
  // If frontend is built, serve it; otherwise 404
  const indexPath = path.join(__dirname, "..", "..", "frontend", "dist", "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).json({ error: "Not found. Run 'npm run build' in frontend/ first." });
});

// ─────────────── START SERVER ───────────────

const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, HOST, () => {
  // Get LAN IP for sharing
  const nets = require("os").networkInterfaces();
  let lanIp = "localhost";
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        lanIp = iface.address;
        break;
      }
    }
  }
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║            🎯 GoalStake Server                   ║
  ║──────────────────────────────────────────────────║
  ║  Local:    http://localhost:${PORT}                 ║
  ║  Network:  http://${lanIp}:${PORT}     ║
  ║  API:      http://localhost:${PORT}/api              ║
  ║  Env:      ${(process.env.NODE_ENV || "development").padEnd(35)}║
  ╚══════════════════════════════════════════════════╝

  👉 Friends on the same WiFi can access: http://${lanIp}:${PORT}
  👉 For internet access, use: npx localtunnel --port ${PORT}
  `);
});

module.exports = app;
