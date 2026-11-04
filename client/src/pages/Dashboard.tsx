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
    <div className="space-y-8 max-w-6xl mx-auto w-full">
      {/* Welcome & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap">
            <span>Xin chào,</span>
            <UserName name={me.username} level={me.level} />
            <LevelBadge level={me.level} size="sm" />
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Tổng quan tài sản và các hoạt động tích lũy VNC của bạn hôm nay.
          </p>
        </div>

        {/* Quick Status Pills */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/daily-reward"
            onClick={playClickSound}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill hover:border-amber/50 transition btn-press"
            title="Chuỗi điểm danh"
          >
            <i className="bi bi-fire text-amber text-sm animate-pulse-soft" />
            <span className="font-mono text-xs font-bold text-white">{me.streak_days} ngày streak</span>
          </Link>
          <Link
            to="/profile"
            onClick={playClickSound}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-pill hover:border-blue-500/40 text-xs font-medium text-zinc-300 hover:text-white transition btn-press"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
            <span>Cấp {me.level ?? 1} VIP</span>
          </Link>
        </div>
      </div>

      {/* Bento Grid Architecture (Golden Ratio) */}
      <div className="grid grid-cols-12 gap-4 sm:gap-5">
        {/* Card 1: Master Vault Card (8 Cols on Desktop) */}
        <div className="col-span-12 lg:col-span-8 glass-card rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10 group">
          {/* Ambient Specular Glow */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-600/25 transition-all duration-500" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <i className="bi bi-shield-lock-fill text-blue-400" />
                <span>Số dư khả dụng</span>
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                ● Tức thì 24/7
              </span>
            </div>

            {/* Giant Balance Typography */}
            <div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="shrink-0 flex items-center">
                  <CurrencyIcon size={32} />
                </span>
                <span className="font-mono text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight">
                  {(wallet?.balance_nova ?? 0).toLocaleString('vi-VN')}
                </span>
                <span className="text-lg sm:text-xl font-bold text-blue-400">VNC</span>
              </div>
              <div className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
                ≈ {(wallet?.balance_vnd ?? 0).toLocaleString('vi-VN')} VNĐ (Đã quy đổi: {(wallet?.total_redeemed_nova ?? 0).toLocaleString('vi-VN')} VNC)
              </div>
            </div>

            {/* Action Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/wallet"
                onClick={playClickSound}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-[0_0_25px_rgba(37,99,235,0.45)] transition-all btn-press"
              >
                <span>Rút tiền ngay</span>
                <i className="bi bi-arrow-up-right text-xs" />
              </Link>
              <Link
                to="/giftcode"
                onClick={playClickSound}
                className="flex items-center gap-2 px-5 py-3 rounded-full glass-pill hover:border-blue-500/50 text-white font-semibold text-xs sm:text-sm transition-all btn-press"
              >
                <i className="bi bi-ticket-perforated text-blue-400" />
                <span>Nhập Giftcode</span>
              </Link>
            </div>
          </div>

          {/* Bottom XP Progress Bar */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-zinc-400 shrink-0 font-medium">Tiến độ VIP</span>
              <div className="w-full max-w-xs h-2 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-sky-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                  style={{ width: `${me.levelProgress?.progressPercent ?? 0}%` }}
                />
              </div>
              <span className="font-mono text-zinc-400 shrink-0 text-[11px]">
                {me.xp ?? 0}/{me.levelProgress?.nextLevelXp ?? 'Max'} XP
              </span>
            </div>
            <Link
              to="/profile"
              className="text-blue-400 hover:underline shrink-0 text-xs font-semibold"
            >
              Xem đặc quyền →
            </Link>
          </div>
        </div>

        {/* Card 2: Streak Bento Card (4 Cols on Desktop) */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-[2.5rem] p-6 sm:p-7 flex flex-col justify-between shadow-2xl border border-white/10 relative overflow-hidden group">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber/25 transition-all" />

          <div className="relative z-10 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber/15 border border-amber/25 flex items-center justify-center text-amber text-xl shadow-[0_0_15px_rgba(245,165,36,0.25)]">
              <i className="bi bi-fire" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Chuỗi điểm danh</span>
              <h3 className="font-mono text-3xl font-black text-white mt-1">
                {me.streak_days} <span className="text-sm font-normal text-zinc-400">ngày</span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Điểm danh liên tiếp mỗi ngày để mở khóa x2 phần thưởng VNC cùng nhiều phần quà bí mật.
            </p>
          </div>

          <div className="relative z-10 pt-4 mt-4 border-t border-white/10">
            <Link
              to="/daily-reward"
              onClick={playClickSound}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold text-xs transition-all btn-press shadow-sm"
            >
              <span>Điểm danh hôm nay</span>
              <i className="bi bi-arrow-right text-xs" />
            </Link>
          </div>
        </div>

        {/* Card 3: Lucky Wheel Bento Card (6 Cols) */}
        <div className="col-span-12 sm:col-span-6 glass-card rounded-[2.5rem] p-6 flex flex-col justify-between shadow-2xl border border-white/10 relative overflow-hidden group">
          <div className="absolute -top-14 -right-14 w-40 h-40 bg-blue-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/25 transition-all" />

          <div className="relative z-10 space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-lg shadow-[0_0_15px_rgba(59,130,246,0.25)]">
              <i className="bi bi-stars" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">Vòng Quay May Mắn</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Mỗi ngày nhận 1 lượt quay miễn phí với cơ hội trúng giải độc đắc lên đến 50.000 VNC.
            </p>
          </div>

          <div className="relative z-10 pt-4 mt-3">
            <Link
              to="/lucky-wheel"
              onClick={playClickSound}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-pill hover:border-blue-500/50 text-blue-400 hover:text-white font-bold text-xs transition-all btn-press"
            >
              <span>Quay thưởng ngay</span>
              <i className="bi bi-arrow-right text-xs" />
            </Link>
          </div>
        </div>

        {/* Card 4: Referral Program Bento Card (6 Cols) */}
        <div className="col-span-12 sm:col-span-6 glass-card rounded-[2.5rem] p-6 flex flex-col justify-between shadow-2xl border border-white/10 relative overflow-hidden group">
          <div className="absolute -top-14 -right-14 w-40 h-40 bg-sky-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/25 transition-all" />

          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-lg shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                <i className="bi bi-people-fill" />
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Hoa hồng 20%
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-white">Chương Trình Giới Thiệu</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Chia sẻ link cá nhân cho bạn bè và hưởng trọn đời 20% số VNC khi họ vượt link thành công.
            </p>
          </div>

          <div className="relative z-10 pt-4 mt-3">
            <Link
              to="/referral"
              onClick={playClickSound}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-pill hover:border-blue-500/50 text-sky-400 hover:text-white font-bold text-xs transition-all btn-press"
            >
              <span>Lấy link mời bạn bè</span>
              <i className="bi bi-arrow-right text-xs" />
            </Link>
          </div>
        </div>
      </div>

      {/* Task Center (Redesigned Action Hub) */}
      <div className="space-y-5 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <i className="bi bi-lightning-charge-fill text-blue-400" />
              <span>Nhiệm vụ vượt link hôm nay</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Vượt liên kết rút gọn bảo mật để cộng VNC trực tiếp vào số dư tài khoản của bạn.
            </p>
          </div>

          {/* Segmented Floating Filter Pill */}
          <div className="flex items-center gap-1.5 p-1 rounded-full glass-pill border border-white/10 self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar shadow-inner">
            <button
              onClick={() => {
                playClickSound();
                setFilter('all');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all btn-press ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tất cả ({tasks.length})
            </button>
            <button
              onClick={() => {
                playClickSound();
                setFilter('hot');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all btn-press flex items-center gap-1.5 ${
                filter === 'hot'
                  ? 'bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.4)]'
                  : 'text-zinc-400 hover:text-white'
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
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all btn-press ${
                filter === 'available'
                  ? 'bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Còn lượt
            </button>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {filteredTasks.length === 0 ? (
          <div className="glass-card rounded-[2rem] p-12 text-center text-zinc-400 border border-white/10 shadow-2xl">
            <i className="bi bi-inbox text-4xl mb-3 inline-block text-zinc-500" />
            <div className="text-sm font-semibold text-white">Không tìm thấy nhiệm vụ nào phù hợp.</div>
            <p className="text-xs text-zinc-400 mt-1">Vui lòng quay lại sau hoặc chọn bộ lọc khác.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {filteredTasks.map((t) => (
              <TaskCard key={t.id} task={t} onStart={handleStart} busy={busyId === t.id} />
            ))}
          </div>
        )}

        {challengeTaskId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="glass-panel border border-white/15 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <i className="bi bi-shield-check text-blue-400" />
                  <span>Xác minh bảo mật Cloudflare</span>
                </h3>
                <button
                  onClick={() => setChallengeTaskId(null)}
                  className="w-7 h-7 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition"
                >
                  <i className="bi bi-x-lg text-xs" />
                </button>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Hệ thống yêu cầu xác minh bảo mật trước khi cấp link nhiệm vụ. Vui lòng bấm xác minh bên dưới.
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
