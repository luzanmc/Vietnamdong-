import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import Footer from '../components/Footer.js';
import { playClickSound } from '../utils/sound.js';

const FEATURE_KEYS = [
  {
    icon: 'bi-link-45deg',
    titleKey: 'landing.feature_tasks_title',
    descKey: 'landing.feature_tasks_desc',
    badge: 'Nhiều link',
    color: 'text-indigo dark:text-cyan',
    bg: 'bg-indigo/15 border-indigo/25 text-indigo dark:text-cyan',
  },
  {
    icon: 'bi-fire',
    titleKey: 'landing.feature_daily_title',
    descKey: 'landing.feature_daily_desc',
    badge: 'Streak 7 ngày',
    color: 'text-rose',
    bg: 'bg-rose/15 border-rose/25 text-rose',
  },
  {
    icon: 'bi-people',
    titleKey: 'landing.feature_referral_title',
    descKey: 'landing.feature_referral_desc',
    badge: 'Hoa hồng 20%',
    color: 'text-cyan',
    bg: 'bg-cyan/15 border-cyan/25 text-cyan',
  },
  {
    icon: 'bi-wallet2',
    titleKey: 'landing.feature_redeem_title',
    descKey: 'landing.feature_redeem_desc',
    badge: 'MoMo / Bank / Thẻ',
    color: 'text-amber',
    bg: 'bg-amber/15 border-amber/25 text-amber',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Tạo tài khoản nhanh',
    desc: 'Đăng ký trong 10 giây qua email, Discord hoặc tài khoản Google cá nhân.',
    icon: 'bi-person-plus-fill',
    badge: 'Bước 1',
  },
  {
    step: '02',
    title: 'Tích lũy VDX mỗi ngày',
    desc: 'Vượt link rút gọn bảo mật, điểm danh giữ streak và quay vòng quay may mắn.',
    icon: 'bi-coin',
    badge: 'Bước 2',
  },
  {
    step: '03',
    title: 'Quy đổi ra tiền mặt',
    desc: 'Rút tiền trực tiếp về ví MoMo, tài khoản ngân hàng hoặc nạp thẻ game siêu tốc.',
    icon: 'bi-cash-coin',
    badge: 'Bước 3',
  },
];

const LIVE_CASHOUTS = [
  { user: 'minh***92', amount: '50.000đ', method: 'MoMo', time: '1 phút trước' },
  { user: 'hoang***pro', amount: '100.000đ', method: 'Vietcombank', time: '3 phút trước' },
  { user: 'thanh***88', amount: '20.000đ', method: 'MBBank', time: '6 phút trước' },
  { user: 'lan***vdx', amount: '50.000đ', method: 'MoMo', time: '9 phút trước' },
];

