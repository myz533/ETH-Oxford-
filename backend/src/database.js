const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "goalstake.db");

let db;

function getDb() {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initializeDb(db);
  }
  return db;
}

function initializeDb(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      avatar_url TEXT,
      bio TEXT,
      balance REAL DEFAULT 5000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS balance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      change_amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      reason TEXT NOT NULL,
      goal_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS circles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      creator_wallet TEXT NOT NULL,
      invite_code TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS circle_members (
      circle_id INTEGER NOT NULL,
      wallet_address TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (circle_id, wallet_address),
      FOREIGN KEY (circle_id) REFERENCES circles(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id INTEGER,
      circle_id INTEGER NOT NULL,
      creator_wallet TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      deadline DATETIME NOT NULL,
      stake_amount REAL DEFAULT 0,
      yes_pool REAL DEFAULT 0,
      no_pool REAL DEFAULT 0,
      max_pool REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      proof_url TEXT,
      proof_description TEXT,
      verify_yes INTEGER DEFAULT 0,
      verify_no INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (circle_id) REFERENCES circles(id)
    );

    CREATE TABLE IF NOT EXISTS claims (
      goal_id INTEGER NOT NULL,
      wallet_address TEXT NOT NULL,
      payout REAL NOT NULL DEFAULT 0,
      claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (goal_id, wallet_address),
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      wallet_address TEXT NOT NULL,
      is_yes BOOLEAN NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS verifications (
      goal_id INTEGER NOT NULL,
      wallet_address TEXT NOT NULL,
      approved BOOLEAN NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (goal_id, wallet_address),
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      from_wallet TEXT NOT NULL,
      to_wallet TEXT NOT NULL,
      amount REAL NOT NULL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goal_id) REFERENCES goals(id)
    );

    CREATE TABLE IF NOT EXISTS activity_feed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      circle_id INTEGER,
      goal_id INTEGER,
      wallet_address TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { getDb };
