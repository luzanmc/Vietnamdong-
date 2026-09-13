import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import Login from './pages/Login.js';
import ForgotPassword from './pages/ForgotPassword.js';
import ResetPassword from './pages/ResetPassword.js';
import Dashboard from './pages/Dashboard.js';
import Wallet from './pages/Wallet.js';
import Redeem from './pages/Redeem.js';
import Admin from './pages/Admin.js';
import VerifyLink from './pages/VerifyLink.js';
import NovaChart from './pages/NovaChart.js';
import DailyReward from './pages/DailyReward.js';
import Leaderboard from './pages/Leaderboard.js';
import CreatorCode from './pages/CreatorCode.js';
import Shell from './components/Shell.js';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/vuotlinkthanhcong/:token" element={<VerifyLink />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/redeem" element={<Redeem />} />
            <Route path="/chart" element={<NovaChart />} />
            <Route path="/daily-reward" element={<DailyReward />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/creator-code" element={<CreatorCode />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute adminOnly />}>
          <Route element={<Shell />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
