import { useEffect, useState } from 'react';
import { api, type ApiError } from '../api/client.js';
import type { Wallet as WalletType, Withdrawal } from '../types.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import BalanceCard from '../components/BalanceCard.js';
import AnimatedNumber from '../components/AnimatedNumber.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useSettings } from '../context/SettingsContext.js';
import { playClickSound, playCoinSound } from '../utils/sound.js';

type MethodType = 'bank' | 'momo' | 'card';

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
    id: 'bank',
    label: 'Ngân hàng',
    icon: 'bi-bank',
    color: 'text-cyan',
    bg: 'bg-cyan/15 border-cyan/30',
    desc: 'Chuyển khoản 24/7',
  },
  {
    id: 'momo',
    label: 'Ví MoMo',
    icon: 'bi-wallet-fill',
    color: 'text-pink-400',
    bg: 'bg-pink-500/15 border-pink-500/30',
    desc: 'Rút về ví MoMo',
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

const POPULAR_BANKS = [
  'MBBank (Quân Đội)',
  'Vietcombank',
  'Techcombank',
  'VPBank',
  'ACB',
  'BIDV',
  'Agribank',
  'TPBank',
  'MSB',
  'OCB',
  'Sacombank',
  'VIB',
  'VietinBank',
  'SHB',
  'HDBank',
  'SeABank',
];

interface WithdrawalModalData {
  id: string;
  transferCode: string;
  amountNova: number;
  amountVnd: number;
  destination: string;
}

export default function Wallet() {
  const { t } = useLanguage();
  const { me, refresh } = useAuth();
  const { novaToVndRate } = useSettings();
  const { success: toastSuccess, error: toastError } = useToast();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [amountNova, setAmountNova] = useState('');
  const [method, setMethod] = useState<MethodType>('bank');

  // 3 distinct fields for Bank
  const [bankName, setBankName] = useState(POPULAR_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  // 3 distinct fields for MoMo
  const [momoWalletName] = useState('Ví điện tử MoMo');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoName, setMomoName] = useState('');

  // 3 distinct fields for Card
  const [cardTelco, setCardTelco] = useState('Viettel');
  const [cardDenomination, setCardDenomination] = useState('20.000đ');
  const [cardContact, setCardContact] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<WithdrawalModalData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

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

  function formatDestination(): string {
    if (method === 'bank') {
      const cleanAcc = accountNumber.replace(/-/g, '').trim();
      const cleanName = accountHolder.replace(/-/g, '').trim().toUpperCase();
      return `Ngân hàng: ${bankName} | STK: ${cleanAcc} | Chủ TK: ${cleanName}`;
    }
    if (method === 'momo') {
      const cleanPhone = momoPhone.replace(/-/g, '').trim();
      const cleanName = momoName.replace(/-/g, '').trim().toUpperCase();
      return `${momoWalletName} | SĐT: ${cleanPhone} | Tên: ${cleanName}`;
    }
    const cleanContact = cardContact.replace(/-/g, '').trim();
    return `Nhà mạng: ${cardTelco} | Mệnh giá: ${cardDenomination} | Nhận tại: ${cleanContact}`;
  }

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(amountNova);
    if (!amount || amount <= 0) {
      toastError('Vui lòng nhập số VNC hợp lệ.', 'Số lượng không hợp lệ');
      return;
    }
    if (wallet && amount > wallet.balance_nova) {
      toastError('Số dư VNC không đủ để thực hiện yêu cầu.', 'Số dư không đủ');
      return;
    }

    if (method === 'bank') {
      if (!accountNumber.trim()) {
        toastError('Vui lòng nhập số tài khoản ngân hàng.', 'Thiếu thông tin');
        return;
      }
      if (!accountHolder.trim()) {
        toastError('Vui lòng nhập họ tên chủ tài khoản.', 'Thiếu thông tin');
        return;
      }
    } else if (method === 'momo') {
      if (!momoPhone.trim()) {
        toastError('Vui lòng nhập số điện thoại MoMo.', 'Thiếu thông tin');
        return;
      }
      if (!momoName.trim()) {
        toastError('Vui lòng nhập họ tên chủ ví MoMo.', 'Thiếu thông tin');
        return;
      }
    } else if (method === 'card') {
      if (!cardContact.trim()) {
        toastError('Vui lòng nhập email hoặc SĐT để nhận thẻ.', 'Thiếu thông tin');
        return;
      }
    }

    const destinationString = formatDestination();

    playClickSound();
    setSubmitting(true);
    setError(null);

    try {
      const res = (await api.withdraw({
        amount_nova: amount,
        method,
        destination: destinationString,
      })) as { ok: boolean; id: string; transfer_code?: string };

      playCoinSound();
      const transferCode = res.transfer_code || `VNC-RUT-${res.id.slice(0, 8).toUpperCase()}`;

      setSuccessModal({
        id: res.id,
        transferCode,
        amountNova: amount,
        amountVnd: Math.round(estimatedVnd),
        destination: destinationString,
      });

      toastSuccess('Yêu cầu rút tiền thành công, đang chờ duyệt từ 24-72h', 'Đã gửi đơn rút');

      // Reset form fields
      setAmountNova('');
      setAccountNumber('');
      setAccountHolder('');
      setMomoPhone('');
      setMomoName('');
      setCardContact('');

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

  function copyToClipboard(text: string) {
    playClickSound();
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toastSuccess('Đã sao chép nội dung chuyển tiền', 'Thành công');
    setTimeout(() => setCopiedCode(false), 2500);
  }

  const selectedAmount = Number(amountNova) || 0;
  const estimatedVnd =
    novaToVndRate > 0
      ? selectedAmount * novaToVndRate
      : wallet
      ? (selectedAmount / (wallet.balance_nova || 1)) * wallet.balance_vnd
      : selectedAmount * 1000;

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          <i className="bi bi-wallet2 text-cyan" /> {t('wallet.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Quản lý số dư VNC, tạo lệnh chuyển khoản ngân hàng hoặc đổi thẻ cào nhanh chóng.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-6 items-start">
        {/* Holographic Virtual Card (Left - 2 Cols) */}
        <div className="md:col-span-2 space-y-4">
          <div className="w-full">
            <BalanceCard
              amount={wallet?.balance_vnd}
              currency="₫"
              label="Số dư khả dụng"
              cardId={me?.card_id || undefined}
            />
          </div>

          {/* Wallet Mini Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-3.5 border border-line text-center">
              <div className="text-[10px] text-muted uppercase font-semibold">Đã quy đổi</div>
              <div className="font-mono text-base font-bold text-cyan mt-1">
                <span>{wallet?.total_redeemed_nova ?? 0}</span> VNC
              </div>
            </div>
            <div className="glass-card rounded-2xl p-3.5 border border-line text-center">
              <div className="text-[10px] text-muted uppercase font-semibold">Tỷ giá quy đổi</div>
              <div className="font-mono text-sm font-bold text-amber mt-1">
                1 VNC = {novaToVndRate > 0 ? novaToVndRate.toLocaleString('vi-VN') : '1.000'}đ
              </div>
            </div>
          </div>
        </div>

        {/* Withdrawal Form (Right - 3 Cols) */}
        <div className="md:col-span-3 glass-card rounded-3xl p-6 sm:p-7 border border-line shadow-xl space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <i className="bi bi-cash-stack text-cyan" /> Yêu cầu rút tiền về tài khoản
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Chọn phương thức, điền thông tin và xác nhận số VNC bạn muốn quy đổi
            </p>
          </div>

          {/* Prominent Manual Withdrawal Approval Notice */}
          <div className="p-4 rounded-2xl bg-amber/10 border border-amber/30 text-amber text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-ink">
              <i className="bi bi-clock-history text-amber" /> Thông báo thời gian duyệt rút tiền:
            </div>
            <div className="leading-relaxed">
              Đơn rút tiền sẽ được kiểm tra và <strong className="text-amber">duyệt từ 24 - 72h</strong>. Vui lòng đảm bảo thông tin số tài khoản và ngân hàng chính xác tuyệt đối!
            </div>
          </div>

          <form onSubmit={submitWithdraw} className="space-y-4">
            {/* Method Selector Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">Phương thức nhận tiền</label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => {
                  const active = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setMethod(m.id);
                      }}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all btn-press flex flex-col items-center justify-center ${
                        active
                          ? `${m.bg} shadow-md`
                          : 'bg-surface2/60 border-line hover:border-line/80 text-muted'
                      }`}
                    >
                      <i className={`bi ${m.icon} ${m.color} text-lg mb-1`} />
                      <div className="font-semibold text-xs text-ink truncate w-full">{m.label}</div>
                      <div className="text-[10px] text-muted truncate w-full hidden xs:block">{m.desc}</div>
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
                  value={amountNova}
                  onChange={(e) => setAmountNova(e.target.value)}
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
                      setAmountNova(String(preset));
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
                      setAmountNova(String(wallet.balance_nova));
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo/15 text-indigo hover:bg-indigo/25 border border-indigo/30 transition btn-press ml-auto"
                  >
                    Tất cả ({wallet.balance_nova})
                  </button>
                )}
              </div>
            </div>

            {/* 3-Part Destination Information (Chia thành 3 phần, ko để -) */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-semibold text-muted block">
                Thông tin nhận tiền (3 phần riêng biệt)
              </label>

              {method === 'bank' && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-surface2/40 border border-line">
                  {/* Part 1: Ngân hàng */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-indigo/20 text-indigo flex items-center justify-center text-[10px] font-bold">1</span>
                      Tên ngân hàng
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo"
                    >
                      {POPULAR_BANKS.map((b) => (
                        <option key={b} value={b} className="bg-surface text-ink">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Part 2: Số tài khoản (ko để -) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-indigo/20 text-indigo flex items-center justify-center text-[10px] font-bold">2</span>
                      Số tài khoản (STK)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Chỉ nhập số tài khoản, không nhập dấu gạch ngang"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/-/g, '').trim())}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo font-mono"
                    />
                  </div>

                  {/* Part 3: Tên chủ tài khoản */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-indigo/20 text-indigo flex items-center justify-center text-[10px] font-bold">3</span>
                      Tên chủ tài khoản (Họ và tên in hoa)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: NGUYEN VAN A"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo uppercase font-mono tracking-wider"
                    />
                  </div>
                </div>
              )}

              {method === 'momo' && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-surface2/40 border border-line">
                  {/* Part 1: Loại ví */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px] font-bold">1</span>
                      Loại ví điện tử
                    </label>
                    <input
                      disabled
                      value={momoWalletName}
                      className="w-full bg-surface/50 border border-line/60 rounded-xl px-3 py-2 text-xs sm:text-sm text-ink opacity-80"
                    />
                  </div>

                  {/* Part 2: SĐT MoMo (ko để -) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px] font-bold">2</span>
                      Số điện thoại MoMo
                    </label>
                    <input
                      type="tel"
                      placeholder="Chỉ nhập số điện thoại, không nhập dấu gạch ngang"
                      value={momoPhone}
                      onChange={(e) => setMomoPhone(e.target.value.replace(/-/g, '').trim())}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo font-mono"
                    />
                  </div>

                  {/* Part 3: Tên người nhận */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px] font-bold">3</span>
                      Tên chủ ví MoMo (In hoa)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: NGUYEN VAN A"
                      value={momoName}
                      onChange={(e) => setMomoName(e.target.value.toUpperCase())}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo uppercase font-mono tracking-wider"
                    />
                  </div>
                </div>
              )}

              {method === 'card' && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-surface2/40 border border-line">
                  {/* Part 1: Nhà mạng */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">1</span>
                      Nhà mạng thẻ cào
                    </label>
                    <select
                      value={cardTelco}
                      onChange={(e) => setCardTelco(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo"
                    >
                      <option value="Viettel">Viettel</option>
                      <option value="Mobifone">Mobifone</option>
                      <option value="Vinaphone">Vinaphone</option>
                    </select>
                  </div>

                  {/* Part 2: Mệnh giá */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
                      Mệnh giá thẻ
                    </label>
                    <select
                      value={cardDenomination}
                      onChange={(e) => setCardDenomination(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo"
                    >
                      <option value="10.000đ">10.000đ</option>
                      <option value="20.000đ">20.000đ</option>
                      <option value="50.000đ">50.000đ</option>
                      <option value="100.000đ">100.000đ</option>
                      <option value="200.000đ">200.000đ</option>
                    </select>
                  </div>

                  {/* Part 3: Thông tin nhận */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">3</span>
                      Email hoặc Số điện thoại nhận mã thẻ
                    </label>
                    <input
                      type="text"
                      placeholder="Email hoặc SĐT nhận mã thẻ & seri"
                      value={cardContact}
                      onChange={(e) => setCardContact(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && <div className="text-xs text-rose">{error}</div>}

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-indigo via-indigo/90 to-cyan hover:brightness-110 text-white shadow-lg shadow-indigo/20 hover:shadow-[0_0_25px_rgba(85,167,255,0.4)] transition-all btn-press flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin text-base" />
                  <span>Đang gửi yêu cầu rút tiền...</span>
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

      {/* Confirmation & Transfer Code Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="max-w-md w-full max-h-[90dvh] overflow-y-auto bg-surface border border-indigo/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
              <i className="bi bi-check-circle-fill text-3xl" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-display text-xl font-bold text-ink">Yêu cầu rút tiền thành công!</h3>
              <p className="text-xs text-muted leading-relaxed">
                Đơn rút tiền sẽ được admin xử lý và duyệt từ <strong>24 - 72h</strong>.
              </p>
            </div>

            {/* Generated Transfer Content / Confirmation Code */}
            <div className="p-4 rounded-2xl bg-surface2 border border-line space-y-2 text-left">
              <div className="text-[11px] uppercase tracking-wider text-muted font-semibold flex items-center justify-between">
                <span>Nội dung chuyển tiền xác nhận</span>
                <span className="text-cyan font-mono text-[10px]">MÃ ĐỐI SOÁT</span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface border border-line/80">
                <span className="font-mono text-sm sm:text-base font-bold text-amber tracking-wider select-all">
                  {successModal.transferCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(successModal.transferCode)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo text-white hover:brightness-110 transition btn-press flex items-center gap-1 shrink-0"
                >
                  <i className={`bi ${copiedCode ? 'bi-check-lg' : 'bi-copy'}`} />
                  <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              <p className="text-[11px] text-muted leading-relaxed pt-1">
                Vui lòng lưu lại mã này. Khi tài khoản nhận được tiền, nội dung chuyển khoản sẽ chứa mã này để bạn kiểm tra và xác nhận.
              </p>
            </div>

            <div className="text-xs text-muted space-y-1 text-left bg-surface2/40 p-3 rounded-xl border border-line/60">
              <div className="flex justify-between">
                <span>Số VNC rút:</span>
                <strong className="text-amber font-mono">-{successModal.amountNova} VNC</strong>
              </div>
              <div className="flex justify-between">
                <span>Số tiền quy đổi:</span>
                <strong className="text-ink font-mono">{successModal.amountVnd.toLocaleString('vi-VN')} VND</strong>
              </div>
            </div>

            <button
              onClick={() => setSuccessModal(null)}
              className="w-full py-3 rounded-xl font-bold text-sm bg-surface2 hover:bg-line border border-line text-ink transition btn-press"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </div>
      )}

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
            <div className="overflow-x-auto table-responsive no-scrollbar">
              <table className="w-full text-left text-sm min-w-[700px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-line bg-surface2/40 text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-5 py-3">Mã đơn</th>
                    <th className="px-5 py-3">Nội dung xác nhận</th>
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

                    const memoCode = `VNC-RUT-${w.id.slice(0, 8).toUpperCase()}`;

                    return (
                      <tr key={w.id} className="hover:bg-surface2/40 transition">
                        <td className="px-5 py-3.5 font-mono text-xs text-muted">
                          #{w.id.slice(0, 8)}
                        </td>

                        {/* Generated Transfer memo / confirmation content */}
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(memoCode)}
                            title="Bấm để sao chép nội dung chuyển tiền"
                            className="font-mono text-xs font-bold text-amber hover:underline flex items-center gap-1 group"
                          >
                            <span>{memoCode}</span>
                            <i className="bi bi-copy text-[10px] text-muted group-hover:text-amber transition" />
                          </button>
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

                        <td className="px-5 py-3.5 text-xs text-muted max-w-xs truncate" title={(w as any).destination}>
                          {(w as any).destination || 'Chuyển khoản'}
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
