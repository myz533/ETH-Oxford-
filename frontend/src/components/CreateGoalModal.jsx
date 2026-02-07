import { useState } from "react";
import { goalApi } from "../api";
import { useWallet } from "../context/WalletContext";
import { X, Target, Calendar, Coins, Tag, FileText } from "lucide-react";
import toast from "react-hot-toast";

const categories = [
  { value: "fitness", label: "💪 Fitness" },
  { value: "learning", label: "📚 Learning" },
  { value: "career", label: "💼 Career" },
  { value: "health", label: "🏥 Health" },
  { value: "finance", label: "💰 Finance" },
  { value: "creative", label: "🎨 Creative" },
  { value: "social", label: "🤝 Social" },
  { value: "general", label: "🎯 General" },
];

export default function CreateGoalModal({ circleId, onClose, onCreated }) {
  const { wallet } = useWallet();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "general",
    deadline: "",
    stakeAmount: 10,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet) return toast.error("Connect wallet first");

    setLoading(true);
    try {
      const goal = await goalApi.create({
        circleId,
        title: form.title,
        description: form.description,
        category: form.category,
        deadline: new Date(form.deadline).toISOString(),
        stakeAmount: Number(form.stakeAmount),
        creatorWallet: wallet,
      });

      toast.success("Goal created! Your friends can now stake on it 🎯");
      onCreated?.(goal);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Default deadline: 7 days from now
  const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const defaultDate = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="text-brand-400" size={24} />
            Create a Goal
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              What's your goal?
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Run a marathon by June"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              <FileText size={14} className="inline mr-1" />
              Description (optional)
            </label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Tell your friends more about this goal..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              <Tag size={14} className="inline mr-1" />
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.value })}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    form.category === cat.value
                      ? "bg-brand-600/20 text-brand-400 border border-brand-600/50"
                      : "bg-dark-800 text-dark-300 border border-dark-700 hover:border-dark-600"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              <Calendar size={14} className="inline mr-1" />
              Deadline
            </label>
            <input
              type="date"
              className="input"
              min={minDate}
              defaultValue={defaultDate}
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              required
            />
          </div>

          {/* Stake Amount */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              <Coins size={14} className="inline mr-1" />
              Your Commitment Stake (GSTK)
            </label>
            <div className="relative">
              <input
                type="number"
                className="input pr-16"
                min={10}
                step={1}
                value={form.stakeAmount}
                onChange={(e) => setForm({ ...form, stakeAmount: e.target.value })}
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-dark-400 font-mono">
                GSTK
              </span>
            </div>
            <p className="mt-1 text-xs text-dark-500">
              Minimum 10 GSTK. This seeds the YES pool — you're betting on yourself!
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                "🎯 Create Goal"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
