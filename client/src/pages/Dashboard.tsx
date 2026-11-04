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
  IconGift,
  IconArrowUpRight,
  IconArrowRight,
  IconShieldCheck,
  IconRefresh,
  IconInbox,
  IconX,
  IconCrown,
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

  const completedTodayCount = tasks.filter((t) => t.done_today >= t.daily_limit).length;

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-10 w-48 rounded-xl" />
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <TaskCardSkeleton key={i} />
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <Skeleton className="h-60 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* 2-COLUMN FINTECH DASHBOARD MASTER GRID (CARD PLACED ON THE RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* LEFT / CENTER COLUMN: MAIN WORKFLOW (TASKS & ACTIVITIES) */}
        {/* On Mobile: order-2 (Renders below Card)                 */}
        {/* On Desktop: lg:order-1 (Primary Left Section - 8 cols)  */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 order-2 lg:order-1 min-w-0">
          {/* Welcome & KPI Banner */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden shadow-xl group">
            <div className="absolute -top-16 -right-16 w-60 h-60 bg-sky-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-sky-400/20 transition-all duration-500" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-zinc-400">Xin chào,</span>
                  <UserName name={me.username} level={me.level} className="text-base sm:text-lg font-bold text-white" />
                  <LevelBadge level={me.level} size="xs" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  ● Hệ thống 24/7
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Hoàn thành các liên kết nhiệm vụ bên dưới để tích lũy VNC và quy đổi tiền mặt, thẻ cào tức thì.
              </p>

              {/* Quick KPI stats strip */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] text-zinc-400 font-medium block">Số dư VNC</span>
                  <span className="font-mono text-sm sm:text-base font-bold text-white tracking-tight">
                    {(wallet?.balance_nova ?? 0).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] text-zinc-400 font-medium block">Nhiệm vụ xong</span>
                  <span className="font-mono text-sm sm:text-base font-bold text-sky-400 tracking-tight">
                    {completedTodayCount}/{tasks.length}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] text-zinc-400 font-medium block">Chuỗi streak</span>
                  <span className="font-mono text-sm sm:text-base font-bold text-amber-400 tracking-tight flex items-center gap-1">
                    <IconFlame size={14} /> {me.streak_days}d
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Task Hub: Nhiệm vụ vượt link hôm nay */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <IconBolt size={22} className="text-sky-400" />
                  <span>Nhiệm vụ vượt link hôm nay</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Bấm "Làm ngay" để nhận VNC tự động sau khi vượt link.
                </p>
              </div>

              {/* Apple Segmented Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl glass-pill border border-white/10 self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar shadow-inner">
                <button
                  onClick={() => {
                    playClickSound();
                    setFilter('all');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all btn-press ${
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
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all btn-press flex items-center gap-1.5 ${
                    filter === 'hot'
                      ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>HOT</span>
                  <IconFlame size={13} className="text-amber-400" />
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setFilter('available');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all btn-press ${
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredTasks.map((t) => (
                  <TaskCard key={t.id} task={t} onStart={handleStart} busy={busyId === t.id} />
                ))}
              </div>
            )}
          </div>

          {/* Secondary Bento Quick Cards (Vòng quay & Giới thiệu) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Bento: Lucky Wheel */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-white/10 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-sky-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-400/20 transition-all" />
              <div className="relative z-10 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                  <IconSparkles size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Vòng quay may mắn</span>
                  <h3 className="font-display text-base font-bold text-white mt-0.5">
                    Quay Thưởng Miễn Phí
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Nhận 1 lượt quay miễn phí mỗi ngày với cơ hội trúng lên đến 50.000 VNC.
                </p>
              </div>
              <div className="relative z-10 pt-3 mt-1">
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

            {/* Bento: Referral Program */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-white/10 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-sky-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-400/20 transition-all" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
                    <IconUsers size={18} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    Hoa hồng 20%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Giới thiệu bạn bè</span>
                  <h3 className="font-display text-base font-bold text-white mt-0.5">
                    Kiếm VNC Thụ Động
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Mời bạn bè và hưởng trọn đời 20% số VNC khi họ vượt link thành công.
                </p>
              </div>
              <div className="relative z-10 pt-3 mt-1">
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
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: DEDICATED 3D VIRTUAL CARD & WALLET ACTIONS */}
        {/* On Mobile: order-1 (Renders at TOP, never at the bottom!)*/}
        {/* On Desktop: lg:order-2 (Positioned on the RIGHT - 4 cols)*/}
        {/* ======================================================== */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5 order-1 lg:order-2 lg:sticky lg:top-20">
          {/* 1. THE 3D VIRTUAL BANK CARD (RIGHT SIDE) */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-sky-400/15 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-400/25 transition-all" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-full max-w-sm">
                <BalanceCard
                  novaAmount={wallet?.balance_nova ?? me.balance_nova}
                  vndAmount={wallet?.balance_vnd}
                  cardId={me?.card_id || undefined}
                  showEditButton
                />
              </div>

              <div className="flex items-center justify-between w-full px-1 mt-2.5 text-[11px] text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span>Chạm thẻ đổi VNC/VNĐ</span>
                </span>
                <span>Giữ thẻ để đổi nền</span>
              </div>
            </div>
          </div>

          {/* 2. FAST WALLET ACTIONS CARD */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Số dư khả dụng
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <CurrencyIcon size={20} />
                  <span className="font-mono text-xl sm:text-2xl font-black text-white tracking-tight">
                    {(wallet?.balance_nova ?? 0).toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-bold text-sky-400">VNC</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  ≈ {(wallet?.balance_vnd ?? 0).toLocaleString('vi-VN')} VNĐ
                </div>
              </div>

              <Link
                to="/history"
                onClick={playClickSound}
                className="text-[11px] text-sky-400 hover:underline font-semibold"
              >
                Lịch sử →
              </Link>
            </div>

            {/* Primary Withdraw Action */}
            <Link
              to="/wallet"
              onClick={playClickSound}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs sm:text-sm shadow-[0_0_18px_rgba(56,189,248,0.35)] transition-all btn-press"
            >
              <span>Rút tiền ngay</span>
              <IconArrowUpRight size={16} stroke={2.5} />
            </Link>

            {/* Secondary Action Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to="/giftcode"
                onClick={playClickSound}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl glass-pill hover:border-sky-500/40 text-white font-semibold text-xs transition-all btn-press"
              >
                <IconTicket size={15} className="text-sky-400" />
                <span>Nhập Giftcode</span>
              </Link>
              <Link
                to="/redeem"
                onClick={playClickSound}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl glass-pill hover:border-sky-500/40 text-white font-semibold text-xs transition-all btn-press"
              >
                <IconGift size={15} className="text-sky-400" />
                <span>Đổi thưởng</span>
              </Link>
            </div>
          </div>

          {/* 3. DAILY STREAK CARD */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 shadow-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.25)]">
                <IconFlame size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Chuỗi điểm danh</span>
                  <span className="font-mono text-amber-400 font-extrabold">{me.streak_days} ngày</span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                  Điểm danh mỗi ngày để mở khóa x2 quà
                </p>
              </div>
            </div>

            <Link
              to="/daily-reward"
              onClick={playClickSound}
              className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-xs font-bold transition btn-press shrink-0"
            >
              Điểm danh
            </Link>
          </div>

          {/* 4. VIP LEVEL STATUS & PROGRESS CARD */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCrown size={16} className="text-sky-400" />
                <span className="text-xs font-bold text-white">Cấp {me.level ?? 1} VIP</span>
              </div>
              <Link
                to="/profile"
                className="text-sky-400 hover:underline text-[11px] font-semibold"
              >
                Đặc quyền →
              </Link>
            </div>

            <div className="space-y-1">
              <div className="h-2 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                  style={{ width: `${me.levelProgress?.progressPercent ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>Tiến độ kinh nghiệm</span>
                <span>{me.xp ?? 0}/{me.levelProgress?.nextLevelXp ?? 'Max'} XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
  );
}
