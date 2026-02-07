import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { userApi, circleApi } from "../api";
import ConnectModal from "../components/ConnectModal";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [user, setUser] = useState(null);
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Check if wallet already connected
  useEffect(() => {
    const saved = localStorage.getItem("goalstake_wallet");
    if (saved) {
      const addr = saved.toLowerCase();
      setWallet(addr);
      loadUser(addr);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async (address) => {
    try {
      const profile = await userApi.getProfile(address);
      setUser(profile);
      const userCircles = await circleApi.getUserCircles(address);
      setCircles(userCircles);
    } catch {
      // User not in DB (e.g. DB was reset) — re-register them
      try {
        const savedName = localStorage.getItem("goalstake_username");
        if (savedName) {
          const profile = await userApi.register(address, savedName);
          setUser(profile);
        } else {
          // No saved name — clear state so they see sign-in
          setWallet(null);
          localStorage.removeItem("goalstake_wallet");
          localStorage.removeItem("goalstake_username");
        }
      } catch (regErr) {
        console.error("Auto re-register failed:", regErr);
        setWallet(null);
        localStorage.removeItem("goalstake_wallet");
        localStorage.removeItem("goalstake_username");
      }
    } finally {
      setLoading(false);
    }
  };

  // Opens the connect modal instead of auto-generating a wallet
  const connectWallet = useCallback(() => {
    setShowConnectModal(true);
  }, []);

  // Called from the ConnectModal with user-supplied data
  const handleConnect = useCallback(async (address, username, avatarData) => {
    try {
      setError(null);
      const addr = address.toLowerCase();

      const profile = await userApi.register(addr, username, null, avatarData);
      setWallet(addr);
      setUser(profile);
      localStorage.setItem("goalstake_wallet", addr);
      localStorage.setItem("goalstake_username", username);

      // Load circles
      try {
        const userCircles = await circleApi.getUserCircles(addr);
        setCircles(userCircles);
      } catch {}

      setShowConnectModal(false);
      return addr;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setUser(null);
    setCircles([]);
    localStorage.removeItem("goalstake_wallet");
    localStorage.removeItem("goalstake_username");
  }, []);

  const refreshCircles = useCallback(async () => {
    if (wallet) {
      try {
        const userCircles = await circleApi.getUserCircles(wallet);
        setCircles(userCircles);
      } catch (err) {
        console.error("Failed to refresh circles:", err);
      }
    }
  }, [wallet]);

  const refreshUser = useCallback(async () => {
    if (wallet) {
      await loadUser(wallet);
    }
  }, [wallet]);

  const updateProfile = useCallback(async (updates) => {
    if (!wallet) return;
    try {
      const profile = await userApi.updateProfile(wallet, updates);
      setUser((prev) => ({ ...prev, ...profile }));
      if (updates.username) {
        localStorage.setItem("goalstake_username", updates.username);
      }
    } catch (err) {
      throw err;
    }
  }, [wallet]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        user,
        circles,
        loading,
        error,
        connectWallet,
        disconnectWallet,
        refreshCircles,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
      {showConnectModal && (
        <ConnectModal
          onConnect={handleConnect}
          onClose={() => setShowConnectModal(false)}
        />
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
