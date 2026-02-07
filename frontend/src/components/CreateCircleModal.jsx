import { useState } from "react";
import { circleApi } from "../api";
import { useWallet } from "../context/WalletContext";
import { X, Users, Link as LinkIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function CreateCircleModal({ onClose, onCreated }) {
  const { wallet } = useWallet();
  const [mode, setMode] = useState("create"); // "create" | "join"
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!wallet) return toast.error("Connect wallet first");

    setLoading(true);
    try {
      const circle = await circleApi.create(name, description, wallet);
      toast.success(`Circle "${name}" created! Share code: ${circle.invite_code}`);
      onCreated?.(circle);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!wallet) return toast.error("Connect wallet first");

    setLoading(true);
    try {
      const result = await circleApi.join(inviteCode, wallet);
      toast.success(`Joined "${result.circle.name}"! 🎉`);
      onCreated?.(result.circle);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-brand-400" size={24} />
            Friend Circle
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-dark-800 rounded-xl p-1 mb-6">
          <button
            onClick={() => setMode("create")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === "create"
                ? "bg-brand-600 text-white shadow-lg"
                : "text-dark-400 hover:text-white"
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setMode("join")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === "join"
                ? "bg-brand-600 text-white shadow-lg"
                : "text-dark-400 hover:text-white"
            }`}
          >
            Join Existing
          </button>
        </div>

        {mode === "create" ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Circle Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Gym Bros, Study Group"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Description (optional)
              </label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="What's this circle about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Circle"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                <LinkIcon size={14} className="inline mr-1" />
                Invite Code
              </label>
              <input
                type="text"
                className="input text-center text-lg font-mono tracking-widest uppercase"
                placeholder="ABCD1234"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
              />
              <p className="mt-1.5 text-xs text-dark-500 text-center">
                Ask your friend for their circle's invite code
              </p>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Joining..." : "Join Circle"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
