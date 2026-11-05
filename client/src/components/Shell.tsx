import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import Footer from './Footer.js';
import { playClickSound, isSoundEnabled, toggleSound } from '../utils/sound.js';

const NAV: [string, [string, string, string, string?][]][] = [
  [
    'Chính',
    [
      ['dash', 'Dashboard', 'dashboard'],
      ['bolt', 'Nhiệm vụ', 'quests', 'HOT'],
      ['spark', 'Vòng quay', 'lucky-wheel', 'FREE'],
      ['wallet', 'Ví', 'wallet'],
    ],
  ],
  [
    'Tiện ích',
    [
      ['gift', 'Đổi thưởng', 'redeem'],
      ['ticket', 'Giftcode', 'giftcode'],
      ['flame', 'Điểm danh', 'daily-reward', 'STREAK'],
      ['head', 'Vietsub Studio', 'vietsub-studio'],
      ['ticket', 'Creator Code', 'creator-code'],
    ],
  ],
  [
    'Cộng đồng',
    [
      ['trophy', 'Thành tựu', 'achievements'],
      ['bar', 'Xếp hạng', 'leaderboard'],
      ['users', 'Giới thiệu', 'referral', '20%'],
    ],
  ],
  [
    'Hỗ trợ',
    [
      ['hist', 'Lịch sử', 'history'],
      ['head', 'Hỗ trợ', 'support'],
      ['help', 'FAQ', 'faq'],
    ],
  ],
];

