import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import type { Wallet as WalletType, Withdrawal } from '../types.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import AnimatedNumber from '../components/AnimatedNumber.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useSettings } from '../context/SettingsContext.js';
import { playClickSound, playCoinSound } from '../utils/sound.js';

type MethodType = 'momo' | 'bank' | 'card';

interface MethodOption {
  id: MethodType;
  label: string;
  icon: string;
  color: string;
  bg: string;
  desc: string;
}

const METHODS: MethodOption[] = [
  {
    id: 'momo',
    label: 'Ví MoMo',
    icon: 'bi-wallet-fill',
    color: 'text-pink-400',
    bg: 'bg-pink-500/15 border-pink-500/30',
    desc: 'Rút về SĐT MoMo',
  },
  {
    id: 'bank',
    label: 'Ngân hàng',
    icon: 'bi-bank',
    color: 'text-cyan',
    bg: 'bg-cyan/15 border-cyan/30',
    desc: 'STK & Tên ngân hàng',
  },
  {
    id: 'card',
    label: 'Thẻ cào',
    icon: 'bi-credit-card-2-front-fill',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    desc: 'Viettel / Vina / Mobi',
  },
];

export default function Wallet() {
  const { t } = useLanguage();
  const { me, refresh } = useAuth();
  const { novaToVndRate } = useSettings();
  const { success: toastSuccess, error: toastError } = useToast();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount_nova: '', method: 'momo' as MethodType, destination: '' });
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      const [w, hist] = await Promise.all([api.wallet(), api.withdrawals()]);
      setWallet(w);
      setWithdrawals(hist);
    } catch {} finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount_nova);
    if (!amount || amount <= 0) {
      toastError('Vui lòng nhập số VNC hợp lệ.', 'Số lượng không hợp lệ');
      return;
    }
    if (wallet && amount > wallet.balance_nova) {
      toastError('Số dư VNC không đủ để thực hiện yêu cầu.', 'Số dư không đủ');
      return;
    }
    if (!form.destination.trim()) {
      toastError('Vui lòng nhập thông tin nhận tiền.', 'Thiếu thông tin');
      return;
    }

    playClickSound();
    setSubmitting(true);
    setError(null);

    try {
      await api.withdraw({
        amount_nova: amount,
        method: form.method,
        destination: form.destination,
      });
      playCoinSound();
      toastSuccess(t('wallet.submit_success'), 'Yêu cầu rút tiền thành công');
      setForm({ amount_nova: '', method: form.method, destination: '' });
      await refresh();
      loadData();
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(msg);
      toastError(msg, 'Lỗi rút tiền');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedAmount = Number(form.amount_nova) || 0;
  const estimatedVnd = novaToVndRate > 0 ? selectedAmount * novaToVndRate : wallet ? (selectedAmount / (wallet.balance_nova || 1)) * wallet.balance_vnd : selectedAmount * 1000;

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          <i className="bi bi-wallet2 text-cyan" /> {t('wallet.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Quản lý số dư VNC, yêu cầu rút tiền về ngân hàng hoặc đổi thẻ cào nhanh chóng.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-6 items-start">
        {/* Holographic Virtual Card (Left - 2 Cols) */}
        <div className="md:col-span-2 space-y-4">
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 shadow-2xl text-white group">
            {/* Ambient glows inside card */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-cyan/20 rounded-full blur-2xl -z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo/30 rounded-full blur-2xl -z-10 pointer-events-none" />

            <div className="relative z-10 flex flex-col justify-between h-48 sm:h-52">
              {/* Card Top */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo-mark.png" alt="VietnamDong" className="w-7 h-7" />
                  <span className="font-display font-bold text-sm tracking-wide">VIETNAMDONG</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-amber/20 border border-amber/40 flex items-center justify-center">
                  <i className="bi bi-cpu text-amber text-lg" />
                </div>
              </div>

              {/* Card Middle Balance */}
              <div>
                <div className="text-[11px] font-mono text-white/70 uppercase tracking-wider mb-1">
                  {t('wallet.available_balance')}
                </div>
                {wallet ? (
                  <div className="font-mono text-3xl font-extrabold flex items-center gap-2 tracking-tight">
                    <CurrencyIcon size={26} />
                    <AnimatedNumber value={wallet.balance_nova} />
                    <span className="text-sm font-normal text-amber">VNC</span>
                  </div>
                ) : (
                  <Skeleton className="h-9 w-36 bg-white/10" />
                )}
                {wallet && (
                  <div className="text-xs text-cyan font-medium mt-1">
                    ≈ {wallet.balance_vnd.toLocaleString('vi-VN')} VND
                  </div>
                )}
              </div>

              {/* Card Bottom */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <div>
                  <div className="text-[9px] text-white/60 uppercase">Chủ thẻ</div>
                  <div className="font-semibold tracking-wider uppercase truncate max-w-[130px]">
                    {me?.username || 'THÀNH VIÊN'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-white/60 uppercase">Trạng thái</div>
                  <div className="font-mono font-semibold text-emerald-400">ACTIVE ●</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats mini cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-4">
              <div className="text-[11px] text-muted uppercase">Tổng đã rút</div>
              <div className="font-mono text-lg font-bold text-ink mt-1 flex items-center gap-1">
                <CurrencyIcon size={16} />
                <span>{wallet?.total_redeemed_nova ?? 0}</span>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <div className="text-[11px] text-muted uppercase">Tỷ giá quy đổi</div>
              <div className="font-mono text-lg font-bold text-amber mt-1">
                1 VNC = {novaToVndRate > 0 ? novaToVndRate.toLocaleString('vi-VN') : '1.000'}đ
              </div>
            </div>
          </div>
        </div>

        {/* Withdrawal Form (Right - 3 Cols) */}
        <div className="md:col-span-3">
          <form
            onSubmit={submitWithdraw}
            className="glass-panel rounded-3xl p-6 sm:p-7 border border-line shadow-xl space-y-5"
          >
            <div>
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <i className="bi bi-cash-stack text-indigo" /> {t('wallet.withdraw_title')}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Chọn phương thức và nhập số lượng VNC bạn muốn quy đổi
              </p>
            </div>

            {/* Method Cards */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted">Phương thức thanh toán</label>
              <div className="grid grid-cols-3 gap-2.5">
                {METHODS.map((m) => {
                  const isSelected = form.method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setForm({ ...form, method: m.id });
                      }}
                      className={`p-3 rounded-2xl text-left border transition-all btn-press flex flex-col justify-between ${
                        isSelected
                          ? `${m.bg} shadow-md scale-[1.02]`
                          : 'bg-surface2/60 border-line hover:border-line/90 text-muted'
                      }`}
                    >
                      <i className={`bi ${m.icon} ${m.color} text-lg mb-1`} />
                      <div className="font-semibold text-xs text-ink">{m.label}</div>
                      <div className="text-[10px] text-muted truncate">{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount input & Preset chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-muted">Số lượng VNC rút</label>
                {selectedAmount > 0 && (
                  <span className="text-cyan font-mono font-medium">
                    Nhận ≈ {Math.round(estimatedVnd).toLocaleString('vi-VN')} VND
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={wallet?.balance_nova ?? undefined}
                  placeholder={t('wallet.amount_placeholder')}
                  value={form.amount_nova}
                  onChange={(e) => setForm({ ...form, amount_nova: e.target.value })}
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-indigo font-mono pl-10"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                  <CurrencyIcon size={18} />
                </div>
              </div>

              {/* Preset Chips */}
              <div className="flex items-center gap-1.5 pt-1">
                {[10, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setForm({ ...form, amount_nova: String(preset) });
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-surface2 hover:bg-line border border-line text-muted hover:text-ink transition btn-press"
                  >
                    +{preset} VNC
                  </button>
                ))}
                {wallet && wallet.balance_nova > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setForm({ ...form, amount_nova: String(wallet.balance_nova) });
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo/15 text-indigo hover:bg-indigo/25 border border-indigo/30 transition btn-press ml-auto"
                  >
                    Tất cả ({wallet.balance_nova})
                  </button>
                )}
              </div>
            </div>

            {/* Destination input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Thông tin nhận tiền</label>
              <input
                placeholder={
                  form.method === 'momo'
                    ? 'Số điện thoại nhận tiền MoMo'
                    : form.method === 'bank'
                    ? 'STK - Tên ngân hàng - Tên chủ tài khoản'
                    : 'Nhà mạng (Viettel/Mobi/Vina) & Mệnh giá'
                }
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-indigo"
              />
            </div>

            {error && <div className="text-xs text-rose">{error}</div>}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-indigo via-indigo/90 to-cyan hover:brightness-110 text-white shadow-lg shadow-indigo/20 hover:shadow-[0_0_25px_rgba(108,99,245,0.4)] transition-all btn-press flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin text-base" />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-send-fill text-sm" />
                  <span>{t('wallet.submit')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Withdrawal History Section */}
      <div className="space-y-4 pt-4">
        <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
          <i className="bi bi-clock-history text-amber" /> Lịch sử yêu cầu rút tiền
        </h2>

        <div className="glass-panel rounded-3xl border border-line overflow-hidden shadow-xl">
          {loadingHistory ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-10 text-center text-muted">
              <i className="bi bi-inbox text-3xl mb-2 inline-block text-muted/60" />
              <div className="text-sm">Bạn chưa có yêu cầu rút tiền nào.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface2/40 text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-5 py-3">Mã đơn</th>
                    <th className="px-5 py-3">Số lượng</th>
                    <th className="px-5 py-3">Phương thức</th>
                    <th className="px-5 py-3">Thông tin nhận</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {withdrawals.map((w) => {
                    const statusConfig = {
                      paid: { label: 'Đã thanh toán', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
                      approved: { label: 'Đã duyệt', bg: 'bg-cyan/15 text-cyan border-cyan/30' },
                      pending: { label: 'Chờ duyệt', bg: 'bg-amber/15 text-amber border-amber/30' },
                      rejected: { label: 'Từ chối', bg: 'bg-rose/15 text-rose border-rose/30' },
                    }[w.status] || { label: w.status, bg: 'bg-surface2 text-muted border-line' };

                    return (
                      <tr key={w.id} className="hover:bg-surface2/40 transition">
                        <td className="px-5 py-3.5 font-mono text-xs text-muted">
                          #{w.id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-mono font-bold text-amber flex items-center gap-1">
                            <CurrencyIcon size={15} />
                            <span>-{w.amount_nova}</span>
                          </div>
                          <div className="text-[11px] text-muted">
                            ≈ {w.amount_vnd.toLocaleString('vi-VN')}đ
                          </div>
                        </td>
                        <td className="px-5 py-3.5 capitalize font-medium text-xs">
                          {w.method === 'momo' ? 'MoMo' : w.method === 'bank' ? 'Ngân hàng' : 'Thẻ cào'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted max-w-xs truncate">
                          {/* destination is in withdrawal object if extended, fallback */}
                          {(w as any).destination || 'Ví điện tử'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.bg}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted font-mono">
                          {new Date(w.created_at).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
