import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export const PRESET_TRACKS: MusicTrack[] = [
  {
    id: 'lofi-1',
    title: 'Lofi Chill Study',
    artist: 'Chillhop Beats',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
  },
  {
    id: 'lofi-2',
    title: 'Peaceful Ambient Melody',
    artist: 'Deep Focus',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
  },
  {
    id: 'lofi-3',
    title: 'Synthwave Night Drive',
    artist: 'Retro Horizon',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=synthwave-80s-110045.mp3',
  },
  {
    id: 'lofi-4',
    title: 'Coffee Shop Acoustic',
    artist: 'Acoustic Morning',
    url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77cd0.mp3?filename=acoustic-guitar-loop-f-91bpm-124037.mp3',
  },
];

interface MusicContextValue {
  enabled: boolean;
  isPlaying: boolean;
  url: string;
  trackTitle: string;
  volume: number;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  setVolume: (v: number) => void;
  setTrack: (track: MusicTrack) => void;
  setCustomUrl: (url: string, title?: string) => void;
  toggleEnabled: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

const STORAGE_KEY = 'vnd_web_music_settings';

export function MusicProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).enabled ?? true;
    } catch {}
    return true;
  });

  const [url, setUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).url || PRESET_TRACKS[0].url;
    } catch {}
    return PRESET_TRACKS[0].url;
  });

  const [trackTitle, setTrackTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).trackTitle || PRESET_TRACKS[0].title;
    } catch {}
    return PRESET_TRACKS[0].title;
  });

  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return Number(JSON.parse(saved).volume) || 0.4;
    } catch {}
    return 0.4;
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ enabled, url, trackTitle, volume })
      );
    } catch {}
  }, [enabled, url, trackTitle, volume]);

  // Sync volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  function play() {
    if (!enabled || !url) return;
    const audio = audioRef.current;
    if (audio) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }

  function pause() {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function setVolume(v: number) {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }

  function setTrack(track: MusicTrack) {
    setUrl(track.url);
    setTrackTitle(track.title);
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }

  function setCustomUrl(newUrl: string, title = 'Nhạc tùy chỉnh') {
    const trimmed = newUrl.trim();
    setUrl(trimmed);
    setTrackTitle(trimmed ? title : 'Chưa chọn nhạc');
    if (audioRef.current) {
      audioRef.current.src = trimmed;
      if (trimmed) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        pause();
      }
    }
  }

  function toggleEnabled() {
    setEnabled((prev) => {
      const next = !prev;
      if (!next) pause();
      return next;
    });
  }

  return (
    <MusicContext.Provider
      value={{
        enabled,
        isPlaying,
        url,
        trackTitle,
        volume,
        togglePlay,
        play,
        pause,
        setVolume,
        setTrack,
        setCustomUrl,
        toggleEnabled,
      }}
    >
      {/* Hidden background audio element */}
      {url && (
        <audio
          ref={audioRef}
          src={url}
          loop
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}
