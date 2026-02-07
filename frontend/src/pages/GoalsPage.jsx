import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { goalApi } from "../api";
import GoalCard from "../components/GoalCard";
import { Target, TrendingUp, Award, Filter } from "lucide-react";

export default function GoalsPage() {
  const { wallet, circles } = useWallet();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, active, achieved, failed

  useEffect(() => {
    loadAllGoals();
  }, [circles]);

  const loadAllGoals = async () => {
    if (!circles.length) {
      setLoading(false);
      return;
    }

    try {
      const allGoals = await Promise.all(
        circles.map((c) => goalApi.getByCircle(c.id))
      );
      const flat = allGoals.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setGoals(flat);
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered =
    filter === "all"
      ? goals
      : goals.filter((g) => g.status === filter);

  if (!wallet) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <Target size={48} className="text-dark-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-dark-400">Connect to see goals from your circles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Goals</h1>
            <p className="text-dark-400 mt-1">All goals from your circles</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: "all", label: "All", icon: Target },
            { value: "active", label: "Active", icon: TrendingUp },
            { value: "achieved", label: "Achieved", icon: Award },
            { value: "failed", label: "Failed", icon: Filter },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === value
                  ? "bg-brand-600/20 text-brand-400 border border-brand-600/30"
                  : "bg-dark-800 text-dark-400 border border-dark-700 hover:border-dark-600"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-dark-400">Loading goals...</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Target size={48} className="text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No goals yet</h3>
            <p className="text-dark-400">
              {circles.length === 0
                ? "Join a circle first to see goals."
                : "Create a goal in one of your circles."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((goal) => (
              <GoalCard key={`${goal.id}-${goal.circle_id}`} goal={goal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
