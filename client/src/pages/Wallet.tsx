import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type ApiError } from '../api/client.js';
import type { Wallet as WalletType, Withdrawal, PayoutAccountItem, WithdrawTierInfo } from '../types.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import BalanceCard from '../components/BalanceCard.js';
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

interface WithdrawChallengeState {
  challengeId: string;
  method: 'totp' | 'email_otp';
  emailMasked?: string;
  amountNova: number;
  amountVnd: number;
  message: string;
  destination: string;
}

export default function Wallet() {
  const { t } = useLanguage();
  const { me, refresh } = useAuth();
  const { novaToVndRate } = useSettings();
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccountItem[]>([]);
  const [tierInfo, setTierInfo] = useState<WithdrawTierInfo | null>(null);

  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amountNova, setAmountNova] = useState('');
  const [method, setMethod] = useState<MethodType>('bank');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const [cardTelco, setCardTelco] = useState('Viettel');
  const [cardDenomination, setCardDenomination] = useState('20.000đ');
  const [cardContact, setCardContact] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<WithdrawalModalData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [addAccountType, setAddAccountType] = useState<'bank' | 'ewallet'>('bank');
  const [addBankName, setAddBankName] = useState(POPULAR_BANKS[0]);
  const [addAccountNumber, setAddAccountNumber] = useState('');
  const [addAccountHolder, setAddAccountHolder] = useState('');
  const [addTotpCode, setAddTotpCode] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const [confirmModalAccount, setConfirmModalAccount] = useState<PayoutAccountItem | null>(null);
  const [confirmInputToken, setConfirmInputToken] = useState('');
  const [confirmInputTotp, setConfirmInputTotp] = useState('');
  const [confirmingAccount, setConfirmingAccount] = useState(false);

  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const [challengeData, setChallengeData] = useState<WithdrawChallengeState | null>(null);
  const [challengeCode, setChallengeCode] = useState('');
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  async function loadData() {
    try {
      const [w, hist, pRes, tInfo] = await Promise.all([
        api.wallet(),
        api.withdrawals(),
        api.payoutAccounts(),
        api.withdrawTierLimit(),
      ]);
      setWallet(w);
      setWithdrawals(hist);
      setPayoutAccounts(pRes.accounts);
      setTierInfo(tInfo);

      const activeAccounts = pRes.accounts.filter((a) => a.isActive);
      if (activeAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(activeAccounts[0].id);
      }
    } catch {} finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const confirmPayoutToken = searchParams.get('confirm_payout');
    const confirmPayoutId = searchParams.get('payout_id');
    if (confirmPayoutToken && confirmPayoutId) {
      api
        .confirmPayoutAccount(confirmPayoutId, { token: confirmPayoutToken })
        .then((res) => {
          toastSuccess(res.message, 'Xác nhận tài khoản');
          searchParams.delete('confirm_payout');
          searchParams.delete('payout_id');
          setSearchParams(searchParams, { replace: true });
          loadData();
        })
        .catch((err: ApiError) => {
          toastError(err.message, 'Lỗi xác nhận');
        });
    }
  }, [searchParams]);

  const activeAccountsForMethod = payoutAccounts.filter((a) => {
    if (!a.isActive) return false;
    if (method === 'bank') return a.type === 'bank';
    if (method === 'momo') return a.type === 'ewallet';
    return false;
  });

  const selectedPayoutAccount = payoutAccounts.find((a) => a.id === selectedAccountId);

  function formatDestination(): string {
    if (method === 'bank' || method === 'momo') {
      if (selectedPayoutAccount) {
        return `${selectedPayoutAccount.bank_name} | STK: ***${selectedPayoutAccount.last4} | Chủ TK: ${selectedPayoutAccount.account_name}`;
      }
      return 'Chưa chọn tài khoản nhận tiền';
    }
    const cleanContact = cardContact.replace(/-/g, '').trim();
    return `Nhà mạng: ${cardTelco} | Mệnh giá: ${cardDenomination} | Nhận tại: ${cleanContact}`;
  }

  async function handleAddPayoutAccount(e: React.FormEvent) {
    e.preventDefault();
    if (payoutAccounts.length >= 5) {
      toastError('Bạn chỉ có thể liên kết tối đa 5 tài khoản nhận tiền.', 'Đã đạt giới hạn');
      return;
    }

    const cleanAcc = addAccountNumber.replace(/-/g, '').trim();
    const cleanName = addAccountHolder.replace(/-/g, '').trim().toUpperCase();
    const bName = addAccountType === 'ewallet' ? 'Ví MoMo' : addBankName;

    if (!cleanAcc || cleanAcc.length < 4) {
      toastError('Vui lòng nhập số tài khoản hoặc số điện thoại hợp lệ (tối thiểu 4 số).', 'Thiếu thông tin');
      return;
    }
    if (!cleanName) {
      toastError('Vui lòng nhập họ và tên chủ tài khoản.', 'Thiếu thông tin');
      return;
    }

    setSavingAccount(true);
    try {
      const res = await api.addPayoutAccount({
        type: addAccountType,
        bank_name: bName,
        account_name: cleanName,
        account_number: cleanAcc,
        totpCode: addTotpCode.trim() || undefined,
      });

      toastSuccess(res.message, 'Thêm tài khoản');
      setShowAddAccountModal(false);
      setAddAccountNumber('');
      setAddAccountHolder('');
      setAddTotpCode('');
      loadData();
    } catch (err) {
      const msg = (err as ApiError).message;
      toastError(msg, 'Lỗi thêm tài khoản');
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleConfirmAccountManual(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmModalAccount) return;

    setConfirmingAccount(true);
    try {
      const res = await api.confirmPayoutAccount(confirmModalAccount.id, {
        token: confirmInputToken.trim() || undefined,
        totpCode: confirmInputTotp.trim() || undefined,
      });
      toastSuccess(res.message, 'Xác nhận thành công');
      setConfirmModalAccount(null);
      setConfirmInputToken('');
      setConfirmInputTotp('');
      loadData();
    } catch (err) {
      const msg = (err as ApiError).message;
      toastError(msg, 'Lỗi xác nhận');
    } finally {
      setConfirmingAccount(false);
    }
  }

  async function handleDeleteAccount(acc: PayoutAccountItem) {
    if (!window.confirm(`Bạn có chắc chắn muốn gỡ tài khoản ${acc.bank_name} (***${acc.last4})?`)) return;

    setDeletingAccountId(acc.id);
    try {
      const res = await api.deletePayoutAccount(acc.id);
      toastSuccess(res.message, 'Đã xóa tài khoản');
      if (selectedAccountId === acc.id) {
        setSelectedAccountId('');
      }
      loadData();
    } catch (err) {
      const msg = (err as ApiError).message;
      toastError(msg, 'Lỗi xóa tài khoản');
    } finally {
      setDeletingAccountId(null);
    }
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

    if (tierInfo && tierInfo.totalWithdrawn24h + amount > tierInfo.dailyLimit) {
      toastError(
        `Đã vượt quá hạn mức rút tiền trong ngày (${tierInfo.dailyLimit.toLocaleString('vi-VN')} VNC). Còn lại ${tierInfo.remainingLimit.toLocaleString('vi-VN')} VNC.`,
        'Vượt hạn mức'
      );
      return;
    }

    if (method === 'bank' || method === 'momo') {
      if (!selectedPayoutAccount || !selectedPayoutAccount.isActive) {
        toastError('Vui lòng chọn một tài khoản nhận tiền ở trạng thái "Sẵn sàng".', 'Tài khoản chưa sẵn sàng');
        return;
      }
    } else if (method === 'card') {
      if (!cardContact.trim()) {
        toastError('Vui lòng nhập email hoặc SĐT để nhận mã thẻ cào.', 'Thiếu thông tin');
        return;
      }
    }

    const destinationString = formatDestination();
    playClickSound();
    setSubmitting(true);
    setError(null);

    try {
      const initRes = await api.initWithdraw({
        amount_nova: amount,
        payout_account_id: selectedPayoutAccount?.id || '',
      });

      if (initRes.requiresConfirmation) {
        setChallengeData({
          challengeId: initRes.challengeId,
          method: initRes.method,
          emailMasked: initRes.emailMasked,
          amountNova: initRes.amountNova,
          amountVnd: initRes.amountVnd,
          message: initRes.message,
          destination: destinationString,
        });
        setChallengeCode('');
        setSubmitting(false);
        return;
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404 || apiErr.message.includes('404')) {
        try {
          const directRes = await api.withdraw({
            amount_nova: amount,
            method,
            destination: destinationString,
            payout_account_id: selectedPayoutAccount?.id,
          });

          playCoinSound();
          const transferCode = directRes.transfer_code || `VNC-RUT-${directRes.id.slice(0, 8).toUpperCase()}`;

          setSuccessModal({
            id: directRes.id,
            transferCode,
            amountNova: amount,
            amountVnd: Math.round(estimatedVnd),
            destination: destinationString,
          });

          toastSuccess('Yêu cầu rút tiền thành công, đang chờ duyệt từ 24-72h', 'Đã gửi đơn rút');
          setAmountNova('');
          setCardContact('');
          await refresh();
          loadData();
          return;
        } catch (innerErr) {
          const msg = (innerErr as ApiError).message;
          setError(msg);
          toastError(msg, 'Lỗi rút tiền');
        }
      } else {
        const msg = apiErr.message;
        setError(msg);
        toastError(msg, 'Lỗi rút tiền');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmWithdrawChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeData || !challengeCode.trim()) return;

    setConfirmingWithdraw(true);
    try {
      const res = await api.confirmWithdraw({
        challengeId: challengeData.challengeId,
        code: challengeCode.trim(),
      });

      playCoinSound();
      const transferCode = res.transfer_code || `VNC-RUT-${res.id.slice(0, 8).toUpperCase()}`;

      setSuccessModal({
        id: res.id,
        transferCode,
        amountNova: challengeData.amountNova,
        amountVnd: challengeData.amountVnd,
        destination: challengeData.destination,
      });

      toastSuccess('Yêu cầu rút tiền thành công, đang chờ admin duyệt từ 24-72h', 'Đã duyệt yêu cầu');
      setChallengeData(null);
      setChallengeCode('');
      setAmountNova('');
      setCardContact('');

      await refresh();
      loadData();
    } catch (err) {
      const msg = (err as ApiError).message;
      toastError(msg, 'Xác nhận thất bại');
    } finally {
      setConfirmingWithdraw(false);
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
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          <i className="bi bi-wallet2 text-cyan" /> {t('wallet.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Quản lý số dư VNC, tài khoản nhận tiền tin cậy và tạo lệnh rút tiền được bảo vệ an toàn.
        </p>
      </div>

      {tierInfo && (
        <div className="glass-card rounded-3xl p-4 sm:p-5 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Hạn mức rút tiền hôm nay:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  tierInfo.tier === '2fa'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : tierInfo.tier === 'basic'
                    ? 'bg-cyan/15 border-cyan/30 text-cyan'
                    : 'bg-amber/15 border-amber/30 text-amber'
                }`}
              >
                <i
                  className={`bi ${
                    tierInfo.tier === '2fa'
                      ? 'bi-shield-check'
                      : tierInfo.tier === 'basic'
                      ? 'bi-person-check'
                      : 'bi-shield-exclamation'
                  } mr-1`}
                />
                {tierInfo.tierLabel}
              </span>
            </div>
            <div className="text-sm font-display text-ink flex items-center gap-2">
              <span>Còn lại:</span>
              <span className="font-mono font-bold text-cyan text-base">
                {tierInfo.remainingLimit.toLocaleString('vi-VN')} VNC
              </span>
              <span className="text-xs text-muted">
                / {tierInfo.dailyLimit.toLocaleString('vi-VN')} VNC (Đã rút 24h: {tierInfo.totalWithdrawn24h.toLocaleString('vi-VN')} VNC)
              </span>
            </div>
          </div>

          {tierInfo.tier !== '2fa' && (
            <Link
              to="/profile?tab=security"
              onClick={playClickSound}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo/15 text-indigo hover:bg-indigo/25 border border-indigo/30 transition btn-press flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
            >
              <i className="bi bi-shield-lock-fill" />
              <span>Bật 2FA để tăng hạn mức ({tierInfo.limit2fa.toLocaleString('vi-VN')} VNC)</span>
            </Link>
          )}
        </div>
      )}

      <div className="glass-card rounded-3xl p-5 sm:p-6 border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <i className="bi bi-shield-check text-cyan" /> Danh sách tài khoản nhận tiền tin cậy
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Tối đa 5 tài khoản. Tài khoản mới cần chờ 24 giờ sau khi xác nhận để được rút tiền.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-muted font-mono bg-surface2 px-2.5 py-1 rounded-xl border border-line">
              {payoutAccounts.length} / 5
            </span>
            {payoutAccounts.length < 5 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowAddAccountModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan text-ink hover:brightness-110 transition btn-press flex items-center gap-1.5 shadow-sm"
              >
                <i className="bi bi-plus-circle-fill" />
                <span>Thêm tài khoản</span>
              </button>
            )}
          </div>
        </div>

        {payoutAccounts.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted bg-surface2/40 rounded-2xl border border-line space-y-2">
            <i className="bi bi-bank text-2xl text-muted/60 inline-block" />
            <p>Bạn chưa thêm tài khoản nhận tiền tin cậy nào.</p>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowAddAccountModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan text-ink hover:brightness-110 transition btn-press inline-flex items-center gap-1.5"
            >
              <i className="bi bi-plus-lg" />
              <span>Thêm tài khoản ngân hàng / MoMo ngay</span>
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {payoutAccounts.map((acc) => (
              <div
                key={acc.id}
                className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                  acc.isActive
                    ? 'bg-surface2/60 border-line hover:border-line/90'
                    : 'bg-surface2/30 border-line/60 opacity-90'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 border ${
                        acc.type === 'ewallet'
                          ? 'bg-pink-500/15 border-pink-500/30 text-pink-400'
                          : 'bg-cyan/15 border-cyan/30 text-cyan'
                      }`}
                    >
                      <i className={`bi ${acc.type === 'ewallet' ? 'bi-wallet-fill' : 'bi-bank'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-ink truncate">{acc.bank_name}</div>
                      <div className="text-[11px] text-muted font-mono">
                        ***{acc.last4} • <span className="uppercase text-ink font-sans font-medium">{acc.account_name}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc)}
                    disabled={deletingAccountId === acc.id}
                    title="Xóa tài khoản này"
                    className="w-7 h-7 rounded-lg text-muted hover:text-rose hover:bg-rose/10 flex items-center justify-center transition shrink-0"
                  >
                    {deletingAccountId === acc.id ? (
                      <i className="bi bi-arrow-repeat animate-spin text-xs" />
                    ) : (
                      <i className="bi bi-trash text-xs" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/60 text-[11px]">
                  {acc.status === 'pending_email' ? (
                    <>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-amber/15 text-amber border border-amber/30 text-[10px] flex items-center gap-1">
                        <i className="bi bi-envelope-exclamation" /> Chờ xác nhận email
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setConfirmModalAccount(acc);
                        }}
                        className="text-[11px] font-semibold text-cyan hover:underline flex items-center gap-1"
                      >
                        <i className="bi bi-check-circle" /> Nhập mã
                      </button>
                    </>
                  ) : acc.status === 'waiting' && !acc.isActive ? (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-cyan/15 text-cyan border border-cyan/30 text-[10px] flex items-center gap-1">
                      <i className="bi bi-clock-history" /> Còn {acc.hoursUntilActive ?? 24} giờ nữa mới dùng được
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] flex items-center gap-1">
                      <i className="bi bi-check2-circle" /> Sẵn sàng
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-5 gap-6 items-start">
        <div className="md:col-span-2 space-y-4">
          <div className="w-full">
            <BalanceCard
              novaAmount={wallet?.balance_nova}
              vndAmount={wallet?.balance_vnd}
              label="Số dư khả dụng"
              cardId={me?.card_id || undefined}
            />
          </div>

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

        <div className="md:col-span-3 glass-card rounded-3xl p-6 sm:p-7 border border-line shadow-xl space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <i className="bi bi-cash-stack text-cyan" /> Yêu cầu rút tiền về tài khoản
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Chọn phương thức, tài khoản nhận tiền và xác nhận số VNC bạn muốn quy đổi
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber/10 border border-amber/30 text-amber text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-ink">
              <i className="bi bi-clock-history text-amber" /> Thông báo thời gian duyệt rút tiền:
            </div>
            <div className="leading-relaxed">
              Mọi lệnh rút tiền đều được admin kiểm tra và <strong className="text-amber">duyệt từ 24 - 72h</strong>.
              Các lệnh rút lớn hoặc có điểm rủi ro cao sẽ cần thêm thời gian xác minh an toàn.
            </div>
          </div>

          <form onSubmit={submitWithdraw} className="space-y-4">
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

            <div className="space-y-3 pt-1">
              <label className="text-xs font-semibold text-muted block">
                Thông tin nhận tiền (3 phần riêng biệt)
              </label>

              {(method === 'bank' || method === 'momo') && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-surface2/40 border border-line">
                  {activeAccountsForMethod.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted space-y-2">
                      <p className="text-amber">
                        Bạn chưa có tài khoản {method === 'bank' ? 'ngân hàng' : 'ví MoMo'} nào ở trạng thái "Sẵn sàng".
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setAddAccountType(method === 'bank' ? 'bank' : 'ewallet');
                          setShowAddAccountModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan text-ink hover:brightness-110 transition btn-press inline-flex items-center gap-1.5"
                      >
                        <i className="bi bi-plus-circle-fill" /> Thêm tài khoản mới ngay
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-indigo/20 text-indigo flex items-center justify-center text-[10px] font-bold">1</span>
                          Chọn tài khoản nhận tiền tin cậy
                        </label>
                        <select
                          value={selectedAccountId}
                          onChange={(e) => setSelectedAccountId(e.target.value)}
                          className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo"
                        >
                          {activeAccountsForMethod.map((a) => (
                            <option key={a.id} value={a.id} className="bg-surface text-ink">
                              {a.bank_name} - ***{a.last4} ({a.account_name})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedPayoutAccount && (
                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="p-2.5 rounded-xl bg-surface border border-line">
                            <span className="text-[10px] text-muted block">Số tài khoản / SĐT:</span>
                            <span className="font-mono text-ink font-semibold">***{selectedPayoutAccount.last4}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-surface border border-line">
                            <span className="text-[10px] text-muted block">Chủ tài khoản:</span>
                            <span className="font-mono text-ink font-semibold truncate block uppercase">
                              {selectedPayoutAccount.account_name}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {method === 'card' && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-surface2/40 border border-line">
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-indigo via-indigo/90 to-cyan hover:brightness-110 text-white shadow-lg shadow-indigo/20 hover:shadow-[0_0_25px_rgba(85,167,255,0.4)] transition-all btn-press flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin text-base" />
                  <span>Đang khởi tạo yêu cầu...</span>
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

      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="max-w-md w-full bg-surface border border-line rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <i className="bi bi-shield-plus text-cyan" /> Thêm tài khoản nhận tiền tin cậy
              </h3>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                className="w-7 h-7 rounded-lg text-muted hover:text-ink flex items-center justify-center"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form onSubmit={handleAddPayoutAccount} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted">Loại tài khoản</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddAccountType('bank')}
                    className={`py-2 px-3 rounded-xl border text-center transition font-semibold ${
                      addAccountType === 'bank'
                        ? 'bg-cyan/15 border-cyan text-cyan'
                        : 'bg-surface2 border-line text-muted'
                    }`}
                  >
                    <i className="bi bi-bank mr-1" /> Ngân hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddAccountType('ewallet')}
                    className={`py-2 px-3 rounded-xl border text-center transition font-semibold ${
                      addAccountType === 'ewallet'
                        ? 'bg-pink-500/15 border-pink-500 text-pink-400'
                        : 'bg-surface2 border-line text-muted'
                    }`}
                  >
                    <i className="bi bi-wallet-fill mr-1" /> Ví MoMo
                  </button>
                </div>
              </div>

              {addAccountType === 'bank' ? (
                <div className="space-y-1">
                  <label className="font-semibold text-muted">Tên ngân hàng</label>
                  <select
                    value={addBankName}
                    onChange={(e) => setAddBankName(e.target.value)}
                    className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-ink focus:outline-none focus:border-indigo"
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b} value={b} className="bg-surface text-ink">
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-semibold text-muted">Tên ví điện tử</label>
                  <input
                    disabled
                    value="Ví điện tử MoMo"
                    className="w-full bg-surface2/60 border border-line rounded-xl px-3 py-2 text-ink opacity-80"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-muted">
                  {addAccountType === 'bank' ? 'Số tài khoản (STK)' : 'Số điện thoại MoMo'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Chỉ nhập số, không nhập dấu gạch ngang"
                  value={addAccountNumber}
                  onChange={(e) => setAddAccountNumber(e.target.value.replace(/-/g, '').trim())}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-ink focus:outline-none focus:border-indigo font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-muted">Tên chủ tài khoản (In hoa không dấu)</label>
                <input
                  type="text"
                  placeholder="VD: NGUYEN VAN A"
                  value={addAccountHolder}
                  onChange={(e) => setAddAccountHolder(e.target.value.toUpperCase())}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-ink focus:outline-none focus:border-indigo uppercase font-mono tracking-wider"
                  required
                />
              </div>

              {!me?.email_verified && (
                <div className="space-y-1 p-2.5 rounded-xl bg-amber/10 border border-amber/30 text-amber">
                  <div className="font-semibold flex items-center gap-1">
                    <i className="bi bi-shield-exclamation" /> Xác thực 2FA
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Tài khoản của bạn chưa xác minh email. Vui lòng nhập mã TOTP từ ứng dụng Authenticator để thêm tài khoản.
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Nhập mã 6 chữ số TOTP"
                    value={addTotpCode}
                    onChange={(e) => setAddTotpCode(e.target.value.replace(/\s+/g, ''))}
                    className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-ink focus:outline-none focus:border-indigo font-mono text-center tracking-widest text-sm mt-1"
                    required
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 rounded-xl border border-line text-muted hover:text-ink transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="px-4 py-2 rounded-xl bg-cyan text-ink font-bold hover:brightness-110 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingAccount ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg" />
                      <span>Thêm tài khoản</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="max-w-md w-full bg-surface border border-line rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
                <i className="bi bi-envelope-check text-cyan" /> Xác nhận tài khoản nhận tiền
              </h3>
              <button
                type="button"
                onClick={() => setConfirmModalAccount(null)}
                className="w-7 h-7 rounded-lg text-muted hover:text-ink flex items-center justify-center"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Bạn có thể xác nhận tài khoản <strong>{confirmModalAccount.bank_name}</strong> (***{confirmModalAccount.last4}) bằng liên kết đã gửi tới email, hoặc nhập trực tiếp mã xác thực bên dưới.
            </p>

            <form onSubmit={handleConfirmAccountManual} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-muted">Mã token xác nhận từ liên kết email</label>
                <input
                  type="text"
                  placeholder="Dán mã token từ liên kết email"
                  value={confirmInputToken}
                  onChange={(e) => setConfirmInputToken(e.target.value.trim())}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-ink font-mono focus:outline-none focus:border-indigo"
                />
              </div>

              <div className="text-center text-muted font-bold text-[10px]">HOẶC</div>

              <div className="space-y-1">
                <label className="font-semibold text-muted">Mã xác thực Google Authenticator (2FA)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập mã 6 số TOTP nếu đã bật 2FA"
                  value={confirmInputTotp}
                  onChange={(e) => setConfirmInputTotp(e.target.value.replace(/\s+/g, ''))}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-ink font-mono text-center tracking-widest text-sm focus:outline-none focus:border-indigo"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalAccount(null)}
                  className="px-4 py-2 rounded-xl border border-line text-muted hover:text-ink transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={confirmingAccount || (!confirmInputToken && !confirmInputTotp)}
                  className="px-4 py-2 rounded-xl bg-cyan text-ink font-bold hover:brightness-110 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {confirmingAccount ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin" />
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2" />
                      <span>Xác nhận kích hoạt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {challengeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="max-w-md w-full bg-surface border border-indigo/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo/15 border border-indigo/30 flex items-center justify-center text-indigo text-2xl shadow-lg">
              <i className="bi bi-shield-lock-fill" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display text-lg font-bold text-ink">Xác nhận lệnh rút tiền</h3>
              <p className="text-xs text-muted leading-relaxed">{challengeData.message}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface2/60 border border-line space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Số tiền VNC:</span>
                <span className="font-mono font-bold text-cyan">{challengeData.amountNova.toLocaleString('vi-VN')} VNC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Số tiền quy đổi:</span>
                <span className="font-mono font-bold text-ink">{challengeData.amountVnd.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tài khoản nhận:</span>
                <span className="font-mono text-ink text-[11px] truncate max-w-[200px]">{challengeData.destination}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmWithdrawChallenge} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted text-center block">
                  {challengeData.method === 'totp'
                    ? 'Nhập mã Google Authenticator (hoặc mã khôi phục)'
                    : `Nhập mã OTP 6 số gửi đến ${challengeData.emailMasked}`}
                </label>
                <input
                  type="text"
                  placeholder={challengeData.method === 'totp' ? 'VD: 123456 hoặc XXXXX-XXXXX' : 'VD: 123456'}
                  value={challengeCode}
                  onChange={(e) => setChallengeCode(e.target.value.toUpperCase())}
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm text-ink text-center font-mono tracking-widest focus:outline-none focus:border-indigo"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setChallengeData(null)}
                  className="flex-1 py-2.5 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={confirmingWithdraw || !challengeCode.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-cyan text-ink text-xs font-bold hover:brightness-110 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {confirmingWithdraw ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin" />
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg" />
                      <span>Hoàn tất rút tiền</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
