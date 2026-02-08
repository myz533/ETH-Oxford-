# ForShure 

**Bet on Your Friends' Ambitions** — A social prediction market for personal goals.

## What is ForShure?

ForShure is a novel consumer primitive at the intersection of **prediction markets**, **social networks**, and **token economies**. Users create personal goals, stake tokens as commitment, and their friend circle trades on the probability of achievement.

### The Core Loop

```
Set Goal → Stake Tokens → Friends Trade YES/NO → Submit Proof → Verify → Payout + Award
```

### Why It Matters

- **Polymarket** proved prediction markets work for news/politics
- **pump.fun** proved token launches can be social entertainment
- **ForShure** applies both to **personal growth** — the most universal human desire

Instead of betting on elections, you bet on your friend finishing their marathon. Instead of launching meme tokens, you launch "goal tokens" that represent your commitment. Friends who bet YES are *financially incentivized to help you succeed*.

## Architecture

```
┌────────────────────────────────────────────┐
│                  Frontend                   │
│        React + Vite + TailwindCSS          │
│          Custom User IDs / Wallets          │
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
| **GoalToken (GSTK)** | ERC-20 token for staking and rewards. Users start with 5000 GSTK balance. |
| **FriendCircle** | On-chain social graph. Create circles, invite friends, manage membership. |
| **GoalMarket** | Core prediction market. Create goals, take YES/NO positions, verify achievements, claim payouts. |

### Key Features

- **Goal Creation** — Set ambitious goals with deadlines and token stakes
- **Prediction Trading** — Friends buy YES/NO positions; price reflects collective belief
- **Proof Verification** — Submit evidence, others vote to verify
- **Social Awards** — Achievers can tip supporters with bonus tokens
- **AI Content Filter** — Two-tier moderation (local + OpenAI) bans inappropriate content
- **Friend Circles** — Private groups with invite codes for goal accountability
- **Custom User IDs** — Choose your own wallet address / username
- **Profile Pictures** — Upload avatars and personalize your profile
- **Balance Tracking** — Full balance history with transaction breakdown
- **Leaderboard** — Compete with friends for the highest balance

## How the Market Mechanism Works

### Payout Rules

**If Goal Succeeds:**
| Role | Payout |
|------|--------|
| Creator | Stake back + **45% of NO pool** |
| YES bettors | Tokens back + **45% of NO pool** (proportional) |
| NO bettors | Lose everything |
| Platform | **10% of NO pool** |

**If Goal Fails:**
| Role | Payout |
|------|--------|
| Creator | Loses entire stake → goes to platform |
| YES bettors | Lose everything |
| NO bettors | Tokens back + **45% of YES pool** (proportional) |
| Platform | Creator stake + **55% of YES pool** |

### Example

1. **Goal Creation**: Alice creates "Run a marathon by June" and stakes 50 GSTK.

2. **Trading**:
   - Bob believes in Alice → buys 30 GSTK of YES
   - Charlie is skeptical → buys 20 GSTK of NO
   - Pool: YES = 30, NO = 20

3. **Resolution (Goal Achieved)**:
   - Alice: 50 (stake back) + 9 (45% of 20 NO pool) = **59 GSTK**
   - Bob: 30 (tokens back) + 9 (45% of 20 NO pool) = **39 GSTK**
   - Charlie: **0 GSTK** (loses everything)
   - Platform: 2 GSTK (10% of 20 NO pool)

4. **Incentive Alignment**:
   - Alice has skin in the game (50 GSTK stake)
   - Bob is incentivized to *help* Alice (his payout grows with NO pool)
   - Charlie keeps Alice honest (skepticism is valued and rewarded if correct)
   - Single-side betting: each user can only bet YES *or* NO on a given goal

## Quick Start

### Prerequisites

- Node.js >= 18
- npm or yarn

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
# Terminal 1: Start local blockchain (optional)
npm run node

# Terminal 2: Deploy contracts (optional)
npm run deploy:local

# Terminal 3: Start backend + frontend
npm run dev
```

> **Note:** The default port 5173 is Vite's standard development server port. However, if this port is already in use on your machine, Vite will automatically assign the next available port (e.g., 5174, 5175, etc.). Always check your terminal output after running the development server to confirm the actual port being used.
The app will be available at **http://localhost:5173**

### Production Build

```bash
npm run share
```

### Run Tests

```bash
npm run test:contracts
```

## Project Structure

```
ETH-Oxford-/
├── contracts/              # Solidity smart contracts
│   ├── GoalToken.sol       # ERC-20 token (GSTK)
│   ├── FriendCircle.sol    # Social graph management
│   └── GoalMarket.sol      # Prediction market (45/45/10 split)
├── scripts/
│   └── deploy.js           # Contract deployment script
├── test/
│   └── GoalStake.test.js   # Contract tests
├── backend/
│   └── src/
│       ├── index.js         # Express server
│       ├── database.js      # SQLite schema (forshure.db)
│       ├── routes/
│       │   ├── goals.js     # CRUD + trading + payouts
│       │   ├── circles.js   # Circle management
│       │   ├── users.js     # Profiles, balance, leaderboard
│       │   └── moderation.js # AI filter endpoint
│       └── services/
│           └── moderation.js # AI content moderation
├── frontend/
│   └── src/
│       ├── App.jsx          # Router & providers
│       ├── api.js           # API client
│       ├── context/
│       │   └── WalletContext.jsx  # Custom wallet/User ID system
│       ├── components/
│       │   ├── Navbar.jsx         # Navigation bar
│       │   ├── WalletButton.jsx   # Wallet connect button
│       │   ├── GoalCard.jsx       # Goal card component
│       │   ├── CreateGoalModal.jsx # Goal creation form
│       │   └── CreateCircleModal.jsx # Circle creation form
│       └── pages/
│           ├── HomePage.jsx       # Landing page
│           ├── CirclesPage.jsx    # Circle browser
│           ├── CircleDetailPage.jsx # Circle detail view
│           ├── GoalsPage.jsx      # Goal browser
│           ├── GoalDetailPage.jsx # Goal detail + trading
│           └── LeaderboardPage.jsx # Global leaderboard
├── hardhat.config.js
└── package.json
```

## Commercial Vision

ForShure sits at the convergence of:
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
- 10% platform fee on loser pool at market resolution
- Cash be exchanged with GSTK tokens
- Premium accounts/circles with advanced analytics and financial products (e.g. token options/derivatives, insurance)
- NFT achievement badges
- API licensing for third-party integrations + data (e.g. newest trends in personal goal-setting)

## Content Moderation

Two-tier AI filtering system [to be implemented]:

1. **Local Filter** — Instant profanity/banned-word detection using `bad-words` library
2. **OpenAI Moderation API** — Advanced contextual analysis for harassment, hate speech, etc.

Every goal title, description, and comment passes through this pipeline before being saved.
