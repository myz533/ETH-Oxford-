import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { userApi, goalApi } from "../api";
import { Link } from "react-router-dom";
import {
  Coins, Target, Trophy, TrendingUp, TrendingDown,
  Clock, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight,
  User, BarChart3
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { wallet, user, refreshUser } = useWallet();
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [userGoals, setUserGoals] = useState({ created: [], staked: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [wallet]);

  const loadData = async () => {
    try {
      await refreshUser();
      const [history, goals] = await Promise.all([
        userApi.getBalanceHistory(wallet),
        goalApi.getUserGoals(wallet),
      ]);
      setBalanceHistory(history);
      setUserGoals(goals);
    } catch (err) {
      console.error("Failed to load profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <div className="max-w-md mx-auto card py-16">
          <User size={48} className="text-dark-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-dark-400">Connect your wallet to see your progress and stats.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-pulse text-dark-400">Loading your progress...</div>
      </div>
    );
  }

  const balance = user?.balance ?? user?.stats?.balance ?? 5000;
  const stats = user?.stats || {};
  const startingBalance = 5000;
  const pnl = balance - startingBalance;
  const pnlPercent = ((pnl / startingBalance) * 100).toFixed(1);

  const reasonLabels = {
    goal_created: "Created Goal (Stake)",
    bet_yes: "Bet YES",
    bet_no: "Bet NO",
    payout_claimed: "Payout Claimed",
    award_given: "Award Sent",
    award_received: "Award Received",
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-600/25">
            <User size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">
            {user?.username || `${wallet.slice(0, 8)}...${wallet.slice(-6)}`}
          </h1>
          <p className="text-dark-400 text-sm font-mono mt-1">{wallet}</p>
        </div>

        {/* Balance Card */}
        <div className="card mb-6 text-center border-brand-600/20">
          <p className="text-sm text-dark-400 mb-1">Current Balance</p>
          <p className="text-4xl font-bold text-brand-400 flex items-center justify-center gap-2">
            <Coins size={32} />
            {Math.round(balance)}
            <span className="text-lg text-dark-400 font-normal">GSTK</span>
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className={`text-sm font-semibold flex items-center gap-1 ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {pnl >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {pnl >= 0 ? '+' : ''}{Math.round(pnl)} GSTK ({pnl >= 0 ? '+' : ''}{pnlPercent}%)
            </span>
            <span className="text-xs text-dark-500">from {startingBalance} start</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card text-center">
            <Target size={20} className="text-brand-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.goalsCreated || 0}</p>
            <p className="text-xs text-dark-400">Goals Set</p>
          </div>
          <div className="card text-center">
            <CheckCircle size={20} className="text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-400">{stats.goalsAchieved || 0}</p>
            <p className="text-xs text-dark-400">Achieved</p>
          </div>
          <div className="card text-center">
            <TrendingUp size={20} className="text-brand-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{Math.round(stats.totalWins || 0)}</p>
            <p className="text-xs text-dark-400">GSTK Won</p>
          </div>
          <div className="card text-center">
            <TrendingDown size={20} className="text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-400">{Math.round(stats.totalLosses || 0)}</p>
            <p className="text-xs text-dark-400">GSTK Lost</p>
          </div>
        </div>

        {/* Balance Progress Bar */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <BarChart3 size={20} className="text-brand-400" />
            Balance Progress
          </h2>
          <div className="relative h-6 rounded-full overflow-hidden bg-dark-700">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(5, (balance / (startingBalance * 2)) * 100))}%`,
                background: pnl >= 0
                  ? 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)'
                  : 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
              }}
            />
            {/* Starting marker */}
            <div
              className="absolute top-0 h-full w-0.5 bg-white/30"
              style={{ left: '50%' }}
            />
          </div>
          <div className="flex justify-between text-xs text-dark-500 mt-1">
            <span>0</span>
            <span className="text-white/40">Start: {startingBalance}</span>
            <span>{startingBalance * 2}</span>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-dark-400" />
            Balance History
          </h2>
          {balanceHistory.length === 0 ? (
            <p className="text-dark-500 text-center py-8">No transactions yet. Start by creating or betting on a goal!</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {balanceHistory.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-dark-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.change_amount >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                    }`}>
                      {tx.change_amount >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{reasonLabels[tx.reason] || tx.reason}</p>
                      <p className="text-xs text-dark-500">
                        {tx.goal_id ? `Goal #${tx.goal_id} • ` : ''}
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${tx.change_amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.change_amount >= 0 ? '+' : ''}{Math.round(tx.change_amount * 100) / 100}
                    </p>
                    <p className="text-xs text-dark-500">{Math.round(tx.balance_after)} GSTK</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Goals */}
        {userGoals.created.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target size={20} className="text-brand-400" />
              My Goals ({userGoals.created.length})
            </h2>
            <div className="space-y-2">
              {userGoals.created.map((goal) => (
                <Link
                  key={goal.id}
                  to={`/goals/${goal.id}`}
                  className="flex items-center justify-between p-3 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{goal.title}</p>
                    <p className="text-xs text-dark-500">Staked {goal.stake_amount} GSTK</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    goal.status === 'achieved' ? 'bg-green-900/30 text-green-400' :
                    goal.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                    'bg-blue-900/30 text-blue-400'
                  }`}>
                    {goal.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* My Bets */}
        {userGoals.staked.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy size={20} className="text-yellow-400" />
              My Bets ({userGoals.staked.length})
            </h2>
            <div className="space-y-2">
              {userGoals.staked.map((goal) => (
                <Link
                  key={goal.id}
                  to={`/goals/${goal.id}`}
                  className="flex items-center justify-between p-3 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{goal.title}</p>
                    <p className="text-xs text-dark-500">by {goal.creator_wallet?.slice(0, 6)}...{goal.creator_wallet?.slice(-4)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    goal.status === 'achieved' ? 'bg-green-900/30 text-green-400' :
                    goal.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                    'bg-blue-900/30 text-blue-400'
                  }`}>
                    {goal.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
