import { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  newUsers7Days: number;
  totalLinks: number;
  totalBypassed: number;
  totalServerVnc: number;
  pendingWithdrawals: number;
  pendingRedeems: number;
  pendingVietsub: number;
  openTickets: number;
}

export default function AdminDashboard({ onSelectTab }: { onSelectTab?: (tab: string) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutMsg, setPayoutMsg] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/dashboard-stats', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 45000);
    return () => clearInterval(interval);
  }, []);

  async function triggerMonthlyPayout() {
    if (!confirm('Phát thưởng top 3 bảng xếp hạng tháng ngay bây giờ?')) return;
    setPayoutLoading(true);
    setPayoutMsg('');
    try {
      const res = await fetch('/api/admin/leaderboard/monthly-payout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi phát thưởng');
      setPayoutMsg(data.paid?.length > 0 ? data.paid.map((p: any) => `${p.username}: +${p.amount} VNC`).join(', ') : 'Chưa có ai đủ điều kiện.');
    } catch (err: any) {
      setPayoutMsg(err.message || 'Lỗi hệ thống');
    } finally {
      setPayoutLoading(false);
    }
  }

  const statCards = [
    {
      title: 'Tổng người dùng',
      value: stats?.totalUsers,
      subtext: `+${stats?.newUsersToday ?? 0} hôm nay | +${stats?.newUsers7Days ?? 0} (7 ngày)`,
      icon: 'bi-people-fill',
      color: 'text-indigo',
      tab: 'users',
    },
    {
      title: 'Lượt vượt link hoàn thành',
      value: stats?.totalBypassed,
      subtext: `Trên tổng số ${stats?.totalLinks ?? 0} link hoạt động`,
      icon: 'bi-link-45deg',
      color: 'text-cyan',
      tab: 'tasks',
    },
    {
      title: 'Tổng VNC toàn hệ thống',
      value: stats?.totalServerVnc?.toLocaleString('vi-VN'),
      subtext: 'Tổng số dư ví của toàn bộ thành viên',
      icon: 'bi-coin',
      color: 'text-amber',
      tab: 'analytics',
    },
    {
      title: 'Yêu cầu rút tiền chờ duyệt',
      value: stats?.pendingWithdrawals,
      subtext: stats?.pendingWithdrawals ? 'Cần admin xử lý' : 'Đã duyệt hết',
      icon: 'bi-cash-stack',
      color: 'text-rose',
      highlight: (stats?.pendingWithdrawals ?? 0) > 0,
      tab: 'withdrawals',
    },
    {
      title: 'Đơn đổi thưởng chờ duyệt',
      value: stats?.pendingRedeems,
      subtext: stats?.pendingRedeems ? 'Cần giao quà' : 'Không có đơn chờ',
      icon: 'bi-gift-fill',
      color: 'text-emerald-400',
      highlight: (stats?.pendingRedeems ?? 0) > 0,
      tab: 'redeem',
    },
    {
      title: 'Đơn Vietsub Studio chờ',
      value: stats?.pendingVietsub,
      subtext: stats?.pendingVietsub ? 'Cần duyệt license' : 'Đã xử lý xong',
      icon: 'bi-badge-cc-fill',
      color: 'text-purple-400',
      highlight: (stats?.pendingVietsub ?? 0) > 0,
      tab: 'vietsub',
    },
    {
      title: 'Ticket hỗ trợ đang mở',
      value: stats?.openTickets,
      subtext: stats?.openTickets ? 'Cần phản hồi thành viên' : 'Đã giải quyết',
      icon: 'bi-headset',
      color: 'text-sky-400',
      highlight: (stats?.openTickets ?? 0) > 0,
      tab: 'support',
    },
    {
      title: 'Link nhiệm vụ đang bật',
      value: stats?.totalLinks,
      subtext: 'Nhiệm vụ vượt link khả dụng',
      icon: 'bi-list-check',
      color: 'text-indigo',
      tab: 'tasks',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-speedometer2 text-indigo" /> Chỉ số tổng quan hệ thống
        </h2>
        <span className="text-[11px] text-muted flex items-center gap-1.5">
          <i className="bi bi-arrow-repeat text-indigo" /> Tự động cập nhật (cache 45s)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <div
            key={i}
            onClick={() => onSelectTab && onSelectTab(card.tab)}
            className={`bg-surface border rounded-2xl p-4 transition cursor-pointer hover:border-indigo/50 ${
              card.highlight ? 'border-amber/40 bg-amber/5' : 'border-line'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted uppercase font-medium">{card.title}</span>
              <div className={`w-8 h-8 rounded-xl bg-surface2 flex items-center justify-center text-sm ${card.color}`}>
                <i className={`bi ${card.icon}`} />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-24 my-1 rounded-lg" />
            ) : (
              <div className="font-mono text-2xl font-bold text-ink">
                {card.value ?? 0}
              </div>
            )}
            <p className="text-[11px] text-muted mt-1 truncate">{card.subtext}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <i className="bi bi-trophy text-amber" /> Phát thưởng bảng xếp hạng tháng
            </h3>
            <p className="text-xs text-muted mt-0.5">Top 1: 500 VNC | Top 2: 300 VNC | Top 3: 100 VNC</p>
          </div>
          <button
            onClick={triggerMonthlyPayout}
            disabled={payoutLoading}
            className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {payoutLoading && <i className="bi bi-arrow-repeat animate-spin" />}
            <i className="bi bi-send" />
            <span>Phát thưởng ngay</span>
          </button>
        </div>
        {payoutMsg && (
          <div className="p-3 bg-surface2 border border-line rounded-xl text-xs font-mono text-cyan">
            {payoutMsg}
          </div>
        )}
      </div>
    </div>
  );
}
