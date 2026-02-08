import { useState, useRef } from "react";
import { User, Camera, X, Hash } from "lucide-react";
import toast from "react-hot-toast";

export default function ConnectModal({ onConnect, onClose }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [username, setUsername] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarData, setAvatarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error("Image must be under 500KB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      setAvatarData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const finalAddress = walletAddress.trim();
    if (!finalAddress) {
      toast.error("Please enter a User ID");
      return;
    }

    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }

    setLoading(true);
    try {
      await onConnect(finalAddress, username.trim(), avatarData);
    } catch (err) {
      toast.error(err.message || "Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl border border-dark-700/50 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-dark-700/50">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-dark-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Join ForShure</h2>
              <p className="text-sm text-dark-400">Set up your profile to get started</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Profile Picture */}
          <div className="flex flex-col items-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full cursor-pointer group"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover border-2 border-brand-500"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-dark-700 to-dark-800 border-2 border-dashed border-dark-600 flex items-center justify-center">
                  <User size={32} className="text-dark-500" />
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-xs text-dark-500 mt-2">Click to upload profile picture</p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              Username <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                maxLength={30}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">
              User ID <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value.replace(/\s/g, ''))}
                placeholder="e.g. WK123, alice_eth, myID"
                maxLength={40}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors font-mono text-sm"
              />
            </div>
            <p className="text-xs text-dark-500 mt-1.5">Choose any short ID — this is how others will find you.</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !walletAddress.trim() || !username.trim()}
            className="w-full py-3 btn-primary text-center font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting...
              </span>
            ) : (
              "Get Started"
            )}
          </button>

          <p className="text-xs text-dark-500 text-center">
            You'll start with 5,000 GSTK tokens to stake and bet on goals.
          </p>
        </form>
      </div>
    </div>
  );
}
