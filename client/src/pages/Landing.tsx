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
    color: 'text-indigo',
    bg: 'bg-indigo/15 border-indigo/25',
  },
  {
    icon: 'bi-fire',
    titleKey: 'landing.feature_daily_title',
    descKey: 'landing.feature_daily_desc',
    badge: 'Streak 7 ngày',
    color: 'text-rose',
    bg: 'bg-rose/15 border-rose/25',
  },
  {
    icon: 'bi-people',
    titleKey: 'landing.feature_referral_title',
    descKey: 'landing.feature_referral_desc',
    badge: 'Hoa hồng 20%',
    color: 'text-cyan',
    bg: 'bg-cyan/15 border-cyan/25',
  },
  {
    icon: 'bi-wallet2',
    titleKey: 'landing.feature_redeem_title',
    descKey: 'landing.feature_redeem_desc',
    badge: 'MoMo / Bank / Thẻ',
    color: 'text-amber',
    bg: 'bg-amber/15 border-amber/25',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Tạo tài khoản',
    desc: 'Đăng ký nhanh chóng chỉ mất 10 giây qua email, Discord hoặc Google.',
    icon: 'bi-person-plus-fill',
  },
  {
    step: '02',
    title: 'Kiếm VDX mỗi ngày',
    desc: 'Vượt liên kết rút gọn, giữ streak điểm danh và quay vòng quay may mắn.',
    icon: 'bi-coin',
  },
  {
    step: '03',
    title: 'Quy đổi ra tiền mặt',
    desc: 'Rút tiền trực tiếp về MoMo, tài khoản ngân hàng hoặc nạp game tức thì.',
    icon: 'bi-cash-coin',
  },
];

export default function Landing() {
  const { lang, toggle: toggleLang, t } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col selection:bg-indigo/30">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/80 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 sm:px-6 h-16">
          <Link to="/" onClick={playClickSound} className="flex items-center gap-2.5 group">
            <div className="relative">
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playClickSound();
                toggleTheme();
              }}
              aria-label="Toggle theme"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-surface2 transition btn-press border border-line/60"
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-amber' : 'bi-moon-stars-fill text-indigo'}`} />
            </button>

            <button
              onClick={() => {
                playClickSound();
                toggleLang();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition px-3 py-2 rounded-xl hover:bg-surface2 border border-line/60 btn-press"
            >
              <i className="bi bi-translate text-sm text-cyan" />
              <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
            </button>

            <Link
              to="/login"
              onClick={playClickSound}
              className="text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo to-indigo/90 hover:brightness-110 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all shadow-md shadow-indigo/20 btn-press ml-1"
            >
              {t('login.title')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-20 space-y-20">
        <div className="text-center max-w-3xl mx-auto relative">
          {/* Subtle aurora background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo/15 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="inline-flex items-center gap-2 bg-surface2/80 border border-indigo/30 rounded-full px-4 py-1.5 text-xs font-semibold text-ink mb-6 shadow-sm">
            <CurrencyIcon size={16} />
            <span className="gradient-text-indigo">VDX Token · VietnamDong Network</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          </div>

          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight sm:leading-tight">
            {t('landing.hero_title')}
          </h1>

          <p className="text-muted mt-5 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('landing.hero_subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 max-w-md mx-auto">
            <Link
              to="/login"
              onClick={playClickSound}
              className="w-full sm:w-auto flex-1 bg-gradient-to-r from-indigo via-indigo/90 to-cyan hover:brightness-110 text-white text-sm font-bold px-7 py-3.5 rounded-2xl transition-all shadow-xl shadow-indigo/25 btn-press flex items-center justify-center gap-2"
            >
              <span>{t('landing.cta_start')}</span>
              <i className="bi bi-arrow-right" />
            </Link>
            <Link
              to="/login"
              onClick={playClickSound}
              className="w-full sm:w-auto flex-1 bg-surface2/90 border border-line hover:bg-line text-sm font-semibold px-6 py-3.5 rounded-2xl transition btn-press text-ink"
            >
              {t('landing.cta_login')}
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-xs text-muted font-medium">
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

        {/* How It Works (3 Steps) */}
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-xs uppercase font-bold text-indigo tracking-wider mb-1">Quy trình đơn giản</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">Bắt đầu kiếm VDX chỉ với 3 bước</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.step} className="glass-card rounded-3xl p-6 relative overflow-hidden group">
                <div className="text-3xl font-mono font-extrabold text-muted/30 mb-3 group-hover:text-indigo/40 transition">
                  {s.step}
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo/15 text-indigo flex items-center justify-center text-lg mb-3">
                  <i className={`bi ${s.icon}`} />
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
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${f.bg} ${f.color} text-xl shadow-sm`}>
                      <i className={`bi ${f.icon}`} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface2 border border-line text-muted">
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-ink group-hover:text-indigo transition">
                    {t(f.titleKey)}
                  </h3>
                  <p className="text-xs text-muted mt-2 leading-relaxed">{t(f.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Banner */}
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 border border-indigo/40 bg-gradient-to-br from-indigo-950 via-surface to-indigo-900 shadow-2xl text-center">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo/30 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div className="relative z-10 max-w-xl mx-auto space-y-5">
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-white">
              Sẵn sàng gia nhập VietnamDong?
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Hàng ngàn thành viên đã và đang kiếm VDX mỗi ngày. Đăng ký ngay để nhận phần quà khởi đầu!
            </p>
            <div>
              <Link
                to="/login"
                onClick={playClickSound}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-display font-bold text-sm bg-white text-black hover:bg-slate-100 shadow-xl transition btn-press"
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
