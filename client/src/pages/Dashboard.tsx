import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ApiError } from '../api/client.js';
import TaskCard from '../components/TaskCard.js';
import Alert from '../components/Alert.js';
import { TaskCardSkeleton, Skeleton } from '../components/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { playClickSound } from '../utils/sound.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import BalanceCard from '../components/BalanceCard.js';
import LevelBadge from '../components/LevelBadge.js';
import UserName from '../components/UserName.js';
import TurnstileWidget from '../components/TurnstileWidget.js';
import type { Me, Wallet, Task } from '../types.js';
import {
  IconFlame,
  IconSparkles,
  IconUsers,
  IconBolt,
  IconTicket,
  IconArrowUpRight,
  IconArrowRight,
  IconShieldCheck,
  IconRefresh,
  IconInbox,
  IconX,
} from '@tabler/icons-react';

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
          className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-xl transition btn-press flex items-center gap-2"
        >
          <IconRefresh size={16} /> Thử lại
        </button>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto w-full">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-8 w-48 rounded-xl" />
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
      {/* SECTION 1: MASTER HERO CARD (GOLDEN RATIO 7:5 WITH 3D BALANCE CARD) */}
      <div className="glass-card rounded-2xl p-5 sm:p-7 relative overflow-hidden border border-white/10 shadow-2xl group">
        {/* Soft Ambient Cyan Specular Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-sky-400/20 transition-all duration-500" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          {/* Left Column: Account Greeting + Balances + Fast Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Header Greeting */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-sm font-semibold text-zinc-400">Xin chào,</span>
                <UserName name={me.username} level={me.level} className="text-lg sm:text-xl font-bold text-white" />
                <LevelBadge level={me.level} size="xs" />
                <span className="ml-auto lg:ml-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  ● Hệ thống 24/7
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Tổng quan tài sản số dư và các hoạt động tích lũy VNC hôm nay của bạn.
              </p>
            </div>

            {/* Giant Typography Balance Display */}
            <div className="pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Số dư tài khoản
              </span>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="shrink-0 flex items-center">
                  <CurrencyIcon size={34} />
                </span>
                <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  {(wallet?.balance_nova ?? 0).toLocaleString('vi-VN')}
                </span>
                <span className="text-base sm:text-lg font-bold text-sky-400">VNC</span>
              </div>
              <div className="text-xs text-zinc-400 font-medium mt-1 flex items-center gap-2 flex-wrap">
                <span>≈ {(wallet?.balance_vnd ?? 0).toLocaleString('vi-VN')} VNĐ</span>
                <span>•</span>
                <span>Đã đổi thưởng: {(wallet?.total_redeemed_nova ?? 0).toLocaleString('vi-VN')} VNC</span>
              </div>
            </div>

            {/* Fast Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                to="/wallet"
                onClick={playClickSound}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all btn-press"
              >
                <span>Rút tiền ngay</span>
                <IconArrowUpRight size={16} stroke={2.5} />
              </Link>
              <Link
                to="/giftcode"
                onClick={playClickSound}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-pill hover:border-sky-500/40 text-white font-semibold text-xs sm:text-sm transition-all btn-press"
              >
                <IconTicket size={16} className="text-sky-400" />
                <span>Nhập Giftcode</span>
              </Link>
              <Link
                to="/daily-reward"
                onClick={playClickSound}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl glass-pill hover:border-amber-400/40 text-zinc-300 hover:text-white text-xs font-semibold transition-all btn-press"
              >
                <IconFlame size={16} className="text-amber-400" />
                <span>{me.streak_days}d streak</span>
              </Link>
            </div>

            {/* VIP Level Progress */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="text-zinc-400 shrink-0 font-medium text-[11px]">Cấp {me.level ?? 1} VIP</span>
                <div className="w-full max-w-xs h-2 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                    style={{ width: `${me.levelProgress?.progressPercent ?? 0}%` }}
                  />
                </div>
                <span className="font-mono text-zinc-400 shrink-0 text-[11px]">
                  {me.xp ?? 0}/{me.levelProgress?.nextLevelXp ?? 'Max'} XP
                </span>
              </div>
              <Link
                to="/profile"
                className="text-sky-400 hover:underline shrink-0 text-xs font-semibold"
              >
                Xem đặc quyền →
              </Link>
            </div>
          </div>

          {/* Right Column: 3D Holographic BalanceCard (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm">
              <BalanceCard
                novaAmount={wallet?.balance_nova ?? me.balance_nova}
                vndAmount={wallet?.balance_vnd}
                showEditButton
              />
            </div>
            <div className="flex items-center justify-between w-full max-w-sm px-2 mt-2 text-[11px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span>Chạm thẻ để đổi VNC/VNĐ</span>
              </span>
              <span>Giữ thẻ để đổi giao diện</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 3 BENTO CARDS (STREAK, LUCKY WHEEL, REFERRAL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bento 1: Daily Streak */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-400/20 transition-all" />
          <div className="relative z-10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]">
              <IconFlame size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chuỗi điểm danh</span>
              <h3 className="font-mono text-2xl font-black text-white mt-0.5">
                {me.streak_days} <span className="text-xs font-normal text-zinc-400">ngày</span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Điểm danh liên tiếp mỗi ngày để nhận VNC cùng các phần quà độc quyền.
            </p>
          </div>
          <div className="relative z-10 pt-4 mt-2">
            <Link
              to="/daily-reward"
              onClick={playClickSound}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 font-bold text-xs transition-all btn-press"
            >
              <span>Điểm danh ngay</span>
              <IconArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Bento 2: Lucky Wheel */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-400/20 transition-all" />
          <div className="relative z-10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
              <IconSparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Vòng quay may mắn</span>
              <h3 className="font-display text-lg font-bold text-white mt-0.5">
                Quay Thưởng Miễn Phí
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Mỗi ngày 1 lượt quay miễn phí với cơ hội trúng giải lên đến 50.000 VNC.
            </p>
          </div>
          <div className="relative z-10 pt-4 mt-2">
            <Link
              to="/lucky-wheel"
              onClick={playClickSound}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 font-bold text-xs transition-all btn-press"
            >
              <span>Quay thưởng ngay</span>
              <IconArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Bento 3: Referral Program */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-400/20 transition-all" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                <IconUsers size={20} />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                Hoa hồng 20%
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chương trình giới thiệu</span>
              <h3 className="font-display text-lg font-bold text-white mt-0.5">
                Kiếm VNC Thụ Động
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Mời bạn bè và nhận trọn đời 20% VNC mỗi khi họ hoàn thành nhiệm vụ.
            </p>
          </div>
          <div className="relative z-10 pt-4 mt-2">
            <Link
              to="/referral"
              onClick={playClickSound}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 font-bold text-xs transition-all btn-press"
            >
              <span>Lấy link mời bạn bè</span>
              <IconArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 3: TASK HUB (APPLE-STYLE SEGMENTED CONTROL + HARMONIZED CARDS) */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <IconBolt size={22} className="text-sky-400" />
              <span>Nhiệm vụ vượt link hôm nay</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Hoàn thành các liên kết rút gọn để nhận VNC trực tiếp vào số dư.
            </p>
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 rounded-xl glass-pill border border-white/10 self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar shadow-inner">
            <button
              onClick={() => {
                playClickSound();
                setFilter('all');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all btn-press ${
                filter === 'all'
                  ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)]'
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
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all btn-press flex items-center gap-1.5 ${
                filter === 'hot'
                  ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>HOT</span>
              <IconFlame size={14} className="text-amber-400" />
            </button>
            <button
              onClick={() => {
                playClickSound();
                setFilter('available');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all btn-press ${
                filter === 'available'
                  ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Còn lượt
            </button>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {filteredTasks.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-zinc-400 border border-white/10 shadow-xl">
            <IconInbox size={40} className="mb-2 mx-auto text-zinc-500" />
            <div className="text-sm font-semibold text-white">Không có nhiệm vụ nào phù hợp.</div>
            <p className="text-xs text-zinc-400 mt-1">Vui lòng quay lại sau hoặc chọn bộ lọc khác.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filteredTasks.map((t) => (
              <TaskCard key={t.id} task={t} onStart={handleStart} busy={busyId === t.id} />
            ))}
          </div>
        )}

        {/* Security Challenge Modal */}
        {challengeTaskId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="glass-panel border border-white/15 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <IconShieldCheck size={18} className="text-sky-400" />
                  <span>Xác minh bảo mật Cloudflare</span>
                </h3>
                <button
                  onClick={() => setChallengeTaskId(null)}
                  className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition"
                >
                  <IconX size={16} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Hệ thống yêu cầu xác minh an toàn trước khi cấp link nhiệm vụ. Vui lòng bấm xác minh bên dưới.
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
