import { useState, useEffect } from "react";
import { userApi } from "../api";
import { Trophy, Medal, Target, Coins, User } from "lucide-react";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await userApi.getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const rankIcons = {
    0: <span className="text-2xl">🥇</span>,
    1: <span className="text-2xl">🥈</span>,
    2: <span className="text-2xl">🥉</span>,
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Trophy className="text-yellow-400" size={32} />
            Leaderboard
          </h1>
          <p className="text-dark-400 mt-1">Top goal achievers on GoalStake</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-dark-400">Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div className="card text-center py-16">
            <Trophy size={48} className="text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No data yet</h3>
            <p className="text-dark-400">Start achieving goals to appear here!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <div
                key={user.wallet_address}
                className={`card flex items-center gap-4 ${
                  index < 3 ? "border-yellow-500/20 glow-green" : ""
                }`}
              >
                <div className="w-10 text-center flex-shrink-0">
                  {rankIcons[index] || (
                    <span className="text-dark-500 font-bold">#{index + 1}</span>
                  )}
                </div>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">
                    {user.username || user.wallet_address}
                  </p>
                  <p className="text-xs text-dark-400">
                    {user.total_goals} goals • {user.goals_achieved} achieved
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 text-right">
                  <div>
                    <p className="font-bold text-brand-400 flex items-center gap-1">
                      <Coins size={14} />
                      {Math.round(user.balance ?? 5000)}
                    </p>
                    <p className="text-xs text-dark-500">balance</p>
                  </div>
                  <div>
                    <p className="font-bold text-dark-300 flex items-center gap-1">
                      <Target size={14} />
                      {user.goals_achieved}
                    </p>
                    <p className="text-xs text-dark-500">achieved</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
