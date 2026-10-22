import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';

export type MusicSourceType = 'audio' | 'youtube' | 'spotify';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  type: MusicSourceType;
  thumbnail?: string;
  youtubeId?: string;
  spotifyEmbedUrl?: string;
}

export const PRESET_TRACKS: MusicTrack[] = [
  {
    id: 'preset-lofi-1',
    title: 'Lofi Chill Study Beats',
    artist: 'Chillhop Beats',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    type: 'audio',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-lofi-2',
    title: 'Peaceful Ambient Melody',
    artist: 'Deep Focus',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    type: 'audio',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-lofi-3',
    title: 'Synthwave Night Drive',
    artist: 'Retro Horizon',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=synthwave-80s-110045.mp3',
    type: 'audio',
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-lofi-4',
    title: 'Coffee Shop Acoustic',
    artist: 'Acoustic Morning',
    url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77cd0.mp3?filename=acoustic-guitar-loop-f-91bpm-124037.mp3',
    type: 'audio',
    thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'preset-yt-1',
    title: 'lofi hip hop radio - beats to relax/study to',
    artist: 'Lofi Girl',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    type: 'youtube',
    youtubeId: 'jfKfPfyJRdk',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
  },
];

export function detectTrackType(url: string): MusicSourceType {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    return 'youtube';
  }
  if (trimmed.includes('spotify.com') || trimmed.startsWith('spotify:')) {
    return 'spotify';
  }
  return 'audio';
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

export function extractSpotifyEmbedUrl(url: string): string | null {
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|artist|episode)\/([a-zA-Z0-9]+)/i);
  if (match) {
    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator`;
  }
  return null;
}

export async function fetchTrackMetadata(rawUrl: string): Promise<{
  title: string;
  artist: string;
  thumbnail?: string;
  type: MusicSourceType;
  youtubeId?: string;
  spotifyEmbedUrl?: string;
}> {
  const trimmed = rawUrl.trim();
  const type = detectTrackType(trimmed);

  if (type === 'youtube') {
    const ytId = extractYouTubeId(trimmed);
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(trimmed)}&format=json`);
      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title || 'YouTube Track',
          artist: data.author_name || 'YouTube',
          thumbnail: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : data.thumbnail_url,
          type: 'youtube',
          youtubeId: ytId || undefined,
        };
      }
    } catch {}
    return {
      title: 'YouTube Track',
      artist: 'YouTube',
      thumbnail: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined,
      type: 'youtube',
      youtubeId: ytId || undefined,
    };
  }

  if (type === 'spotify') {
    const embedUrl = extractSpotifyEmbedUrl(trimmed);
    try {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title || 'Spotify Track',
          artist: 'Spotify',
          thumbnail: data.thumbnail_url,
          type: 'spotify',
          spotifyEmbedUrl: embedUrl || undefined,
        };
      }
    } catch {}
    return {
      title: 'Spotify Track',
      artist: 'Spotify',
      type: 'spotify',
      spotifyEmbedUrl: embedUrl || undefined,
    };
  }

  // Direct Audio MP3 link
  const cleanName = trimmed.split('/').pop()?.split('?')[0]?.replace(/[-_]/g, ' ').replace(/\.mp3$/i, '') || 'Nhạc âm thanh';
  return {
    title: decodeURIComponent(cleanName),
    artist: 'Audio Stream',
    type: 'audio',
  };
}

