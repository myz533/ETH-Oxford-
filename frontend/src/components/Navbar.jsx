import { Link, useLocation } from "react-router-dom";
import WalletButton from "./WalletButton";
import { Target, Users, Trophy, BarChart3, Home, Coins } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/circles", label: "Circles", icon: Users },
  { path: "/goals", label: "Goals", icon: Target },
  { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { path: "/profile", label: "My Progress", icon: BarChart3 },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/25 group-hover:shadow-brand-500/40 transition-shadow">
              <Target size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold">
              Goal<span className="gradient-text">Stake</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-brand-600/20 text-brand-400 border border-brand-600/30"
                      : "text-dark-300 hover:text-white hover:bg-dark-800"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Wallet */}
          <WalletButton />
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-dark-700/50">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 text-xs ${
                isActive ? "text-brand-400" : "text-dark-400"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
