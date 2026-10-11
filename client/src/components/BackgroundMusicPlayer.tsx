import { useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext.js';

export default function BackgroundMusicPlayer() {
  const { musicUrl } = useSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  if (!musicUrl) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40">
      <audio ref={audioRef} src={musicUrl} loop />
      <button
        onClick={toggle}
        aria-label={playing ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        title={playing ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        className={`w-11 h-11 rounded-full text-white shadow-xl flex items-center justify-center transition btn-press border border-white/20 ${
          playing
            ? 'bg-gradient-to-tr from-indigo to-cyan shadow-[0_0_20px_rgba(108,99,245,0.4)] animate-pulse-soft'
            : 'bg-surface2/90 text-muted hover:text-ink hover:bg-surface2'
        }`}
      >
        <i className={`bi text-base ${playing ? 'bi-music-note-beamed text-white' : 'bi-music-note text-muted'}`} />
      </button>
    </div>
  );
}
