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
  } = useMusic();

  if (!enabled || !currentTrack) return null;

  const sourceType = currentTrack.type;

  return (
    <>
      {/* Floating Mini-Player for Spotify & Audio / Controls (when showMiniPlayer is active) */}
      {showMiniPlayer && (
        <div className="fixed bottom-24 right-4 z-40 w-80 max-w-[calc(100vw-32px)] rounded-3xl bg-surface/95 border border-line p-3 shadow-2xl backdrop-blur-xl animate-scale-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-line text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-ink truncate">
              {sourceType === 'youtube' && <i className="bi bi-youtube text-red-500" />}
              {sourceType === 'spotify' && <i className="bi bi-spotify text-emerald-400" />}
              {sourceType === 'audio' && <i className="bi bi-music-note-beamed text-indigo" />}
              <span className="truncate">{currentTrack.title}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                to="/profile?tab=music"
                onClick={playClickSound}
                className="p-1 rounded-lg hover:bg-surface2 text-muted hover:text-ink transition"
                title="Quản lý danh sách nhạc"
              >
                <i className="bi bi-sliders text-xs" />
              </Link>
              <button
                onClick={() => {
                  playClickSound();
                  setShowMiniPlayer(false);
                }}
                className="p-1 rounded-lg hover:bg-surface2 text-muted hover:text-ink transition"
                title="Thu nhỏ"
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
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              {currentTrack.thumbnail && sourceType !== 'spotify' && (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-9 h-9 rounded-xl object-cover shrink-0 border border-line"
                />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-ink truncate">{currentTrack.title}</div>
                <div className="text-[10px] text-muted truncate">{currentTrack.artist}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  playClickSound();
                  prevTrack();
                }}
                className="p-1.5 text-muted hover:text-ink rounded-lg transition"
                title="Bài trước"
              >
                <i className="bi bi-skip-backward-fill text-xs" />
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  togglePlay();
                }}
                className="w-8 h-8 rounded-xl bg-indigo text-white flex items-center justify-center transition hover:brightness-110 shadow-sm"
                title={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'} text-sm`} />
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  nextTrack();
                }}
                className="p-1.5 text-muted hover:text-ink rounded-lg transition"
                title="Bài sau"
              >
                <i className="bi bi-skip-forward-fill text-xs" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Mobile always, Desktop if mini-player closed) */}
      <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2">
        {(sourceType === 'youtube' || sourceType === 'spotify') && !showMiniPlayer && (
          <button
            onClick={() => {
              playClickSound();
              setShowMiniPlayer(true);
            }}
            title="Mở màn hình nhỏ"
            className="w-9 h-9 rounded-full bg-surface2/90 border border-line text-muted hover:text-ink shadow-lg flex items-center justify-center transition btn-press backdrop-blur-md"
          >
            <i className="bi bi-pip text-xs" />
          </button>
        )}

        <button
          onClick={() => {
            playClickSound();
            togglePlay();
          }}
          aria-label={isPlaying ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
          title={isPlaying ? `Đang phát: ${currentTrack.title}` : 'Bật nhạc nền'}
          className={`w-10 h-10 rounded-full text-white shadow-xl flex items-center justify-center transition btn-press border border-line ${
            isPlaying
              ? 'bg-gradient-to-tr from-indigo to-cyan shadow-[0_0_20px_rgba(85,167,255,0.4)] animate-pulse-soft'
              : 'bg-surface2/90 text-muted hover:text-ink hover:bg-surface2'
          }`}
        >
          <i
            className={`bi text-sm ${
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
    </>
  );
}
