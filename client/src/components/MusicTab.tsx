import { Link } from 'react-router-dom';
import { useMusic } from '../context/MusicContext.js';
import { playClickSound } from '../utils/sound.js';

export default function MusicTab() {
  const { isPlaying, togglePlay, trackTitle, enabled } = useMusic();

  if (!enabled) return null;

  return (
    <div
      className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all text-xs ${
        isPlaying
          ? 'bg-indigo/15 border-indigo/40 text-indigo shadow-[0_0_15px_rgba(85,167,255,0.2)]'
          : 'bg-surface2/60 border-line/60 text-muted hover:text-ink hover:border-line'
      }`}
    >
      {/* Equalizer animation when playing */}
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
          <i className="bi bi-music-note-beamed text-muted text-xs" />
        )}

        <i className={`bi ${isPlaying ? 'bi-pause-fill text-indigo' : 'bi-play-fill text-muted'} text-sm`} />
      </button>

      {/* Track Title */}
      <span className="max-w-[110px] lg:max-w-[150px] truncate font-medium text-[11px] select-none text-ink">
        {trackTitle}
      </span>

      {/* Settings shortcut to Profile */}
      <Link
        to="/profile?tab=music"
        onClick={playClickSound}
        title="Tùy chỉnh nhạc nền trên Profile"
        className="text-muted hover:text-indigo p-0.5 transition"
      >
        <i className="bi bi-sliders text-xs" />
      </Link>
    </div>
  );
}
