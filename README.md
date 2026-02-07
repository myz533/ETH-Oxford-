# GoalStake 🎯

**Bet on Your Friends' Ambitions** — A social prediction market for personal goals.

> Built for ETH Oxford Hackathon 2026

## 🌟 What is GoalStake?

GoalStake is a novel consumer primitive at the intersection of **prediction markets**, **social networks**, and **token economies**. Users create personal goals, stake tokens as commitment, and their friend circle trades on the probability of achievement.

### The Core Loop

```
Set Goal → Stake Tokens → Friends Trade YES/NO → Submit Proof → Verify → Payout + Award
```

### Why It Matters

- **Polymarket** proved prediction markets work for news/politics
- **pump.fun** proved token launches can be social entertainment
- **GoalStake** applies both to **personal growth** — the most universal human desire

Instead of betting on elections, you bet on your friend finishing their marathon. Instead of launching meme tokens, you launch "goal tokens" that represent your commitment. Friends who bet YES are *financially incentivized to help you succeed*.

## 🏗️ Architecture

```
┌────────────────────────────────────────────┐
│                  Frontend                   │
│        React + Vite + TailwindCSS          │
│          MetaMask / Demo Wallet             │
├────────────────────────────────────────────┤
│                Backend API                  │
│        Express.js + SQLite + AI             │
│         Content Moderation Layer            │
├────────────────────────────────────────────┤
│              Smart Contracts                │
│  GoalToken   FriendCircle   GoalMarket     │
│        Solidity on Ethereum/L2              │
└────────────────────────────────────────────┘
```

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| **GoalToken (GSTK)** | ERC-20 token for staking and rewards. Users get 1000 GSTK airdrop on join. |
| **FriendCircle** | On-chain social graph. Create circles, invite friends, manage membership. |
| **GoalMarket** | Core prediction market. Create goals, take YES/NO positions, verify achievements, claim payouts. |

### Key Features

- 🎯 **Goal Creation** — Set ambitious goals with deadlines and token stakes
- 📈 **Prediction Trading** — Friends buy YES/NO positions; price reflects collective belief
- 📸 **Proof Verification** — Submit evidence, circle members vote to verify
- 🎁 **Social Awards** — Achievers can tip supporters with bonus tokens
- 🤖 **AI Content Filter** — Two-tier moderation (local + OpenAI) bans inappropriate content
- 👥 **Friend Circles** — Private groups with invite codes for goal accountability

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- npm or yarn
- MetaMask (optional — demo mode works without)

### Install

```bash
# Clone the repo
git clone https://github.com/myz533/ETH-Oxford-.git
cd ETH-Oxford-

# Install all dependencies
npm run install:all
```

### Run in Development

```bash
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local

# Terminal 3: Start backend + frontend
npm run dev
```

The app will be available at **http://localhost:5173**

### Run Tests

```bash
npm run test:contracts
```

## 📁 Project Structure

```
ETH-Oxford-/
├── contracts/              # Solidity smart contracts
│   ├── GoalToken.sol       # ERC-20 token with airdrop & minting
│   ├── FriendCircle.sol    # Social graph management
│   └── GoalMarket.sol      # Prediction market for goals
├── scripts/
│   └── deploy.js           # Contract deployment script
├── test/
│   └── GoalStake.test.js   # Contract tests
├── backend/
│   └── src/
│       ├── index.js         # Express server
│       ├── database.js      # SQLite schema & queries
│       ├── routes/          # API endpoints
│       │   ├── goals.js     # CRUD + trading
│       │   ├── circles.js   # Circle management
│       │   ├── users.js     # Profiles & leaderboard
│       │   └── moderation.js # AI filter endpoint
│       └── services/
│           └── moderation.js # AI content moderation
├── frontend/
│   └── src/
│       ├── App.jsx          # Router & providers
│       ├── api.js           # API client
│       ├── context/         # Wallet context
│       ├── components/      # Reusable UI components
│       └── pages/           # Full page views
├── hardhat.config.js
└── package.json
```

## 💡 How the Market Mechanism Works

1. **Goal Creation**: Alice creates "Run a marathon by June" and stakes 50 GSTK. This seeds the YES pool.

2. **Trading**: 
   - Bob believes in Alice → buys 30 GSTK of YES
   - Charlie is skeptical → buys 20 GSTK of NO
   - Market: YES pool = 80, NO pool = 20 → **80% implied probability**

3. **Resolution**:
   - Alice submits proof (photo at finish line)
   - Circle members verify: majority approves ✅
   - YES holders split the total pool (100 GSTK) proportionally
   - Alice can award bonus tokens to her supporters

4. **Incentive Alignment**:
   - Alice has skin in the game (50 GSTK stake)
   - Bob is incentivized to *help* Alice (his money is on the line)
   - Charlie keeps Alice honest (skepticism is also valued)

## 🔮 Commercial Vision

GoalStake sits at the convergence of:
- **Prediction Markets** (Polymarket) — but for personal, relatable events
- **Token Launchpads** (pump.fun) — but tokens represent real human ambitions
- **Social Networks** — small-group, high-trust interactions
- **Gamification** — self-improvement meets financial incentives

### Growth Path
1. **Friend Groups** → organic viral loops (invite codes)
2. **Public Goals** → creator economy (stake on influencer promises)
3. **Corporate Wellness** → teams betting on collective fitness goals
4. **Education** → students staking on study goals with classmates

### Revenue Model
- 2% platform fee on all market resolutions
- Premium circles with advanced analytics
- NFT achievement badges
- API licensing for third-party integrations

## 🛡️ Content Moderation

Two-tier AI filtering system:

1. **Local Filter** — Instant profanity/banned-word detection using `bad-words` library
2. **OpenAI Moderation API** — Advanced contextual analysis for harassment, hate speech, etc.

Every goal title, description, and comment passes through this pipeline before being saved.

## 📜 License

MIT — Built with ❤️ at ETH Oxford 2026