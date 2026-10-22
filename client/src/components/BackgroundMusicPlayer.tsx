import { useEffect, useRef } from 'react';
import { useMusic } from '../context/MusicContext.js';
import { playClickSound } from '../utils/sound.js';
import { Link } from 'react-router-dom';

export default function BackgroundMusicPlayer() {
  const {
    enabled,
    isPlaying,
    currentTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    showMiniPlayer,
    setShowMiniPlayer,
    removeTrack,
  } = useMusic();

  const panelRef = useRef<HTMLDivElement>(null);

  // Dynamically measure the control panel height to offset YouTube video shell perfectly
  useEffect(() => {
    if (!showMiniPlayer || !panelRef.current) return;
    const updateHeight = () => {
      if (panelRef.current) {
        document.documentElement.style.setProperty(
          '--vnd-music-panel-height',
          `${panelRef.current.offsetHeight}px`
        );
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(panelRef.current);
    return () => {
      ro.disconnect();
    };
  }, [showMiniPlayer, currentTrack]);

  if (!enabled || !currentTrack) return null;

  const sourceType = currentTrack.type;

  return (
    <>
      {/* Floating Mini-Player for Spotify & Audio / Controls (when showMiniPlayer is active) */}
      {showMiniPlayer && (
        <div
          ref={panelRef}
          id="vnd-music-control-panel"
          className="fixed bottom-20 sm:bottom-24 right-3 sm:right-4 z-40 w-80 max-w-[calc(100vw-24px)] max-h-[82vh] overflow-y-auto rounded-3xl bg-surface/95 border border-line p-3 shadow-2xl backdrop-blur-xl animate-scale-in"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-line text-xs min-w-0">
            <div className="flex items-center gap-1.5 font-semibold text-ink truncate min-w-0 flex-1 mr-2">
              {sourceType === 'youtube' && <i className="bi bi-youtube text-red-500 shrink-0" />}
              {sourceType === 'spotify' && <i className="bi bi-spotify text-emerald-400 shrink-0" />}
              {sourceType === 'audio' && <i className="bi bi-music-note-beamed text-indigo shrink-0" />}
              <span className="truncate">{currentTrack.title}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to="/profile?tab=music"
                onClick={playClickSound}
                className="w-8 h-8 min-w-[32px] min-h-[32px] sm:w-7 sm:h-7 rounded-lg hover:bg-surface2 text-muted hover:text-ink flex items-center justify-center transition"
                title="Quản lý danh sách nhạc"
                aria-label="Quản lý danh sách nhạc"
              >
                <i className="bi bi-sliders text-xs" />
              </Link>
              <button
                onClick={() => {
                  playClickSound();
                  setShowMiniPlayer(false);
                }}
                className="w-8 h-8 min-w-[32px] min-h-[32px] sm:w-7 sm:h-7 rounded-lg hover:bg-surface2 text-muted hover:text-ink flex items-center justify-center transition"
                title="Thu nhỏ"
                aria-label="Thu nhỏ"
              >
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>
          </div>

          {/* If Spotify: Embed Player */}
          {sourceType === 'spotify' && currentTrack.spotifyEmbedUrl && (
            <div className="overflow-hidden rounded-2xl mb-2">
              <iframe
                src={currentTrack.spotifyEmbedUrl}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-2xl w-full"
                title="Spotify Embed"
              />
            </div>
          )}

          {/* Player controls */}
          <div className="flex items-center justify-between gap-2 pt-0.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {currentTrack.thumbnail && sourceType !== 'spotify' ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-10 h-10 rounded-xl object-cover shrink-0 border border-line"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-surface2 border border-line text-indigo flex items-center justify-center shrink-0">
                  <i className={`bi ${isPlaying ? 'bi-soundwave animate-pulse' : 'bi-music-note-beamed'} text-base`} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-ink truncate" title={currentTrack.title}>
                  {currentTrack.title}
                </div>
                <div className="text-[10px] text-muted truncate mt-0.5">{currentTrack.artist}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  playClickSound();
                  prevTrack();
                }}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted hover:text-ink rounded-xl hover:bg-surface2 transition"
                title="Bài trước"
                aria-label="Bài trước"
              >
                <i className="bi bi-skip-backward-fill text-xs" />
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  togglePlay();
                }}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-indigo text-white flex items-center justify-center transition hover:brightness-110 shadow-sm"
                title={isPlaying ? 'Tạm dừng' : 'Phát'}
                aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'} text-sm`} />
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  nextTrack();
                }}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted hover:text-ink rounded-xl hover:bg-surface2 transition"
                title="Bài sau"
                aria-label="Bài sau"
              >
                <i className="bi bi-skip-forward-fill text-xs" />
              </button>

              {/* Nút xoá bài đang phát */}
              <button
                onClick={() => {
                  playClickSound();
                  removeTrack(currentTrack.id);
                }}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted hover:text-rose hover:bg-rose/10 rounded-xl transition"
                title="Xóa bài này khỏi danh sách"
                aria-label="Xóa bài này khỏi danh sách"
              >
                <i className="bi bi-trash text-sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Mobile only since desktop has header MusicTab, hidden when mini-player is open) */}
      {!showMiniPlayer && (
        <div className="fixed bottom-20 right-3.5 z-40 flex items-center gap-2 md:hidden">
          {(sourceType === 'youtube' || sourceType === 'spotify') && (
            <button
              onClick={() => {
                playClickSound();
                setShowMiniPlayer(true);
              }}
              title="Mở màn hình nhỏ"
              aria-label="Mở màn hình nhỏ"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-surface2/90 border border-line text-muted hover:text-ink shadow-lg flex items-center justify-center transition btn-press backdrop-blur-md"
            >
              <i className="bi bi-pip text-sm" />
            </button>
          )}

          <button
            onClick={() => {
              playClickSound();
              togglePlay();
            }}
            aria-label={isPlaying ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
            title={isPlaying ? `Đang phát: ${currentTrack.title}` : 'Bật nhạc nền'}
            className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-full text-white shadow-xl flex items-center justify-center transition btn-press border border-line ${
              isPlaying
                ? 'bg-gradient-to-tr from-indigo to-cyan shadow-[0_0_20px_rgba(85,167,255,0.4)] animate-pulse-soft'
                : 'bg-surface2/90 text-muted hover:text-ink hover:bg-surface2'
            }`}
          >
            <i
              className={`bi text-base ${
                isPlaying
                  ? sourceType === 'youtube'
                    ? 'bi-youtube text-red-400'
                    : sourceType === 'spotify'
                    ? 'bi-spotify text-emerald-400'
                    : 'bi-music-note-beamed text-white'
                  : 'bi-music-note text-muted'
              }`}
            />
          </button>
        </div>
      )}
    </>
  );
}