export default function Shell() {
  const { me, logout } = useAuth();
  const { lang, toggle: toggleLanguage } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mini, setMini] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowDrawer(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function handleSound() {
    const next = toggleSound();
    setSoundOn(next);
    if (next) playClickSound();
  }

  function handleLogout() {
    playClickSound();
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* SVG Symbol Definitions from VND-Dashboard.html */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <symbol id="dash" viewBox="0 0 24 24"><path d="M4 4h6v8h-6z M4 16h6v4h-6z M14 12h6v8h-6z M14 4h6v4h-6z" /></symbol>
          <symbol id="bolt" viewBox="0 0 24 24"><path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" /></symbol>
          <symbol id="spark" viewBox="0 0 24 24"><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6" /></symbol>
          <symbol id="wallet" viewBox="0 0 24 24"><path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" /><path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" /></symbol>
          <symbol id="gift" viewBox="0 0 24 24"><path d="M3 8m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z M12 8l0 13 M19 12v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-7 M7.5 8a2.5 2.5 0 0 1 0 -5a4.8 8 0 0 1 4.5 5a4.8 8 0 0 1 4.5 -5a2.5 2.5 0 0 1 0 5" /></symbol>
          <symbol id="ticket" viewBox="0 0 24 24"><path d="M15 5l0 2 M15 11l0 2 M15 17l0 2 M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2" /></symbol>
          <symbol id="flame" viewBox="0 0 24 24"><path d="M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z" /></symbol>
          <symbol id="trophy" viewBox="0 0 24 24"><path d="M8 21l8 0 M12 17l0 4 M7 4l10 0 M17 4v8a5 5 0 0 1 -10 0v-8 M5 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M19 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /></symbol>
          <symbol id="bar" viewBox="0 0 24 24"><path d="M3 12m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z M9 8m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z M15 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z M4 20l14 0" /></symbol>
          <symbol id="users" viewBox="0 0 24 24"><path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2 M16 3.13a4 4 0 0 1 0 7.75 M21 21v-2a4 4 0 0 0 -3 -3.85" /></symbol>
          <symbol id="hist" viewBox="0 0 24 24"><path d="M12 8l0 4l2 2 M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" /></symbol>
          <symbol id="head" viewBox="0 0 24 24"><path d="M4 14v-3a8 8 0 1 1 16 0v3 M18 19c0 1.657 -2.686 3 -6 3 M4 14a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z M15 14a2 2 0 0 1 2 -2h1a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-1a2 2 0 0 1 -2 -2z" /></symbol>
          <symbol id="help" viewBox="0 0 24 24"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 17l0 .01 M12 13.5a1.5 1.5 0 0 1 1 -1.5a2.6 2.6 0 1 0 -3 -4" /></symbol>
          <symbol id="search" viewBox="0 0 24 24"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-6 -6" /></symbol>
          <symbol id="bell" viewBox="0 0 24 24"><path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6 M9 17v1a3 3 0 0 0 6 0v-1" /></symbol>
          <symbol id="cl" viewBox="0 0 24 24"><path d="M11 7l-5 5l5 5 M17 7l-5 5l5 5" /></symbol>
          <symbol id="menu" viewBox="0 0 24 24"><path d="M4 6l16 0 M4 12l16 0 M4 18l16 0" /></symbol>
          <symbol id="x" viewBox="0 0 24 24"><path d="M18 6l-12 12 M6 6l12 12" /></symbol>
          <symbol id="up" viewBox="0 0 24 24"><path d="M17 7l-10 10 M8 7l9 0l0 9" /></symbol>
          <symbol id="arr" viewBox="0 0 24 24"><path d="M5 12l14 0 M13 18l6 -6 M13 6l6 6" /></symbol>
          <symbol id="cal" viewBox="0 0 24 24"><path d="M11.5 21h-5.5a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v6 M16 3v4 M8 3v4 M4 11h16 M15 19l2 2l4 -4" /></symbol>
          <symbol id="crown" viewBox="0 0 24 24"><path d="M12 6l4 6l5 -4l-2 10h-14l-2 -10l5 4z" /></symbol>
          <symbol id="shield" viewBox="0 0 24 24"><path d="M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06 M15 19l2 2l4 -4" /></symbol>
          <symbol id="ref" viewBox="0 0 24 24"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4 M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></symbol>
          <symbol id="coin" viewBox="0 0 24 24"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M14.8 9a2 2 0 0 0 -1.8 -1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1 -1.8 -1 M12 7v10" /></symbol>
          <symbol id="link" viewBox="0 0 24 24"><path d="M9 15l6 -6 M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464 M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" /></symbol>
          <symbol id="out" viewBox="0 0 24 24"><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2 M9 12h12l-3 -3 M18 15l3 -3" /></symbol>
          <symbol id="user" viewBox="0 0 24 24"><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0 M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" /></symbol>
          <symbol id="down" viewBox="0 0 24 24"><path d="M6 9l6 6l6 -6" /></symbol>
          <symbol id="check" viewBox="0 0 24 24"><path d="M5 12l5 5l10 -10" /></symbol>
          <symbol id="inbox" viewBox="0 0 24 24"><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z M4 13h3l3 3h4l3 -3h3" /></symbol>
          <symbol id="vol" viewBox="0 0 24 24"><path d="M15 8a5 5 0 0 1 0 8 M17.7 5a9 9 0 0 1 0 14 M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5" /></symbol>
          <symbol id="muted" viewBox="0 0 24 24"><path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5 M16 10l4 4m0 -4l-4 4" /></symbol>
          <symbol id="lang" viewBox="0 0 24 24"><path d="M4 5h7 M9 3v2c0 4.418 -2.239 8 -5 8 M5 9c0 2.144 2.952 3.908 6.7 4 M12 20l4 -9l4 9 M19.1 18h-6.2" /></symbol>
          <symbol id="sun" viewBox="0 0 24 24"><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M3 12h1 M12 3v1 M20 12h1 M12 20v1 M5.6 5.6l.7 .7 M18.4 5.6l-.7 .7 M17.7 17.7l.7 .7 M6.3 17.7l-.7 .7" /></symbol>
          <symbol id="moon" viewBox="0 0 24 24"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /></symbol>
        </defs>
      </svg>

      <div className={`scrim ${showDrawer ? 'show' : ''}`} id="scrim" onClick={() => setShowDrawer(false)} />

      <div className="app">
        {/* SIDEBAR (.side) */}
        <aside className={`side ${mini ? 'mini' : ''} ${showDrawer ? 'show' : ''}`} id="side">
          <div className="brand">
            <img className="logo" src="/logo-mark.png" alt="VietnamDong" />
            <div className="bn">
              <b>VietnamDong</b>
              <small>VNC Platform</small>
            </div>
            <button className="col" id="col" aria-label="Thu gọn" onClick={() => setMini(!mini)}>
              <svg className="i"><use href="#cl" /></svg>
            </button>
          </div>

          <nav className="nav" id="nav">
            {NAV.map(([g, items]) => (
              <React.Fragment key={g}>
                <div className="grp">{g}</div>
                {items.map(([iconId, title, route, badge]) => (
                  <NavLink
                    key={route}
                    to={`/${route}`}
                    className={({ isActive }) => `it ${isActive ? 'on' : ''}`}
                    onClick={() => playClickSound()}
                  >
                    <svg className="i"><use href={`#${iconId}`} /></svg>
                    <span>{title}</span>
                    {badge ? (
                      <em
                        className={`tag ${badge === 'FREE' || badge === 'STREAK' ? 'w' : ''}`}
                        style={{ fontStyle: 'normal' }}
                      >
                        {badge}
                      </em>
                    ) : null}
                  </NavLink>
                ))}
              </React.Fragment>
            ))}
          </nav>

          <div className="sb">
            <div className="upg">
              <i className="o1" /><i className="o2" />
              <span className="pro"><svg className="i"><use href="#crown" /></svg>VIP</span>
              <b>Nâng cấp VIP</b>
              <p>Mở khóa thưởng x2 và rút tiền nhanh.</p>
              <ul>
                <li><svg className="i"><use href="#check" /></svg>Thưởng nhiệm vụ x2</li>
                <li><svg className="i"><use href="#check" /></svg>Rút tiền ưu tiên</li>
                <li><svg className="i"><use href="#check" /></svg>Huy hiệu độc quyền</li>
              </ul>
              <Link className="btn wh" to="/profile" onClick={() => playClickSound()}>
                Xem đặc quyền<svg className="i"><use href="#arr" /></svg>
              </Link>
            </div>

            <div className="m3">
              <button className="tgl" id="theme" aria-label="Sáng/Tối" onClick={() => { playClickSound(); toggleTheme(); }}>
                <svg className="i"><use href={theme === 'dark' ? '#sun' : '#moon'} /></svg>
              </button>
              <button id="snd" aria-label="Âm thanh" onClick={handleSound}>
                <svg className="i"><use href={soundOn ? '#vol' : '#muted'} /></svg>
              </button>
              <button id="lang" aria-label="Ngôn ngữ" onClick={() => { playClickSound(); toggleLanguage(); }}>
                <svg className="i"><use href="#lang" /></svg>
              </button>
            </div>

            <button className="out" onClick={handleLogout}>
              <svg className="i"><use href="#out" /></svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        {/* MAIN (.main) */}
        <div className="main">
          <header className="top">
            <button className="ic burger" id="burger" aria-label="Menu" onClick={() => setShowDrawer(true)}>
              <svg className="i"><use href="#menu" /></svg>
            </button>
            <label className="search">
              <svg className="i"><use href="#search" /></svg>
              <input id="q" placeholder="Tìm nhiệm vụ..." />
            </label>
            <div className="sp" />
            <div className="bal">
              <svg className="i"><use href="#coin" /></svg>
              <span id="balTop">{(me?.balance_nova ?? 0).toLocaleString('vi-VN')}</span>
              <span className="vu">&nbsp;VNC</span>
            </div>
            <button className="ic tgl" id="theme2" aria-label="Sáng/Tối" onClick={() => { playClickSound(); toggleTheme(); }}>
              <svg className="i"><use href={theme === 'dark' ? '#sun' : '#moon'} /></svg>
            </button>
            <button className="ic" id="bell" aria-label="Thông báo" onClick={() => playClickSound()}>
              <svg className="i"><use href="#bell" /></svg>
              <i className="dot" id="dot" />
            </button>
            <div className="usr" ref={userRef}>
              <button
                className="ub"
                id="ub"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Hồ sơ người dùng"
                style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <div className="av">{me?.username?.[0]?.toUpperCase() || 'R'}</div>
              </button>
              <div className={`menu ${menuOpen ? 'open' : ''}`} id="menu">
                <Link to="/profile" onClick={() => playClickSound()}><svg className="i"><use href="#user" /></svg>Hồ sơ</Link>
                <Link to="/history" onClick={() => playClickSound()}><svg className="i"><use href="#hist" /></svg>Lịch sử</Link>
                <button onClick={handleLogout} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', color: 'var(--ink)', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                  <svg className="i"><use href="#out" /></svg>Đăng xuất
                </button>
              </div>
            </div>
          </header>

          {/* Router Content Outlet */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Outlet />
          </div>

          {/* Footer gốc của web như yêu cầu */}
          <Footer />
        </div>
      </div>

      {/* BOTTOM TABS FOR MOBILE (.tabs) */}
      <nav className="tabs" id="tabs">
        <NavLink className={({ isActive }) => `tb ${isActive ? 'on' : ''}`} to="/dashboard" onClick={() => playClickSound()}>
          <svg className="i"><use href="#dash" /></svg>
          <span>Trang chủ</span>
        </NavLink>
        <NavLink className={({ isActive }) => `tb ${isActive ? 'on' : ''}`} to="/quests" onClick={() => playClickSound()}>
          <svg className="i"><use href="#bolt" /></svg>
          <span>Nhiệm vụ</span>
        </NavLink>
        <NavLink className="fab" to="/lucky-wheel" aria-label="Vòng quay" onClick={() => playClickSound()}>
          <svg className="i"><use href="#spark" /></svg>
        </NavLink>
        <NavLink className={({ isActive }) => `tb ${isActive ? 'on' : ''}`} to="/wallet" onClick={() => playClickSound()}>
          <svg className="i"><use href="#wallet" /></svg>
          <span>Ví</span>
        </NavLink>
        <NavLink className={({ isActive }) => `tb ${isActive ? 'on' : ''}`} to="/profile" onClick={() => playClickSound()}>
          <svg className="i"><use href="#user" /></svg>
          <span>Hồ sơ</span>
        </NavLink>
      </nav>
    </>
  );
}