export interface MusicContextValue {
  enabled: boolean;
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  tracks: MusicTrack[];
  url: string;
  trackTitle: string;
  volume: number;
  showMiniPlayer: boolean;
  setShowMiniPlayer: (s: boolean) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  setVolume: (v: number) => void;
  setTrack: (track: MusicTrack) => void;
  addTrack: (track: Omit<MusicTrack, 'id'>) => MusicTrack;
  removeTrack: (id: string) => void;
  resetTracks: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setCustomUrl: (url: string, title?: string) => void;
  toggleEnabled: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

const STORAGE_KEY_PLAYLIST = 'vnd_web_playlist_v2';
const STORAGE_KEY_SETTINGS = 'vnd_web_music_settings_v2';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export function MusicProvider({ children }: { children: ReactNode }) {
  // Playlist state
  const [tracks, setTracks] = useState<MusicTrack[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYLIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return PRESET_TRACKS;
  });

  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return JSON.parse(saved).enabled ?? true;
    } catch {}
    return true;
  });

  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) return Number(JSON.parse(saved).volume) || 0.4;
    } catch {}
    return 0.4;
  });

  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.currentTrackId) {
          const found = tracks.find((t) => t.id === parsed.currentTrackId);
          if (found) return found;
        }
      }
    } catch {}
    return tracks[0] || null;
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef<boolean>(false);

  // Sync playlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYLIST, JSON.stringify(tracks));
    } catch {}
  }, [tracks]);

  // Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SETTINGS,
        JSON.stringify({
          enabled,
          volume,
          currentTrackId: currentTrack?.id,
        })
      );
    } catch {}
  }, [enabled, volume, currentTrack]);

  // Sync volume to audio element & YouTube
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (ytPlayerRef.current && ytReadyRef.current && ytPlayerRef.current.setVolume) {
      try {
        ytPlayerRef.current.setVolume(Math.round(volume * 100));
      } catch {}
    }
  }, [volume]);

  // Initialize YouTube Iframe Player
  useEffect(() => {
    let checkInterval: any = null;

    function initYT() {
      if (!window.YT || !window.YT.Player) return false;
      const host = document.getElementById('vnd-yt-player-host');
      if (!host) return false;

      try {
        ytPlayerRef.current = new window.YT.Player('vnd-yt-player-host', {
          height: '100%',
          width: '100%',
          videoId: currentTrack?.youtubeId || 'jfKfPfyJRdk',
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            loop: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              ytReadyRef.current = true;
              try {
                event.target.setVolume(Math.round(volume * 100));
              } catch {}
            },
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                // Auto next track
                nextTrack();
              }
            },
          },
        });
        return true;
      } catch {
        return false;
      }
    }

    if (!initYT()) {
      checkInterval = setInterval(() => {
        if (initYT()) {
          clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  function play() {
    if (!enabled || !currentTrack) return;

    if (currentTrack.type === 'youtube') {
      if (audioRef.current) audioRef.current.pause();
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch {
          setIsPlaying(false);
        }
      }
    } else if (currentTrack.type === 'audio') {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    } else if (currentTrack.type === 'spotify') {
      if (audioRef.current) audioRef.current.pause();
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      setIsPlaying(true);
    }
  }

  function pause() {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (ytPlayerRef.current && ytReadyRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {}
    }
    setIsPlaying(false);
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
    if (ytPlayerRef.current && ytReadyRef.current && ytPlayerRef.current.setVolume) {
      try {
        ytPlayerRef.current.setVolume(Math.round(clamped * 100));
      } catch {}
    }
  }

  function setTrack(track: MusicTrack) {
    setCurrentTrack(track);

    if (track.type === 'youtube') {
      if (audioRef.current) audioRef.current.pause();
      const ytId = track.youtubeId || extractYouTubeId(track.url);
      if (ytPlayerRef.current && ytReadyRef.current && ytId) {
        try {
          ytPlayerRef.current.loadVideoById(ytId);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch {}
      }
    } else if (track.type === 'audio') {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } else if (track.type === 'spotify') {
      if (audioRef.current) audioRef.current.pause();
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      setIsPlaying(true);
    }
  }

  function addTrack(trackData: Omit<MusicTrack, 'id'>): MusicTrack {
    const newTrack: MusicTrack = {
      ...trackData,
      id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      youtubeId: trackData.youtubeId || (trackData.type === 'youtube' ? extractYouTubeId(trackData.url) || undefined : undefined),
      spotifyEmbedUrl: trackData.spotifyEmbedUrl || (trackData.type === 'spotify' ? extractSpotifyEmbedUrl(trackData.url) || undefined : undefined),
    };

    setTracks((prev) => [newTrack, ...prev]);
    setTrack(newTrack);
    return newTrack;
  }

  function removeTrack(id: string) {
    setTracks((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (currentTrack?.id === id) {
        if (filtered.length > 0) {
          const oldIdx = prev.findIndex((t) => t.id === id);
          const nextT = filtered[oldIdx % filtered.length] || filtered[0];
          setTrack(nextT);
        } else {
          pause();
          setCurrentTrack(null);
          setShowMiniPlayer(false);
        }
      }
      return filtered;
    });
  }

  function resetTracks() {
    setTracks(PRESET_TRACKS);
    setTrack(PRESET_TRACKS[0]);
  }

  function nextTrack() {
    if (tracks.length === 0) return;
    const currentIdx = tracks.findIndex((t) => t.id === currentTrack?.id);
    const nextIdx = (currentIdx + 1) % tracks.length;
    setTrack(tracks[nextIdx]);
  }

  function prevTrack() {
    if (tracks.length === 0) return;
    const currentIdx = tracks.findIndex((t) => t.id === currentTrack?.id);
    const prevIdx = (currentIdx - 1 + tracks.length) % tracks.length;
    setTrack(tracks[prevIdx]);
  }

  function setCustomUrl(newUrl: string, title = 'Nhạc tùy chỉnh') {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    const type = detectTrackType(trimmed);
    const ytId = extractYouTubeId(trimmed);
    const spotifyEmbed = extractSpotifyEmbedUrl(trimmed);
    addTrack({
      title,
      artist: type === 'youtube' ? 'YouTube' : type === 'spotify' ? 'Spotify' : 'Tùy chỉnh',
      url: trimmed,
      type,
      youtubeId: ytId || undefined,
      spotifyEmbedUrl: spotifyEmbed || undefined,
      thumbnail: ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined,
    });
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
        currentTrack,
        tracks,
        url: currentTrack?.url || '',
        trackTitle: currentTrack?.title || 'Chưa chọn nhạc',
        volume,
        showMiniPlayer,
        setShowMiniPlayer,
        togglePlay,
        play,
        pause,
        setVolume,
        setTrack,
        addTrack,
        removeTrack,
        resetTracks,
        nextTrack,
        prevTrack,
        setCustomUrl,
        toggleEnabled,
      }}
    >
      {/* Hidden audio element for MP3 playback */}
      {currentTrack?.type === 'audio' && currentTrack.url && (
        <audio
          ref={audioRef}
          src={currentTrack.url}
          loop
          onEnded={nextTrack}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}

      {/* Persistent YouTube Iframe container - active in DOM */}
      <div
        id="vnd-yt-player-shell"
        style={{
          position: 'fixed',
          bottom: showMiniPlayer && currentTrack?.type === 'youtube' ? 'calc(5rem + 7.5rem)' : '-9999px',
          right: '12px',
          width: 'min(320px, calc(100vw - 24px))',
          aspectRatio: '16 / 9',
          zIndex: showMiniPlayer && currentTrack?.type === 'youtube' ? 45 : -10,
          opacity: showMiniPlayer && currentTrack?.type === 'youtube' ? 1 : 0.001,
          pointerEvents: showMiniPlayer && currentTrack?.type === 'youtube' ? 'auto' : 'none',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
        className="border border-line bg-black relative"
      >
        {showMiniPlayer && currentTrack?.type === 'youtube' && (
          <button
            onClick={() => setShowMiniPlayer(false)}
            aria-label="Ẩn video"
            title="Ẩn video"
            className="absolute top-2 right-2 z-20 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition"
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
        <div id="vnd-yt-player-host" className="w-full h-full" />
      </div>

      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
}
