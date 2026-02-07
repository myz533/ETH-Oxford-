import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { goalApi } from "../api";
import {
  ArrowLeft, TrendingUp, TrendingDown, Clock, CheckCircle,
  XCircle, AlertCircle, Upload, ThumbsUp, ThumbsDown, Gift,
  Coins, Users
} from "lucide-react";
import toast from "react-hot-toast";

export default function GoalDetailPage() {
  const { goalId } = useParams();
  const { wallet } = useWallet();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stakeAmount, setStakeAmount] = useState(10);
  const [proofUrl, setProofUrl] = useState("");
  const [proofDesc, setProofDesc] = useState("");
  const [verifyComment, setVerifyComment] = useState("");
  const [awardTo, setAwardTo] = useState("");
  const [awardAmount, setAwardAmount] = useState(5);
  const [awardMessage, setAwardMessage] = useState("");

  useEffect(() => {
    loadGoal();
  }, [goalId]);

  const loadGoal = async () => {
    try {
      const data = await goalApi.getGoal(goalId);
      setGoal(data);
    } catch {
      toast.error("Failed to load goal");
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async (isYes) => {
    try {
      await goalApi.takePosition(goalId, wallet, isYes, stakeAmount);
      toast.success(`Staked ${stakeAmount} GSTK on ${isYes ? "YES" : "NO"}!`);
      loadGoal();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSubmitProof = async () => {
    try {
      await goalApi.submitProof(goalId, wallet, proofUrl, proofDesc);
      toast.success("Proof submitted! Waiting for verification.");
      loadGoal();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleVerify = async (approved) => {
    try {
      await goalApi.verify(goalId, wallet, approved, verifyComment);
      toast.success(approved ? "Approved! ✅" : "Rejected ❌");
      loadGoal();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAward = async () => {
    try {
      await goalApi.award(goalId, wallet, awardTo, awardAmount, awardMessage);
      toast.success("Award sent! 🎁");
      setAwardTo("");
      setAwardAmount(5);
      setAwardMessage("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-pulse text-dark-400">Loading...</div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <p className="text-dark-400">Goal not found.</p>
      </div>
    );
  }

  const probability = goal.probability || 50;
  const isCreator = wallet?.toLowerCase() === goal.creator_wallet;
  const deadline = new Date(goal.deadline);
  const daysLeft = Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)));
  const hasVerified = goal.verifications?.some(
    (v) => v.wallet_address === wallet?.toLowerCase()
  );

  const categoryEmojis = {
    fitness: "💪", learning: "📚", career: "💼", health: "🏥",
    finance: "💰", creative: "🎨", social: "🤝", general: "🎯",
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          to={`/circles/${goal.circle_id}`}
          className="flex items-center gap-1 text-dark-400 hover:text-white mb-4 text-sm"
        >
          <ArrowLeft size={16} /> Back to Circle
        </Link>

        {/* Goal Header */}
        <div className={`card mb-6 ${goal.status === "achieved" ? "glow-green-strong" : ""}`}>
          <div className="flex items-start gap-4 mb-4">
            <span className="text-4xl">{categoryEmojis[goal.category] || "🎯"}</span>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold">{goal.title}</h1>
                <span
                  className={`${
                    goal.status === "active"
                      ? "badge-blue"
                      : goal.status === "proof_submitted"
                      ? "badge-yellow"
                      : goal.status === "achieved"
                      ? "badge-green"
                      : "badge-red"
                  }`}
                >
                  {goal.status === "active" && <Clock size={12} className="mr-1" />}
                  {goal.status === "proof_submitted" && <AlertCircle size={12} className="mr-1" />}
                  {goal.status === "achieved" && <CheckCircle size={12} className="mr-1" />}
                  {goal.status === "failed" && <XCircle size={12} className="mr-1" />}
                  {goal.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <p className="text-dark-400 text-sm font-mono mt-1">
                by {goal.creator_wallet?.slice(0, 8)}...{goal.creator_wallet?.slice(-6)}
              </p>
            </div>
          </div>

          {goal.description && (
            <p className="text-dark-300 mb-4">{goal.description}</p>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-dark-800 rounded-xl">
              <p className="text-2xl font-bold text-brand-400">{probability}%</p>
              <p className="text-xs text-dark-400">Probability</p>
            </div>
            <div className="text-center p-3 bg-dark-800 rounded-xl">
              <p className="text-2xl font-bold">{Math.round(goal.totalPool || 0)}</p>
              <p className="text-xs text-dark-400">GSTK Pool</p>
            </div>
            <div className="text-center p-3 bg-dark-800 rounded-xl">
              <p className="text-2xl font-bold">{daysLeft}</p>
              <p className="text-xs text-dark-400">Days Left</p>
            </div>
          </div>

          {/* Probability Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="flex items-center gap-1 text-brand-400 font-semibold">
                <TrendingUp size={16} />
                YES — {Math.round(goal.yesPool || 0)} GSTK
              </span>
              <span className="flex items-center gap-1 text-red-400 font-semibold">
                NO — {Math.round(goal.noPool || 0)} GSTK
                <TrendingDown size={16} />
              </span>
            </div>
            <div className="h-4 rounded-full overflow-hidden bg-dark-700">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${probability}%`,
                  background: `linear-gradient(90deg, #22c55e 0%, #4ade80 100%)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Trading Panel */}
        {goal.status === "active" && wallet && !isCreator && (
          <div className="card mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Coins size={20} className="text-brand-400" />
              Take a Position
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="number"
                className="input flex-1"
                min={1}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                placeholder="Amount"
              />
              <span className="text-dark-400 text-sm font-mono">GSTK</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleStake(true)}
                className="py-3 px-6 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 font-bold rounded-xl border border-brand-600/30 transition-all flex items-center justify-center gap-2"
              >
                <TrendingUp size={18} />
                Stake YES
              </button>
              <button
                onClick={() => handleStake(false)}
                className="py-3 px-6 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-xl border border-red-600/30 transition-all flex items-center justify-center gap-2"
              >
                <TrendingDown size={18} />
                Stake NO
              </button>
            </div>
          </div>
        )}

        {/* Submit Proof (Creator only) */}
        {isCreator && goal.status === "active" && (
          <div className="card mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Upload size={20} className="text-brand-400" />
              Submit Proof of Achievement
            </h2>
            <div className="space-y-3">
              <input
                type="url"
                className="input"
                placeholder="Proof URL (image, video, link...)"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
              />
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Describe how you achieved this goal..."
                value={proofDesc}
                onChange={(e) => setProofDesc(e.target.value)}
              />
              <button onClick={handleSubmitProof} className="btn-primary w-full">
                Submit Proof
              </button>
            </div>
          </div>
        )}

        {/* Verification Panel */}
        {goal.status === "proof_submitted" && wallet && !isCreator && !hasVerified && (
          <div className="card mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-yellow-400" />
              Verify Achievement
            </h2>
            {goal.proof_url && (
              <div className="mb-3 p-3 bg-dark-800 rounded-xl">
                <p className="text-xs text-dark-400 mb-1">Proof:</p>
                <a href={goal.proof_url} target="_blank" className="text-brand-400 text-sm break-all hover:underline">
                  {goal.proof_url}
                </a>
              </div>
            )}
            {goal.proof_description && (
              <p className="text-sm text-dark-300 mb-4">{goal.proof_description}</p>
            )}
            <textarea
              className="input resize-none mb-3"
              rows={2}
              placeholder="Optional comment..."
              value={verifyComment}
              onChange={(e) => setVerifyComment(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVerify(true)}
                className="py-3 px-6 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 font-bold rounded-xl border border-brand-600/30 transition-all flex items-center justify-center gap-2"
              >
                <ThumbsUp size={18} />
                Approve
              </button>
              <button
                onClick={() => handleVerify(false)}
                className="py-3 px-6 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-xl border border-red-600/30 transition-all flex items-center justify-center gap-2"
              >
                <ThumbsDown size={18} />
                Reject
              </button>
            </div>
            <div className="mt-3 text-xs text-dark-500 text-center">
              Votes: {goal.verify_yes} ✅ / {goal.verify_no} ❌
            </div>
          </div>
        )}

        {/* Award Supporters (After Achievement) */}
        {isCreator && goal.status === "achieved" && (
          <div className="card mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Gift size={20} className="text-yellow-400" />
              Award Your Supporters
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                className="input"
                placeholder="Friend's wallet address"
                value={awardTo}
                onChange={(e) => setAwardTo(e.target.value)}
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  className="input flex-1"
                  min={1}
                  value={awardAmount}
                  onChange={(e) => setAwardAmount(Number(e.target.value))}
                />
                <span className="self-center text-dark-400 text-sm font-mono">GSTK</span>
              </div>
              <input
                type="text"
                className="input"
                placeholder="Thank you message (optional)"
                value={awardMessage}
                onChange={(e) => setAwardMessage(e.target.value)}
              />
              <button onClick={handleAward} className="btn-primary w-full">
                🎁 Send Award
              </button>
            </div>
          </div>
        )}

        {/* Positions History */}
        {goal.positions && goal.positions.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={20} className="text-dark-400" />
              Positions ({goal.positions.length})
            </h2>
            <div className="space-y-2">
              {goal.positions.map((pos, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-dark-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className={pos.is_yes ? "text-brand-400" : "text-red-400"}>
                      {pos.is_yes ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </span>
                    <span className="font-mono text-sm text-dark-300">
                      {pos.wallet_address.slice(0, 6)}...{pos.wallet_address.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${pos.is_yes ? "text-brand-400" : "text-red-400"}`}>
                      {pos.is_yes ? "YES" : "NO"}
                    </span>
                    <span className="text-dark-400 text-sm">{pos.amount} GSTK</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
