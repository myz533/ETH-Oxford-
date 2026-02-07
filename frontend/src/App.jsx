import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "./context/WalletContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import CirclesPage from "./pages/CirclesPage";
import CircleDetailPage from "./pages/CircleDetailPage";
import GoalsPage from "./pages/GoalsPage";
import GoalDetailPage from "./pages/GoalDetailPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <div className="min-h-screen bg-dark-950">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/circles" element={<CirclesPage />} />
            <Route path="/circles/:circleId" element={<CircleDetailPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/goals/:goalId" element={<GoalDetailPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
              borderRadius: "12px",
            },
            success: {
              iconTheme: { primary: "#22c55e", secondary: "#f1f5f9" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#f1f5f9" },
            },
          }}
        />
      </WalletProvider>
    </BrowserRouter>
  );
}
