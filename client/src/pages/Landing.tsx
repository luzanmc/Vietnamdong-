import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { playClickSound } from '../utils/sound.js';

interface FeedItem {
  id: number;
  who: string;
  gainText: string;
  isWithdrawal: boolean;
  way?: string;
}

const GAINS = [100, 300, 100, 1000, 300, 100, 300];
const NAMES = ['minh***', 'hoa_dev', 'kaz99', 'thanh***', 'bao_nl', 'lan***', 'duy***', 'nhi_01'];
const WAYS = ['Ví MoMo', 'Ngân hàng', 'Thẻ cào'];
const OUTS = [20000, 50000, 100000, 200000, 50000];

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const REVIEWS = [
  ['Minh Khoa', 'Thành viên 3 tháng', 'Rút thẻ cào lần đầu được xử lý trong ngày, đúng như hệ thống ghi. Mỗi tối mình vượt khoảng 30 link.'],
  ['Trung Hiếu', 'Thành viên mới', 'Giao diện dễ dùng, vượt link xong là Xu cộng ngay vào ví, không phải chờ lâu.'],
  ['Lan Anh', 'Giới thiệu bạn bè', 'Hoa hồng giới thiệu hiện rõ trong dashboard, bạn bè đăng ký là thấy cập nhật liền.'],
  ['Quốc Bảo', 'Rút qua ngân hàng', 'Yêu cầu rút có trạng thái từng bước nên mình biết chắc tiền đang ở đâu.'],
  ['Thanh Nhi', 'Vượt link mỗi ngày', 'Bảng Xu rõ ràng, lúc rảnh mình chọn danh mục cao cấp, lúc vội thì vượt danh mục cơ bản.'],
  ['Duy Anh', 'Thành viên 1 tháng', 'Hỗ trợ trả lời qua Zalo rất nhanh, lần mình gặp lỗi cộng Xu được xử lý trong vài phút.'],
  ['Hoài Nam', 'Thành viên mới', 'Không cần thẻ hay mất phí gì, chỉ cần tài khoản. Muốn dừng lúc nào cũng được.'],
  ['Mai Phương', 'Đổi thẻ cào', 'Đổi Xu lấy thẻ cào thuận tiện, mức rút tối thiểu thấp nên mình rút thường xuyên.']
];

const FAQS = [
  {
    q: 'Vượt link có mất phí không?',
    a: 'Không. Đăng ký và vượt link hoàn toàn miễn phí, bạn chỉ cần một tài khoản để nhận Xu.'
  },
  {
    q: 'Sau khi vượt link bao lâu thì có Xu?',
    a: 'Xu được cộng tự động ngay khi hệ thống ghi nhận bạn vượt link thành công.'
  },
  {
    q: 'Rút tiền tối thiểu là bao nhiêu?',
    a: 'Mức tối thiểu là 20.000 Xu. Khi đủ điều kiện, bạn gửi yêu cầu trong trang Rút tiền và theo dõi trạng thái từng bước.'
  },
  {
    q: 'Yêu cầu rút tiền được xử lý bao lâu?',
    a: 'Mỗi yêu cầu đều do admin duyệt theo thứ tự. Trạng thái hiển thị trong dashboard để bạn biết tiền đang ở bước nào.'
  },
  {
    q: 'Tôi được tạo mấy tài khoản?',
    a: 'Mỗi người chỉ nên dùng một tài khoản. Tài khoản gian lận lượt vượt link có thể bị khoá và trừ Xu.'
  },
  {
    q: 'Giới thiệu bạn bè có được thưởng không?',
    a: 'Có. Bạn nhận hoa hồng từ hoạt động của người đăng ký qua link giới thiệu riêng của mình.'
  }
];

