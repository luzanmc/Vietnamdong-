import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { playClickSound } from '../utils/sound.js';
import './Landing.css';

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

  // Sync balance if user is logged in
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

  // Initialize Lucide icons
  useEffect(() => {
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }, [feedItems, openFaq]);

  // Scroll animations with IntersectionObserver
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Set delay for grid items
    const grids = root.querySelectorAll('.grid3, .rates, .steps, .faq');
    grids.forEach((g) => {
      Array.from(g.children).forEach((c, idx) => {
        (c as HTMLElement).classList.add('rv');
        (c as HTMLElement).style.setProperty('--d', `${idx * 0.08}s`);
      });
    });

    const otherEls = root.querySelectorAll('.head, .stats, .recent, .mock, .marq, .cta-box, .f-top, .f-flag');
    otherEls.forEach((el) => el.classList.add('rv'));

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

  const dashboardLink = '/dashboard';
  const loginLink = '/login';
  const registerLink = '/register';
  const primaryAuthLink = me ? dashboardLink : registerLink;

  return (
    <div ref={containerRef} className="vnd-landing-page js">
      {/* Topbar */}
      <header className="topbar">
        <Link to="/" onClick={playClickSound} className="brand">
          <span className="brand-mark">V</span>
          <span>
            VIETNAMDONG
            <span className="brand-sub">VƯỢT LINK · KIẾM XU</span>
          </span>
        </Link>

        <nav className={`links ${menuOpen ? 'open' : ''}`} id="links">
          <a href="#tinh-nang" onClick={() => setMenuOpen(false)}>Tính năng</a>
          <a href="#cach-kiem" onClick={() => setMenuOpen(false)}>Cách kiếm</a>
          <a href="#bang-xu" onClick={() => setMenuOpen(false)}>Bảng Xu</a>
          <a href="#danh-gia" onClick={() => setMenuOpen(false)}>Đánh giá</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
        </nav>

        <div className="top-actions">
          {me ? (
            <Link to={dashboardLink} onClick={playClickSound} className="btn btn-primary">
              <i data-lucide="layout-dashboard" />
              <span>{me.username || 'Bảng điều khiển'}</span>
            </Link>
          ) : (
            <>
              <Link to={loginLink} onClick={playClickSound} className="btn login">
                Đăng nhập
              </Link>
              <Link to={registerLink} onClick={playClickSound} className="btn btn-primary">
                Đăng ký miễn phí
              </Link>
            </>
          )}

          <button
            className="btn menu-btn"
            id="menuBtn"
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <i data-lucide={menuOpen ? 'x' : 'menu'} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="top">
        <div className="wrap">
          {/* Hero Section */}
          <div className="hero">
            <div className="art">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="glass-card">
                <div className="card-top">
                  <span>VIETNAMDONG / VNC</span>
                  <span className="live">● LIVE</span>
                </div>
                <div className="cube">
                  V<span>NC</span>
                </div>
                <div className="card-bottom">
                  <span>Ví Xu</span>
                  <span>
                    <b id="bal">{fmt(total)}</b> Xu
                  </span>
                </div>
              </div>
              <div className="float chip-a">
                <i data-lucide="link-2" />
                <span>Vượt link tự động</span>
              </div>
              <div className="float chip-b">
                <i data-lucide="zap" />
                <span>Rút tiền về ví trong ngày</span>
              </div>
            </div>

            <div className="copy">
              <span className="pill">
                <span className="pulse" />
                Hệ thống tự động hoạt động 24/7
              </span>
              <h1>
                Vượt link,<br />
                <span className="grad">kiếm Xu mỗi ngày</span>
              </h1>
              <p className="lead">
                Mở link, vượt trang quảng cáo trong vài giây và nhận Xu ngay. Đổi Xu lấy thẻ cào hoặc rút tiền về ví, hoàn toàn miễn phí.
              </p>
              <div className="cta">
                <Link
                  to={primaryAuthLink}
                  onClick={playClickSound}
                  className="btn btn-primary"
                >
                  <span>{me ? 'Vào Bảng điều khiển' : 'Bắt đầu kiếm Xu'}</span>
                  <i data-lucide="arrow-right" />
                </Link>
                <Link
                  to={dashboardLink}
                  onClick={playClickSound}
                  className="btn"
                >
                  Bảng điều khiển
                </Link>
              </div>
              <p className="price-line">
                Mỗi lượt vượt link từ <b>+100 Xu</b> · rút tối thiểu 20.000 Xu
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="stats">
            <div>
              <b>12.480</b>
              <span>Thành viên</span>
            </div>
            <div>
              <b>1,2 triệu</b>
              <span>Lượt vượt link</span>
            </div>
            <div>
              <b>48 triệu</b>
              <span>Xu đã chi trả</span>
            </div>
            <div>
              <b>24/7</b>
              <span>Hỗ trợ và hoạt động</span>
            </div>
          </div>

          {/* Features Section */}
          <section id="tinh-nang">
            <div className="head">
              <span className="kicker">
                <i data-lucide="star" />
                Tính năng
              </span>
              <h2>Mọi thứ bạn cần để kiếm Xu</h2>
              <p>Hệ thống lo phần còn lại: cộng Xu, ghi lịch sử, xử lý rút tiền.</p>
            </div>
            <div className="grid3">
              <div className="card">
                <div className="ic">
                  <i data-lucide="link" />
                </div>
                <h3>Vượt link nhận Xu</h3>
                <p>Chọn danh mục, mở link và vượt quảng cáo. Xu vào ví ngay khi hoàn thành lượt.</p>
              </div>
              <div className="card">
                <div className="ic">
                  <i data-lucide="banknote" />
                </div>
                <h3>Rút tiền linh hoạt</h3>
                <p>Đổi Xu lấy thẻ cào hoặc rút tiền mặt. Mỗi yêu cầu đều theo dõi được trạng thái.</p>
              </div>
              <div className="card">
                <div className="ic">
                  <i data-lucide="trending-up" />
                </div>
                <h3>Thống kê minh bạch</h3>
                <p>Lịch sử vượt link, biến động số dư và tổng Xu đã kiếm đều hiện rõ trong dashboard.</p>
              </div>
              <div className="card">
                <div className="ic">
                  <i data-lucide="shield-check" />
                </div>
                <h3>Bảo mật tài khoản</h3>
                <p>Nhật ký đăng nhập và công cụ bảo mật giúp tài khoản luôn nằm trong tay bạn.</p>
              </div>
              <div className="card">
                <div className="ic">
                  <i data-lucide="handshake" />
                </div>
                <h3>Giới thiệu nhận hoa hồng</h3>
                <p>Gửi link giới thiệu riêng cho bạn bè và nhận hoa hồng từ hoạt động của họ.</p>
              </div>
              <div className="card">
                <div className="ic">
                  <i data-lucide="message-circle" />
                </div>
                <h3>Hỗ trợ tận tâm</h3>
                <p>Gặp vấn đề khi vượt link hoặc rút tiền, đội hỗ trợ trả lời nhanh qua Zalo.</p>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="cach-kiem">
            <div className="head">
              <span className="kicker">
                <i data-lucide="route" />
                Cách hoạt động
              </span>
              <h2>Kiếm Xu chỉ với 3 bước</h2>
              <p>Không cần kỹ năng đặc biệt. Lượt đầu tiên chỉ mất vài phút.</p>
            </div>
            <div className="steps">
              <div className="step">
                <i>Bước 1</i>
                <h3>Tạo tài khoản</h3>
                <p>Chỉ cần tên đăng nhập và email. Không mất phí, không ràng buộc.</p>
              </div>
              <div className="step">
                <i>Bước 2</i>
                <h3>Chọn danh mục và vượt link</h3>
                <p>Mở link trong danh mục bạn thích và làm theo hướng dẫn trên trang quảng cáo.</p>
              </div>
              <div className="step">
                <i>Bước 3</i>
                <h3>Nhận Xu và rút tiền</h3>
                <p>Xu tự cộng vào ví. Đủ mức tối thiểu là bạn đổi thẻ cào hoặc rút tiền ngay.</p>
              </div>
            </div>
          </section>

          {/* Rates Table Section */}
          <section id="bang-xu">
            <div className="head">
              <span className="kicker">
                <i data-lucide="coins" />
                Bảng Xu
              </span>
              <h2>Phần thưởng từng danh mục</h2>
              <p>Giá trị Xu mỗi lượt đang áp dụng cho từng loại link.</p>
            </div>
            <div className="rates">
              <div className="rate">
                <h3>Danh mục cơ bản</h3>
                <div className="amt">
                  +100 <small>Xu / lượt</small>
                </div>
                <ul>
                  <li>Link ngắn, vượt nhanh</li>
                  <li>Không giới hạn lượt</li>
                </ul>
                <Link to={dashboardLink} onClick={playClickSound} className="btn">
                  Chọn danh mục
                </Link>
              </div>

              <div className="rate hot">
                <h3>Danh mục tiêu chuẩn</h3>
                <div className="amt">
                  +300 <small>Xu / lượt</small>
                </div>
                <ul>
                  <li>Nhiều người chọn nhất</li>
                  <li>Hoàn thành trong 1–2 phút</li>
                </ul>
                <Link to={dashboardLink} onClick={playClickSound} className="btn btn-primary">
                  Chọn danh mục
                </Link>
              </div>

              <div className="rate">
                <h3>Danh mục cao cấp</h3>
                <div className="amt">
                  +1.000 <small>Xu / lượt</small>
                </div>
                <ul>
                  <li>Thưởng cao, số lượt có hạn</li>
                  <li>Cần vượt nhiều bước</li>
                </ul>
                <Link to={dashboardLink} onClick={playClickSound} className="btn">
                  Chọn danh mục
                </Link>
              </div>
            </div>
            <p className="note">
              • Bảng Xu có thể thay đổi theo từng thời điểm. Giá trị mới nhất luôn hiển thị trong dashboard.
            </p>
          </section>

          {/* Live Payments and Mock Dashboard */}
          <section id="thanh-toan">
            <div className="head">
              <span className="kicker">
                <i data-lucide="wallet" />
                Thanh toán
              </span>
              <h2>Rút tiền gần đây</h2>
              <p>Thành viên vừa nhận tiền và Xu từ hệ thống, cập nhật trực tiếp.</p>
            </div>
            <div className="pay-grid">
              <div className="recent">
                <div className="recent-head">
                  <b>
                    <span className="pulse" />
                    Giao dịch
                  </b>
                  <span>Cập nhật</span>
                </div>
                <ul className="feed" id="feed">
                  {feedItems.map((item) => (
                    <li key={item.id}>
                      <span>
                        <span className="who">{item.who}</span>{' '}
                        {item.isWithdrawal ? `đã rút qua ${item.way}` : 'vừa vượt link'}
                      </span>
                      <span className="gain">{item.gainText}</span>
                    </li>
                  ))}
                </ul>
                <div className="srv">
                  <span className="pulse" />
                  <b>Live</b> - Server system
                </div>
              </div>

              <div className="mock in">
                <div className="mock-head">
                  <i />
                  <i />
                  <i />
                  <span>Bảng điều khiển</span>
                </div>
                <div className="mock-stats">
                  <div>
                    <b>48 triệu</b>
                    <span>Xu đã chi trả</span>
                  </div>
                  <div>
                    <b>1,2 triệu</b>
                    <span>Lượt vượt link</span>
                  </div>
                </div>
                <div className="mock-chart">
                  <i style={{ height: '38%', '--i': 0 } as React.CSSProperties} />
                  <i style={{ height: '56%', '--i': 1 } as React.CSSProperties} />
                  <i style={{ height: '44%', '--i': 2 } as React.CSSProperties} />
                  <i style={{ height: '70%', '--i': 3 } as React.CSSProperties} />
                  <i style={{ height: '52%', '--i': 4 } as React.CSSProperties} />
                  <i style={{ height: '84%', '--i': 5 } as React.CSSProperties} />
                  <i style={{ height: '64%', '--i': 6 } as React.CSSProperties} />
                  <i style={{ height: '95%', '--i': 7 } as React.CSSProperties} />
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials Section */}
          <section id="danh-gia">
            <div className="head">
              <span className="kicker">
                <i data-lucide="message-square-quote" />
                Đánh giá
              </span>
              <h2>
                Thành viên <span className="grad">nói gì</span>
              </h2>
              <p>Phản hồi từ những người đang kiếm Xu trên hệ thống của chúng tôi.</p>
            </div>
            <div className="marq">
              <div className="track" id="t1">
                {REVIEWS.slice(0, 4).concat(REVIEWS.slice(0, 4)).map((r, i) => (
                  <div key={i} className="rev-card">
                    <div className="stars">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <i key={si} data-lucide="star" />
                      ))}
                    </div>
                    <p>{r[2]}</p>
                    <div className="au">
                      <span className="av">{r[0].charAt(0)}</span>
                      <div>
                        <b>{r[0]}</b>
                        <span>{r[1]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="track rev" id="t2">
                {REVIEWS.slice(4).concat(REVIEWS.slice(4)).map((r, i) => (
                  <div key={i} className="rev-card">
                    <div className="stars">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <i key={si} data-lucide="star" />
                      ))}
                    </div>
                    <p>{r[2]}</p>
                    <div className="au">
                      <span className="av">{r[0].charAt(0)}</span>
                      <div>
                        <b>{r[0]}</b>
                        <span>{r[1]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq">
            <div className="head">
              <span className="kicker">
                <i data-lucide="circle-help" />
                FAQ
              </span>
              <h2>Câu hỏi thường gặp</h2>
              <p>Những điều bạn nên biết trước khi bắt đầu kiếm Xu.</p>
            </div>
            <div className="faq">
              {FAQS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className={`qa ${isOpen ? 'open' : ''}`}>
                    <button
                      className="q"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      <span>{faq.q}</span>
                      <span className="tg">
                        <i className="i-plus" data-lucide="plus" />
                        <i className="i-minus" data-lucide="minus" />
                      </span>
                    </button>
                    <div className="a">
                      <div>
                        <p>{faq.a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* CTA Box */}
          <section>
            <div className="cta-box">
              <h2>Sẵn sàng kiếm Xu ngay hôm nay?</h2>
              <p>Tạo tài khoản miễn phí trong 30 giây và nhận những Xu đầu tiên chỉ sau vài phút.</p>
              <Link
                to={primaryAuthLink}
                onClick={playClickSound}
                className="btn btn-white"
              >
                <i data-lucide="rocket" />
                <span>{me ? 'Vào Bảng điều khiển' : 'Đăng ký miễn phí'}</span>
              </Link>
              <small>Miễn phí 100% · Không cần thẻ · Hủy bất cứ lúc nào</small>
            </div>
          </section>

          {/* Footer */}
          <footer>
            <div className="f-top">
              <div className="f-brand">
                <Link to="/" onClick={playClickSound} className="brand">
                  <span className="brand-mark">V</span>VIETNAMDONG
                </Link>
                <p>
                  Nền tảng kiếm Xu bằng vượt link, giới thiệu bạn bè và nhiệm vụ mỗi ngày. Mọi yêu cầu rút tiền đều do admin duyệt, luôn sẵn sàng phục vụ bạn.
                </p>
              </div>

              <div className="f-col">
                <h4>Thông tin chung</h4>
                <Link to="/about">Về chúng tôi</Link>
                <Link to="/terms">Điều khoản dịch vụ</Link>
                <Link to="/privacy">Điều khoản bảo mật</Link>
              </div>

              <div className="f-col">
                <h4>Hỗ trợ khách hàng</h4>
                <Link to="/support">Trung tâm hỗ trợ</Link>
                <a href="#faq">Hỏi đáp thường gặp</a>
                <Link to={me ? '/redeem' : '/login'}>Rút tiền</Link>
                <Link to={me ? '/redeem' : '/login'}>Đổi thưởng</Link>
                <Link to={me ? '/referral' : '/login'}>Theo dõi Affiliate</Link>
              </div>

              <div className="f-col f-contact">
                <h4>Liên hệ</h4>
                <Link to="/support">
                  <i data-lucide="headphones" />
                  Gửi ticket hỗ trợ
                </Link>
              </div>
            </div>

            <div className="f-flag">
              <span className="flag">
                <i data-lucide="star" />
              </span>
              Hoàng Sa &amp; Trường Sa là của Việt Nam!
            </div>

            <div className="f-bottom">
              <span>© {new Date().getFullYear()} VietnamDong. Bảo lưu mọi quyền.</span>
              <span className="ver">
                <i data-lucide="tag" />
                1.0.0
              </span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
