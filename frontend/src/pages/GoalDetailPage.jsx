import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { goalApi } from "../api";
import {
  ArrowLeft, TrendingUp, TrendingDown, Clock, CheckCircle,
  XCircle, AlertCircle, Upload, ThumbsUp, ThumbsDown, Gift,
  Coins, Users, Trophy, ShieldAlert, Info
} from "lucide-react";
import toast from "react-hot-toast";

export default function GoalDetailPage() {
  const { goalId } = useParams();
  const { wallet, refreshUser } = useWallet();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stakeAmount, setStakeAmount] = useState(10);
  const [proofUrl, setProofUrl] = useState("");
  const [proofDesc, setProofDesc] = useState("");
  const [verifyComment, setVerifyComment] = useState("");
  const [awardTo, setAwardTo] = useState("");
  const [awardAmount, setAwardAmount] = useState(5);
  const [awardMessage, setAwardMessage] = useState("");
  const [claiming, setClaiming] = useState(false);

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
      refreshUser();
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

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await goalApi.claim(goalId, wallet);
      if (result.payout > 0) {
        toast.success(`Claimed ${result.payout} GSTK! 🎉`);
      } else {
        toast.error("No payout — you lost this round 😔");
      }
      loadGoal();
      refreshUser();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setClaiming(false);
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
  const hasClaimed = goal.claims?.some(
    (c) => c.wallet_address === wallet?.toLowerCase()
  );
  const isResolved = goal.status === "achieved" || goal.status === "failed";

  // Calculate user's position
  const userYes = goal.positions?.filter(p => p.wallet_address === wallet?.toLowerCase() && p.is_yes).reduce((s, p) => s + p.amount, 0) || 0;
  const userNo = goal.positions?.filter(p => p.wallet_address === wallet?.toLowerCase() && !p.is_yes).reduce((s, p) => s + p.amount, 0) || 0;

  // Calculate potential payout
  const calcPayout = () => {
    if (!isResolved) return null;
    const yesPool = goal.yesPool || 0;
    const noPool = goal.noPool || 0;
    const stake = goal.stake_amount || 0;

    if (isCreator) {
      if (goal.status === "achieved") {
        const fee = (noPool * 0.02);
        return stake + noPool - fee;
      }
      return 0;
    }

    if (goal.status === "achieved") {
      return userYes; // YES holders get tokens back
    } else {
      if (userNo > 0 && noPool > 0) {
        const loserFunds = stake + yesPool;
        const fee = loserFunds * 0.02;
        const bonus = (userNo * (loserFunds - fee)) / noPool;
        return userNo + bonus;
      }
      return 0;
    }
  };

  const potentialPayout = calcPayout();

  const maxPool = goal.maxPool || goal.max_pool || (goal.stake_amount * 5);
  const remainingCapacity = goal.remainingCapacity ?? Math.max(0, maxPool - (goal.totalPool || 0));

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
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center p-3 bg-dark-800 rounded-xl">
              <p className="text-2xl font-bold text-brand-400">{probability}%</p>
              <p className="text-xs text-dark-400">Probability</p>
            </div>
            <div className="text-center p-3 bg-dark-800 rounded-xl">
              <p className="text-2xl font-bold text-yellow-400">{Math.round(goal.stake_amount || 0)}</p>
              <p className="text-xs text-dark-400">Creator Stake</p>
            </div>
            <div className="text-center p-3 bg-dark-800 rounded-xl">
              <p className="text-2xl font-bold">{Math.round(goal.totalPool || 0)}</p>
              <p className="text-xs text-dark-400">Betting Pool</p>
            </div>
            <div className="text-center p-3 bg-dark-800 rounded-xl">
              <p className="text-2xl font-bold">{daysLeft}</p>
              <p className="text-xs text-dark-400">Days Left</p>
            </div>
          </div>

          {/* Pool Cap Bar */}
          {goal.status === "active" && (
            <div className="mb-4 p-3 bg-dark-800/50 rounded-xl">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-dark-400">Pool Capacity</span>
                <span className="text-dark-300 font-mono">
                  {Math.round(goal.totalPool || 0)} / {Math.round(maxPool)} GSTK
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-dark-700">
                <div
                  className="h-full rounded-full bg-brand-500/60 transition-all duration-500"
                  style={{ width: `${Math.min(100, ((goal.totalPool || 0) / maxPool) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-dark-500 mt-1">{Math.round(remainingCapacity)} GSTK remaining</p>
            </div>
          )}

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

        {/* Payout Rules Info */}
        <div className="card mb-6 border-dark-700/50">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-dark-300">
            <Info size={16} className="text-brand-400" />
            Payout Rules
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-green-900/10 rounded-xl border border-green-800/20">
              <p className="font-bold text-green-400 mb-2">✅ If Goal Succeeds</p>
              <ul className="space-y-1 text-dark-300">
                <li>• <span className="text-yellow-400">Creator</span>: stake back + all NO pool</li>
                <li>• <span className="text-brand-400">YES bettors</span>: get tokens back</li>
                <li>• <span className="text-red-400">NO bettors</span>: lose everything</li>
              </ul>
            </div>
            <div className="p-3 bg-red-900/10 rounded-xl border border-red-800/20">
              <p className="font-bold text-red-400 mb-2">❌ If Goal Fails</p>
              <ul className="space-y-1 text-dark-300">
                <li>• <span className="text-yellow-400">Creator</span>: loses entire stake</li>
                <li>• <span className="text-brand-400">YES bettors</span>: lose everything</li>
                <li>• <span className="text-red-400">NO bettors</span>: tokens back + bonus</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Your Position */}
        {wallet && (userYes > 0 || userNo > 0 || isCreator) && (
          <div className="card mb-6 border-brand-600/20">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <ShieldAlert size={20} className="text-brand-400" />
              Your Position
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {isCreator && (
                <div className="text-center p-3 bg-yellow-900/10 rounded-xl border border-yellow-800/20">
                  <p className="text-lg font-bold text-yellow-400">{Math.round(goal.stake_amount || 0)}</p>
                  <p className="text-xs text-dark-400">Creator Stake</p>
                </div>
              )}
              {userYes > 0 && (
                <div className="text-center p-3 bg-green-900/10 rounded-xl border border-green-800/20">
                  <p className="text-lg font-bold text-brand-400">{Math.round(userYes)}</p>
                  <p className="text-xs text-dark-400">YES Position</p>
                </div>
              )}
              {userNo > 0 && (
                <div className="text-center p-3 bg-red-900/10 rounded-xl border border-red-800/20">
                  <p className="text-lg font-bold text-red-400">{Math.round(userNo)}</p>
                  <p className="text-xs text-dark-400">NO Position</p>
                </div>
              )}
            </div>
            {isResolved && potentialPayout !== null && (
              <div className={`mt-3 p-3 rounded-xl text-center ${potentialPayout > 0 ? 'bg-green-900/20 border border-green-800/30' : 'bg-red-900/20 border border-red-800/30'}`}>
                <p className={`text-lg font-bold ${potentialPayout > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {potentialPayout > 0 ? `+${Math.round(potentialPayout * 100) / 100} GSTK` : 'No payout'}
                </p>
                <p className="text-xs text-dark-400">
                  {potentialPayout > 0 ? 'Your payout' : 'You lost this round'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Claim Payout Button */}
        {isResolved && wallet && !hasClaimed && (isCreator || userYes > 0 || userNo > 0) && (
          <div className="card mb-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Trophy size={20} className="text-yellow-400" />
              Claim Your Payout
            </h2>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="btn-primary w-full py-3 text-lg"
            >
              {claiming ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Claiming...
                </span>
              ) : (
                "💰 Claim Payout"
              )}
            </button>
            {potentialPayout === 0 && (
              <p className="text-xs text-dark-500 text-center mt-2">
                You have no payout, but claiming will record the result.
              </p>
            )}
          </div>
        )}

        {hasClaimed && (
          <div className="card mb-6 border-green-800/20 bg-green-900/5">
            <p className="text-center text-green-400 font-semibold flex items-center justify-center gap-2">
              <CheckCircle size={18} />
              Payout claimed!
            </p>
          </div>
        )}

        {/* Trading Panel */}
        {goal.status === "active" && wallet && !isCreator && (
          <div className="card mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Coins size={20} className="text-brand-400" />
              Take a Position
            </h2>

            {/* Single-side warning */}
            {(userYes > 0 || userNo > 0) && (
              <div className="mb-3 p-2.5 bg-yellow-900/10 border border-yellow-800/20 rounded-xl">
                <p className="text-xs text-yellow-400 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  You already have a <strong>{userYes > 0 ? 'YES' : 'NO'}</strong> position ({Math.round(userYes || userNo)} GSTK). You can only add more to the same side.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <input
                type="number"
                className="input flex-1"
                min={1}
                max={remainingCapacity}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                placeholder="Amount"
              />
              <span className="text-dark-400 text-sm font-mono">GSTK</span>
            </div>
            <p className="text-xs text-dark-500 mb-4">
              Max you can bet: {Math.round(remainingCapacity)} GSTK (pool cap: {Math.round(maxPool)} GSTK)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleStake(true)}
                disabled={remainingCapacity <= 0 || userNo > 0}
                className="py-3 px-6 bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 font-bold rounded-xl border border-brand-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <TrendingUp size={18} />
                Stake YES
              </button>
              <button
                onClick={() => handleStake(false)}
                disabled={remainingCapacity <= 0 || userYes > 0}
                className="py-3 px-6 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-xl border border-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
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
