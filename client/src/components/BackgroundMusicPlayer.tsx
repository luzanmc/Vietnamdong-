import { useMusic } from '../context/MusicContext.js';
import { playClickSound } from '../utils/sound.js';

export default function BackgroundMusicPlayer() {
  const { enabled, isPlaying, togglePlay } = useMusic();

  if (!enabled) return null;

  return (
    <div className="md:hidden fixed bottom-20 right-4 z-40">
      <button
        onClick={() => {
          playClickSound();
          togglePlay();
        }}
        aria-label={isPlaying ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        title={isPlaying ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        className={`w-10 h-10 rounded-full text-white shadow-xl flex items-center justify-center transition btn-press border border-line ${
          isPlaying
            ? 'bg-gradient-to-tr from-indigo to-cyan shadow-[0_0_20px_rgba(85,167,255,0.4)] animate-pulse-soft'
            : 'bg-surface2/90 text-muted hover:text-ink hover:bg-surface2'
        }`}
      >
        <i
          className={`bi text-sm ${
            isPlaying ? 'bi-music-note-beamed text-white' : 'bi-music-note text-muted'
          }`}
        />
      </button>
    </div>
  );
}
