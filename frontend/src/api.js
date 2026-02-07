// In dev: Vite proxy handles /api → localhost:3001
// In prod / single-server: relative path just works
// For separate deploys: set VITE_API_URL=https://your-backend.onrender.com/api
const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { "Content-Type": "application/json" },
    ...options,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }

  return data;
}

// ─────────────── USERS ───────────────

export const userApi = {
  register: (walletAddress, username, bio) =>
    request("/users/register", {
      method: "POST",
      body: { walletAddress, username, bio },
    }),

  getProfile: (wallet) => request(`/users/${wallet}`),

  getLeaderboard: () => request("/users/leaderboard/top"),

  getBalanceHistory: (wallet) => request(`/users/${wallet}/balance-history`),
};

// ─────────────── CIRCLES ───────────────

export const circleApi = {
  create: (name, description, creatorWallet) =>
    request("/circles", {
      method: "POST",
      body: { name, description, creatorWallet },
    }),

  join: (inviteCode, walletAddress) =>
    request("/circles/join", {
      method: "POST",
      body: { inviteCode, walletAddress },
    }),

  getUserCircles: (wallet) => request(`/circles/user/${wallet}`),

  getCircle: (circleId) => request(`/circles/${circleId}`),

  getFeed: (circleId) => request(`/circles/${circleId}/feed`),
};

// ─────────────── GOALS ───────────────

export const goalApi = {
  create: (data) =>
    request("/goals", {
      method: "POST",
      body: data,
    }),

  getByCircle: (circleId) => request(`/goals/circle/${circleId}`),

  getGoal: (goalId) => request(`/goals/${goalId}`),

  takePosition: (goalId, walletAddress, isYes, amount) =>
    request(`/goals/${goalId}/position`, {
      method: "POST",
      body: { walletAddress, isYes, amount },
    }),

  submitProof: (goalId, walletAddress, proofUrl, proofDescription) =>
    request(`/goals/${goalId}/proof`, {
      method: "POST",
      body: { walletAddress, proofUrl, proofDescription },
    }),

  verify: (goalId, walletAddress, approved, comment) =>
    request(`/goals/${goalId}/verify`, {
      method: "POST",
      body: { walletAddress, approved, comment },
    }),

  award: (goalId, fromWallet, toWallet, amount, message) =>
    request(`/goals/${goalId}/award`, {
      method: "POST",
      body: { fromWallet, toWallet, amount, message },
    }),

  claim: (goalId, walletAddress) =>
    request(`/goals/${goalId}/claim`, {
      method: "POST",
      body: { walletAddress },
    }),

  getUserGoals: (wallet) => request(`/goals/user/${wallet}`),
};

// ─────────────── MODERATION ───────────────

export const moderationApi = {
  check: (text) =>
    request("/moderation/check", {
      method: "POST",
      body: { text },
    }),
};

// ─────────────── STATS ───────────────

export const statsApi = {
  getPlatformStats: () => request("/stats"),
  getHealth: () => request("/health"),
};
