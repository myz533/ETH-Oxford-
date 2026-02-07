import { useWallet } from "../context/WalletContext";
import { Wallet, LogOut, User, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function WalletButton() {
  const { wallet, user, connectWallet, disconnectWallet } = useWallet();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!wallet) {
    return (
      <button onClick={connectWallet} className="btn-primary flex items-center gap-2">
        <Wallet size={18} />
        Connect Wallet
      </button>
    );
  }

  const displayName = user?.username || `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 glass-hover rounded-xl"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
          <User size={16} />
        </div>
        <span className="font-medium text-sm">{displayName}</span>
        <ChevronDown size={14} className={`transition-transform ${showMenu ? "rotate-180" : ""}`} />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-56 glass rounded-xl overflow-hidden shadow-xl z-50">
          <div className="p-3 border-b border-dark-700">
            <p className="text-xs text-dark-400">Connected</p>
            <p className="text-sm font-mono truncate">{wallet}</p>
          </div>
          {user?.stats && (
            <div className="p-3 border-b border-dark-700 grid grid-cols-2 gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-brand-400">{user.stats.goalsAchieved}</p>
                <p className="text-xs text-dark-400">Achieved</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{user.stats.successRate}%</p>
                <p className="text-xs text-dark-400">Success</p>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              disconnectWallet();
              setShowMenu(false);
            }}
            className="w-full p-3 flex items-center gap-2 text-red-400 hover:bg-dark-800 transition-colors"
          >
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
