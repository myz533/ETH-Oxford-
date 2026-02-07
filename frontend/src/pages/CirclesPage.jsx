import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { circleApi } from "../api";
import CreateCircleModal from "../components/CreateCircleModal";
import { Users, Plus, Copy, ExternalLink, Hash } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function CirclesPage() {
  const { wallet, circles, refreshCircles } = useWallet();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (wallet) refreshCircles();
  }, [wallet]);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Invite code copied!");
  };

  if (!wallet) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <Users size={48} className="text-dark-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-dark-400">Connect your wallet to see your friend circles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Friend Circles</h1>
            <p className="text-dark-400 mt-1">Your goal accountability groups</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Circle
          </button>
        </div>

        {/* Circles Grid */}
        {circles.length === 0 ? (
          <div className="card text-center py-16">
            <Users size={48} className="text-dark-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No circles yet</h3>
            <p className="text-dark-400 mb-6">
              Create a circle and invite your friends, or join one with an invite code.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              Create Your First Circle
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {circles.map((circle) => (
              <Link
                key={circle.id}
                to={`/circles/${circle.id}`}
                className="card group hover:border-dark-600/80 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-brand-400 transition-colors">
                        {circle.name}
                      </h3>
                      <p className="text-xs text-dark-400">
                        {circle.member_count || 1} member{(circle.member_count || 1) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-dark-600 group-hover:text-brand-400 transition-colors" />
                </div>

                {circle.description && (
                  <p className="text-sm text-dark-400 mb-3 line-clamp-2">{circle.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-dark-500">
                    <Hash size={12} />
                    <span className="font-mono">{circle.invite_code}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copyCode(circle.invite_code);
                    }}
                    className="p-1.5 hover:bg-dark-800 rounded-lg transition-colors"
                    title="Copy invite code"
                  >
                    <Copy size={14} className="text-dark-400" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCircleModal
          onClose={() => setShowCreate(false)}
          onCreated={() => refreshCircles()}
        />
      )}
    </div>
  );
}
