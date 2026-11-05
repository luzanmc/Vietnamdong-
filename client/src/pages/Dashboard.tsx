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
  IconBolt,
  IconFlame,
  IconCrown,
  IconChartBar,
  IconCalendar,
  IconTrophy,
  IconArrowUpRight,
  IconTicket,
  IconGift,
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

  const completedTodayCount = tasks.filter((t) => t.done_today >= t.daily_limit).length;

  /* Loading State Skeleton */
  if (!me) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto w-full">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* Error with no data */
  if (error && !me) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <Alert type="error">{error}</Alert>
        <button
          onClick={() => {
            setError(null);
            load();
          }}
          className="mt-4 px-4 py-2 bg-indigo hover:brightness-110 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2"
        >
          <IconRefresh size={16} /> Thử lại
        </button>
      </div>
    );
  }

  const balNova = wallet?.balance_nova ?? me.balance_nova ?? 0;
  const balVnd = wallet?.balance_vnd ?? balNova * 1000;

  return (
    <div className="space-y-4 max-w-6xl mx-auto w-full">
      {/* ======================================================== */}
      {/* 1. WELCOME SECTION (.card.wel from VND-Dashboard)        */}
      {/* ======================================================== */}
      <section className="bg-surface border border-line rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(47,123,255,0.04)] relative overflow-hidden">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-muted text-xs sm:text-sm font-medium">Xin chào,</span>
          <UserName name={me.username} level={me.level} className="text-base sm:text-lg font-bold text-ink" />
          <LevelBadge level={me.level} size="xs" />
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 ml-auto sm:ml-2">
            ● Hệ thống 24/7
          </span>
        </div>
        <p className="text-muted text-xs sm:text-[13px] mt-1.5 leading-relaxed">
          Hoàn thành nhiệm vụ vượt link để tích lũy VNC và quy đổi tiền mặt tức thì.
        </p>
      </section>

      {/* ======================================================== */}
      {/* 2. BLUE BALANCE BANNER (.card.blue from VND-Dashboard)   */}
      {/* ======================================================== */}
      <section className="card-blue-vnd p-5 sm:p-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Balance & Quick Actions */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            <div>
              <div className="text-white/80 text-xs font-medium tracking-wide">Số dư khả dụng</div>
              <div className="flex items-baseline gap-2 mt-1">
                <CurrencyIcon size={24} className="text-white shrink-0" />
                <span className="font-extrabold text-3xl sm:text-4xl text-white tracking-tight font-mono">
                  {balNova.toLocaleString('vi-VN')}
                </span>
                <span className="text-sm sm:text-base font-bold text-sky-200">VNC</span>
              </div>
              <div className="text-white/80 text-xs sm:text-[13px] mt-1 font-mono">
                ≈ {balVnd.toLocaleString('vi-VN')} VNĐ
              </div>
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link
                to="/wallet"
                onClick={playClickSound}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#1d5fe0] font-bold text-xs sm:text-[13px] shadow-md transition active:scale-95"
              >
                <IconArrowUpRight size={16} stroke={2.5} />
                <span>Rút tiền</span>
              </Link>
              <Link
                to="/giftcode"
                onClick={playClickSound}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold text-xs sm:text-[13px] backdrop-blur-sm transition active:scale-95"
              >
                <IconTicket size={16} />
                <span>Giftcode</span>
              </Link>
              <Link
                to="/redeem"
                onClick={playClickSound}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold text-xs sm:text-[13px] backdrop-blur-sm transition active:scale-95"
              >
                <IconGift size={16} />
                <span>Đổi thưởng</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Interactive Balance Card */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center">
            <div className="w-full max-w-[310px]">
              <BalanceCard
                novaAmount={balNova}
                vndAmount={balVnd}
                cardId={me?.card_id || undefined}
                showEditButton
              />
            </div>
            <div className="flex items-center justify-between w-full max-w-[310px] px-1 mt-2 text-[10px] text-white/80 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Chạm thẻ đổi VNC/VNĐ
              </span>
              <span>Giữ thẻ để đổi nền</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. STATS GRID (.stats from VND-Dashboard)                */}
      {/* ======================================================== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Stat 1: Nhiệm vụ xong */}
        <div className="bg-surface border border-line rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(47,123,255,0.04)]">
          <div className="w-11 h-11 rounded-xl bg-surface2 text-indigo flex items-center justify-center shrink-0">
            <IconBolt size={20} stroke={2.2} />
          </div>
          <div className="min-w-0">
            <small className="text-muted text-[11px] font-medium block truncate">Nhiệm vụ xong</small>
            <b className="text-base sm:text-lg font-bold text-ink block font-mono">
              {completedTodayCount}/{tasks.length}
            </b>
          </div>
        </div>

        {/* Stat 2: Chuỗi streak */}
        <div className="bg-surface border border-line rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(47,123,255,0.04)]">
          <div className="w-11 h-11 rounded-xl bg-amber-400/15 text-amber-500 flex items-center justify-center shrink-0">
            <IconFlame size={20} stroke={2.2} />
          </div>
          <div className="min-w-0">
            <small className="text-muted text-[11px] font-medium block truncate">Chuỗi streak</small>
            <b className="text-base sm:text-lg font-bold text-ink block font-mono">
              {me.streak_days} ngày
            </b>
          </div>
        </div>

        {/* Stat 3: Cấp VIP */}
        <div className="bg-surface border border-line rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(47,123,255,0.04)]">
          <div className="w-11 h-11 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
            <IconCrown size={20} stroke={2.2} />
          </div>
          <div className="min-w-0">
            <small className="text-muted text-[11px] font-medium block truncate">Cấp VIP</small>
            <b className="text-base sm:text-lg font-bold text-ink block font-mono">
              Lv.{me.level ?? 1}
            </b>
          </div>
        </div>

        {/* Stat 4: Kinh nghiệm */}
        <div className="bg-surface border border-line rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(47,123,255,0.04)]">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
            <IconChartBar size={20} stroke={2.2} />
          </div>
          <div className="min-w-0">
            <small className="text-muted text-[11px] font-medium block truncate">Kinh nghiệm</small>
            <b className="text-base sm:text-lg font-bold text-ink block font-mono">
              {me.xp ?? 0} XP
            </b>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. TWO-CARD ROW (.two from VND-Dashboard)                */}
      {/* ======================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Điểm danh hằng ngày card */}
        <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-[0_4px_20px_rgba(47,123,255,0.04)]">
          <div className="w-11 h-11 rounded-xl bg-amber-400/15 text-amber-500 flex items-center justify-center shrink-0">
            <IconCalendar size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <b className="text-sm font-bold text-ink block truncate">Điểm danh hằng ngày</b>
            <p className="text-muted text-xs mt-0.5 truncate">
              Nhận quà và mở khóa thưởng x2 mỗi ngày
            </p>
          </div>
          <Link
            to="/daily-reward"
            onClick={playClickSound}
            className="px-3.5 py-2 rounded-xl bg-indigo text-white font-bold text-xs hover:brightness-110 shadow-sm transition active:scale-95 shrink-0"
          >
            Điểm danh
          </Link>
        </div>

        {/* Tiến độ VIP card */}
        <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-[0_4px_20px_rgba(47,123,255,0.04)]">
          <div className="flex items-center justify-between">
            <b className="text-sm font-bold text-ink flex items-center gap-2">
              <IconTrophy size={18} className="text-indigo" />
              <span>Tiến độ VIP cấp {me.level ?? 1}</span>
            </b>
            <Link
              to="/profile"
              onClick={playClickSound}
              className="text-xs font-semibold text-indigo hover:underline"
            >
              Đặc quyền
            </Link>
          </div>

          <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-surface2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-indigo transition-all duration-500"
                style={{ width: `${Math.min(100, me.levelProgress?.progressPercent ?? 0)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted font-mono">
              <span>Tiến độ kinh nghiệm</span>
              <span>{me.xp ?? 0} / {me.levelProgress?.nextLevelXp ?? 'Max'} XP</span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. TASKS HUB (.tasks from VND-Dashboard)                 */}
      {/* ======================================================== */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <IconBolt size={20} className="text-indigo" />
              <span>Nhiệm vụ vượt link hôm nay</span>
            </h2>
            <p className="text-muted text-xs mt-0.5">
              Bấm “Làm ngay” để nhận VNC sau khi vượt link.
            </p>
          </div>

          {/* Segmented Filter Control (.seg) */}
          <div className="flex gap-1 p-1 rounded-xl bg-surface border border-line shadow-sm self-start sm:self-auto">
            <button
              onClick={() => {
                playClickSound();
                setFilter('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'all'
                  ? 'bg-indigo text-white shadow-sm'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                filter === 'hot'
                  ? 'bg-indigo text-white shadow-sm'
                  : 'text-muted hover:text-ink'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === 'available'
                  ? 'bg-indigo text-white shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Còn lượt
            </button>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {filteredTasks.length === 0 ? (
          <div className="bg-surface border border-line rounded-2xl p-10 text-center text-muted shadow-sm">
            <IconInbox size={40} className="mb-2 mx-auto text-muted/60" />
            <div className="text-sm font-semibold text-ink">Không có nhiệm vụ nào phù hợp.</div>
            <p className="text-xs text-muted mt-1">Vui lòng quay lại sau hoặc chọn bộ lọc khác.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
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
      </section>

      {/* Cloudflare Security Challenge Modal */}
      {challengeTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-line rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <IconShieldCheck size={18} className="text-indigo" />
                <span>Xác minh bảo mật</span>
              </h3>
              <button
                onClick={() => setChallengeTaskId(null)}
                className="w-7 h-7 rounded-lg text-muted hover:text-ink hover:bg-surface2 flex items-center justify-center transition"
              >
                <IconX size={16} />
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed">
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
