import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { LanguageProvider } from './context/LanguageContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { SettingsProvider } from './context/SettingsContext.js';
import { ToastProvider } from './context/ToastContext.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import GuestRoute from './components/GuestRoute.js';
import Login from './pages/Login.js';
import ForgotPassword from './pages/ForgotPassword.js';
import ResetPassword from './pages/ResetPassword.js';
import Dashboard from './pages/Dashboard.js';
import Wallet from './pages/Wallet.js';
import Redeem from './pages/Redeem.js';
import Admin from './pages/Admin.js';
import AdminAdvanced from './pages/AdminAdvanced.js';
import VerifyLink from './pages/VerifyLink.js';
import NovaChart from './pages/NovaChart.js';
import DailyReward from './pages/DailyReward.js';
import Leaderboard from './pages/Leaderboard.js';
import CreatorCode from './pages/CreatorCode.js';
import VietsubStudio from './pages/VietsubStudio.js';
import Achievements from './pages/Achievements.js';
import Referral from './pages/Referral.js';
import ReferralCapture from './pages/ReferralCapture.js';
import Faq from './pages/Faq.js';
import TransactionHistory from './pages/TransactionHistory.js';
import LuckyWheel from './pages/LuckyWheel.js';
import Quests from './pages/Quests.js';
import Support from './pages/Support.js';
import Security from './pages/Security.js';
import Legal from './pages/Legal.js';
import NotFound from './pages/NotFound.js';
import Landing from './pages/Landing.js';
import { MusicProvider } from './context/MusicContext.js';
import SecurityGuard from './components/SecurityGuard.js';
import Profile from './pages/Profile.js';
import Giftcode from './pages/Giftcode.js';
import Shell from './components/Shell.js';
import { CardProvider } from './context/CardContext.js';
import { BalanceCardModal } from './components/BalanceCard.js';
import ErrorBoundary from './components/ErrorBoundary.js';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CardProvider>
              <SettingsProvider>
                <MusicProvider>
                  <ToastProvider>
                    <SecurityGuard />
                    <BalanceCardModal />
                    <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/r/:username" element={<ReferralCapture />} />
              <Route path="/terms" element={<Legal kind="terms" />} />
              <Route path="/privacy" element={<Legal kind="privacy" />} />
              <Route path="/about" element={<Legal kind="about" />} />
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>
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
                  <Route path="/vietsub-studio" element={<VietsubStudio />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/referral" element={<Referral />} />
                  <Route path="/faq" element={<Faq />} />
                  <Route path="/history" element={<TransactionHistory />} />
                  <Route path="/lucky-wheel" element={<LuckyWheel />} />
                  <Route path="/quests" element={<Quests />} />
                  <Route path="/giftcode" element={<Giftcode />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>
              <Route element={<ProtectedRoute adminOnly />}>
                <Route element={<Shell />}>
                  <Route path="/admin" element={<Admin />} />
                </Route>
                <Route path="/admin/advanced" element={<AdminAdvanced />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ToastProvider>
            </MusicProvider>
          </SettingsProvider>
          </CardProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
