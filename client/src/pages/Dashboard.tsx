import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ApiError } from '../api/client.js';
import StatCard from '../components/StatCard.js';
import TaskCard from '../components/TaskCard.js';
import Alert from '../components/Alert.js';
import { StatCardSkeleton, TaskCardSkeleton, Skeleton } from '../components/Skeleton.js';
import { useToast } from '../context/ToastContext.js';
import { playClickSound, playCoinSound } from '../utils/sound.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import type { Me, Wallet, Task } from '../types.js';

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'hot' | 'available'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick Giftcode on Dashboard
  const [giftcode, setGiftcode] = useState('');
  const [claimingCode, setClaimingCode] = useState(false);
  const [giftcodeMsg, setGiftcodeMsg] = useState<string | null>(null);

  const { error: toastError, success: toastSuccess } = useToast();

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

  async function handleStart(taskId: string) {
    setBusyId(taskId);
    setError(null);
    try {
      const { shortUrl } = await api.startTask(taskId);
      window.open(shortUrl, '_blank', 'noopener');
    } catch (e) {
      const msg = (e as ApiError).message;
      setError(msg);
      toastError(msg, 'Không thể mở nhiệm vụ');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRedeemGiftcode(e: React.FormEvent) {
    e.preventDefault();
    if (!giftcode.trim()) return;
    playClickSound();
    setClaimingCode(true);
    setGiftcodeMsg(null);
    try {
      const res = await api.redeemGiftcode(giftcode.trim());
      playCoinSound();
      toastSuccess(`Đã nhận +${res.reward_nova} VNC vào ví!`, 'Nhận Giftcode thành công');
      setGiftcodeMsg(`+${res.reward_nova} VNC đã được cộng vào tài khoản của bạn!`);
      setGiftcode('');
      load();
    } catch (err) {
      toastError((err as ApiError).message, 'Không thể nhận giftcode');
    } finally {
      setClaimingCode(false);
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
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-56 w-full rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-6 w-48" />
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Banner styled in harmony with Landing Page */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-line bg-gradient-to-br from-surface2 via-surface to-surface shadow-2xl">
        {/* Ambient radial glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="grid md:grid-cols-12 gap-6 items-center relative z-10">
          {/* Left Hero Content (7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo/15 text-indigo border border-indigo/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
                <span>VietnamDong Hub</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose/15 text-rose border border-rose/30">
                <i className="bi bi-fire text-xs" />
                <span>Streak: {me.streak_days} ngày</span>
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-ink leading-tight">
              Chào mừng trở lại,{' '}
              <span className="gradient-text-indigo">{me.username}</span>
            </h1>

            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
              Vượt link tự động, điểm danh chuỗi ngày và tích lũy VNC đổi tiền mặt hoặc nạp game tức thì. An toàn, bảo mật và thanh toán chuẩn xác!
            </p>

            {/* Quick Action Shortcuts */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <Link
                to="/daily-reward"
                onClick={playClickSound}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose/20 to-rose/10 hover:from-rose/30 hover:to-rose/20 border border-rose/30 text-rose shadow-sm transition btn-press"
              >
                <i className="bi bi-gift-fill text-sm" />
                <span>Điểm danh</span>
              </Link>

              <Link
                to="/lucky-wheel"
                onClick={playClickSound}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber/20 to-amber/10 hover:from-amber/30 hover:to-amber/20 border border-amber/30 text-amber shadow-sm transition btn-press"
              >
                <i className="bi bi-stars text-sm" />
                <span>Quay thưởng</span>
              </Link>

              <Link
                to="/wallet"
                onClick={playClickSound}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan/20 to-cyan/10 hover:from-cyan/30 hover:to-cyan/20 border border-cyan/30 text-cyan shadow-sm transition btn-press"
              >
                <i className="bi bi-wallet2 text-sm" />
                <span>Rút tiền</span>
              </Link>

              <Link
                to="/referral"
                onClick={playClickSound}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo/20 to-indigo/10 hover:from-indigo/30 hover:to-indigo/20 border border-indigo/30 text-indigo shadow-sm transition btn-press"
              >
                <i className="bi bi-people-fill text-sm" />
                <span>Hoa hồng 20%</span>
              </Link>
            </div>
          </div>

          {/* Right Hero Virtual Card (5 Cols) matching Landing 3D Glass aesthetic */}
          <div className="md:col-span-5 flex justify-center md:justify-end">
            <div className="w-full max-w-sm rounded-2xl p-5 border border-line bg-gradient-to-br from-surface via-surface2 to-surface shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs text-muted pb-3 border-b border-line/60">
                <span className="font-display font-semibold tracking-wider text-[11px] text-ink flex items-center gap-1.5">
                  <CurrencyIcon size={16} /> VIETNAMDONG / VNC
                </span>
                <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                </span>
              </div>

              <div className="py-4 text-center">
                <div className="text-[11px] uppercase tracking-wider text-muted font-medium">Số dư khả dụng</div>
                <div className="font-mono text-3xl sm:text-4xl font-bold text-amber tracking-tight flex items-center justify-center gap-2 mt-1">
                  <CurrencyIcon size={28} />
                  <span>{wallet?.balance_nova ?? 0}</span>
                  <span className="text-base font-normal text-amber/80 font-body">VNC</span>
                </div>
                <div className="text-xs text-muted mt-1 font-mono">
                  ≈ {(wallet?.balance_vnd ?? 0).toLocaleString('vi-VN')} VND
                </div>
              </div>

              <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                <Link
                  to="/profile?tab=giftcode"
                  onClick={playClickSound}
                  className="text-amber hover:underline flex items-center gap-1 text-[11px] font-semibold"
                >
                  <i className="bi bi-ticket-perforated-fill" /> Nhập Giftcode
                </Link>
                <Link
                  to="/wallet"
                  onClick={playClickSound}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo hover:brightness-110 text-white transition btn-press flex items-center gap-1 shadow-md shadow-indigo/25"
                >
                  <i className="bi bi-arrow-up-right" /> Rút tiền ngay
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Giftcode Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber/15 border border-amber/30 text-amber flex items-center justify-center shrink-0">
            <i className="bi bi-gift-fill text-lg" />
          </div>
          <div>
            <div className="font-semibold text-sm text-ink flex items-center gap-2">
              <span>Bạn có mã Giftcode quà tặng?</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose/15 text-rose border border-rose/30">
                NHẬN VNC
              </span>
            </div>
            <div className="text-xs text-muted">
              Nhập mã code để nhận VNC miễn phí trực tiếp vào ví
            </div>
          </div>
        </div>

        <form onSubmit={handleRedeemGiftcode} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Nhập mã Giftcode..."
            value={giftcode}
            onChange={(e) => setGiftcode(e.target.value.toUpperCase())}
            className="flex-1 md:w-64 bg-surface2 border border-line rounded-xl px-3.5 py-2 text-xs font-mono tracking-wider uppercase text-ink focus:outline-none focus:border-indigo"
          />
          <button
            type="submit"
            disabled={claimingCode || !giftcode.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber hover:brightness-110 text-black transition btn-press shrink-0 flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
          >
            {claimingCode ? (
              <i className="bi bi-arrow-repeat animate-spin" />
            ) : (
              <i className="bi bi-check2" />
            )}
            <span>Áp dụng</span>
          </button>
        </form>
      </div>

      {giftcodeMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <i className="bi bi-check-circle-fill text-base" />
          <span>{giftcodeMsg}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label="Số dư VNC"
          value={wallet?.balance_nova ?? 0}
          suffix="VNC"
          icon="bi-coin"
          iconColor="text-amber"
          hint={`≈ ${(wallet?.balance_vnd ?? 0).toLocaleString('vi-VN')}đ`}
          trend="Khả dụng"
        />
        <StatCard
          label="Đã quy đổi"
          value={wallet?.total_redeemed_nova ?? 0}
          suffix="VNC"
          icon="bi-receipt-cutoff"
          iconColor="text-cyan"
          hint="Tổng VNC đã rút"
        />
        <StatCard
          label="Chuỗi điểm danh"
          value={me.streak_days}
          suffix="ngày"
          icon="bi-fire"
          iconColor="text-rose"
          hint="Giữ streak x2 quà"
          trend="Streak"
        />
        <StatCard
          label="Cấp bậc"
          value={me.role === 'admin' ? 'Admin' : 'Thành viên'}
          icon="bi-person-badge-fill"
          iconColor="text-indigo"
          hint="Hạng hội viên"
        />
      </div>

      {/* Tasks Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2 text-ink">
              <i className="bi bi-lightning-charge-fill text-amber" /> Nhiệm vụ rút gọn liên kết
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Hoàn thành các liên kết bên dưới để cộng VNC trực tiếp vào số dư
            </p>
          </div>

          {/* Task Filter Chips */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface2/80 border border-line self-start sm:self-auto">
            <button
              onClick={() => {
                playClickSound();
                setFilter('all');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition btn-press ${
                filter === 'all' ? 'bg-indigo text-white shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              Tất cả ({tasks.length})
            </button>
            <button
              onClick={() => {
                playClickSound();
                setFilter('hot');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition btn-press flex items-center gap-1 ${
                filter === 'hot' ? 'bg-indigo text-white shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              <span>HOT</span>
              <i className="bi bi-fire text-xs" />
            </button>
            <button
              onClick={() => {
                playClickSound();
                setFilter('available');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition btn-press ${
                filter === 'available' ? 'bg-indigo text-white shadow-sm' : 'text-muted hover:text-ink'
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
      </div>
    </div>
  );
}
