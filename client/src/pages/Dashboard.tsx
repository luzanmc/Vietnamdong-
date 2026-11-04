import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ApiError } from '../api/client.js';
import StatCard from '../components/StatCard.js';
import TaskCard from '../components/TaskCard.js';
import Alert from '../components/Alert.js';
import { StatCardSkeleton, TaskCardSkeleton, Skeleton } from '../components/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { playClickSound } from '../utils/sound.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import BalanceCard from '../components/BalanceCard.js';
import LevelBadge from '../components/LevelBadge.js';
import UserName from '../components/UserName.js';
import TurnstileWidget from '../components/TurnstileWidget.js';
import type { Me, Wallet, Task } from '../types.js';

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'hot' | 'available'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [challengeTaskId, setChallengeTaskId] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const { error: toastError } = useToast();

  async function load() {
    try {
      const [meData, walletData, taskData] = await Promise.all([
        api.me(),
        api.wallet(),
        api.tasks(),
      ]);
      setMe(meData);
      setWallet(walletData);
      setTasks(taskData);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStart(taskId: string, captchaToken?: string) {
    setBusyId(taskId);
    setError(null);
    try {
      const { shortUrl } = await api.startTask(taskId, captchaToken);
      setChallengeTaskId(null);
      window.open(shortUrl, '_blank', 'noopener');
    } catch (e) {
      const err = e as ApiError;
      if (err.status === 428) {
        setChallengeTaskId(taskId);
        setCaptchaReset((prev) => prev + 1);
        return;
      }
      const msg = err.message;
      setError(msg);
      toastError(msg, 'Không thể mở nhiệm vụ');
    } finally {
      setBusyId(null);
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'hot') return !!t.is_hot;
    if (filter === 'available') return t.done_today < t.daily_limit;
    return true;
  });

  if (error && !me) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Alert type="error">{error}</Alert>
        <button
          onClick={() => {
            setError(null);
            load();
          }}
          className="mt-4 px-4 py-2 bg-indigo text-white text-sm font-medium rounded-xl hover:brightness-110 transition btn-press"
        >
          <i className="bi bi-arrow-clockwise mr-1.5" /> Thử lại
        </button>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto w-full">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-6 w-48 rounded-xl" />
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Hero Banner styled with Apple-grade precision and unified geometry */}
      <div className="glass-card rounded-3xl p-5 sm:p-7 border border-line/70 relative overflow-hidden">
        {/* Subtle Ocean Blue ambient glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="grid md:grid-cols-12 gap-6 items-center relative z-10">
          {/* Left Hero Content (7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass-pill text-blue-400 border border-blue-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
                <span>VietnamDong Hub</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass-pill text-muted border border-line/60">
                <i className="bi bi-fire text-amber text-xs" />
                <span>Streak: {me.streak_days} ngày</span>
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-ink leading-tight flex items-center gap-2 flex-wrap">
              <span>Chào mừng trở lại,</span>
              <UserName name={me.username} level={me.level} />
            </h1>

            <Link
              to="/profile"
              onClick={playClickSound}
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full glass-pill hover:border-blue-500/40 text-xs transition btn-press max-w-full"
              title="Xem chi tiết cấp độ & đặc quyền"
            >
              <LevelBadge level={me.level} size="xs" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-ink shrink-0">Cấp {me.level ?? 1}</span>
                <div className="w-24 sm:w-32 h-1.5 bg-surface rounded-full overflow-hidden border border-line/40 shrink-0">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ width: `${me.levelProgress?.progressPercent ?? 0}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-muted truncate">
                  {me.xp ?? 0}/{me.levelProgress?.nextLevelXp ?? 'Max'} XP
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
              Vượt link tự động, điểm danh chuỗi ngày và tích lũy VNC đổi tiền mặt hoặc nạp game tức thì. An toàn, bảo mật và thanh toán chuẩn xác!
            </p>

            {/* Quick Action Shortcuts - Apple Action Pills */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 pt-1">
              <Link
                to="/daily-reward"
                onClick={playClickSound}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-full text-xs font-semibold glass-pill hover:border-blue-500/50 hover:text-blue-400 text-ink transition-all btn-press shadow-sm"
              >
                <i className="bi bi-gift-fill text-blue-400 text-sm shrink-0" />
                <span className="truncate">Điểm danh</span>
              </Link>

              <Link
                to="/lucky-wheel"
                onClick={playClickSound}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-full text-xs font-semibold glass-pill hover:border-blue-500/50 hover:text-blue-400 text-ink transition-all btn-press shadow-sm"
              >
                <i className="bi bi-stars text-sky-400 text-sm shrink-0" />
                <span className="truncate">Quay thưởng</span>
              </Link>

              <Link
                to="/wallet"
                onClick={playClickSound}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-full text-xs font-semibold glass-pill hover:border-blue-500/50 hover:text-blue-400 text-ink transition-all btn-press shadow-sm"
              >
                <i className="bi bi-wallet2 text-blue-500 text-sm shrink-0" />
                <span className="truncate">Rút tiền</span>
              </Link>

              <Link
                to="/referral"
                onClick={playClickSound}
                className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-full text-xs font-semibold glass-pill hover:border-blue-500/50 hover:text-blue-400 text-ink transition-all btn-press shadow-sm"
              >
                <i className="bi bi-people-fill text-blue-400 text-sm shrink-0" />
                <span className="truncate">Hoa hồng 20%</span>
              </Link>
            </div>
          </div>

          {/* Right Hero Virtual Card (5 Cols) */}
          <div className="md:col-span-5 flex flex-col items-center md:items-end justify-center gap-3">
            <div className="w-full max-w-sm">
              <BalanceCard
                novaAmount={wallet?.balance_nova}
                vndAmount={wallet?.balance_vnd}
                label="Số dư khả dụng"
                cardId={me?.card_id || undefined}
              />
            </div>

            <div className="w-full max-w-sm flex items-center justify-between text-xs px-1">
              <Link
                to="/giftcode"
                onClick={playClickSound}
                className="px-3.5 py-1.5 rounded-full font-medium text-xs glass-pill hover:border-blue-500/40 text-ink transition-all btn-press flex items-center gap-1.5"
              >
                <i className="bi bi-ticket-perforated-fill text-blue-400" /> Nhập Giftcode
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  to="/wallet"
                  onClick={playClickSound}
                  className="px-4 py-1.5 rounded-full font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all btn-press flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.35)]"
                >
                  <i className="bi bi-arrow-up-right" /> Rút tiền
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Số dư VNC"
          value={wallet?.balance_nova ?? 0}
          suffix="VNC"
          icon="bi-coin"
          iconColor="text-blue-400"
          hint={`≈ ${(wallet?.balance_vnd ?? 0).toLocaleString('vi-VN')}đ`}
          trend="Khả dụng"
        />
        <StatCard
          label="Đã quy đổi"
          value={wallet?.total_redeemed_nova ?? 0}
          suffix="VNC"
          icon="bi-receipt-cutoff"
          iconColor="text-sky-400"
          hint="Tổng VNC đã rút"
        />
        <StatCard
          label="Chuỗi điểm danh"
          value={me.streak_days}
          suffix="ngày"
          icon="bi-fire"
          iconColor="text-blue-400"
          hint="Giữ streak x2 quà"
          trend="Streak"
        />
        <StatCard
          label="Cấp bậc"
          value={me.role === 'admin' ? 'Admin' : 'Thành viên'}
          icon="bi-person-badge-fill"
          iconColor="text-blue-500"
          hint="Hạng hội viên"
        />
      </div>

      {/* Tasks Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2 text-ink">
              <i className="bi bi-lightning-charge-fill text-blue-400" /> Nhiệm vụ rút gọn liên kết
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Hoàn thành các liên kết bên dưới để cộng VNC trực tiếp vào số dư
            </p>
          </div>

          {/* Task Filter - Apple Segmented Control */}
          <div className="flex items-center gap-1 p-1 rounded-full glass-pill border border-line/60 self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar shadow-inner">
            <button
              onClick={() => {
                playClickSound();
                setFilter('all');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all btn-press ${
                filter === 'all'
                  ? 'bg-blue-600 text-white font-semibold shadow-[0_0_15px_rgba(37,99,235,0.35)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Tất cả ({tasks.length})
            </button>
            <button
              onClick={() => {
                playClickSound();
                setFilter('hot');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all btn-press flex items-center gap-1.5 ${
                filter === 'hot'
                  ? 'bg-blue-600 text-white font-semibold shadow-[0_0_15px_rgba(37,99,235,0.35)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <span>HOT</span>
              <i className="bi bi-fire text-amber text-xs" />
            </button>
            <button
              onClick={() => {
                playClickSound();
                setFilter('available');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all btn-press ${
                filter === 'available'
                  ? 'bg-blue-600 text-white font-semibold shadow-[0_0_15px_rgba(37,99,235,0.35)]'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Còn lượt
            </button>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {filteredTasks.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-muted">
            <i className="bi bi-inbox text-3xl mb-2 inline-block text-muted/60" />
            <div className="text-sm font-medium">Không tìm thấy nhiệm vụ nào phù hợp.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filteredTasks.map((t) => (
              <TaskCard key={t.id} task={t} onStart={handleStart} busy={busyId === t.id} />
            ))}
          </div>
        )}

        {challengeTaskId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-line rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <i className="bi bi-shield-check text-indigo" />
                  <span>Xác minh bảo mật</span>
                </h3>
                <button
                  onClick={() => setChallengeTaskId(null)}
                  className="text-muted hover:text-ink text-sm p-1"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Hệ thống yêu cầu xác minh bảo vệ trước khi bắt đầu nhiệm vụ. Vui lòng bấm xác minh bên dưới.
              </p>
              <div className="flex justify-center py-2">
                <TurnstileWidget
                  reset={captchaReset}
                  onToken={(token) => {
                    if (token) {
                      handleStart(challengeTaskId, token);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