export default function Landing() {
  const { lang, toggle: toggleLang, t } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();

  // Interactive Earnings Calculator State
  const [linksPerDay, setLinksPerDay] = useState(6);
  const [hasStreak, setHasStreak] = useState(true);
  const [referrals, setReferrals] = useState(3);
  const linksInputId = useId();
  const referralsInputId = useId();

  // Estimate: ~2 VDX per link + ~3 VDX/day from streak & spin + 20% of referrals (~1.2 VDX/ref/day)
  const estimatedDailyVdx = Math.round(
    linksPerDay * 2 + (hasStreak ? 3.5 : 1) + referrals * 1.5
  );
  const estimatedMonthlyVnd = Math.round(estimatedDailyVxdToVnd(estimatedDailyVdx * 30));

  function estimatedDailyVxdToVnd(vdx: number) {
    return vdx * 1000;
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col selection:bg-indigo/30 relative overflow-x-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-indigo/15 rounded-full blur-[120px] -z-10 pointer-events-none animate-glow-pulse" />
      <div className="absolute top-[800px] -right-20 w-[500px] h-[500px] bg-cyan/10 rounded-full blur-[140px] -z-10 pointer-events-none animate-float-smooth" />
      <div className="absolute top-[1600px] -left-20 w-[500px] h-[500px] bg-amber/10 rounded-full blur-[140px] -z-10 pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/85 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 sm:px-6 h-16">
          <Link to="/" onClick={playClickSound} className="flex items-center gap-2.5 group shrink-0">
            <div className="relative shrink-0">
              <img
                src="/logo-mark.png"
                alt="VietnamDong"
                className="w-8 h-8 transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 rounded-full bg-indigo/25 blur-md -z-10" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-base tracking-tight gradient-text-indigo leading-none">
                VietnamDong
              </span>
              <span className="text-[9px] font-mono text-muted uppercase tracking-widest leading-none mt-0.5">
                Reward Platform
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                playClickSound();
                toggleTheme();
              }}
              aria-label="Đổi giao diện"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-surface2 transition btn-press border border-line/60 shrink-0"
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-amber' : 'bi-moon-stars-fill text-indigo'}`} />
            </button>

            <button
              onClick={() => {
                playClickSound();
                toggleLang();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition px-3 py-2 rounded-xl hover:bg-surface2 border border-line/60 btn-press shrink-0"
            >
              <i className="bi bi-translate text-sm text-cyan" />
              <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
            </button>

            <Link
              to="/login"
              onClick={playClickSound}
              className="text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo via-indigo/90 to-cyan hover:brightness-110 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all shadow-md shadow-indigo/25 hover:shadow-[0_0_20px_rgba(108,99,245,0.4)] btn-press ml-1 shrink-0"
            >
              {t('login.title')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20 space-y-20">
        <div className="text-center max-w-3xl mx-auto relative animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-surface2/90 border border-indigo/30 rounded-full px-4 py-1.5 text-xs font-semibold text-ink mb-6 shadow-sm">
            <CurrencyIcon size={16} />
            <span className="gradient-text-indigo font-bold">VDX Network · Nền tảng tích lũy điểm thưởng Việt Nam</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          </div>

          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight sm:leading-tight">
            {t('landing.hero_title')}
          </h1>

          <p className="text-muted mt-5 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('landing.hero_subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 max-w-md mx-auto">
            <Link
              to="/login"
              onClick={playClickSound}
              className="w-full sm:w-auto flex-1 bg-gradient-to-r from-indigo via-indigo/90 to-cyan hover:brightness-110 text-white text-sm font-bold px-7 py-3.5 rounded-2xl transition-all shadow-xl shadow-indigo/25 hover:shadow-[0_0_25px_rgba(108,99,245,0.45)] btn-press flex items-center justify-center gap-2"
            >
              <span>{t('landing.cta_start')}</span>
              <i className="bi bi-arrow-right" />
            </Link>
            <Link
              to="/login"
              onClick={playClickSound}
              className="w-full sm:w-auto flex-1 bg-surface2/90 border border-line hover:border-indigo/40 text-sm font-semibold px-6 py-3.5 rounded-2xl transition btn-press text-ink"
            >
              {t('landing.cta_login')}
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-10 text-xs text-muted font-medium">
            <span className="flex items-center gap-1.5">
              <i className="bi bi-shield-check text-cyan text-sm" /> {t('landing.trust_secure')}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="bi bi-patch-check-fill text-indigo text-sm" /> {t('landing.trust_admin')}
            </span>
            <span className="flex items-center gap-1.5">
              <i className="bi bi-clock-history text-amber text-sm" /> {t('landing.trust_transparent')}
            </span>
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-card rounded-2xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold gradient-text-indigo">50,000+</div>
            <div className="text-xs text-muted mt-1 font-medium">Thành viên tham gia</div>
          </div>
          <div className="glass-card rounded-2xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold gradient-text-gold">2.5M+ VDX</div>
            <div className="text-xs text-muted mt-1 font-medium">Đã thanh toán thành công</div>
          </div>
          <div className="glass-card rounded-2xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold gradient-text-fire">&lt; 3 Phút</div>
            <div className="text-xs text-muted mt-1 font-medium">Tốc độ rút tiền MoMo / ATM</div>
          </div>
          <div className="glass-card rounded-2xl p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold text-cyan">100%</div>
            <div className="text-xs text-muted mt-1 font-medium">Miễn phí tham gia trọn đời</div>
          </div>
        </div>

        {/* Interactive Earnings Calculator */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-line shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-5 w-full">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber/15 text-amber border border-amber/30 mb-2">
                  <i className="bi bi-calculator" />
                  <span>Ước tính thu nhập</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  Bạn có thể tích lũy bao nhiêu mỗi tháng?
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  Kéo thanh trượt bên dưới để ước tính số tiền bạn có thể rút về tài khoản.
                </p>
              </div>

              {/* Slider 1: Tasks per day */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <label htmlFor={linksInputId} className="text-muted">Số link vượt mỗi ngày</label>
                  <span className="font-mono text-indigo dark:text-cyan font-bold">{linksPerDay} nhiệm vụ</span>
                </div>
                <input
                  id={linksInputId}
                  type="range"
                  min="1"
                  max="20"
                  value={linksPerDay}
                  onChange={(e) => setLinksPerDay(Number(e.target.value))}
                  className="w-full accent-indigo cursor-pointer"
                />
              </div>

              {/* Slider 2: Referrals */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <label htmlFor={referralsInputId} className="text-muted">Bạn bè giới thiệu</label>
                  <span className="font-mono text-amber font-bold">{referrals} bạn bè (+20% hoa hồng)</span>
                </div>
                <input
                  id={referralsInputId}
                  type="range"
                  min="0"
                  max="20"
                  value={referrals}
                  onChange={(e) => setReferrals(Number(e.target.value))}
                  className="w-full accent-amber cursor-pointer"
                />
              </div>

              {/* Checkbox Streak */}
              <label className="flex items-center gap-2.5 text-xs text-ink cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={hasStreak}
                  onChange={(e) => setHasStreak(e.target.checked)}
                  className="accent-rose w-4 h-4 rounded cursor-pointer"
                />
                <span className="font-medium">Giữ chuỗi điểm danh 7 ngày liên tục (x2 quà mốc cuối)</span>
              </label>
            </div>

            {/* Calculated Output Card */}
            <div className="w-full lg:w-80 glass-card rounded-2xl p-6 text-center border-2 border-indigo/40 shadow-xl flex flex-col justify-between shrink-0">
              <div className="text-xs uppercase font-bold text-muted tracking-wider mb-2">
                Dự kiến tích lũy mỗi tháng
              </div>
              <div className="my-3">
                <div className="font-mono text-3xl sm:text-4xl font-extrabold gradient-text-gold">
                  ~{estimatedMonthlyVnd.toLocaleString('vi-VN')}đ
                </div>
                <div className="text-xs text-muted mt-1 font-mono flex items-center justify-center gap-1.5">
                  <CurrencyIcon size={14} />
                  <span>≈ {estimatedDailyVdx * 30} VDX / tháng</span>
                </div>
              </div>
              <p className="text-[11px] text-muted leading-relaxed mb-4">
                Quy đổi trực tiếp ra tiền mặt MoMo, Ngân hàng hoặc thẻ cào bất cứ lúc nào!
              </p>
              <Link
                to="/login"
                onClick={playClickSound}
                className="w-full py-3 rounded-xl font-display font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo to-cyan hover:brightness-110 text-white shadow-md transition btn-press flex items-center justify-center gap-2"
              >
                <span>Bắt đầu kiếm ngay</span>
                <i className="bi bi-arrow-right" />
              </Link>
            </div>
          </div>
        </div>

        {/* How It Works (3 Steps) */}
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-xs uppercase font-bold text-indigo dark:text-cyan tracking-wider mb-1">Quy trình đơn giản</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">Bắt đầu kiếm VDX chỉ với 3 bước</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.step} className="glass-card rounded-3xl p-6 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-indigo/15 border border-indigo/25 text-indigo dark:text-cyan flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                    <i className={`bi ${s.icon}`} />
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-surface2 border border-line text-muted">
                    {s.badge}
                  </span>
                </div>
                <h3 className="font-bold text-base text-ink mb-1">{s.title}</h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-xs uppercase font-bold text-cyan tracking-wider mb-1">Tính năng vượt trội</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">Đa dạng cách thức gia tăng thu nhập</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURE_KEYS.map((f) => (
              <div
                key={f.titleKey}
                className="glass-card rounded-3xl p-6 flex flex-col justify-between group hover:-translate-y-1 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${f.bg} text-xl shadow-sm shrink-0`}>
                      <i className={`bi ${f.icon}`} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface2 border border-line text-muted">
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-ink group-hover:text-indigo dark:group-hover:text-cyan transition">
                    {t(f.titleKey)}
                  </h3>
                  <p className="text-xs text-muted mt-2 leading-relaxed">{t(f.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Live Cashouts Ticker */}
        <div className="glass-card rounded-3xl p-6 border border-line">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-sm text-ink">Giao dịch quy đổi gần đây</h3>
            </div>
            <span className="text-[11px] text-muted font-mono">Tự động cập nhật 24/7</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LIVE_CASHOUTS.map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface2/60 border border-line/60 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-semibold text-ink">{c.user}</div>
                  <div className="text-[10px] text-muted">{c.method} · {c.time}</div>
                </div>
                <div className="font-mono text-xs font-bold text-emerald-500">
                  +{c.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Banner (High contrast dark background that stays readable in both themes) */}
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 shadow-2xl text-center text-white">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo/25 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="relative z-10 max-w-xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-cyan border border-white/20">
              <i className="bi bi-rocket-takeoff-fill" />
              <span>Gia nhập cộng đồng người dùng</span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white">
              Sẵn sàng gia nhập VietnamDong?
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Hàng ngàn thành viên đã và đang kiếm VDX mỗi ngày. Đăng ký ngay để nhận phần quà khởi đầu!
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                onClick={playClickSound}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-display font-bold text-sm bg-white text-black hover:bg-slate-100 shadow-xl hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition btn-press"
              >
                <span>Bắt đầu ngay hôm nay</span>
                <i className="bi bi-arrow-right" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