export default function Landing() {
  const { me } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLanguage();

  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [total, setTotal] = useState(() => (me?.balance_nova !== undefined ? me.balance_nova : 128450));
  const [feedItems, setFeedItems] = useState<FeedItem[]>(() => [
    { id: 1, who: 'minh***', gainText: '50.000đ', isWithdrawal: true, way: 'Ví MoMo' },
    { id: 2, who: 'kaz99', gainText: '+300 Xu', isWithdrawal: false },
    { id: 3, who: 'bao_nl', gainText: '100.000đ', isWithdrawal: true, way: 'Ngân hàng' },
    { id: 4, who: 'nhi_01', gainText: '+1.000 Xu', isWithdrawal: false }
  ]);

  const feedIdRef = useRef(5);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update total if user balance changes
  useEffect(() => {
    if (me?.balance_nova !== undefined) {
      setTotal(me.balance_nova);
    }
  }, [me?.balance_nova]);

  // Periodic feed generator
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = setInterval(() => {
      const isW = Math.random() < 0.7;
      const gainVal = pick(GAINS);
      const newItem: FeedItem = {
        id: feedIdRef.current++,
        who: pick(NAMES),
        isWithdrawal: isW,
        gainText: isW ? `${fmt(pick(OUTS))}đ` : `+${fmt(gainVal)} Xu`,
        way: isW ? pick(WAYS) : undefined
      };

      setTotal((prev) => prev + gainVal);
      setFeedItems((prev) => [newItem, ...prev.slice(0, 3)]);
    }, 2600);

    return () => clearInterval(interval);
  }, []);

  // IntersectionObserver scroll reveal
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const els = root.querySelectorAll('.rv');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      els.forEach((e) => io.observe(e));
      return () => io.disconnect();
    } else {
      els.forEach((e) => e.classList.add('in'));
    }
  }, []);

  // Auth destination helper
  const dashboardLink = '/dashboard';
  const loginLink = '/login';
  const registerLink = '/register';

  const ctaPrimaryLink = me ? dashboardLink : registerLink;
  const ctaSecondaryLink = me ? dashboardLink : loginLink;

  return (
    <div ref={containerRef} className="vnd-landing-wrapper min-h-screen text-slate-100 selection:bg-indigo-500/30">
      <style>{`
        .vnd-landing-wrapper {
          --bg: #080b14;
          --panel: #101522;
          --panel2: #151d2e;
          --line: #252d41;
          --text: #f4f7ff;
          --muted: #9ba8c0;
          --blue: #55a7ff;
          --purple: #a47bff;
          --green: #62f0bd;
          --glow: #1b1740;
          --bar: #080b14d9;
          background: radial-gradient(ellipse at 80% 0, var(--glow) 0, transparent 34%), var(--bg);
          color: var(--text);
          font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
        }
        [data-theme="light"] .vnd-landing-wrapper {
          --bg: #f6f7fb;
          --panel: #fff;
          --panel2: #f0f2f8;
          --line: #dfe3ee;
          --text: #0e1424;
          --muted: #566177;
          --blue: #2f7fe6;
          --purple: #7a53e6;
          --green: #0d9f73;
          --glow: #e3e0ff;
          --bar: #f6f7fbd9;
        }
        .vnd-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 max(calc((100vw - 1180px)/2), 24px);
          border-bottom: 1px solid var(--line);
          background: var(--bar);
          backdrop-filter: blur(18px);
        }
        .vnd-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 0 17px;
          background: transparent;
          color: var(--text);
          font-weight: 600;
          font-size: 14px;
          transition: transform .18s, border-color .18s, filter .18s;
          cursor: pointer;
        }
        .vnd-btn:hover {
          transform: translateY(-1px);
          border-color: var(--muted);
        }
        .vnd-btn-primary {
          border: 0;
          color: #fff;
          background: linear-gradient(115deg, #3988ff, #825cf6);
          box-shadow: 0 8px 25px rgba(98, 85, 239, 0.2);
        }
        .vnd-btn-primary:hover {
          filter: brightness(1.12);
        }
        .vnd-grad {
          background: linear-gradient(90deg, #64b5ff, #a47bff 65%, #da8cff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .vnd-art {
          width: 100%;
          position: relative;
          isolation: isolate;
          display: grid;
          place-items: center;
          height: 350px;
          overflow: hidden;
          perspective: 1000px;
        }
        .vnd-art::before, .vnd-art::after {
          content: "";
          position: absolute;
          z-index: -1;
          left: 50%;
          top: 50%;
          width: 330px;
          height: 330px;
          border: 1px solid rgba(110, 145, 255, 0.3);
          border-radius: 50%;
          pointer-events: none;
          transform-style: preserve-3d;
        }
        .vnd-art::before {
          animation: vndRingA 12s linear infinite;
          box-shadow: 0 0 22px rgba(100, 110, 255, 0.08);
        }
        .vnd-art::after {
          width: 285px;
          height: 285px;
          border-color: rgba(180, 105, 255, 0.32);
          animation: vndRingB 9s linear infinite;
        }
        @keyframes vndRingA {
          from { transform: translate(-50%, -50%) rotateX(65deg) rotateZ(0deg); }
          to { transform: translate(-50%, -50%) rotateX(65deg) rotateZ(360deg); }
        }
        @keyframes vndRingB {
          from { transform: translate(-50%, -50%) rotateY(65deg) rotateZ(0deg); }
          to { transform: translate(-50%, -50%) rotateY(65deg) rotateZ(-360deg); }
        }
        .vnd-glass-card {
          position: relative;
          width: 270px;
          height: 238px;
          border: 1px solid rgba(165, 180, 252, 0.35);
          border-radius: 24px;
          background: linear-gradient(145deg, rgba(37, 42, 77, 0.8), rgba(17, 22, 37, 0.87));
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.4), 0 0 65px rgba(129, 140, 248, 0.12);
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          backdrop-filter: blur(12px);
          transform-style: preserve-3d;
          transform-origin: center;
          animation: vndCardSpin 7s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes vndCardSpin {
          0%, 100% { transform: rotateX(0deg) rotateY(-9deg) rotateZ(-3deg) translateY(0); }
          25% { transform: rotateX(5deg) rotateY(7deg) rotateZ(0deg) translateY(-9px); }
          50% { transform: rotateX(-3deg) rotateY(12deg) rotateZ(3deg) translateY(-4px); }
          75% { transform: rotateX(4deg) rotateY(-5deg) rotateZ(0deg) translateY(-10px); }
        }
        .vnd-glass-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(115deg, transparent 20%, rgba(255, 255, 255, 0.12) 45%, transparent 65%);
          background-size: 220% 100%;
          animation: vndCardShine 5s ease-in-out infinite;
        }
        @keyframes vndCardShine {
          0%, 100% { background-position: 150% 0; }
          50% { background-position: -80% 0; }
        }
        .vnd-orbit {
          position: absolute;
          border: 1px solid rgba(123, 143, 255, 0.22);
          border-radius: 50%;
          transform: rotate(-20deg);
          pointer-events: none;
        }
        .vnd-orbit-one { width: 380px; height: 230px; }
        .vnd-orbit-two { width: 310px; height: 360px; transform: rotate(50deg); }
        .vnd-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 12px var(--green);
          animation: vndPulseAnim 1.8s infinite;
        }
        @keyframes vndPulseAnim {
          50% { opacity: 0.35; }
        }
        .vnd-feed-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px 13px;
          background: var(--bg);
          font-size: 13px;
          animation: vndDropAnim .5s ease;
        }
        @keyframes vndDropAnim {
          from { opacity: 0; transform: translateY(-10px); }
        }
        .vnd-marq {
          display: grid;
          gap: 16px;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
        }
        .vnd-track {
          display: flex;
          gap: 16px;
          width: max-content;
          animation: vndSlideAnim 50s linear infinite;
        }
        .vnd-track.rev {
          animation-direction: reverse;
          animation-duration: 58s;
        }
        .vnd-marq:hover .vnd-track {
          animation-play-state: paused;
        }
        @keyframes vndSlideAnim {
          to { transform: translateX(calc(-50% - 8px)); }
        }
        .rv {
          opacity: 0;
          transform: translateY(26px);
          transition: opacity .7s ease var(--d, 0s), transform .7s ease var(--d, 0s);
        }
        .rv.in {
          opacity: 1;
          transform: none;
        }
      `}</style>

      {/* Topbar */}
      <header className="vnd-topbar">
        <Link to="/" onClick={playClickSound} className="flex items-center gap-2.5 shrink-0 group">
          <span className="grid place-items-center w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-blue-400 to-indigo-400 text-slate-900 font-bold text-xl shadow-[0_0_28px_rgba(129,140,248,0.3)]">
            V
          </span>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-wider text-[var(--text)] group-hover:text-blue-400 transition-colors">
              VIETNAMDONG
            </span>
            <span className="text-[8px] font-semibold tracking-[2.5px] text-[var(--muted)] -mt-0.5 hidden xs:block">
              VƯỢT LINK · KIẾM XU
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--muted)]">
          <a href="#tinh-nang" className="hover:text-[var(--text)] transition-colors">Tính năng</a>
          <a href="#cach-kiem" className="hover:text-[var(--text)] transition-colors">Cách kiếm</a>
          <a href="#bang-xu" className="hover:text-[var(--text)] transition-colors">Bảng Xu</a>
          <a href="#danh-gia" className="hover:text-[var(--text)] transition-colors">Đánh giá</a>
          <a href="#faq" className="hover:text-[var(--text)] transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme & Lang Controls */}
          <button
            onClick={() => { playClickSound(); toggleTheme(); }}
            className="w-9 h-9 rounded-xl border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel2)] transition-colors"
            aria-label="Toggle Theme"
          >
            <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-amber-400' : 'bi-moon-stars-fill text-indigo-400'}`} />
          </button>

          <button
            onClick={() => { playClickSound(); toggleLang(); }}
            className="px-2.5 h-9 rounded-xl border border-[var(--line)] flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel2)] transition-colors"
          >
            <i className="bi bi-translate text-cyan-400" />
            <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
          </button>

          {/* Dynamic Auth Action Buttons */}
          {me ? (
            <Link
              to="/dashboard"
              onClick={playClickSound}
              className="vnd-btn vnd-btn-primary"
            >
              <i className="bi bi-grid-1x2-fill mr-1" />
              <span>{me.username || 'Bảng điều khiển'}</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                onClick={playClickSound}
                className="vnd-btn hidden sm:inline-flex"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                onClick={playClickSound}
                className="vnd-btn vnd-btn-primary"
              >
                Đăng ký miễn phí
              </Link>
            </>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden vnd-btn px-2.5 w-10"
            aria-label="Menu"
          >
            <i className={`bi ${menuOpen ? 'bi-x-lg' : 'bi-list'} text-lg`} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="md:hidden border-b border-[var(--line)] bg-[var(--panel)] px-6 py-4 flex flex-col gap-3 text-sm z-30">
          <a href="#tinh-nang" onClick={() => setMenuOpen(false)} className="py-2 border-b border-[var(--line)] text-[var(--muted)]">Tính năng</a>
          <a href="#cach-kiem" onClick={() => setMenuOpen(false)} className="py-2 border-b border-[var(--line)] text-[var(--muted)]">Cách kiếm</a>
          <a href="#bang-xu" onClick={() => setMenuOpen(false)} className="py-2 border-b border-[var(--line)] text-[var(--muted)]">Bảng Xu</a>
          <a href="#danh-gia" onClick={() => setMenuOpen(false)} className="py-2 border-b border-[var(--line)] text-[var(--muted)]">Đánh giá</a>
          <a href="#faq" onClick={() => setMenuOpen(false)} className="py-2 text-[var(--muted)]">FAQ</a>
          {!me && (
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="vnd-btn flex-1 text-center" onClick={() => setMenuOpen(false)}>Đăng nhập</Link>
              <Link to="/register" className="vnd-btn vnd-btn-primary flex-1 text-center" onClick={() => setMenuOpen(false)}>Đăng ký</Link>
            </div>
          )}
        </div>
      )}

      {/* Hero Section */}
      <main className="max-w-[1180px] mx-auto px-6 pt-8 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-8 lg:py-16">
          {/* Copy Column */}
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2.5 border border-[var(--line)] bg-[var(--panel)] rounded-full px-3.5 py-1.5 text-xs text-[var(--muted)]">
              <span className="vnd-pulse" />
              <span>Hệ thống tự động hoạt động 24/7</span>
            </span>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Vượt link,<br />
              <span className="vnd-grad">kiếm Xu mỗi ngày</span>
            </h1>

            <p className="text-[var(--muted)] text-base sm:text-lg max-w-xl leading-relaxed">
              Mở link, vượt trang quảng cáo trong vài giây và nhận Xu ngay. Đổi Xu lấy thẻ cào hoặc rút tiền về ví, hoàn toàn miễn phí.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={ctaPrimaryLink}
                onClick={playClickSound}
                className="vnd-btn vnd-btn-primary px-6 py-3.5 text-base"
              >
                <span>{me ? 'Vào Bảng điều khiển' : 'Bắt đầu kiếm Xu'}</span>
                <i className="bi bi-arrow-right ml-1" />
              </Link>
              <Link
                to={ctaSecondaryLink}
                onClick={playClickSound}
                className="vnd-btn px-6 py-3.5 text-base"
              >
                {me ? 'Bảng điều khiển' : 'Đăng nhập'}
              </Link>
            </div>

            <p className="text-xs sm:text-sm text-[var(--muted)] pt-2">
              Mỗi lượt vượt link từ <b className="text-[var(--text)] font-bold text-base sm:text-lg font-mono">+100 Xu</b> · rút tối thiểu 20.000 Xu
            </p>
          </div>

          {/* 3D Visual Art Column */}
          <div className="vnd-art">
            <div className="vnd-orbit vnd-orbit-one" />
            <div className="vnd-orbit vnd-orbit-two" />
            
            <div className="vnd-glass-card">
              <div className="flex justify-between items-center text-[11px] tracking-wider text-slate-300">
                <span>VIETNAMDONG / VNC</span>
                <span className="text-[var(--green)] font-semibold flex items-center gap-1.5">
                  <span className="vnd-pulse" /> LIVE
                </span>
              </div>

              <div className="m-auto font-bold text-6xl tracking-tighter text-blue-100 drop-shadow-[0_0_35px_rgba(119,170,255,0.7)] font-mono">
                V<span className="text-purple-400">NC</span>
              </div>

              <div className="flex justify-between items-center text-xs tracking-wider text-slate-300">
                <span>Ví Xu {me ? `(${me.username})` : ''}</span>
                <span><b className="text-white text-base font-bold font-mono">{fmt(total)}</b> Xu</span>
              </div>
            </div>

            <div className="absolute top-10 left-0 z-10 flex items-center gap-2 px-3.5 py-2.5 border border-[var(--line)] bg-[var(--panel)]/90 backdrop-blur-md rounded-xl text-xs font-bold shadow-2xl">
              <i className="bi bi-link-45deg text-[var(--blue)] text-base" />
              <span>Vượt link tự động</span>
            </div>
            <div className="absolute bottom-8 right-0 z-10 flex items-center gap-2 px-3.5 py-2.5 border border-[var(--line)] bg-[var(--panel)]/90 backdrop-blur-md rounded-xl text-xs font-bold shadow-2xl">
              <i className="bi bi-lightning-charge-fill text-[var(--blue)] text-base" />
              <span>Rút tiền về ví trong ngày</span>
            </div>
          </div>
        </div>

        {/* Stats Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-6 my-16 gap-6 rv">
          <div className="space-y-1">
            <b className="block text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[var(--text)]">12.480</b>
            <span className="text-xs sm:text-sm text-[var(--muted)]">Thành viên</span>
          </div>
          <div className="space-y-1 md:border-l md:border-[var(--line)] md:pl-6">
            <b className="block text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[var(--text)]">1,2 triệu</b>
            <span className="text-xs sm:text-sm text-[var(--muted)]">Lượt vượt link</span>
          </div>
          <div className="space-y-1 md:border-l md:border-[var(--line)] md:pl-6">
            <b className="block text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[var(--text)]">48 triệu</b>
            <span className="text-xs sm:text-sm text-[var(--muted)]">Xu đã chi trả</span>
          </div>
          <div className="space-y-1 md:border-l md:border-[var(--line)] md:pl-6">
            <b className="block text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-[var(--text)]">24/7</b>
            <span className="text-xs sm:text-sm text-[var(--muted)]">Hỗ trợ & hoạt động</span>
          </div>
        </div>

        {/* Features Section */}
        <section id="tinh-nang" className="py-14">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 text-[var(--blue)] rounded-full px-3 py-1 text-xs font-semibold">
              <i className="bi bi-star-fill text-xs" /> Tính năng
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Mọi thứ bạn cần để kiếm Xu</h2>
            <p className="text-sm text-[var(--muted)]">Hệ thống lo phần còn lại: cộng Xu, ghi lịch sử, xử lý rút tiền.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: 'bi-link-45deg', title: 'Vượt link nhận Xu', desc: 'Chọn danh mục, mở link và vượt quảng cáo. Xu vào ví ngay khi hoàn thành lượt.' },
              { icon: 'bi-cash-coin', title: 'Rút tiền linh hoạt', desc: 'Đổi Xu lấy thẻ cào hoặc rút tiền mặt. Mỗi yêu cầu đều theo dõi được trạng thái.' },
              { icon: 'bi-graph-up-arrow', title: 'Thống kê minh bạch', desc: 'Lịch sử vượt link, biến động số dư và tổng Xu đã kiếm đều hiện rõ trong dashboard.' },
              { icon: 'bi-shield-check', title: 'Bảo mật tài khoản', desc: 'Nhật ký đăng nhập và công cụ bảo mật giúp tài khoản luôn nằm trong tay bạn.' },
              { icon: 'bi-people-fill', title: 'Giới thiệu nhận hoa hồng', desc: 'Gửi link giới thiệu riêng cho bạn bè và nhận hoa hồng từ hoạt động của họ.' },
              { icon: 'bi-headset', title: 'Hỗ trợ tận tâm', desc: 'Gặp vấn đề khi vượt link hoặc rút tiền, đội hỗ trợ trả lời nhanh qua Zalo và Ticket.' }
            ].map((f, i) => (
              <div key={i} className="border border-[var(--line)] rounded-2xl p-6 bg-gradient-to-br from-[var(--panel2)] to-[var(--panel)] rv space-y-3">
                <div className="w-11 h-11 rounded-xl grid place-items-center bg-[var(--bg)] border border-[var(--line)] text-xl text-[var(--blue)]">
                  <i className={`bi ${f.icon}`} />
                </div>
                <h3 className="text-base font-bold text-[var(--text)]">{f.title}</h3>
                <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps Section */}
        <section id="cach-kiem" className="py-14">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 text-[var(--blue)] rounded-full px-3 py-1 text-xs font-semibold">
              <i className="bi bi-signpost-split-fill text-xs" /> Cách hoạt động
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Kiếm Xu chỉ với 3 bước</h2>
            <p className="text-sm text-[var(--muted)]">Không cần kỹ năng đặc biệt. Lượt đầu tiên chỉ mất vài phút.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-[var(--line)] rounded-2xl overflow-hidden bg-[var(--panel)] rv">
            <div className="p-7 space-y-2">
              <i className="text-xs font-bold text-[var(--blue)] font-mono not-italic uppercase tracking-wider block">Bước 1</i>
              <h3 className="text-lg font-bold text-[var(--text)]">Tạo tài khoản</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)]">Chỉ cần tên đăng nhập và email. Không mất phí, không ràng buộc.</p>
            </div>
            <div className="p-7 space-y-2 md:border-l md:border-[var(--line)]">
              <i className="text-xs font-bold text-[var(--blue)] font-mono not-italic uppercase tracking-wider block">Bước 2</i>
              <h3 className="text-lg font-bold text-[var(--text)]">Chọn danh mục & vượt link</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)]">Mở link trong danh mục bạn thích và làm theo hướng dẫn trên trang quảng cáo.</p>
            </div>
            <div className="p-7 space-y-2 md:border-l md:border-[var(--line)]">
              <i className="text-xs font-bold text-[var(--blue)] font-mono not-italic uppercase tracking-wider block">Bước 3</i>
              <h3 className="text-lg font-bold text-[var(--text)]">Nhận Xu & rút tiền</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)]">Xu tự cộng vào ví. Đủ mức tối thiểu là bạn đổi thẻ cào hoặc rút tiền ngay.</p>
            </div>
          </div>
        </section>

        {/* Rates Section */}
        <section id="bang-xu" className="py-14">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 text-[var(--blue)] rounded-full px-3 py-1 text-xs font-semibold">
              <i className="bi bi-coin text-xs" /> Bảng Xu
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Phần thưởng từng danh mục</h2>
            <p className="text-sm text-[var(--muted)]">Giá trị Xu mỗi lượt đang áp dụng cho từng loại link.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rv">
            <div className="border border-[var(--line)] rounded-2xl p-6 bg-[var(--panel)] flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-[var(--text)]">Danh mục cơ bản</h3>
                <div className="text-3xl font-extrabold text-[var(--green)] font-mono">
                  +100 <small className="text-xs text-[var(--muted)] font-normal">Xu / lượt</small>
                </div>
                <ul className="border-t border-[var(--line)] pt-4 space-y-2 text-xs sm:text-sm text-[var(--muted)]">
                  <li>• Link ngắn, vượt nhanh</li>
                  <li>• Không giới hạn lượt mỗi ngày</li>
                </ul>
              </div>
              <Link to={ctaSecondaryLink} onClick={playClickSound} className="vnd-btn w-full text-center">
                Chọn danh mục
              </Link>
            </div>

            <div className="border border-indigo-500/50 rounded-2xl p-6 bg-gradient-to-br from-indigo-900/20 to-[var(--panel)] shadow-[0_0_50px_rgba(110,122,255,0.1)] flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                Phổ biến
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-bold text-[var(--text)]">Danh mục tiêu chuẩn</h3>
                <div className="text-3xl font-extrabold text-[var(--green)] font-mono">
                  +300 <small className="text-xs text-[var(--muted)] font-normal">Xu / lượt</small>
                </div>
                <ul className="border-t border-[var(--line)] pt-4 space-y-2 text-xs sm:text-sm text-[var(--muted)]">
                  <li>• Nhiều người chọn nhất</li>
                  <li>• Hoàn thành trong 1–2 phút</li>
                </ul>
              </div>
              <Link to={ctaSecondaryLink} onClick={playClickSound} className="vnd-btn vnd-btn-primary w-full text-center">
                Chọn danh mục
              </Link>
            </div>

            <div className="border border-[var(--line)] rounded-2xl p-6 bg-[var(--panel)] flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-[var(--text)]">Danh mục cao cấp</h3>
                <div className="text-3xl font-extrabold text-[var(--green)] font-mono">
                  +1.000 <small className="text-xs text-[var(--muted)] font-normal">Xu / lượt</small>
                </div>
                <ul className="border-t border-[var(--line)] pt-4 space-y-2 text-xs sm:text-sm text-[var(--muted)]">
                  <li>• Thưởng cao, số lượt có hạn</li>
                  <li>• Cần vượt nhiều bước</li>
                </ul>
              </div>
              <Link to={ctaSecondaryLink} onClick={playClickSound} className="vnd-btn w-full text-center">
                Chọn danh mục
              </Link>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)] text-center mt-4">
            • Bảng Xu có thể thay đổi theo từng thời điểm. Giá trị mới nhất luôn hiển thị trong Dashboard.
          </p>
        </section>

        {/* Live Ticker & Mock Dashboard */}
        <section id="thanh-toan" className="py-14">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 text-[var(--blue)] rounded-full px-3 py-1 text-xs font-semibold">
              <i className="bi bi-wallet2 text-xs" /> Thanh toán
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Rút tiền gần đây</h2>
            <p className="text-sm text-[var(--muted)]">Thành viên vừa nhận tiền và Xu từ hệ thống, cập nhật trực tiếp.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch rv">
            {/* Live Feed Column */}
            <div className="border border-[var(--line)] rounded-2xl bg-gradient-to-br from-[var(--panel2)] to-[var(--panel)] p-5 flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs text-[var(--muted)] mb-3">
                <b className="flex items-center gap-2 text-[var(--text)] text-sm">
                  <span className="vnd-pulse" /> Giao dịch trực tiếp
                </b>
                <span>Cập nhật liên tục</span>
              </div>

              <div className="space-y-2 h-[215px] overflow-hidden">
                {feedItems.map((item) => (
                  <div key={item.id} className="vnd-feed-item">
                    <span className="text-[var(--muted)]">
                      <span className="text-[var(--text)] font-semibold">{item.who}</span>{' '}
                      {item.isWithdrawal ? `đã rút qua ${item.way}` : 'vừa vượt link'}
                    </span>
                    <span className="text-[var(--green)] font-bold font-mono whitespace-nowrap">
                      {item.gainText}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--line)] pt-3 mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="vnd-pulse" />
                <b className="text-[var(--green)]">Live</b> - Server automation system
              </div>
            </div>

            {/* Mock Dashboard Preview Column */}
            <div className="border border-[var(--line)] rounded-2xl bg-gradient-to-br from-[var(--panel2)] to-[var(--panel)] p-5 hidden md:flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4 text-xs text-[var(--muted)]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-2 font-mono">Bảng điều khiển trực quan</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-3">
                  <b className="block text-xl font-bold font-mono text-[var(--text)]">48 triệu</b>
                  <span className="text-[11px] text-[var(--muted)]">Xu đã chi trả</span>
                </div>
                <div className="border border-[var(--line)] rounded-xl bg-[var(--bg)] p-3">
                  <b className="block text-xl font-bold font-mono text-[var(--text)]">1,2 triệu</b>
                  <span className="text-[11px] text-[var(--muted)]">Lượt vượt link</span>
                </div>
              </div>

              <div className="h-28 border border-[var(--line)] rounded-xl bg-[var(--bg)] p-3 flex items-end gap-2.5">
                {[38, 56, 44, 70, 52, 84, 64, 95].map((val, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${val}%` }}
                    className="flex-1 rounded-t bg-gradient-to-t from-indigo-500 to-blue-400 hover:brightness-125 transition-all"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Marquee Section */}
        <section id="danh-gia" className="py-14">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 text-[var(--blue)] rounded-full px-3 py-1 text-xs font-semibold">
              <i className="bi bi-chat-quote-fill text-xs" /> Đánh giá
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Thành viên <span className="vnd-grad">nói gì</span></h2>
            <p className="text-sm text-[var(--muted)]">Phản hồi từ những người đang kiếm Xu trên hệ thống của chúng tôi.</p>
          </div>

          <div className="vnd-marq rv">
            <div className="vnd-track">
              {REVIEWS.slice(0, 4).concat(REVIEWS.slice(0, 4)).map((r, i) => (
                <div key={i} className="flex-shrink-0 w-80 border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-5 flex flex-col justify-between gap-3">
                  <div className="flex gap-1 text-blue-400">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <i key={si} className="bi bi-star-fill text-xs" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed flex-1">{r[2]}</p>
                  <div className="flex items-center gap-2.5 pt-2 border-t border-[var(--line)]/50">
                    <span className="w-8 h-8 rounded-full grid place-items-center bg-blue-500/10 text-blue-400 font-bold text-xs">
                      {r[0].charAt(0)}
                    </span>
                    <div>
                      <b className="block text-xs font-bold text-[var(--text)]">{r[0]}</b>
                      <span className="text-[10px] text-[var(--muted)]">{r[1]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="vnd-track rev">
              {REVIEWS.slice(4).concat(REVIEWS.slice(4)).map((r, i) => (
                <div key={i} className="flex-shrink-0 w-80 border border-[var(--line)] rounded-2xl bg-[var(--panel)] p-5 flex flex-col justify-between gap-3">
                  <div className="flex gap-1 text-blue-400">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <i key={si} className="bi bi-star-fill text-xs" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed flex-1">{r[2]}</p>
                  <div className="flex items-center gap-2.5 pt-2 border-t border-[var(--line)]/50">
                    <span className="w-8 h-8 rounded-full grid place-items-center bg-blue-500/10 text-blue-400 font-bold text-xs">
                      {r[0].charAt(0)}
                    </span>
                    <div>
                      <b className="block text-xs font-bold text-[var(--text)]">{r[0]}</b>
                      <span className="text-[10px] text-[var(--muted)]">{r[1]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="py-14">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 border border-indigo-500/30 bg-indigo-500/10 text-[var(--blue)] rounded-full px-3 py-1 text-xs font-semibold">
              <i className="bi bi-question-circle-fill text-xs" /> FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Câu hỏi thường gặp</h2>
            <p className="text-sm text-[var(--muted)]">Những điều bạn nên biết trước khi bắt đầu kiếm Xu.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3 rv">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className={`border border-[var(--line)] rounded-2xl transition-all ${
                    isOpen ? 'border-blue-500/40 bg-[var(--panel)] shadow-lg shadow-blue-500/5' : 'bg-[var(--panel)]'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm sm:text-base text-[var(--text)]"
                  >
                    <span>{faq.q}</span>
                    <span className={`w-8 h-8 rounded-lg grid place-items-center transition-colors ${isOpen ? 'bg-blue-600 text-white' : 'bg-[var(--panel2)] text-[var(--muted)]'}`}>
                      <i className={`bi ${isOpen ? 'bi-dash' : 'bi-plus'} text-lg`} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--line)]/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Banner Box */}
        <section className="py-12 rv">
          <div className="relative overflow-hidden text-center rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-2xl shadow-blue-500/20 space-y-5">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Sẵn sàng kiếm Xu ngay hôm nay?</h2>
            <p className="text-sm sm:text-base text-blue-100 max-w-lg mx-auto">
              Tạo tài khoản miễn phí trong 30 giây và nhận những Xu đầu tiên chỉ sau vài phút.
            </p>
            <div>
              <Link
                to={ctaPrimaryLink}
                onClick={playClickSound}
                className="inline-flex items-center gap-2 bg-white text-indigo-600 font-bold px-8 py-3.5 rounded-2xl text-base shadow-xl hover:-translate-y-0.5 hover:shadow-2xl transition-all"
              >
                <i className="bi bi-rocket-takeoff-fill text-lg" />
                <span>{me ? 'Vào Bảng điều khiển' : 'Đăng ký miễn phí'}</span>
              </Link>
            </div>
            <small className="block text-xs text-blue-100/80 font-medium">
              Miễn phí 100% · Không cần thẻ · Hủy bất cứ lúc nào
            </small>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[var(--line)] pt-12 pb-8 mt-16 text-[var(--muted)] text-sm space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1 space-y-3">
              <Link to="/" onClick={playClickSound} className="flex items-center gap-2.5 font-bold text-lg text-[var(--text)]">
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-blue-500 text-slate-900 text-sm font-bold">V</span>
                VIETNAMDONG
              </Link>
              <p className="text-xs leading-relaxed">
                Nền tảng kiếm Xu bằng vượt link, giới thiệu bạn bè và nhiệm vụ mỗi ngày. Mọi yêu cầu rút tiền đều do admin duyệt.
              </p>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <h4 className="font-bold text-[var(--text)] text-xs uppercase tracking-wider">Thông tin chung</h4>
              <p><Link to="/about" className="hover:text-[var(--text)]">Về chúng tôi</Link></p>
              <p><Link to="/terms" className="hover:text-[var(--text)]">Điều khoản dịch vụ</Link></p>
              <p><Link to="/privacy" className="hover:text-[var(--text)]">Điều khoản bảo mật</Link></p>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <h4 className="font-bold text-[var(--text)] text-xs uppercase tracking-wider">Hỗ trợ khách hàng</h4>
              <p><Link to="/support" className="hover:text-[var(--text)]">Trung tâm hỗ trợ</Link></p>
              <p><a href="#faq" className="hover:text-[var(--text)]">Hỏi đáp thường gặp</a></p>
              <p><Link to={me ? '/redeem' : '/login'} className="hover:text-[var(--text)]">Rút tiền</Link></p>
              <p><Link to={me ? '/redeem' : '/login'} className="hover:text-[var(--text)]">Đổi thưởng</Link></p>
              <p><Link to={me ? '/referral' : '/login'} className="hover:text-[var(--text)]">Theo dõi Affiliate</Link></p>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <h4 className="font-bold text-[var(--text)] text-xs uppercase tracking-wider">Liên hệ</h4>
              <p>
                <Link to="/support" className="inline-flex items-center gap-1.5 hover:text-[var(--text)]">
                  <i className="bi bi-headset text-blue-400" /> Gửi ticket hỗ trợ
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-[var(--text)] pt-4 border-t border-[var(--line)]/50">
            <span className="w-7 h-7 rounded-full bg-[#da251d] grid place-items-center text-amber-300 text-xs">
              ★
            </span>
            <span className="font-medium text-xs sm:text-sm">Hoàng Sa & Trường Sa là của Việt Nam!</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[var(--muted)]">
            <span>© {new Date().getFullYear()} VietnamDong. Bảo lưu mọi quyền.</span>
            <span className="font-mono bg-[var(--panel)] border border-[var(--line)] px-2.5 py-1 rounded-full">v1.0.0</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
