import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { circleApi, goalApi } from "../api";
import GoalCard from "../components/GoalCard";
import CreateGoalModal from "../components/CreateGoalModal";
import {
  Users, Plus, Copy, ArrowLeft, Target, Activity,
  Clock, User as UserIcon
} from "lucide-react";
import toast from "react-hot-toast";

export default function CircleDetailPage() {
  const { circleId } = useParams();
  const { wallet } = useWallet();
  const [circle, setCircle] = useState(null);
  const [goals, setGoals] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [tab, setTab] = useState("goals");

  useEffect(() => {
    loadCircle();
  }, [circleId]);

  const loadCircle = async () => {
    try {
      const [circleData, goalsData, feedData] = await Promise.all([
        circleApi.getCircle(circleId),
        goalApi.getByCircle(circleId),
        circleApi.getFeed(circleId),
      ]);
      setCircle(circleData);
      setGoals(goalsData);
      setFeed(feedData);
    } catch (err) {
      toast.error("Failed to load circle");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-pulse text-dark-400">Loading...</div>
      </div>
    );
  }

  if (!circle) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <p className="text-dark-400">Circle not found.</p>
      </div>
    );
  }

  const actionLabels = {
    goal_created: "🎯 Created a goal",
    position_yes: "📈 Staked YES",
    position_no: "📉 Staked NO",
    proof_submitted: "📸 Submitted proof",
    goal_achieved: "🏆 Goal achieved!",
    goal_failed: "❌ Goal failed",
    member_joined: "👋 Joined the circle",
    award_given: "🎁 Gave an award",
    circle_created: "🎉 Created the circle",
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <Link to="/circles" className="flex items-center gap-1 text-dark-400 hover:text-white mb-4 text-sm">
          <ArrowLeft size={16} /> Back to Circles
        </Link>

        {/* Circle Header */}
        <div className="card mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <Users size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{circle.name}</h1>
                {circle.description && (
                  <p className="text-dark-400 mt-1">{circle.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-dark-400">
                  <span>{circle.members?.length || 0} members</span>
                  <span>{circle.goalCount || 0} goals</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(circle.invite_code);
                      toast.success("Invite code copied!");
                    }}
                    className="flex items-center gap-1 text-brand-400 hover:text-brand-300"
                  >
                    <Copy size={12} />
                    {circle.invite_code}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowCreateGoal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              New Goal
            </button>
          </div>

          {/* Members */}
          {circle.members && (
            <div className="mt-4 pt-4 border-t border-dark-700">
              <div className="flex items-center gap-2 flex-wrap">
                {circle.members.map((member, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 rounded-full text-xs"
                    title={member.wallet_address}
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                      <UserIcon size={10} />
                    </div>
                    <span className="font-mono">
                      {member.username || `${member.wallet_address.slice(0, 6)}...${member.wallet_address.slice(-4)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-dark-900 p-1 rounded-xl mb-6">
          <button
            onClick={() => setTab("goals")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              tab === "goals" ? "bg-dark-700 text-white" : "text-dark-400 hover:text-white"
            }`}
          >
            <Target size={16} />
            Goals ({goals.length})
          </button>
          <button
            onClick={() => setTab("feed")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              tab === "feed" ? "bg-dark-700 text-white" : "text-dark-400 hover:text-white"
            }`}
          >
            <Activity size={16} />
            Activity
          </button>
        </div>

        {/* Goals Tab */}
        {tab === "goals" && (
          <div>
            {goals.length === 0 ? (
              <div className="card text-center py-12">
                <Target size={48} className="text-dark-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">No goals yet</h3>
                <p className="text-dark-400 mb-4">Be the first to set a goal in this circle!</p>
                <button onClick={() => setShowCreateGoal(true)} className="btn-primary">
                  Create a Goal
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Feed Tab */}
        {tab === "feed" && (
          <div className="space-y-2">
            {feed.length === 0 ? (
              <div className="card text-center py-12">
                <Activity size={48} className="text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400">No activity yet</p>
              </div>
            ) : (
              feed.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 glass rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center flex-shrink-0">
                    <UserIcon size={14} className="text-dark-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-mono text-dark-300">
                        {item.username || `${item.wallet_address.slice(0, 6)}...${item.wallet_address.slice(-4)}`}
                      </span>
                      {" "}
                      <span className="text-dark-400">
                        {actionLabels[item.action] || item.action}
                      </span>
                    </p>
                    {item.details && (
                      <p className="text-xs text-dark-500 truncate">{item.details}</p>
                    )}
                  </div>
                  <span className="text-xs text-dark-600 flex-shrink-0">
                    <Clock size={12} className="inline mr-1" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showCreateGoal && (
        <CreateGoalModal
          circleId={Number(circleId)}
          onClose={() => setShowCreateGoal(false)}
          onCreated={() => loadCircle()}
        />
      )}
    </div>
  );
}
