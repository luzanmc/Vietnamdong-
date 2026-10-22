import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useCardTheme, CARD_PRESETS } from '../context/CardContext.js';
import { api } from '../api/client.js';

interface BalanceCardProps {
  novaAmount?: number;
  vndAmount?: number;
  amount?: number | string;
  currency?: '₫' | 'VNC';
  label?: string;
  cardId?: string;
  interactive?: boolean;
  className?: string;
  showEditButton?: boolean;
}

export default function BalanceCard({
  novaAmount,
  vndAmount,
  amount,
  currency,
  label = 'Số dư khả dụng',
  cardId: customCardId,
  interactive = true,
  className = '',
  showEditButton = false,
}: BalanceCardProps) {
  const { me } = useAuth();
  const { effectiveBackground, openCustomizer } = useCardTheme();

  // Balance determination
  const [balanceNova, setBalanceNova] = useState<number>(0);
  const [balanceVnd, setBalanceVnd] = useState<number>(0);
  // Default to VNC: showVnd is false
  const [showVnd, setShowVnd] = useState<boolean>(false);

  // Fetch wallet balance if amounts not explicitly provided
  useEffect(() => {
    if (novaAmount !== undefined && vndAmount !== undefined) return;
    if (amount !== undefined) return;
    if (me) {
      api.wallet()
        .then((w) => {
          setBalanceNova(w.balance_nova ?? 0);
          setBalanceVnd(w.balance_vnd ?? 0);
        })
        .catch(() => {
          setBalanceNova(me.balance_nova ?? 0);
          setBalanceVnd((me.balance_nova ?? 0) * 1000);
        });
    }
  }, [me, novaAmount, vndAmount, amount]);

  const activeNova = novaAmount !== undefined ? novaAmount : balanceNova;
  const activeVnd = vndAmount !== undefined ? vndAmount : (balanceVnd || activeNova * 1000);

  // Determine display amount and currency unit
  let displayAmount: string;
  let displayCurrency: string;

  if (amount !== undefined && novaAmount === undefined && vndAmount === undefined) {
    if (showVnd) {
      displayAmount = typeof amount === 'number' ? (amount * 1000).toLocaleString('vi-VN') : String(amount);
      displayCurrency = '₫';
    } else {
      displayAmount = typeof amount === 'number' ? amount.toLocaleString('vi-VN') : String(amount);
      displayCurrency = currency || 'VNC';
    }
  } else if (showVnd) {
    displayAmount = activeVnd.toLocaleString('vi-VN');
    displayCurrency = '₫';
  } else {
    displayAmount = activeNova.toLocaleString('vi-VN');
    displayCurrency = 'VNC';
  }

  // ID Determination & Masking
  // Format: "0001 2345"
  const rawId = customCardId || me?.card_id || (me ? generateDeterministicId(me.id) : '0001 2345');
  const formattedId = rawId.includes(' ')
    ? rawId
    : `${rawId.slice(0, 4)} ${rawId.slice(4)}`;

  const [isFullIdShown, setIsFullIdShown] = useState(false);
  const [copiedHint, setCopiedHint] = useState(false);

  const maskedId = `•••• ${formattedId.slice(5)}`;
  const displayIdText = isFullIdShown ? formattedId : maskedId;

  const handleIdClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullIdShown((prev) => !prev);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`ID ${formattedId}`).catch(() => {});
      setCopiedHint(true);
      setTimeout(() => setCopiedHint(false), 1800);
    }
  };

  // Long-press / Hold detection to open Customizer
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHolding, setIsHolding] = useState(false);

  const startHold = (clientX: number, clientY: number) => {
    if (!interactive) return;
    touchStartPosRef.current = { x: clientX, y: clientY };
    setIsHolding(true);
    holdTimerRef.current = setTimeout(() => {
      setIsHolding(false);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60);
      }
      openCustomizer();
    }, 550);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startHold(t.clientX, t.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(t.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      cancelHold();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startHold(e.clientX, e.clientY);
    }
  };

  return (
    <div className={`stage vnc-stage ${className}`}>
      <div
        id="card"
        className={`card vnc-card ${isHolding ? 'scale-[0.985] transition-transform duration-300' : ''}`}
        style={{
          background: effectiveBackground,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={cancelHold}
        onTouchCancel={cancelHold}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        title={interactive ? 'Giữ thẻ để đổi giao diện' : undefined}
      >
        {/* Shine highlight */}
        <div className="shine vnc-shine" />

        {/* Watermark layer printed on card */}
        <img
          id="wm"
          className="wm vnc-wm"
          alt=""
          src="/watermark.png"
        />

        {/* Card info overlay */}
        <div className="info vnc-info">
          <span className="label vnc-label">{label}</span>
          <span
            className="amount vnc-amount cursor-pointer select-none active:opacity-80 transition-opacity"
            onClick={(e) => {
              if (interactive) {
                e.stopPropagation();
                setShowVnd((prev) => !prev);
              }
            }}
            title="Nhấn để chuyển đổi giữa VNC và VND"
          >
            {displayAmount}
            <small>{displayCurrency}</small>
          </span>
          <span
            className="id vnc-id"
            onClick={handleIdClick}
            title="Nhấn để xem full ID / Sao chép"
          >
            ID {displayIdText}
            {copiedHint && (
              <span className="text-[2.2cqw] text-emerald-300 bg-black/70 px-[1.2cqw] py-[0.2cqw] rounded border border-emerald-400/30 ml-[1cqw] animate-fade-in font-sans">
                Đã chép
              </span>
            )}
          </span>
        </div>

        {/* Quick Customize Action button (only shown if showEditButton is true) */}
        {showEditButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openCustomizer();
            }}
            title="Tùy chỉnh nền thẻ"
            className="absolute top-[5cqw] right-[5cqw] z-10 w-[7cqw] h-[7cqw] rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white/70 hover:text-white flex items-center justify-center transition opacity-60 hover:opacity-100"
          >
            <i className="bi bi-palette text-[3.2cqw]" />
          </button>
        )}
      </div>
    </div>
  );
}

