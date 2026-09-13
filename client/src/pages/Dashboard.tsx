import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import StatCard from '../components/StatCard.js';
import TaskCard from '../components/TaskCard.js';
import Alert from '../components/Alert.js';
import type { Me, Wallet, Task } from '../types.js';

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [meData, walletData, taskData] = await Promise.all([api.me(), api.wallet(), api.tasks()]);
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
      setError((e as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return (
      <div className="max-w-sm">
        <Alert type="error">{error}</Alert>
        <button
          onClick={() => {
            setError(null);
            load();
          }}
          className="mt-3 text-sm text-indigo hover:underline"
        >
          Thử lại
        </button>
      </div>
    );
  }
  if (!me) return <div className="text-sm text-muted">Đang tải...</div>;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-surface to-surface2 border border-line p-6 mb-6">
        <h1 className="font-display text-2xl font-semibold">Chào {me.username}, mạng lưới đang chờ bạn 👋</h1>
        <p className="text-sm text-muted mt-1 max-w-lg">
          Hoàn thành nhiệm vụ rút gọn liên kết để kiếm Nova — quy đổi ra tiền hoặc dùng để mở khoá công cụ nội bộ.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Số dư" value={wallet?.balance_nova ?? 0} suffix="Nova" icon="bi-coin" hint={`≈ ${(wallet?.balance_vnd ?? 0).toLocaleString('vi-VN')}đ`} />
        <StatCard label="Đã quy đổi" value={wallet?.total_redeemed_nova ?? 0} suffix="Nova" icon="bi-receipt" hint="Trọn đời" />
        <StatCard label="Chuỗi ngày" value={me.streak_days} suffix="ngày" icon="bi-fire" iconColor="text-rose" hint="Giữ streak để x2 thưởng" />
        <StatCard label="Vai trò" value={me.role === 'admin' ? 'Admin' : 'Thành viên'} icon="bi-person-badge" iconColor="text-cyan" />
      </div>

      <h2 className="font-display font-semibold flex items-center gap-2 mb-3">
        <i className="bi bi-list-check text-indigo" /> Nhiệm vụ rút gọn liên kết
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onStart={handleStart} busy={busyId === t.id} />
        ))}
      </div>
    </div>
  );
}
