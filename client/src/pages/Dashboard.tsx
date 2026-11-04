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
  IconBolt,
  IconTicket,
  IconGift,
  IconArrowUpRight,
  IconShieldCheck,
  IconRefresh,
  IconInbox,
  IconX,
  IconCrown,
  IconTrophy,
  IconChartBar,
  IconCalendarCheck,
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

  useEffect(() => { load(); }, []);

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

  /* ─── Loading Skeleton ─── */
  if (!me) {
    return (
      <div className="w-full space-y-6">
        {/* Hero skeleton */}
        <div className="rounded-2xl overflow-hidden">
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        {/* Task grid skeleton */}
        <Skeleton className="h-9 w-56 rounded-xl" />
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>

        {error && (
          <Alert type="error">{error}</Alert>
        )}
      </div>
    );
  }

  /* ─── Error (no data at all) ─── */
  if (error && !me) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Alert type="error">{error}</Alert>
        <button
          onClick={() => { setError(null); load(); }}
          className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-xl transition btn-press flex items-center gap-2"
        >
          <IconRefresh size={16} /> Thử lại
        </button>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     MAIN DASHBOARD — proper fintech layout
     Desktop: hero with card on RIGHT (flex-row, no order hacks)
     Mobile:  hero stacks vertically — text first, card below
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="w-full space-y-5">

      {/* ════════════════════════════════════════════════
          SECTION 1 — HERO BANNER
          flex-col on mobile, flex-row on lg+
          Card stays RIGHT — no CSS order tricks
      ════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl">
        {/* Background gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#06070a] via-[#0d1117] to-[#0a0f1a] pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/[0.08] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/[0.06] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        {/* Content: flex-row on desktop, flex-col on mobile */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-stretch">

          {/* LEFT: Welcome + balance text + quick actions */}
          <div className="flex-1 min-w-0 p-6 sm:p-8 flex flex-col justify-between gap-5">
            {/* Top: greeting row */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-zinc-400">Xin chào,</span>
                <UserName name={me.username} level={me.level} className="text-base sm:text-lg font-bold text-white" />
                <LevelBadge level={me.level} size="xs" />
                <span className="ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Hệ thống 24/7
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">
                Hoàn thành nhiệm vụ vượt link để tích lũy VNC và quy đổi tiền mặt tức thì.
              </p>
            </div>

            {/* Middle: Big balance display */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Số dư khả dụng</span>
              <div className="flex items-baseline gap-2">
                <CurrencyIcon size={22} />
                <span className="font-mono text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {(wallet?.balance_nova ?? 0).toLocaleString('vi-VN')}
                </span>
                <span className="text-sm font-bold text-sky-400">VNC</span>
              </div>
              <div className="text-xs text-zinc-500 font-medium font-mono">
                ≈ {(wallet?.balance_vnd ?? 0).toLocaleString('vi-VN')} VNĐ
              </div>
            </div>

            {/* Bottom: Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Link
                to="/wallet"
                onClick={playClickSound}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all btn-press shrink-0"
              >
                <IconArrowUpRight size={16} stroke={2.5} />
                Rút tiền ngay
              </Link>
              <Link
                to="/giftcode"
                onClick={playClickSound}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-semibold text-xs sm:text-sm transition-all btn-press shrink-0"
              >
                <IconTicket size={15} className="text-sky-400" />
                Nhập Giftcode
              </Link>
              <Link
                to="/redeem"
                onClick={playClickSound}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-semibold text-xs sm:text-sm transition-all btn-press shrink-0"
              >
                <IconGift size={15} className="text-sky-400" />
                Đổi thưởng
              </Link>
            </div>
          </div>

          {/* RIGHT: Balance Card — fixed width, never shrinks or stacks */}
          <div className="lg:w-80 xl:w-88 shrink-0 p-6 sm:p-8 lg:pl-0 flex flex-col items-center justify-center gap-3">
            <div className="w-full max-w-xs lg:max-w-none">
              <BalanceCard
                novaAmount={wallet?.balance_nova ?? me.balance_nova}
                vndAmount={wallet?.balance_vnd}
                cardId={me?.card_id || undefined}
                showEditButton
              />
            </div>
            <div className="flex items-center justify-between w-full max-w-xs lg:max-w-none px-1 text-[10px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Chạm thẻ đổi VNC/VNĐ
              </span>
              <span>Giữ thẻ để đổi nền</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          SECTION 2 — KPI STATS ROW (4 mini cards)
      ════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Nhiệm vụ hôm nay */}
        <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <IconBolt size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium text-zinc-500 truncate">Nhiệm vụ xong</div>
            <div className="font-mono text-base font-bold text-white">
              {completedTodayCount}
              <span className="text-zinc-500 font-medium text-xs">/{tasks.length}</span>
            </div>
          </div>
        </div>

        {/* Chuỗi streak */}
        <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
            <IconFlame size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium text-zinc-500 truncate">Chuỗi streak</div>
            <div className="font-mono text-base font-bold text-amber-400">
              {me.streak_days}
              <span className="text-zinc-500 font-medium text-xs"> ngày</span>
            </div>
          </div>
        </div>

        {/* Cấp VIP */}
        <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-400/15 border border-purple-400/20 flex items-center justify-center text-purple-400 shrink-0">
            <IconCrown size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium text-zinc-500 truncate">Cấp VIP</div>
            <div className="font-mono text-base font-bold text-white">
              Lv.{me.level ?? 1}
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="glass-card rounded-2xl p-4 border border-white/[0.08] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-400/20 flex items-center justify-center text-emerald-400 shrink-0">
            <IconChartBar size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium text-zinc-500 truncate">Kinh nghiệm</div>
            <div className="font-mono text-base font-bold text-white">
              {me.xp ?? 0}
              <span className="text-zinc-500 font-medium text-xs"> XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          SECTION 3 — QUICK ACCESS ROW
          Điểm danh + VIP Progress
      ════════════════════════════════════════════════ */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Daily Streak Check-in */}
        <div className="glass-card rounded-2xl p-4 border border-white/[0.08] shadow-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
              <IconCalendarCheck size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Điểm danh hằng ngày
                <span className="font-mono text-amber-400 font-extrabold">{me.streak_days} ngày 🔥</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">Điểm danh để nhận quà & mở khóa x2 bonus</p>
            </div>
          </div>
          <Link
            to="/daily-reward"
            onClick={playClickSound}
            className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/25 text-xs font-bold transition btn-press shrink-0"
          >
            Điểm danh
          </Link>
        </div>

        {/* VIP Level Progress */}
        <div className="glass-card rounded-2xl p-4 border border-white/[0.08] shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconTrophy size={15} className="text-sky-400" />
              <span className="text-xs font-bold text-white">Cấp {me.level ?? 1} VIP — Tiến độ</span>
            </div>
            <Link to="/profile" className="text-sky-400 hover:underline text-[11px] font-semibold">
              Đặc quyền →
            </Link>
          </div>
          <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-white/[0.06] border border-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                style={{ width: `${me.levelProgress?.progressPercent ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>Tiến độ kinh nghiệm</span>
              <span>{me.xp ?? 0} / {me.levelProgress?.nextLevelXp ?? 'Max'} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          SECTION 4 — TASK HUB (Full Width)
      ════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* Section header + filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <IconBolt size={22} className="text-sky-400" />
              Nhiệm vụ vượt link hôm nay
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Bấm "Làm ngay" để nhận VNC tự động sau khi vượt link.
            </p>
          </div>

          {/* Apple-style segmented filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] self-start sm:self-auto shadow-inner">
            {([
              { key: 'all', label: `Tất cả (${tasks.length})` },
              { key: 'hot', label: 'HOT 🔥', icon: null },
              { key: 'available', label: 'Còn lượt' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { playClickSound(); setFilter(key); }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all btn-press whitespace-nowrap ${
                  filter === key
                    ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* Task grid */}
        {filteredTasks.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-zinc-400 border border-white/[0.08] shadow-xl">
            <IconInbox size={40} className="mb-3 mx-auto text-zinc-600" />
            <div className="text-sm font-semibold text-white">Không có nhiệm vụ nào phù hợp</div>
            <p className="text-xs text-zinc-500 mt-1">Vui lòng quay lại sau hoặc chọn bộ lọc khác.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                busy={busyId === task.id}
                onStart={handleStart}
              />
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════
          SECURITY CHALLENGE MODAL
      ════════════════════════════════════════════════ */}
      {challengeTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="glass-panel border border-white/15 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <IconShieldCheck size={18} className="text-sky-400" />
                Xác minh bảo mật Cloudflare
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
                  if (token) handleStart(challengeTaskId, token);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
