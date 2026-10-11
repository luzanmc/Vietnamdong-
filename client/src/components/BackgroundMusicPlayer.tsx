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
    <div className="fixed bottom-5 right-5 z-40">
      <audio ref={audioRef} src={musicUrl} loop />
      <button
        onClick={toggle}
        aria-label={playing ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
        className="w-11 h-11 rounded-full bg-indigo text-white shadow-lg flex items-center justify-center hover:brightness-110 transition"
      >
        <i className={`bi ${playing ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`} />
      </button>
    </div>
  );
}