// Fallback generator for guest / offline accounts
function generateDeterministicId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 90000000 + 10000000).toString();
  return `${num.slice(0, 4)} ${num.slice(4)}`;
}

interface BalanceCardCustomizerProps {
  onClose?: () => void;
  className?: string;
}

export function BalanceCardCustomizer({ onClose, className = '' }: BalanceCardCustomizerProps) {
  const {
    cardBg,
    setCardBg,
    resetToDefault,
  } = useCardTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const bgVal = `#050505 url("${reader.result}") center/cover no-repeat`;
        setCardBg(bgVal);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardBg(e.target.value);
  };

  return (
    <section className={`panel vnc-panel ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-line/50">
        <div>
          <h3 className="text-sm font-bold text-ink flex items-center gap-2">
            <i className="bi bi-palette-fill text-indigo" /> Tùy chỉnh thẻ số dư
          </h3>
          <p className="text-[11px] text-muted mt-0.5">
            Chọn màu sắc hoặc tải ảnh nền tùy ý cho thẻ
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface2 border border-line text-muted hover:text-ink flex items-center justify-center transition"
            aria-label="Đóng"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        )}
      </div>

      <div className="row">
        <span>Nền có sẵn</span>
        <div className="swatches" id="swatches">
          {CARD_PRESETS.map((preset) => {
            const isPressed = cardBg === preset.v;
            return (
              <button
                key={preset.n}
                type="button"
                className="sw"
                title={preset.n}
                aria-label={preset.n}
                aria-pressed={isPressed ? 'true' : 'false'}
                style={{ background: preset.v }}
                onClick={() => setCardBg(preset.v)}
              />
            );
          })}
        </div>
      </div>

      <div className="row">
        <span>Nền tùy chỉnh</span>
        <div className="tools">
          <label className="btn" title="Chọn màu đơn sắc">
            <i className="bi bi-eyedropper text-indigo" />
            <span>Chọn màu</span>
            <input
              ref={colorInputRef}
              type="color"
              id="color"
              value={cardBg.startsWith('#') ? cardBg : '#1d4ed8'}
              onChange={handleColorChange}
            />
          </label>

          <label className="btn" title="Tải ảnh nền tùy thích từ thiết bị">
            <i className="bi bi-image text-cyan" />
            <span>Tải ảnh nền</span>
            <input
              ref={fileInputRef}
              type="file"
              id="file"
              accept="image/*"
              onChange={handleFileUpload}
            />
          </label>

          <button
            type="button"
            onClick={resetToDefault}
            className="btn hover:border-amber/50 hover:text-amber transition ml-auto"
            title="Khôi phục nền thẻ card-background.png mặc định"
          >
            <i className="bi bi-arrow-counterclockwise" />
            <span>Mặc định</span>
          </button>
        </div>
      </div>
    </section>
  );
}

export function BalanceCardModal() {
  const { isCustomizerOpen, closeCustomizer } = useCardTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCustomizerOpen) {
        closeCustomizer();
      }
    };
    if (isCustomizerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCustomizerOpen, closeCustomizer]);

  if (!isCustomizerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={closeCustomizer}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-line rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col gap-4 p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo animate-pulse" />
            <h2 className="font-display font-bold text-base text-ink">
              Tùy chỉnh thẻ số dư VNC
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCustomizer}
            className="w-8 h-8 rounded-lg bg-surface2 border border-line text-muted hover:text-ink flex items-center justify-center transition"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="w-full max-w-sm mx-auto my-1">
          <BalanceCard interactive={false} />
        </div>

        {/* Customization Panel */}
        <BalanceCardCustomizer onClose={closeCustomizer} />
      </div>
    </div>
  );
}
