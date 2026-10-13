import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useMusic, PRESET_TRACKS, type MusicTrack } from '../context/MusicContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import { api, type ApiError } from '../api/client.js';
import { playClickSound, playCoinSound, isSoundEnabled, toggleSound } from '../utils/sound.js';
import CurrencyIcon from '../components/CurrencyIcon.js';

export default function Profile() {
  const { me, refresh } = useAuth();
  const {
    enabled: musicEnabled,
    isPlaying,
    trackTitle,
    url: currentMusicUrl,
    volume,
    togglePlay,
    setVolume,
    setTrack,
    setCustomUrl,
    toggleEnabled: toggleMusicEnabled,
  } = useMusic();

  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLanguage } = useLanguage();
  const { success: toastSuccess, error: toastError } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'music';
  const [activeTab, setActiveTab] = useState<'info' | 'music' | 'giftcode' | 'appearance'>(
    initialTab as any
  );

  // Sync tab with URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['info', 'music', 'giftcode', 'appearance'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  function switchTab(t: 'info' | 'music' | 'giftcode' | 'appearance') {
    playClickSound();
    setActiveTab(t);
    setSearchParams({ tab: t });
  }

  // Music form state
  const [customInputUrl, setCustomInputUrl] = useState('');

  // Giftcode state
  const [giftcode, setGiftcode] = useState('');
  const [claimingGiftcode, setClaimingGiftcode] = useState(false);
  const [giftcodeResult, setGiftcodeResult] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Sound effects state
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  function handleToggleSound() {
    const next = toggleSound();
    setSoundOn(next);
    if (next) playClickSound();
  }

  async function handleClaimGiftcode(e: React.FormEvent) {
    e.preventDefault();
    if (!giftcode.trim()) return;
    playClickSound();
    setClaimingGiftcode(true);
    setGiftcodeResult(null);

    try {
      const res = await api.redeemGiftcode(giftcode.trim());
      playCoinSound();
      toastSuccess(`Chúc mừng! Bạn đã nhận được +${res.reward_nova} VNC từ mã quà tặng`, 'Đổi mã thành công');
      setGiftcodeResult(`Kích hoạt thành công mã "${res.code}": Nhận +${res.reward_nova} VNC vào tài khoản!`);
      setGiftcode('');
      await refresh();
    } catch (err) {
      const msg = (err as ApiError).message;
      toastError(msg, 'Không thể nhận giftcode');
    } finally {
      setClaimingGiftcode(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError('Xác nhận mật khẩu mới không khớp', 'Lỗi nhập liệu');
      return;
    }
    if (newPassword.length < 6) {
      toastError('Mật khẩu mới phải có ít nhất 6 ký tự', 'Mật khẩu quá ngắn');
      return;
    }

    playClickSound();
    setSavingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      toastSuccess('Mật khẩu của bạn đã được cập nhật thành công', 'Đổi mật khẩu');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toastError((err as ApiError).message, 'Đổi mật khẩu thất bại');
    } finally {
      setSavingPassword(false);
    }
  }

  function handleSaveCustomMusic(e: React.FormEvent) {
    e.preventDefault();
    if (!customInputUrl.trim()) return;
    playClickSound();
    setCustomUrl(customInputUrl.trim(), 'Nhạc tự tải lên');
    toastSuccess('Đã cập nhật liên kết bài nhạc của bạn', 'Nhạc nền');
    setCustomInputUrl('');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-line bg-gradient-to-br from-surface2 via-surface to-surface shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            {me?.avatar_url ? (
              <img
                src={me.avatar_url}
                alt={me.username}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo/40 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo to-cyan text-white flex items-center justify-center font-display font-bold text-2xl sm:text-3xl shadow-lg shadow-indigo/20">
                {me?.username?.slice(0, 2).toUpperCase() || 'VN'}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
                  {me?.username}
                </h1>
                {me?.role === 'admin' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo/20 text-indigo border border-indigo/40 uppercase">
                    Admin
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan/15 text-cyan border border-cyan/30">
                    Thành viên
                  </span>
                )}
              </div>

              <div className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <i className="bi bi-envelope text-muted" /> {me?.email || 'Chưa cập nhật email'}
                </span>
                {me?.email_verified ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <i className="bi bi-patch-check-fill" /> Đã xác thực
                  </span>
                ) : (
                  <span className="text-amber font-medium flex items-center gap-1">
                    <i className="bi bi-exclamation-circle" /> Chưa xác thực
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-surface border border-line/80 text-center min-w-[100px]">
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Số dư ví</div>
              <div className="font-mono text-base sm:text-lg font-bold text-amber flex items-center justify-center gap-1 mt-0.5">
                <CurrencyIcon size={16} />
                <span>{me?.balance_nova ?? 0}</span>
                <span className="text-xs font-normal">VNC</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface border border-line/80 text-center min-w-[90px]">
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Chuỗi ngày</div>
              <div className="font-mono text-base sm:text-lg font-bold text-rose flex items-center justify-center gap-1 mt-0.5">
                <i className="bi bi-fire" />
                <span>{me?.streak_days ?? 0}d</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => switchTab('music')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition btn-press whitespace-nowrap border ${
            activeTab === 'music'
              ? 'bg-indigo text-white border-indigo shadow-md shadow-indigo/25'
              : 'bg-surface border-line text-muted hover:text-ink hover:bg-surface2'
          }`}
        >
          <i className="bi bi-music-note-beamed" />
          <span>Nghe nhạc trên web</span>
        </button>

        <button
          onClick={() => switchTab('giftcode')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition btn-press whitespace-nowrap border ${
            activeTab === 'giftcode'
              ? 'bg-indigo text-white border-indigo shadow-md shadow-indigo/25'
              : 'bg-surface border-line text-muted hover:text-ink hover:bg-surface2'
          }`}
        >
          <i className="bi bi-gift-fill" />
          <span>Nhập Giftcode</span>
        </button>

        <button
          onClick={() => switchTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition btn-press whitespace-nowrap border ${
            activeTab === 'info'
              ? 'bg-indigo text-white border-indigo shadow-md shadow-indigo/25'
              : 'bg-surface border-line text-muted hover:text-ink hover:bg-surface2'
          }`}
        >
          <i className="bi bi-shield-lock-fill" />
          <span>Mật khẩu & Bảo mật</span>
        </button>

        <button
          onClick={() => switchTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition btn-press whitespace-nowrap border ${
            activeTab === 'appearance'
              ? 'bg-indigo text-white border-indigo shadow-md shadow-indigo/25'
              : 'bg-surface border-line text-muted hover:text-ink hover:bg-surface2'
          }`}
        >
          <i className="bi bi-sliders" />
          <span>Tùy biến hiển thị</span>
        </button>
      </div>

      {/* Tab 1: Music Player Settings */}
      {activeTab === 'music' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Main Music Control Card */}
          <div className="glass-card rounded-3xl p-6 border border-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <i className="bi bi-music-player text-cyan" /> Trình phát nhạc nền cá nhân
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Tùy chỉnh bài nhạc yêu thích phát liên tục trên thanh tab điều hướng khi lướt web
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted">
                  {musicEnabled ? 'Đang bật' : 'Đang tắt'}
                </span>
                <button
                  onClick={() => {
                    playClickSound();
                    toggleMusicEnabled();
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                    musicEnabled ? 'bg-indigo' : 'bg-surface2 border border-line'
                  }`}
                  aria-label="Bật tắt nhạc nền"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      musicEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Now Playing Widget */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface2/70 border border-line/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isPlaying
                      ? 'bg-indigo text-white border-indigo shadow-[0_0_20px_rgba(85,167,255,0.35)]'
                      : 'bg-surface border-line text-muted'
                  }`}
                >
                  <i className={`bi text-xl ${isPlaying ? 'bi-soundwave animate-pulse' : 'bi-music-note-beamed'}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    {isPlaying ? 'Đang phát' : 'Tạm dừng'}
                  </div>
                  <div className="font-display font-bold text-base text-ink truncate mt-0.5">
                    {trackTitle || 'Chưa chọn bài hát'}
                  </div>
                </div>
              </div>

              {/* Play/Pause & Volume Controls */}
              <div className="flex items-center gap-4 sm:justify-end">
                <button
                  onClick={() => {
                    playClickSound();
                    togglePlay();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo to-cyan text-white hover:brightness-110 transition btn-press flex items-center gap-1.5 shadow-md shadow-indigo/20"
                >
                  <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'} text-base`} />
                  <span>{isPlaying ? 'Tạm dừng' : 'Phát nhạc'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <i className={`bi ${volume === 0 ? 'bi-volume-mute-fill text-rose' : 'bi-volume-up-fill text-muted'} text-sm`} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-24 sm:w-28 accent-indigo cursor-pointer h-1.5 bg-surface rounded-lg"
                    aria-label="Âm lượng"
                  />
                  <span className="font-mono text-xs text-muted w-8">{Math.round(volume * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Preset Chill Playlist */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <i className="bi bi-collection-play-fill text-indigo" /> Danh sách bài nhạc Chill có sẵn
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {PRESET_TRACKS.map((track) => {
                  const isCurrent = currentMusicUrl === track.url;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        playClickSound();
                        setTrack(track);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                        isCurrent
                          ? 'bg-indigo/10 border-indigo/50 shadow-md'
                          : 'bg-surface hover:bg-surface2 border-line hover:border-line/90'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isCurrent
                              ? 'bg-indigo text-white border-indigo'
                              : 'bg-surface2 text-muted border-line group-hover:text-ink'
                          }`}
                        >
                          <i className={`bi ${isCurrent && isPlaying ? 'bi-soundwave' : 'bi-play-fill'} text-base`} />
                        </div>
                        <div className="min-w-0">
                          <div className={`font-semibold text-xs sm:text-sm truncate ${isCurrent ? 'text-indigo' : 'text-ink'}`}>
                            {track.title}
                          </div>
                          <div className="text-[11px] text-muted truncate mt-0.5">{track.artist}</div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo/20 text-indigo border border-indigo/40 shrink-0">
                          Đang chọn
                        </span>
                      ) : (
                        <span className="text-xs text-muted group-hover:text-ink transition shrink-0">
                          <i className="bi bi-chevron-right" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom MP3 URL */}
            <form onSubmit={handleSaveCustomMusic} className="space-y-2 pt-2 border-t border-line">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <i className="bi bi-link-45deg text-cyan" /> Dán link nhạc MP3 tùy chỉnh của bạn
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/audio/my-favorite-song.mp3"
                  value={customInputUrl}
                  onChange={(e) => setCustomInputUrl(e.target.value)}
                  className="flex-1 bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-indigo hover:brightness-110 transition btn-press shrink-0 flex items-center justify-center gap-1.5"
                >
                  <i className="bi bi-play-circle" />
                  <span>Lưu & Phát ngay</span>
                </button>
              </div>
              <p className="text-[11px] text-muted">
                Hỗ trợ đường dẫn trực tiếp đến file âm thanh định dạng .mp3 hoặc luồng phát trực tuyến.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Giftcode */}
      {activeTab === 'giftcode' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <i className="bi bi-gift-fill text-amber" /> Kích hoạt Giftcode nhận VNC
              </h2>
              <p className="text-xs text-muted mt-1">
                Nhập mã quà tặng từ sự kiện, livestream hoặc fanpage để nhận ngay VNC miễn phí vào ví
              </p>
            </div>

            {giftcodeResult && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <i className="bi bi-check-circle-fill text-base shrink-0" />
                <span>{giftcodeResult}</span>
              </div>
            )}

            <form onSubmit={handleClaimGiftcode} className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Mã quà tặng (Giftcode)</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="VD: VIETNAMDONG2026, TANTHU50..."
                    value={giftcode}
                    onChange={(e) => setGiftcode(e.target.value.toUpperCase())}
                    className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm font-mono tracking-wider text-ink focus:outline-none focus:border-indigo uppercase pl-11"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                    <i className="bi bi-ticket-perforated-fill text-base text-amber" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={claimingGiftcode || !giftcode.trim()}
                className="w-full py-3.5 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:brightness-110 text-white shadow-lg shadow-amber-500/20 transition-all btn-press flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {claimingGiftcode ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin text-base" />
                    <span>Đang kiểm tra mã...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-gift text-base" />
                    <span>Nhận thưởng ngay</span>
                  </>
                )}
              </button>
            </form>

            <div className="p-4 rounded-2xl bg-surface2/50 border border-line text-xs text-muted space-y-1.5">
              <div className="font-semibold text-ink flex items-center gap-1.5">
                <i className="bi bi-info-circle text-cyan" /> Lưu ý khi nhập Giftcode:
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Mỗi mã quà tặng chỉ có thể sử dụng một lần cho mỗi tài khoản.</li>
                <li>Một số mã có giới hạn số lượt kích hoạt hoặc thời hạn áp dụng cụ thể.</li>
                <li>VNC nhận được sẽ được cộng ngay lập tức vào số dư ví của bạn.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Password */}
      {activeTab === 'info' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <i className="bi bi-key-fill text-indigo" /> Đổi mật khẩu tài khoản
              </h2>
              <p className="text-xs text-muted mt-1">
                Cập nhật mật khẩu định kỳ giúp bảo vệ an toàn cho số dư VNC và thông tin cá nhân của bạn
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu đang dùng"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-indigo"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-indigo"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-indigo"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="py-3 px-6 rounded-xl font-bold text-xs sm:text-sm bg-indigo hover:brightness-110 text-white transition btn-press flex items-center justify-center gap-2"
              >
                {savingPassword ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin" />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg text-base" />
                    <span>Cập nhật mật khẩu</span>
                  </>
                )}
              </button>
            </form>

            {/* 2FA Shortcut Card */}
            <div className="pt-6 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-sm text-ink flex items-center gap-1.5">
                  <i className="bi bi-shield-check text-cyan" /> Xác thực 2 bước (2FA)
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Bảo vệ tài khoản qua Google Authenticator khi đăng nhập và rút tiền
                </p>
              </div>
              <Link
                to="/security"
                onClick={playClickSound}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface2 hover:bg-line border border-line text-ink transition btn-press shrink-0 flex items-center gap-1.5"
              >
                <i className="bi bi-arrow-right-circle" />
                <span>Cài đặt bảo mật 2FA</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Appearance & System */}
      {activeTab === 'appearance' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <i className="bi bi-sliders text-cyan" /> Tùy chọn giao diện & Trải nghiệm
              </h2>
              <p className="text-xs text-muted mt-1">
                Cá nhân hóa chế độ hiển thị và âm thanh thông báo trên thiết bị của bạn
              </p>
            </div>

            <div className="space-y-4 max-w-xl">
              {/* Theme selector */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-surface2/60 border border-line">
                <div>
                  <div className="font-semibold text-sm text-ink flex items-center gap-2">
                    <i className={`bi ${theme === 'dark' ? 'bi-moon-stars-fill text-indigo' : 'bi-sun-fill text-amber'}`} />
                    <span>Chế độ giao diện (Dark / Light)</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    Hiện tại: {theme === 'dark' ? 'Giao diện Tối (Khuyên dùng)' : 'Giao diện Sáng'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    playClickSound();
                    toggleTheme();
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-line text-ink hover:border-indigo transition btn-press flex items-center gap-1.5"
                >
                  <i className="bi bi-arrow-repeat text-indigo" />
                  <span>Đổi giao diện</span>
                </button>
              </div>

              {/* Sound effects */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-surface2/60 border border-line">
                <div>
                  <div className="font-semibold text-sm text-ink flex items-center gap-2">
                    <i className={`bi ${soundOn ? 'bi-volume-up-fill text-cyan' : 'bi-volume-mute-fill text-muted'}`} />
                    <span>Hiệu ứng âm thanh click & nhận quà</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    Âm thanh phản hồi khi bấm nút, hoàn thành nhiệm vụ và nhận VNC
                  </div>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition btn-press flex items-center gap-1.5 ${
                    soundOn
                      ? 'bg-cyan/15 border-cyan/40 text-cyan'
                      : 'bg-surface border-line text-muted'
                  }`}
                >
                  <i className={`bi ${soundOn ? 'bi-check2' : 'bi-x-lg'}`} />
                  <span>{soundOn ? 'Đang bật' : 'Đang tắt'}</span>
                </button>
              </div>

              {/* Language toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-surface2/60 border border-line">
                <div>
                  <div className="font-semibold text-sm text-ink flex items-center gap-2">
                    <i className="bi bi-translate text-indigo" />
                    <span>Ngôn ngữ hiển thị</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    Đổi giữa Tiếng Việt và English
                  </div>
                </div>
                <button
                  onClick={() => {
                    playClickSound();
                    toggleLanguage();
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-line text-ink hover:border-indigo transition btn-press flex items-center gap-1.5"
                >
                  <i className="bi bi-globe" />
                  <span>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
