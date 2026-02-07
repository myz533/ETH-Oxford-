import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { userApi, circleApi } from "../api";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [user, setUser] = useState(null);
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if wallet already connected
  useEffect(() => {
    const saved = localStorage.getItem("goalstake_wallet");
    if (saved) {
      setWallet(saved);
      loadUser(saved);
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
      // New user, register
      try {
        const profile = await userApi.register(address);
        setUser(profile);
      } catch (err) {
        console.error("Failed to load/register user:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = useCallback(async () => {
    try {
      setError(null);

      if (!window.ethereum) {
        // Demo mode: use a random wallet
        const demoWallet = "0x" + Array.from({ length: 40 }, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join("");
        
        setWallet(demoWallet);
        localStorage.setItem("goalstake_wallet", demoWallet);
        
        // Register demo user
        const profile = await userApi.register(demoWallet, `User_${demoWallet.slice(2, 8)}`);
        setUser(profile);
        return demoWallet;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const address = accounts[0];
      setWallet(address);
      localStorage.setItem("goalstake_wallet", address);
      await loadUser(address);
      return address;
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
      }}
    >
      {children}
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
