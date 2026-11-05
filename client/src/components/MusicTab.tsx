import { Link } from 'react-router-dom';
import { useMusic } from '../context/MusicContext.js';
import { playClickSound } from '../utils/sound.js';

export default function MusicTab() {
  const { isPlaying, togglePlay, currentTrack, trackTitle, enabled, nextTrack, showMiniPlayer, setShowMiniPlayer } = useMusic();

  if (!enabled) return null;

  const sourceType = currentTrack?.type || 'audio';

  return (
    <div
      className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all text-xs ${
        isPlaying
          ? 'bg-indigo/15 border-indigo/40 text-indigo shadow-[0_0_15px_rgba(85,167,255,0.2)]'
          : 'bg-surface2/60 border-line/60 text-muted hover:text-ink hover:border-line'
      }`}
    >
      {/* Source icon badge */}
      {sourceType === 'youtube' ? (
        <span className="text-red-500 font-bold flex items-center" title="YouTube">
          <i className="bi bi-youtube text-sm" />
        </span>
      ) : sourceType === 'spotify' ? (
        <span className="text-emerald-400 font-bold flex items-center" title="Spotify">
          <i className="bi bi-spotify text-sm" />
        </span>
      ) : (
        <span className="text-indigo font-bold flex items-center" title="MP3 Audio">
          <i className="bi bi-music-note-beamed text-xs" />
        </span>
      )}

      {/* Equalizer / Play button */}
      <button
        onClick={() => {
          playClickSound();
          togglePlay();
        }}
        aria-label={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc nền'}
        className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
        title={isPlaying ? 'Nhấn để tạm dừng' : 'Nhấn để phát nhạc'}
      >
        {isPlaying ? (
          <span className="flex items-end gap-[2px] h-3.5 w-3 px-0.5">
            <span className="w-1 bg-indigo rounded-full animate-bounce h-2" style={{ animationDuration: '0.6s' }} />
            <span className="w-1 bg-cyan rounded-full animate-bounce h-3.5" style={{ animationDuration: '0.4s' }} />
            <span className="w-1 bg-indigo rounded-full animate-bounce h-2.5" style={{ animationDuration: '0.8s' }} />
          </span>
        ) : (
          <i className="bi bi-play-fill text-muted text-sm" />
        )}
      </button>

      {/* Track Title */}
      <span className="max-w-[100px] lg:max-w-[140px] truncate font-medium text-[11px] select-none text-ink">
        {trackTitle}
      </span>

      {/* Next track button */}
      <button
        onClick={() => {
          playClickSound();
          nextTrack();
        }}
        title="Bài tiếp theo"
        className="text-muted hover:text-ink transition p-0.5"
      >
        <i className="bi bi-skip-forward-fill text-xs" />
      </button>

      {/* Mini player toggle (PIP for YouTube / Spotify) */}
      {(sourceType === 'youtube' || sourceType === 'spotify') && (
        <button
          onClick={() => {
            playClickSound();
            setShowMiniPlayer(!showMiniPlayer);
          }}
          title={showMiniPlayer ? 'Ẩn màn hình nhỏ' : 'Hiện màn hình phát nhỏ (PIP)'}
          className={`p-0.5 transition ${showMiniPlayer ? 'text-indigo' : 'text-muted hover:text-ink'}`}
        >
          <i className="bi bi-pip text-xs" />
        </button>
      )}

      {/* Settings shortcut to Profile */}
      <Link
        to="/profile?tab=music"
        onClick={playClickSound}
        title="Tùy chỉnh danh sách nhạc trên Profile"
        className="text-muted hover:text-indigo p-0.5 transition"
      >
        <i className="bi bi-sliders text-xs" />
      </Link>
    </div>
  );
}
