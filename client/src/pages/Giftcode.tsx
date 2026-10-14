import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import AnimatedNumber from '../components/AnimatedNumber.js';
import { Skeleton } from '../components/Skeleton.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playCoinSound } from '../utils/sound.js';
import type { GiftcodeHistoryItem } from '../types.js';

export default function Giftcode() {
  const { me, refresh } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ code: string; reward: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [history, setHistory] = useState<GiftcodeHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  function loadHistory() {
    api.giftcodeHistory()
      .then((items) => {
        setHistory(items);
        setLoadingHistory(false);
      })
      .catch(() => {
        setLoadingHistory(false);
      });
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || submitting) return;

    playClickSound();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessInfo(null);

    try {
      const res = await api.redeemGiftcode(cleanCode);
      playCoinSound();
      triggerConfetti();

      setSuccessInfo({ code: res.code, reward: res.reward_nova });
      toastSuccess(`Kích hoạt thành công mã ${res.code} (+${res.reward_nova} VNC)!`, 'Nhận Giftcode thành công');
      setCode('');

      // Refresh auth user balance and history
      await refresh();
      loadHistory();
    } catch (err) {
      const msg = (err as ApiError).message || 'Không thể kích hoạt giftcode';
      setErrorMsg(msg);
      toastError(msg, 'Đổi mã thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-8 border border-line bg-gradient-to-br from-surface2 via-surface to-surface shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber/15 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-indigo/15 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber/15 text-amber border border-amber/30">
              <i className="bi bi-gift-fill text-xs" />
              <span>Mã quà tặng tri ân</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-ink">
              Kích hoạt <span className="gradient-text-indigo">Giftcode</span>
            </h1>

            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Nhập mã quà tặng từ sự kiện, livestream, mini-game hoặc fanpage để nhận ngay VNC miễn phí vào tài khoản ví của bạn!
            </p>
          </div>

          {/* Quick Balance Indicator Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line/80 shadow-lg w-full sm:w-auto min-w-0 sm:min-w-[200px] shrink-0 text-center sm:text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium">Số dư hiện tại</div>
            <div className="font-mono text-2xl sm:text-3xl font-bold text-amber tracking-tight flex items-center justify-center sm:justify-end gap-1.5 mt-1">
              <CurrencyIcon size={22} />
              <AnimatedNumber value={me?.balance_nova ?? 0} />
              <span className="text-xs font-normal text-amber/80 font-body">VNC</span>
            </div>
            <Link
              to="/wallet"
              onClick={playClickSound}
              className="text-[11px] font-semibold text-indigo hover:text-indigo/80 hover:underline inline-flex items-center gap-1 mt-2"
            >
              <i className="bi bi-wallet2" /> Xem ví & Rút tiền
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Form & History (Left) | Info & Guidelines (Right) */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Enter Giftcode */}
          <div className="glass-card rounded-3xl p-4 sm:p-7 border border-line space-y-5">
            <div className="flex items-center justify-between border-b border-line/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber/15 text-amber flex items-center justify-center border border-amber/30">
                  <i className="bi bi-ticket-perforated-fill text-lg" />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-ink">
                    Nhập mã quà tặng
                  </h2>
                  <p className="text-[11px] text-muted">Mỗi mã chỉ kích hoạt được 1 lần cho mỗi tài khoản</p>
                </div>
              </div>
            </div>

            {/* Success Feedback Alert */}
            {successInfo && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 space-y-1 animate-fade-in-up">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <i className="bi bi-check-circle-fill text-base shrink-0" />
                  <span>Kích hoạt mã thành công!</span>
                </div>
                <div className="text-xs text-emerald-300/90 pl-6">
                  Bạn vừa nhận được <strong className="font-mono text-emerald-200">+{successInfo.reward} VNC</strong> từ mã <strong className="font-mono">{successInfo.code}</strong>. Số dư đã được cộng trực tiếp vào ví!
                </div>
              </div>
            )}

            {/* Error Feedback Alert */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose/15 border border-rose/30 text-rose space-y-1 animate-fade-in-up">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <i className="bi bi-exclamation-triangle-fill text-base shrink-0" />
                  <span>Không thể kích hoạt</span>
                </div>
                <div className="text-xs text-rose/90 pl-6">{errorMsg}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted block">
                  Mã Giftcode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="VD: VIETNAMDONG2026, TANTHU50..."
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (errorMsg) setErrorMsg(null);
                    }}
                    autoFocus
                    className="w-full bg-surface2 border border-line rounded-2xl px-4 py-3.5 text-sm sm:text-base font-mono tracking-wider text-ink focus:outline-none focus:border-indigo uppercase pl-11 pr-10 shadow-inner"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <i className="bi bi-ticket-perforated-fill text-lg text-amber" />
                  </div>
                  {code && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setCode('');
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-sm p-1 transition"
                      aria-label="Xóa mã"
                    >
                      <i className="bi bi-x-circle-fill" />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !code.trim()}
                className="w-full py-3.5 sm:py-4 rounded-2xl font-display font-bold text-sm sm:text-base bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:brightness-110 text-white shadow-xl shadow-amber-500/20 transition-all btn-press flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin text-lg" />
                    <span>Đang kiểm tra & kích hoạt...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-gift-fill text-lg" />
                    <span>Kích hoạt mã ngay</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card: History of Redeemed Codes */}
          <div className="glass-card rounded-3xl p-4 sm:p-7 border border-line space-y-4">
            <div className="flex items-center justify-between border-b border-line/70 pb-3">
              <div className="flex items-center gap-2">
                <i className="bi bi-clock-history text-indigo text-lg" />
                <h3 className="font-display text-base font-bold text-ink">
                  Lịch sử nhận Giftcode
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-muted px-2.5 py-0.5 rounded-full bg-surface2 border border-line">
                {history.length} mã
              </span>
            </div>

            {loadingHistory ? (
              <div className="space-y-3 py-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-surface2 text-muted flex items-center justify-center mx-auto text-2xl border border-line">
                  <i className="bi bi-inbox" />
                </div>
                <div className="text-xs text-muted max-w-sm mx-auto">
                  Bạn chưa nhập mã Giftcode nào. Hãy tham gia cộng đồng để săn mã quà tặng nhé!
                </div>
              </div>
            ) : (
              <div className="divide-y divide-line/60 overflow-hidden">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-surface2/30 px-2 rounded-xl transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs sm:text-sm text-ink bg-surface2 px-2.5 py-0.5 rounded-lg border border-line truncate max-w-[140px] sm:max-w-none">
                          {item.code}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                          Thành công
                        </span>
                      </div>
                      <div className="text-[11px] text-muted mt-1 truncate">
                        {new Date(item.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>

                    <div className="font-mono text-xs sm:text-sm font-bold text-amber flex items-center gap-1 shrink-0">
                      <span>+{item.reward_nova}</span>
                      <span className="text-[10px] text-amber/80 font-normal">VNC</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Community Channels where giftcodes drop */}
          <div className="glass-card rounded-3xl p-4 sm:p-7 border border-line space-y-4">
            <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <i className="bi bi-broadcast text-cyan text-lg" />
              <span>Săn Giftcode ở đâu?</span>
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Giftcode được phát định kỳ hoặc trong các dịp đặc biệt thông qua các kênh chính thức sau:
            </p>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-surface2/60 border border-line flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo/15 text-indigo flex items-center justify-center text-lg shrink-0 border border-indigo/30">
                  <i className="bi bi-discord" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-ink">Discord Server</div>
                  <div className="text-[11px] text-muted">Mini game, give-away và thông báo mã mỗi tuần</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface2/60 border border-line flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan/15 text-cyan flex items-center justify-center text-lg shrink-0 border border-cyan/30">
                  <i className="bi bi-telegram" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-ink">Kênh Telegram</div>
                  <div className="text-[11px] text-muted">Nhận mã chớp nhoáng và cập nhật sự kiện tức thì</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface2/60 border border-line flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose/15 text-rose flex items-center justify-center text-lg shrink-0 border border-rose/30">
                  <i className="bi bi-youtube" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-ink">Livestream & Video</div>
                  <div className="text-[11px] text-muted">Mã tri ân đặc biệt cho người xem luồng trực tiếp</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Important Notes */}
          <div className="glass-card rounded-3xl p-4 sm:p-7 border border-line space-y-3">
            <h3 className="font-display text-sm font-bold text-ink flex items-center gap-2">
              <i className="bi bi-info-circle-fill text-amber" />
              <span>Lưu ý khi sử dụng</span>
            </h3>
            <ul className="text-xs text-muted space-y-2 list-disc list-inside leading-relaxed">
              <li>Mỗi mã Giftcode chỉ có thể sử dụng một lần cho mỗi tài khoản.</li>
              <li>Mã không phân biệt chữ hoa hay chữ thường khi nhập.</li>
              <li>Một số mã có giới hạn số lượt kích hoạt tối đa hoặc thời gian hết hạn.</li>
              <li>VNC nhận được từ mã sẽ được ghi nhận ngay vào lịch sử và số dư ví.</li>
            </ul>
          </div>

          {/* Card: Need Support */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo/10 via-surface to-surface border border-indigo/25 space-y-2">
            <div className="flex items-center gap-2 text-indigo font-bold text-xs">
              <i className="bi bi-headset text-sm" />
              <span>Gặp sự cố với mã quà tặng?</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Nếu bạn nhận được mã nhưng không kích hoạt được, vui lòng liên hệ bộ phận hỗ trợ để được kiểm tra.
            </p>
            <Link
              to="/support"
              onClick={playClickSound}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo hover:text-indigo/80 hover:underline pt-1"
            >
              <span>Gửi yêu cầu hỗ trợ</span>
              <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
