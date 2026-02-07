import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const statusConfig = {
  active: { label: "Active", class: "badge-blue", icon: Clock },
  proof_submitted: { label: "Verifying", class: "badge-yellow", icon: AlertCircle },
  achieved: { label: "Achieved", class: "badge-green", icon: CheckCircle },
  failed: { label: "Failed", class: "badge-red", icon: XCircle },
};

const categoryEmojis = {
  fitness: "💪",
  learning: "📚",
  career: "💼",
  health: "🏥",
  finance: "💰",
  creative: "🎨",
  social: "🤝",
  general: "🎯",
};

export default function GoalCard({ goal, compact = false }) {
  const status = statusConfig[goal.status] || statusConfig.active;
  const StatusIcon = status.icon;
  const probability = goal.probability || 50;
  const emoji = categoryEmojis[goal.category] || "🎯";

  const totalPool = (goal.yesTotal || goal.yes_pool || 0) + (goal.noTotal || goal.no_pool || 0);

  const deadline = new Date(goal.deadline);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));

  return (
    <Link
      to={`/goals/${goal.id}`}
      className={`block card hover:border-dark-600/80 transition-all duration-200 group ${
        goal.status === "achieved" ? "glow-green" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">{emoji}</span>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-brand-400 transition-colors">
              {goal.title}
            </h3>
            <p className="text-xs text-dark-400 font-mono">
              by {goal.creator_wallet?.slice(0, 6)}...{goal.creator_wallet?.slice(-4)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={status.class}>
            <StatusIcon size={12} className="mr-1" />
            {status.label}
          </span>
        </div>
      </div>

      {!compact && goal.description && (
        <p className="text-sm text-dark-300 mb-4 line-clamp-2">{goal.description}</p>
      )}

      {/* Probability Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="flex items-center gap-1 text-brand-400 font-medium">
            <TrendingUp size={12} />
            YES {probability}%
          </span>
          <span className="flex items-center gap-1 text-red-400 font-medium">
            NO {100 - probability}%
            <TrendingDown size={12} />
          </span>
        </div>
        <div className="probability-bar">
          <div
            className="probability-fill"
            style={{
              width: `${probability}%`,
              background: `linear-gradient(90deg, #22c55e ${Math.max(0, probability - 20)}%, ${
                probability > 50 ? "#4ade80" : "#ef4444"
              } 100%)`,
            }}
          />
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-xs text-dark-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            💎 {Math.round(totalPool)} GSTK
          </span>
          {goal.status === "active" && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {daysLeft}d left
            </span>
          )}
        </div>
        <ChevronRight size={14} className="text-dark-500 group-hover:text-brand-400 transition-colors" />
      </div>
    </Link>
  );
}
