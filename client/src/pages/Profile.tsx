import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  useMusic,
  PRESET_TRACKS,
  type MusicTrack,
  detectTrackType,
  extractYouTubeId,
  extractSpotifyEmbedUrl,
  fetchTrackMetadata,
} from '../context/MusicContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import { api, type ApiError } from '../api/client.js';
import type { UserSessionItem, LoginHistoryEvent } from '../types.js';
import { playClickSound, isSoundEnabled, toggleSound } from '../utils/sound.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import BalanceCard, { BalanceCardCustomizer } from '../components/BalanceCard.js';
import LevelBadge from '../components/LevelBadge.js';
import UserName from '../components/UserName.js';
import AvatarFrame from '../components/AvatarFrame.js';

const AVATAR_PRESETS = [
  { label: 'Cyber Cat', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Lucky' },
  { label: 'Mecha Bot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber' },
  { label: 'Hero Felix', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
  { label: 'Warrior Aria', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria' },
  { label: 'Shadow Micah', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Shadow' },
  { label: 'Luna Elf', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna' },
  { label: 'Pixel Gamer', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Gamer' },
  { label: 'Crypto VNC', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=VNC' },
];

export default function Profile() {
  const { me, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const {
    enabled: musicEnabled,
    isPlaying,
    currentTrack,
    tracks,
    volume,
    togglePlay,
    setVolume,
    setTrack,
    addTrack,
    removeTrack,
    resetTracks,
    nextTrack,
    prevTrack,
    toggleEnabled: toggleMusicEnabled,
  } = useMusic();

  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLanguage } = useLanguage();
  const { success: toastSuccess, error: toastError } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'music';
  const [activeTab, setActiveTab] = useState<'info' | 'music' | 'appearance'>(
    initialTab === 'giftcode' ? 'music' : initialTab === 'security' ? 'info' : (initialTab as any)
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'giftcode') {
      navigate('/giftcode', { replace: true });
      return;
    }
    if (tab === 'security') {
      setActiveTab('info');
      return;
    }
    if (tab && ['info', 'music', 'appearance'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams, navigate]);

  function switchTab(t: 'info' | 'music' | 'appearance') {
    playClickSound();
    setActiveTab(t);
    setSearchParams({ tab: t });
  }

  // --- Avatar Edit State ---
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(me?.avatar_url || null);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync preview when me changes
  useEffect(() => {
    if (me) {
      setPreviewAvatar(me.avatar_url);
    }
  }, [me?.avatar_url]);

  // Prevent background scroll and allow ESC key to close modal
  useEffect(() => {
    if (!avatarModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAvatarModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [avatarModalOpen]);

  function handleOpenAvatarModal() {
    playClickSound();
    setPreviewAvatar(me?.avatar_url || null);
    setCustomAvatarInput(me?.avatar_url && !me.avatar_url.startsWith('data:') ? me.avatar_url : '');
    setAvatarModalOpen(true);
  }

  function handleSelectPreset(presetUrl: string) {
    playClickSound();
    setPreviewAvatar(presetUrl);
    setCustomAvatarInput(presetUrl);
  }

  function handleCustomUrlChange(url: string) {
    setCustomAvatarInput(url);
    if (url.trim()) {
      setPreviewAvatar(url.trim());
    } else {
      setPreviewAvatar(me?.avatar_url || null);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError('Vui lòng chọn tệp hình ảnh (.png, .jpg, .webp)', 'Lỗi chọn ảnh');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 256, 256);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewAvatar(dataUrl);
          setCustomAvatarInput('');
          toastSuccess('Ảnh đã được tải lên và sẵn sàng lưu', 'Chọn ảnh thành công');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleResetAvatar() {
    playClickSound();
    setPreviewAvatar(null);
    setCustomAvatarInput('');
  }

  async function handleSaveAvatar() {
    playClickSound();
    setSavingAvatar(true);
    try {
      await api.updateAvatar(previewAvatar);
      await refresh();
      toastSuccess('Ảnh đại diện đã được cập nhật thành công!', 'Avatar Profile');
      setAvatarModalOpen(false);
    } catch (err) {
      toastError((err as ApiError).message, 'Không thể cập nhật ảnh đại diện');
    } finally {
      setSavingAvatar(false);
    }
  }

  // --- Music form state ---
  const [newMusicUrl, setNewMusicUrl] = useState('');
  const [newMusicTitle, setNewMusicTitle] = useState('');
  const [newMusicArtist, setNewMusicArtist] = useState('');
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [detectedType, setDetectedType] = useState<'youtube' | 'spotify' | 'audio'>('audio');
  const [previewThumbnail, setPreviewThumbnail] = useState<string | null>(null);

  // Auto fetch metadata when pasting URL
  async function handleUrlInput(val: string) {
    setNewMusicUrl(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setPreviewThumbnail(null);
      return;
    }

    const type = detectTrackType(trimmed);
    setDetectedType(type);

    if (type === 'youtube' || type === 'spotify') {
      setFetchingMeta(true);
      try {
        const meta = await fetchTrackMetadata(trimmed);
        setNewMusicTitle(meta.title);
        setNewMusicArtist(meta.artist);
        setPreviewThumbnail(meta.thumbnail || null);
      } catch {
        // Fallback
      } finally {
        setFetchingMeta(false);
      }
    } else {
      const meta = await fetchTrackMetadata(trimmed);
      if (!newMusicTitle) setNewMusicTitle(meta.title);
      if (!newMusicArtist) setNewMusicArtist(meta.artist);
      setPreviewThumbnail(null);
    }
  }

  function handleAddMusic(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newMusicUrl.trim();
    if (!trimmed) {
      toastError('Vui lòng nhập đường link bài hát hợp lệ', 'Thiếu đường link');
      return;
    }

    playClickSound();
    const type = detectTrackType(trimmed);
    const title = newMusicTitle.trim() || (type === 'youtube' ? 'YouTube Track' : type === 'spotify' ? 'Spotify Track' : 'Bài hát mới');
    const artist = newMusicArtist.trim() || (type === 'youtube' ? 'YouTube' : type === 'spotify' ? 'Spotify' : 'Tự tải lên');

    const added = addTrack({
      title,
      artist,
      url: trimmed,
      type,
      thumbnail: previewThumbnail || undefined,
      youtubeId: extractYouTubeId(trimmed) || undefined,
      spotifyEmbedUrl: extractSpotifyEmbedUrl(trimmed) || undefined,
    });

    toastSuccess(`Đã thêm "${added.title}" vào danh sách phát!`, 'Thêm nhạc thành công');
    setNewMusicUrl('');
    setNewMusicTitle('');
    setNewMusicArtist('');
    setPreviewThumbnail(null);
  }

  function handleDeleteTrack(id: string, title: string) {
    playClickSound();
    removeTrack(id);
    toastSuccess(`Đã xóa bài hát "${title}" khỏi danh sách`, 'Đã xóa bài nhạc');
  }

  function handleResetDefaultTracks() {
    playClickSound();
    resetTracks();
    toastSuccess('Đã khôi phục danh sách bài nhạc mặc định', 'Khôi phục danh sách');
  }

  // --- Password change state ---
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

  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const [loginHistory, setLoginHistory] = useState<LoginHistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [recoveryCount, setRecoveryCount] = useState<number | null>(null);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [regenerateInputModalOpen, setRegenerateInputModalOpen] = useState(false);
  const [regenerateTotpInput, setRegenerateTotpInput] = useState('');
  const [regeneratingCodes, setRegeneratingCodes] = useState(false);
  const [latestRecoveryCodes, setLatestRecoveryCodes] = useState<string[]>([]);
  const [codesCopied, setCodesCopied] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exportTotp, setExportTotp] = useState('');
  const [exportingData, setExportingData] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteTotp, setDeleteTotp] = useState('');
  const [deleteUsernameInput, setDeleteUsernameInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const res = await api.getUserSessions();
      setSessions(res.sessions || []);
    } catch {
    } finally {
      setLoadingSessions(false);
    }
  }

  async function handleRevokeSession(id: string) {
    playClickSound();
    setRevokingSessionId(id);
    try {
      await api.revokeSession(id);
      toastSuccess('Đã đăng xuất thiết bị thành công', 'Quản lý thiết bị');
      await loadSessions();
    } catch (err) {
      toastError((err as ApiError).message, 'Lỗi đăng xuất thiết bị');
    } finally {
      setRevokingSessionId(null);
    }
  }

  async function handleRevokeOtherSessions() {
    playClickSound();
    setRevokingOthers(true);
    try {
      await api.revokeOtherSessions();
      toastSuccess('Đã đăng xuất tất cả thiết bị khác thành công', 'Quản lý thiết bị');
      await loadSessions();
    } catch (err) {
      toastError((err as ApiError).message, 'Lỗi đăng xuất thiết bị');
    } finally {
      setRevokingOthers(false);
    }
  }

  async function loadLoginHistory() {
    setLoadingHistory(true);
    try {
      const res = await api.getLoginHistory();
      setLoginHistory(res.events || []);
    } catch {
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadTwoFactorInfo() {
    try {
      const status = await api.twoFactorStatus();
      setTwoFactorEnabled(status.enabled);
      if (status.enabled) {
        const countRes = await api.twoFactorRecoveryCodesCount();
        setRecoveryCount(countRes.remainingCount);
      }
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'info') {
      loadSessions();
      loadLoginHistory();
      loadTwoFactorInfo();
    }
  }, [activeTab]);

  async function handleRegenerateRecoveryCodes(e: React.FormEvent) {
    e.preventDefault();
    playClickSound();
    setRegeneratingCodes(true);
    try {
      const res = await api.twoFactorRegenerateRecoveryCodes(regenerateTotpInput);
      setLatestRecoveryCodes(res.recoveryCodes);
      setRegenerateInputModalOpen(false);
      setRegenerateTotpInput('');
      setRecoveryModalOpen(true);
      setRecoveryCount(res.recoveryCodes.length);
      toastSuccess('Đã tạo mới 8 mã khôi phục 2FA', 'Mã khôi phục');
    } catch (err) {
      toastError((err as ApiError).message, 'Lỗi tạo lại mã');
    } finally {
      setRegeneratingCodes(false);
    }
  }

  function handleCopyRecoveryCodes() {
    playClickSound();
    navigator.clipboard.writeText(latestRecoveryCodes.join('\n'));
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2000);
    toastSuccess('Đã sao chép 8 mã khôi phục', 'Sao chép');
  }

  function handleDownloadRecoveryCodes() {
    playClickSound();
    const text = `VIETNAMDONG - MA KHOI PHUC XAC THUC 2 BUOC (2FA)
Tai khoan: ${me?.username || 'user'}
Thoi gian tao: ${new Date().toLocaleString('vi-VN')}

Luu y:
- Moi ma chi su dung duoc dung 1 lan de dang nhap khi ban mat thiet bi xac thuc.
- Giu file nay o noi an toan, tuyet doi khong chia se cho nguoi khac.

Danh sach 8 ma:
${latestRecoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vietnamdong-2fa-recovery-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toastSuccess('Đã tải xuống file vietnamdong-2fa-recovery-codes.txt', 'Tải file');
  }

  async function handleExportData(e: React.FormEvent) {
    e.preventDefault();
    playClickSound();
    setExportingData(true);
    try {
      await api.exportPersonalData(exportPassword, exportTotp);
      toastSuccess('Đã tải dữ liệu cá nhân thành công', 'Tải dữ liệu');
      setExportModalOpen(false);
      setExportPassword('');
      setExportTotp('');
    } catch (err) {
      toastError((err as ApiError).message, 'Tải dữ liệu thất bại');
    } finally {
      setExportingData(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    playClickSound();
    if (deleteUsernameInput.trim() !== me?.username) {
      toastError('Tên đăng nhập xác nhận không chính xác', 'Lỗi xác nhận');
      return;
    }
    setDeletingAccount(true);
    try {
      const res = await api.requestDeleteAccount({
        password: deletePassword,
        totpCode: deleteTotp,
        confirmUsername: deleteUsernameInput,
      });
      toastSuccess(res.message, 'Xóa tài khoản');
      setDeleteModalOpen(false);
      await logout();
      navigate('/login');
    } catch (err) {
      toastError((err as ApiError).message, 'Xóa tài khoản thất bại');
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-8 border border-line bg-gradient-to-br from-surface2 via-surface to-surface shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <AvatarFrame level={me?.level} frame={me?.avatar_frame} shape="square">
              <div
                onClick={handleOpenAvatarModal}
                className="relative group cursor-pointer shrink-0"
                title="Nhấn để chỉnh sửa ảnh đại diện"
              >
                {me?.avatar_url ? (
                  <img
                    src={me.avatar_url}
                    alt={me.username}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo/40 shadow-md group-hover:opacity-85 transition"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo to-cyan text-white flex items-center justify-center font-display font-bold text-2xl sm:text-3xl shadow-lg shadow-indigo/20 group-hover:opacity-85 transition">
                    {me?.username?.slice(0, 2).toUpperCase() || 'VN'}
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold gap-0.5">
                  <i className="bi bi-camera-fill text-lg" />
                  <span>Đổi ảnh</span>
                </div>
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-indigo text-white flex items-center justify-center shadow border border-white/20 text-xs hover:brightness-110"
                >
                  <i className="bi bi-pencil-fill text-[9px]" />
                </button>
              </div>
            </AvatarFrame>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <UserName
                  name={me?.username || 'Thành viên'}
                  level={me?.level}
                  className="font-display text-xl sm:text-3xl font-bold truncate max-w-[200px] sm:max-w-none"
                />
                <LevelBadge level={me?.level} size="md" />
                {me?.role === 'admin' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo/20 text-indigo border border-indigo/40 uppercase shrink-0">
                    Admin
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan/15 text-cyan border border-cyan/30 shrink-0">
                    Thành viên
                  </span>
                )}
                <button
                  onClick={handleOpenAvatarModal}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-surface2/80 hover:bg-surface2 border border-line text-ink transition btn-press flex items-center gap-1.5 shrink-0"
                >
                  <i className="bi bi-image" />
                  <span>Đổi avatar</span>
                </button>
              </div>

              <div className="text-xs text-muted mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 truncate max-w-full">
                  <i className="bi bi-envelope text-muted shrink-0" />
                  <span className="truncate">{me?.email || 'Chưa cập nhật email'}</span>
                </span>
                {me?.email_verified ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                    <i className="bi bi-patch-check-fill" /> Đã xác thực
                  </span>
                ) : (
                  <span className="text-amber font-medium flex items-center gap-1 shrink-0">
                    <i className="bi bi-exclamation-circle" /> Chưa xác thực
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto sm:flex sm:items-center">
            <div className="p-3 rounded-2xl bg-surface border border-line/80 text-center sm:min-w-[100px] flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Số dư ví</div>
              <div className="font-mono text-base sm:text-lg font-bold text-amber flex items-center justify-center gap-1 mt-0.5">
                <CurrencyIcon size={16} />
                <span>{me?.balance_nova ?? 0}</span>
                <span className="text-xs font-normal">VNC</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface border border-line/80 text-center sm:min-w-[90px] flex-1">
              <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">Chuỗi ngày</div>
              <div className="font-mono text-base sm:text-lg font-bold text-rose flex items-center justify-center gap-1 mt-0.5">
                <i className="bi bi-fire" />
                <span>{me?.streak_days ?? 0}d</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-line bg-gradient-to-r from-surface2/80 via-surface/90 to-surface2/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <AvatarFrame level={me?.level} frame={me?.avatar_frame} shape="circle">
              {me?.avatar_url ? (
                <img src={me.avatar_url} alt={me.username} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo to-cyan text-white flex items-center justify-center font-bold text-base">
                  {me?.username?.slice(0, 2).toUpperCase() || 'VN'}
                </div>
              )}
            </AvatarFrame>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <UserName name={me?.username || 'Thành viên'} level={me?.level} className="font-bold text-base text-ink" />
                <LevelBadge level={me?.level} size="sm" />
              </div>
              <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                <span>{me?.levelProgress?.tierName || 'Tập sự'}</span>
                <span>•</span>
                <span>Cấp {me?.level ?? 1}/20</span>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right font-mono">
            <div className="text-[11px] text-muted">Kinh nghiệm tích lũy</div>
            <div className="text-sm font-bold text-ink">
              {me?.xp ?? 0} <span className="text-[11px] font-normal text-muted">XP</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted font-mono">
            <span>Tiến độ</span>
            <span>
              {me?.levelProgress?.nextLevelXp
                ? `${me.levelProgress.xpInCurrentLevel} / ${me.levelProgress.xpRequiredForNextLevel} XP (${me.levelProgress.progressPercent}%)`
                : 'Đạt cấp tối đa (100%)'}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface2 overflow-hidden border border-line/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (me?.level ?? 1) >= 20
                  ? 'bg-gradient-to-r from-rose-500 via-amber-400 to-orange-500'
                  : (me?.level ?? 1) >= 15
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                  : (me?.level ?? 1) >= 10
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : (me?.level ?? 1) >= 5
                  ? 'bg-gradient-to-r from-sky-400 to-cyan-400'
                  : 'bg-gradient-to-r from-zinc-500 to-zinc-400'
              }`}
              style={{ width: `${me?.levelProgress?.progressPercent ?? 0}%` }}
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-line/50 flex items-center justify-between text-xs gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-muted">
            <i className="bi bi-gift-fill text-amber" />
            <span>
              {(me?.level ?? 1) >= 5
                ? `Đặc quyền cấp độ: Xác suất ${(me?.levelProgress?.bonusChancePercent ?? 1).toFixed(1)}% nhận thêm tối đa ${me?.levelProgress?.bonusMaxCoin ?? 2} VNC mỗi link`
                : 'Đạt cấp 5 để kích hoạt cơ hội nhận thêm VNC may mắn khi vượt link'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-muted shrink-0">
            +10 XP/link • +5 XP/điểm danh
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-none">
        <button
          onClick={() => switchTab('music')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition btn-press whitespace-nowrap border ${
            activeTab === 'music'
              ? 'bg-indigo text-white border-indigo shadow-md shadow-indigo/25'
              : 'bg-surface border-line text-muted hover:text-ink hover:bg-surface2'
          }`}
        >
          <i className="bi bi-music-note-beamed" />
          <span>Nghe nhạc trên web ({tracks.length})</span>
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
          <span>Hồ sơ & Bảo mật</span>
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

      {/* Tab 1: Music Player Settings & Playlist Management */}
      {activeTab === 'music' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Main Music Control Card */}
          <div className="glass-card rounded-3xl p-4 sm:p-6 border border-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <i className="bi bi-music-player text-cyan" /> Trình phát nhạc nền cá nhân
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Phát nhạc liên tục khi lướt web. Hỗ trợ YouTube, Spotify và link trực tiếp MP3.
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
            <div className="p-4 sm:p-5 rounded-2xl bg-surface2/70 border border-line/80 space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Thumbnail or animated equalizer */}
                  {currentTrack?.thumbnail && currentTrack.type !== 'spotify' ? (
                    <img
                      src={currentTrack.thumbnail}
                      alt={currentTrack.title}
                      className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-line shadow-md"
                    />
                  ) : (
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isPlaying
                          ? 'bg-indigo text-white border-indigo shadow-[0_0_20px_rgba(85,167,255,0.35)]'
                          : 'bg-surface border-line text-muted'
                      }`}
                    >
                      <i className={`bi text-2xl ${isPlaying ? 'bi-soundwave animate-pulse' : 'bi-music-note-beamed'}`} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border">
                        {currentTrack?.type === 'youtube' && (
                          <span className="text-red-500 border-red-500/30 flex items-center gap-1">
                            <i className="bi bi-youtube" /> YouTube
                          </span>
                        )}
                        {currentTrack?.type === 'spotify' && (
                          <span className="text-emerald-400 border-emerald-400/30 flex items-center gap-1">
                            <i className="bi bi-spotify" /> Spotify
                          </span>
                        )}
                        {currentTrack?.type === 'audio' && (
                          <span className="text-indigo border-indigo/30 flex items-center gap-1">
                            <i className="bi bi-file-earmark-music" /> MP3 Audio
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] font-semibold text-muted">
                        {isPlaying ? 'Đang phát' : 'Tạm dừng'}
                      </span>
                    </div>

                    <div className="font-display font-bold text-base text-ink truncate mt-1">
                      {currentTrack?.title || 'Chưa chọn bài hát'}
                    </div>
                    <div className="text-xs text-muted truncate mt-0.5">
                      {currentTrack?.artist || 'Không rõ nghệ sĩ'}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 sm:justify-end flex-wrap">
                  <button
                    onClick={() => {
                      playClickSound();
                      prevTrack();
                    }}
                    title="Bài trước"
                    className="p-2 rounded-xl border border-line bg-surface hover:bg-surface2 text-muted hover:text-ink transition btn-press"
                  >
                    <i className="bi bi-skip-backward-fill text-sm" />
                  </button>

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

                  <button
                    onClick={() => {
                      playClickSound();
                      nextTrack();
                    }}
                    title="Bài tiếp theo"
                    className="p-2 rounded-xl border border-line bg-surface hover:bg-surface2 text-muted hover:text-ink transition btn-press"
                  >
                    <i className="bi bi-skip-forward-fill text-sm" />
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2 pl-2 border-l border-line">
                    <i className={`bi ${volume === 0 ? 'bi-volume-mute-fill text-rose' : 'bi-volume-up-fill text-muted'} text-sm`} />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-20 sm:w-24 accent-indigo cursor-pointer h-1.5 bg-surface rounded-lg"
                      aria-label="Âm lượng"
                    />
                    <span className="font-mono text-xs text-muted w-7">{Math.round(volume * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* If current track is Spotify: render inline player */}
              {currentTrack?.type === 'spotify' && currentTrack.spotifyEmbedUrl && (
                <div className="pt-2">
                  <iframe
                    src={currentTrack.spotifyEmbedUrl}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-2xl w-full border border-line shadow-sm"
                    title="Spotify Embed"
                  />
                </div>
              )}
            </div>

            {/* Form: Thêm bài nhạc từ link YouTube / Spotify / MP3 */}
            <form onSubmit={handleAddMusic} className="p-4 sm:p-5 rounded-2xl bg-surface border border-line space-y-4 min-w-0">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <i className="bi bi-plus-circle-fill text-indigo" /> Thêm bài nhạc từ link YouTube hoặc Spotify
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Dán đường dẫn YouTube (video/shorts), Spotify (bài hát/album/playlist) hoặc link file MP3
                </p>
              </div>

              <div className="space-y-3">
                {/* Link input */}
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... hoặc https://open.spotify.com/track/..."
                    value={newMusicUrl}
                    onChange={(e) => handleUrlInput(e.target.value)}
                    required
                    className="w-full bg-surface2 border border-line rounded-xl pl-4 pr-10 py-2.5 text-xs sm:text-sm text-ink focus:outline-none focus:border-indigo"
                  />
                  {fetchingMeta && (
                    <div className="absolute right-3 top-3 text-indigo">
                      <i className="bi bi-arrow-repeat animate-spin text-sm" />
                    </div>
                  )}
                </div>

                {/* Live detected preview card */}
                {previewThumbnail && (
                  <div className="p-3 rounded-xl bg-surface2/60 border border-line/80 flex items-center gap-3">
                    <img
                      src={previewThumbnail}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-line shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-muted">
                        {detectedType === 'youtube' && <span className="text-red-500 flex items-center gap-1"><i className="bi bi-youtube" /> YouTube phát hiện</span>}
                        {detectedType === 'spotify' && <span className="text-emerald-400 flex items-center gap-1"><i className="bi bi-spotify" /> Spotify phát hiện</span>}
                      </div>
                      <div className="text-xs font-semibold text-ink truncate mt-0.5">{newMusicTitle}</div>
                      <div className="text-[11px] text-muted truncate">{newMusicArtist}</div>
                    </div>
                  </div>
                )}

                {/* Optional Custom Title & Artist inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted block mb-1">Tên bài hát (tùy chỉnh)</label>
                    <input
                      type="text"
                      placeholder="VD: Lofi Chill Melodies"
                      value={newMusicTitle}
                      onChange={(e) => setNewMusicTitle(e.target.value)}
                      className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted block mb-1">Nghệ sĩ / Kênh (tùy chỉnh)</label>
                    <input
                      type="text"
                      placeholder="VD: Lofi Girl"
                      value={newMusicArtist}
                      onChange={(e) => setNewMusicArtist(e.target.value)}
                      className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-muted flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-red-400"><i className="bi bi-youtube" /> YouTube</span>
                    <span className="flex items-center gap-1 text-emerald-400"><i className="bi bi-spotify" /> Spotify</span>
                    <span className="flex items-center gap-1 text-indigo"><i className="bi bi-filetype-mp3" /> MP3 Audio</span>
                  </div>

                  <button
                    type="submit"
                    disabled={!newMusicUrl.trim()}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo hover:brightness-110 text-white transition btn-press flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <i className="bi bi-plus-lg" />
                    <span>Thêm vào danh sách & Phát</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Playlist List with Delete Controls */}
            <div className="space-y-3 pt-2 border-t border-line min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 min-w-0">
                  <i className="bi bi-collection-play-fill text-indigo shrink-0" />
                  <span className="truncate">Danh sách bài hát ({tracks.length})</span>
                </h3>

                <button
                  onClick={handleResetDefaultTracks}
                  title="Khôi phục lại danh sách bài nhạc có sẵn ban đầu"
                  aria-label="Khôi phục mặc định"
                  className="min-h-[40px] min-w-[40px] px-2.5 sm:px-3 rounded-xl text-xs text-muted hover:text-ink hover:bg-surface2 flex items-center justify-center gap-1.5 transition shrink-0 border border-line/60"
                >
                  <i className="bi bi-arrow-counterclockwise text-sm shrink-0" />
                  <span className="hidden sm:inline">Khôi phục mặc định</span>
                </button>
              </div>

              {tracks.length === 0 ? (
                <div className="p-8 text-center text-muted border border-dashed border-line rounded-2xl">
                  <i className="bi bi-music-note text-3xl mb-1 block opacity-50" />
                  <p className="text-xs">Chưa có bài hát nào trong danh sách.</p>
                  <button
                    onClick={handleResetDefaultTracks}
                    className="mt-3 px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold bg-indigo text-white hover:brightness-110 flex items-center gap-1.5 mx-auto"
                  >
                    <i className="bi bi-arrow-counterclockwise" />
                    <span>Khôi phục bài hát mẫu</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  {tracks.map((track) => {
                    const isCurrent = currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 min-w-0 w-full group relative ${
                          isCurrent
                            ? 'bg-indigo/10 border-indigo/50 shadow-md ring-1 ring-indigo/40'
                            : 'bg-surface hover:bg-surface2 border-line hover:border-line/90'
                        }`}
                      >
                        {/* Play trigger */}
                        <div
                          onClick={() => {
                            playClickSound();
                            setTrack(track);
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          {/* Thumbnail / Source icon */}
                          {track.thumbnail && track.type !== 'spotify' ? (
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-line"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                isCurrent
                                  ? 'bg-indigo text-white border-indigo'
                                  : 'bg-surface2 text-muted border-line group-hover:text-ink'
                              }`}
                            >
                              {track.type === 'youtube' ? (
                                <i className="bi bi-youtube text-red-500 text-lg" />
                              ) : track.type === 'spotify' ? (
                                <i className="bi bi-spotify text-emerald-400 text-lg" />
                              ) : (
                                <i className={`bi ${isCurrent && isPlaying ? 'bi-soundwave' : 'bi-file-earmark-music'} text-base`} />
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center min-w-0">
                              <span
                                className={`font-semibold text-xs truncate block w-full ${
                                  isCurrent ? 'text-indigo' : 'text-ink'
                                }`}
                                title={track.title}
                              >
                                {track.title}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted truncate mt-0.5 flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{track.artist}</span>
                              <span className="text-[9px] px-1 rounded uppercase tracking-wider font-bold bg-surface2 border border-line shrink-0">
                                {track.type}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions: Status & Delete button */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isCurrent ? (
                            <button
                              onClick={() => {
                                playClickSound();
                                togglePlay();
                              }}
                              className="h-10 min-h-[40px] px-2.5 rounded-xl bg-indigo/20 text-indigo border border-indigo/40 flex items-center justify-center gap-1.5 shrink-0 transition hover:bg-indigo/30"
                              title={isPlaying ? 'Đang phát (Nhấn để tạm dừng)' : 'Tạm dừng (Nhấn để phát)'}
                              aria-label={isPlaying ? 'Đang phát' : 'Tạm dừng'}
                            >
                              <i className={`bi ${isPlaying ? 'bi-soundwave animate-pulse text-base' : 'bi-pause-fill text-base'} shrink-0`} />
                              <span className="text-[10px] font-bold hidden sm:inline">Đang phát</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                playClickSound();
                                setTrack(track);
                              }}
                              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl text-muted hover:text-ink hover:bg-surface2 flex items-center justify-center transition shrink-0"
                              title="Phát bài này"
                              aria-label="Phát bài này"
                            >
                              <i className="bi bi-play-circle text-base" />
                            </button>
                          )}

                          {/* Delete Track button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTrack(track.id, track.title);
                            }}
                            title={`Xóa bài hát "${track.title}"`}
                            aria-label={`Xóa bài hát "${track.title}"`}
                            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl text-muted hover:text-rose hover:bg-rose/10 flex items-center justify-center transition shrink-0"
                          >
                            <i className="bi bi-trash text-base" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security & Password & Avatar Card */}
      {activeTab === 'info' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Avatar Profile Management Card */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <i className="bi bi-person-bounding-box text-indigo" /> Ảnh đại diện hồ sơ (Avatar)
                </h2>
                <p className="text-xs text-muted mt-1">
                  Tùy chỉnh ảnh đại diện của bạn hiển thị trên bảng xếp hạng và toàn hệ thống
                </p>
              </div>

              <button
                onClick={handleOpenAvatarModal}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo hover:brightness-110 text-white transition btn-press flex items-center gap-2 self-start sm:self-auto shadow-md"
              >
                <i className="bi bi-pencil-square" />
                <span>Chỉnh sửa Avatar</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {me?.avatar_url ? (
                <img
                  src={me.avatar_url}
                  alt={me.username}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo/40 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo to-cyan text-white flex items-center justify-center font-display font-bold text-2xl shadow-lg">
                  {me?.username?.slice(0, 2).toUpperCase() || 'VN'}
                </div>
              )}

              <div className="space-y-1">
                <div className="font-bold text-sm text-ink">{me?.username}</div>
                <div className="text-xs text-muted">
                  {me?.avatar_url ? 'Đang sử dụng ảnh đại diện tùy chỉnh' : 'Đang sử dụng ảnh chữ cái mặc định'}
                </div>
                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={handleOpenAvatarModal}
                    className="text-xs text-indigo hover:underline font-semibold"
                  >
                    Đổi sang ảnh khác
                  </button>
                  {me?.avatar_url && (
                    <>
                      <span className="text-muted text-xs">•</span>
                      <button
                        onClick={async () => {
                          playClickSound();
                          await api.updateAvatar(null);
                          await refresh();
                          toastSuccess('Đã gỡ avatar và trở về mặc định', 'Avatar');
                        }}
                        className="text-xs text-rose hover:underline font-medium"
                      >
                        Gỡ avatar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Password Change Card */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <i className="bi bi-key-fill text-indigo" /> Đổi mật khẩu tài khoản
              </h2>
              <p className="text-xs text-muted mt-1">
                Cập nhật mật khẩu định kỳ giúp bảo vệ an toàn cho số dư VNC và thông tin cá nhân của bạn
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4.5 w-full">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu đang dùng"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-indigo transition shadow-inner"
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
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-indigo transition shadow-inner"
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
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-indigo transition shadow-inner"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="py-3 px-6 rounded-xl font-bold text-xs sm:text-sm bg-indigo hover:brightness-110 text-white shadow-md shadow-indigo/25 border border-indigo-400/30 transition btn-press flex items-center justify-center gap-2 disabled:opacity-50"
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

          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <i className="bi bi-shield-lock-fill text-indigo" /> Xác thực 2 bước (2FA) & Mã khôi phục
                </h2>
                <p className="text-xs text-muted mt-1">
                  Bảo vệ đăng nhập và giao dịch rút tiền bằng ứng dụng Google Authenticator và mã khôi phục dự phòng
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    twoFactorEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-surface2 border-line text-muted'
                  }`}
                >
                  <i className={`bi ${twoFactorEnabled ? 'bi-check-circle-fill' : 'bi-x-circle'} mr-1.5`} />
                  {twoFactorEnabled ? 'Đang bật' : 'Chưa bật'}
                </span>
                <Link
                  to="/security"
                  onClick={playClickSound}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-surface2 hover:bg-line border border-line text-ink transition btn-press flex items-center gap-1.5"
                >
                  <i className="bi bi-gear" />
                  <span>{twoFactorEnabled ? 'Quản lý' : 'Cài đặt'}</span>
                </Link>
              </div>
            </div>

            {twoFactorEnabled && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface2/60 border border-line">
                  <div>
                    <div className="font-semibold text-xs sm:text-sm text-ink flex items-center gap-2">
                      <i className="bi bi-key-fill text-indigo" />
                      <span>Số mã khôi phục dự phòng còn lại</span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Mỗi mã khôi phục chỉ dùng được một lần duy nhất khi bạn không thể truy cập ứng dụng 2FA.
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono text-base font-bold text-ink">
                        {recoveryCount !== null ? recoveryCount : '...'}
                      </span>
                      <span className="text-xs text-muted"> / 8</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setRegenerateTotpInput('');
                        setRegenerateInputModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo hover:brightness-110 text-white transition btn-press flex items-center gap-1.5 shadow-sm shrink-0"
                    >
                      <i className="bi bi-arrow-repeat" />
                      <span>Tạo lại 8 mã mới</span>
                    </button>
                  </div>
                </div>

                {recoveryCount !== null && recoveryCount <= 2 && (
                  <div className="p-4 rounded-2xl bg-rose/10 border border-rose/30 text-xs text-rose flex items-start gap-3 animate-pulse">
                    <i className="bi bi-exclamation-triangle-fill text-base shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong>Cảnh báo bảo mật:</strong> Bạn chỉ còn {recoveryCount} mã khôi phục dự phòng.
                      Vui lòng tạo lại bộ mã mới ngay để đảm bảo không bị mất quyền truy cập vào tài khoản nếu mất thiết bị.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <i className="bi bi-laptop text-indigo" /> Thiết bị đang đăng nhập
                </h2>
                <p className="text-xs text-muted mt-1">
                  Danh sách tất cả các phiên đăng nhập đang hoạt động của tài khoản này
                </p>
              </div>

              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={handleRevokeOtherSessions}
                  disabled={revokingOthers}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose/15 hover:bg-rose/25 text-rose border border-rose/30 transition btn-press flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
                >
                  {revokingOthers ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-right" />
                      <span>Đăng xuất tất cả thiết bị khác</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {loadingSessions ? (
              <div className="py-8 text-center text-xs text-muted space-y-2">
                <i className="bi bi-arrow-repeat animate-spin text-2xl text-indigo inline-block" />
                <p>Đang tải danh sách thiết bị...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">
                Không tìm thấy phiên đăng nhập nào.
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      s.isCurrent
                        ? 'bg-indigo/10 border-indigo/40 ring-1 ring-indigo/30'
                        : 'bg-surface2/60 border-line hover:border-line/90'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 border ${
                          s.isCurrent
                            ? 'bg-indigo text-white border-indigo'
                            : 'bg-surface text-muted border-line'
                        }`}
                      >
                        <i
                          className={`bi ${
                            /phone|mobile|ios|android/i.test(s.device)
                              ? 'bi-phone'
                              : /tablet|ipad/i.test(s.device)
                              ? 'bi-tablet'
                              : 'bi-laptop'
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-ink truncate">
                            {s.browser} trên {s.device}
                          </span>
                          {s.isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo/20 text-indigo border border-indigo/30 shrink-0">
                              Thiết bị này
                            </span>
                          )}
                          {s.trusted && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                              Tin cậy
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-muted flex items-center gap-2 mt-1 flex-wrap">
                          <span>IP: {s.ipMasked}</span>
                          {s.country && (
                            <>
                              <span>•</span>
                              <span>{s.country}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>Hoạt động: {new Date(s.lastSeenAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    {!s.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(s.id)}
                        disabled={revokingSessionId === s.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface border border-line text-rose hover:bg-rose/10 hover:border-rose/30 transition btn-press self-end sm:self-auto shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {revokingSessionId === s.id ? (
                          <i className="bi bi-arrow-repeat animate-spin" />
                        ) : (
                          <i className="bi bi-box-arrow-right" />
                        )}
                        <span>Đăng xuất</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div className="pb-4 border-b border-line">
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <i className="bi bi-clock-history text-cyan" /> Nhật ký đăng nhập gần nhất
              </h2>
              <p className="text-xs text-muted mt-1">
                Lịch sử 20 lần đăng nhập gần nhất bao gồm cả những lần xác thực không thành công
              </p>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-muted space-y-2">
                <i className="bi bi-arrow-repeat animate-spin text-2xl text-cyan inline-block" />
                <p>Đang tải nhật ký...</p>
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">Chưa có nhật ký đăng nhập nào.</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {loginHistory.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-2xl bg-surface2/50 border border-line/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          h.success
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose/15 text-rose border-rose/30'
                        }`}
                      >
                        <i className={`bi ${h.success ? 'bi-check2' : 'bi-x-lg'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-ink truncate">
                          {h.browser} trên {h.device}
                        </div>
                        <div className="text-[11px] text-muted truncate">IP: {h.ipMasked}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-bold text-[11px] ${h.success ? 'text-emerald-400' : 'text-rose'}`}>
                        {h.success ? 'Thành công' : 'Thất bại'}
                      </div>
                      <div className="text-[10px] text-muted">{new Date(h.createdAt).toLocaleString('vi-VN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                  <i className="bi bi-download text-indigo" /> Tải dữ liệu cá nhân
                </h2>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Tải về toàn bộ dữ liệu tài khoản gồm hồ sơ, sổ coin, lịch sử nhiệm vụ, lệnh rút tiền và thiết bị dưới dạng file JSON.
                  Giới hạn 1 lần mỗi 24 giờ.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setExportPassword('');
                  setExportTotp('');
                  setExportModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-surface2 hover:bg-line border border-line text-ink transition btn-press shrink-0 flex items-center gap-2 self-start sm:self-auto"
              >
                <i className="bi bi-file-earmark-arrow-down" />
                <span>Tải dữ liệu của tôi</span>
              </button>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-rose/30 bg-rose/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-rose flex items-center gap-2">
                  <i className="bi bi-trash3-fill" /> Xóa tài khoản vĩnh viễn
                </h2>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Tài khoản sẽ được đưa vào hàng đợi chờ xóa trong 7 ngày. Bạn có thể hủy yêu cầu bất kỳ lúc nào bằng cách đăng nhập lại.
                  Sau 7 ngày, mọi dữ liệu nhận dạng cá nhân sẽ bị ẩn danh hóa vĩnh viễn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setDeletePassword('');
                  setDeleteTotp('');
                  setDeleteUsernameInput('');
                  setDeleteModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose hover:brightness-110 text-white transition btn-press shrink-0 flex items-center gap-2 self-start sm:self-auto shadow-md shadow-rose/25"
              >
                <i className="bi bi-person-x-fill" />
                <span>Yêu cầu xóa tài khoản</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Appearance & System */}
      {activeTab === 'appearance' && (
        <div className="space-y-6 animate-fade-in-up">
          {/* VNC Card Balance Customizer */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <i className="bi bi-credit-card-2-front-fill text-indigo" /> Tùy chỉnh thẻ số dư VNC
              </h2>
              <p className="text-xs text-muted mt-1">
                Xem trước và thay đổi màu nền, ảnh nền tùy chỉnh hoặc watermark in trên thẻ của bạn
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div className="w-full max-w-sm mx-auto">
                <BalanceCard />
              </div>
              <div className="w-full">
                <BalanceCardCustomizer />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-line space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
                <i className="bi bi-sliders text-cyan" /> Tùy chọn giao diện & Trải nghiệm
              </h2>
              <p className="text-xs text-muted mt-1">
                Cá nhân hóa chế độ hiển thị và âm thanh thông báo trên thiết bị của bạn
              </p>
            </div>

            <div className="space-y-4 w-full">
              {/* Theme selector */}
              <div className="flex items-center justify-between gap-3.5 p-4 rounded-2xl bg-surface2/60 border border-line">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-ink flex items-center gap-2">
                    <i className={`bi ${theme === 'dark' ? 'bi-moon-stars-fill text-indigo' : 'bi-sun-fill text-amber'} shrink-0`} />
                    <span className="truncate">Chế độ giao diện (Dark / Light)</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">
                    Hiện tại: {theme === 'dark' ? 'Giao diện Tối (Khuyên dùng)' : 'Giao diện Sáng'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    playClickSound();
                    toggleTheme();
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-surface border border-slate-300 dark:border-line text-ink hover:border-indigo transition btn-press flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <i className="bi bi-arrow-repeat text-indigo" />
                  <span>Đổi giao diện</span>
                </button>
              </div>

              {/* Sound effects */}
              <div className="flex items-center justify-between gap-3.5 p-4 rounded-2xl bg-surface2/60 border border-line">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-ink flex items-center gap-2">
                    <i className={`bi ${soundOn ? 'bi-volume-up-fill text-cyan' : 'bi-volume-mute-fill text-muted'} shrink-0`} />
                    <span className="truncate">Hiệu ứng âm thanh click & nhận quà</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5 leading-relaxed">
                    Âm thanh phản hồi khi bấm nút, hoàn thành nhiệm vụ và nhận VNC
                  </div>
                </div>
                <button
                  onClick={handleToggleSound}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition btn-press flex items-center gap-1.5 shrink-0 shadow-sm ${
                    soundOn
                      ? 'bg-cyan/15 border-cyan/40 text-cyan'
                      : 'bg-white dark:bg-surface border-slate-300 dark:border-line text-muted hover:text-ink'
                  }`}
                >
                  <i className={`bi ${soundOn ? 'bi-check2' : 'bi-x-lg'}`} />
                  <span>{soundOn ? 'Đang bật' : 'Đang tắt'}</span>
                </button>
              </div>

              {/* Language toggle */}
              <div className="flex items-center justify-between gap-3.5 p-4 rounded-2xl bg-surface2/60 border border-line">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-ink flex items-center gap-2">
                    <i className="bi bi-translate text-indigo shrink-0" />
                    <span className="truncate">Ngôn ngữ hiển thị</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">
                    Đổi giữa Tiếng Việt và English
                  </div>
                </div>
                <button
                  onClick={() => {
                    playClickSound();
                    toggleLanguage();
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-surface border border-slate-300 dark:border-line text-ink hover:border-indigo transition btn-press flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <i className="bi bi-globe" />
                  <span>{lang === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- AVATAR EDIT MODAL --- */}
      {avatarModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAvatarModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-surface border border-line shadow-2xl animate-scale-in flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[88vh] overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0 bg-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo/20 text-indigo flex items-center justify-center shrink-0">
                  <i className="bi bi-camera-fill text-base" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-base text-ink truncate">Chỉnh sửa Ảnh đại diện</h3>
                  <p className="text-xs text-muted truncate">Tùy biến avatar cho tài khoản {me?.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface2 transition shrink-0"
                aria-label="Đóng"
              >
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Preview Banner */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-surface2/60 border border-line/80 space-y-2.5">
                <div className="relative">
                  {previewAvatar ? (
                    <img
                      src={previewAvatar}
                      alt="Preview"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-indigo/40 shadow-xl"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-indigo to-cyan text-white flex items-center justify-center font-display font-bold text-3xl sm:text-4xl shadow-xl">
                      {me?.username?.slice(0, 2).toUpperCase() || 'VN'}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-ink">{me?.username}</div>
                  <div className="text-[11px] text-muted">
                    {previewAvatar ? 'Xem trước ảnh đại diện mới' : 'Avatar chữ cái mặc định'}
                  </div>
                </div>
              </div>

              {/* Presets Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>Chọn mẫu avatar có sẵn</span>
                  <span className="text-[10px] text-muted font-normal">8 kiểu độc đáo</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVATAR_PRESETS.map((preset, idx) => {
                    const isSelected = previewAvatar === preset.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset.url)}
                        title={preset.label}
                        className={`p-1 rounded-2xl border transition-all btn-press ${
                          isSelected
                            ? 'border-indigo bg-indigo/15 ring-2 ring-indigo shadow-md scale-105'
                            : 'border-line bg-surface hover:border-line/80 hover:bg-surface2'
                        }`}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-auto rounded-xl" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload or Custom URL */}
              <div className="space-y-3 pt-2 border-t border-line">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  {/* Upload from device */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-dashed border-indigo/50 bg-indigo/5 hover:bg-indigo/10 text-indigo text-xs font-semibold flex items-center justify-center gap-2 transition btn-press"
                  >
                    <i className="bi bi-cloud-arrow-up-fill text-base" />
                    <span>Tải ảnh từ máy tính / điện thoại</span>
                  </button>

                  {/* Reset to default */}
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="py-2.5 px-3 rounded-xl border border-line bg-surface2 hover:bg-line text-muted hover:text-ink text-xs font-semibold flex items-center justify-center gap-1.5 transition btn-press"
                    title="Dùng avatar chữ cái mặc định"
                  >
                    <i className="bi bi-arrow-counterclockwise" />
                    <span>Dùng avatar mặc định</span>
                  </button>
                </div>

                {/* Direct Image URL input */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted">Hoặc dán liên kết ảnh trực tiếp (URL)</label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={customAvatarInput}
                      onChange={(e) => handleCustomUrlChange(e.target.value)}
                      className="w-full bg-surface2 border border-line rounded-xl px-3.5 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
                    />
                    {customAvatarInput && (
                      <button
                        type="button"
                        onClick={() => handleCustomUrlChange('')}
                        className="absolute right-2.5 top-2 text-muted hover:text-ink text-xs"
                      >
                        <i className="bi bi-x-circle-fill" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions (Fixed at bottom) */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-line shrink-0 bg-surface/90 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink hover:bg-surface2 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveAvatar}
                disabled={savingAvatar}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo hover:brightness-110 text-white transition btn-press flex items-center gap-1.5 shadow-md shadow-indigo/25 disabled:opacity-50"
              >
                {savingAvatar ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg text-sm" />
                    <span>Lưu ảnh đại diện</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {regenerateInputModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRegenerateInputModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-surface border border-line p-6 shadow-2xl animate-scale-in space-y-5" role="dialog">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo/20 text-indigo flex items-center justify-center">
                  <i className="bi bi-shield-lock text-base" />
                </div>
                <h3 className="font-display font-bold text-base text-ink">Tạo lại 8 mã khôi phục 2FA</h3>
              </div>
              <button
                type="button"
                onClick={() => setRegenerateInputModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface2 transition"
              >
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Vui lòng nhập mã 6 số từ Google Authenticator để xác thực. Sau khi tạo mới, toàn bộ mã khôi phục cũ sẽ bị vô hiệu hóa ngay.
            </p>

            <form onSubmit={handleRegenerateRecoveryCodes} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Mã xác thực 2 bước (TOTP)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={regenerateTotpInput}
                  onChange={(e) => setRegenerateTotpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-center font-mono text-base tracking-widest text-ink focus:outline-none focus:border-indigo"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRegenerateInputModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink hover:bg-surface2 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={regeneratingCodes || regenerateTotpInput.length !== 6}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo hover:brightness-110 text-white transition btn-press flex items-center gap-1.5 shadow-md shadow-indigo/25 disabled:opacity-50"
                >
                  {regeneratingCodes ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-repeat" />
                      <span>Tạo mới ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {recoveryModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-surface border border-line p-6 shadow-2xl animate-scale-in space-y-5" role="dialog">
            <div className="flex items-center gap-2.5 border-b border-line pb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg">
                <i className="bi bi-key-fill" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-ink">8 Mã khôi phục dự phòng mới</h3>
                <p className="text-xs text-muted">Lưu lại ngay - Mã chỉ hiển thị MỘT lần duy nhất này</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber/10 border border-amber/30 text-xs text-amber leading-relaxed flex items-start gap-2.5">
              <i className="bi bi-exclamation-triangle-fill text-base shrink-0 mt-0.5" />
              <div>
                Mỗi mã khôi phục chỉ dùng được 1 lần để đăng nhập khi bạn mất thiết bị 2FA. Hãy lưu vào nơi an toàn hoặc tải file về máy.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-4 rounded-2xl bg-surface2 border border-line">
              {latestRecoveryCodes.map((c, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-surface border border-line/80 font-mono text-xs font-bold text-center text-ink tracking-wider select-all"
                >
                  {c}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyRecoveryCodes}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-line bg-surface2 hover:bg-line text-xs font-semibold text-ink transition btn-press flex items-center justify-center gap-1.5"
                >
                  <i className={`bi ${codesCopied ? 'bi-check2' : 'bi-clipboard'}`} />
                  <span>{codesCopied ? 'Đã sao chép' : 'Sao chép tất cả'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadRecoveryCodes}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-line bg-surface2 hover:bg-line text-xs font-semibold text-ink transition btn-press flex items-center justify-center gap-1.5"
                >
                  <i className="bi bi-download" />
                  <span>Tải .txt</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setRecoveryModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo hover:brightness-110 text-white transition btn-press flex items-center justify-center gap-1.5 shadow-md shadow-indigo/25"
              >
                <i className="bi bi-check2-circle text-sm" />
                <span>Tôi đã lưu an toàn</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {exportModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExportModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-surface border border-line p-6 shadow-2xl animate-scale-in space-y-5" role="dialog">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo/20 text-indigo flex items-center justify-center">
                  <i className="bi bi-download text-base" />
                </div>
                <h3 className="font-display font-bold text-base text-ink">Xác nhận tải dữ liệu cá nhân</h3>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface2 transition"
              >
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Để bảo vệ thông tin cá nhân, vui lòng nhập mật khẩu tài khoản (và mã xác thực 2 bước nếu có). File JSON sẽ được tải trực tiếp về thiết bị của bạn.
            </p>

            <form onSubmit={handleExportData} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Mật khẩu tài khoản</label>
                <input
                  type="password"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                  autoFocus
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-indigo"
                />
              </div>

              {twoFactorEnabled && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted">Mã 2FA (hoặc mã khôi phục)</label>
                  <input
                    type="text"
                    value={exportTotp}
                    onChange={(e) => setExportTotp(e.target.value)}
                    placeholder="Nhập mã 6 số hoặc mã khôi phục"
                    required
                    className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-indigo"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink hover:bg-surface2 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={exportingData || !exportPassword}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo hover:brightness-110 text-white transition btn-press flex items-center gap-1.5 shadow-md shadow-indigo/25 disabled:opacity-50"
                >
                  {exportingData ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin" />
                      <span>Đang chuẩn bị...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-download" />
                      <span>Tải file JSON</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {deleteModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModalOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-surface border border-rose/40 p-6 shadow-2xl animate-scale-in space-y-5" role="dialog">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose/20 text-rose flex items-center justify-center">
                  <i className="bi bi-exclamation-triangle-fill text-base" />
                </div>
                <h3 className="font-display font-bold text-base text-rose">Xác nhận yêu cầu xóa tài khoản</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface2 transition"
              >
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose/10 border border-rose/30 text-xs text-rose leading-relaxed space-y-1.5">
              <div><strong>Lưu ý quan trọng:</strong></div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                <li>Bạn sẽ có 7 ngày để hủy yêu cầu này bằng cách đăng nhập lại.</li>
                <li>Sau 7 ngày, email, username, avatar và thông tin xác thực sẽ bị ẩn danh hóa vĩnh viễn.</li>
                <li>Không thể xóa nếu đang có lệnh rút tiền, đổi quà hoặc đơn Vietsub Studio chờ duyệt.</li>
              </ul>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">Mật khẩu tài khoản</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                  autoFocus
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-rose"
                />
              </div>

              {twoFactorEnabled && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted">Mã 2FA (hoặc mã khôi phục)</label>
                  <input
                    type="text"
                    value={deleteTotp}
                    onChange={(e) => setDeleteTotp(e.target.value)}
                    placeholder="Nhập mã 6 số hoặc mã khôi phục"
                    required
                    className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-rose"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted">
                  Gõ lại tên đăng nhập <span className="text-ink font-bold font-mono">{me?.username}</span> để xác nhận:
                </label>
                <input
                  type="text"
                  value={deleteUsernameInput}
                  onChange={(e) => setDeleteUsernameInput(e.target.value)}
                  placeholder={me?.username || 'tên đăng nhập'}
                  required
                  className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-rose"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink hover:bg-surface2 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount || deleteUsernameInput.trim() !== me?.username}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose hover:brightness-110 text-white transition btn-press flex items-center gap-1.5 shadow-md shadow-rose/25 disabled:opacity-50"
                >
                  {deletingAccount ? (
                    <>
                      <i className="bi bi-arrow-repeat animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash3-fill" />
                      <span>Xác nhận xóa tài khoản</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
