import { Link } from 'react-router-dom';
import { useMusic } from '../context/MusicContext.js';
import { playClickSound } from '../utils/sound.js';
import {
  IconBrandYoutube,
  IconBrandSpotify,
  IconMusic,
  IconPlayerPlay,
  IconPlayerTrackNext,
  IconPictureInPicture,
  IconAdjustmentsHorizontal,
} from '@tabler/icons-react';

export default function MusicTab() {
  const {
    isPlaying,
    togglePlay,
    currentTrack,
    trackTitle,
    enabled,
    nextTrack,
    showMiniPlayer,
    setShowMiniPlayer,
  } = useMusic();

  if (!enabled) return null;

  const sourceType = currentTrack?.type || 'audio';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill border transition-all text-xs shadow-md ${
        isPlaying
          ? 'border-sky-500/40 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
          : 'border-white/10 text-zinc-400 hover:text-white'
      }`}
    >
      {/* Source icon badge */}
      {sourceType === 'youtube' ? (
        <span className="text-red-500 font-bold flex items-center" title="YouTube">
          <IconBrandYoutube size={16} />
        </span>
      ) : sourceType === 'spotify' ? (
        <span className="text-emerald-400 font-bold flex items-center" title="Spotify">
          <IconBrandSpotify size={16} />
        </span>
      ) : (
        <span className="text-sky-400 font-bold flex items-center" title="Audio">
          <IconMusic size={15} />
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
            <span
              className="w-1 bg-sky-400 rounded-full animate-bounce h-2"
              style={{ animationDuration: '0.6s' }}
            />
            <span
              className="w-1 bg-cyan-300 rounded-full animate-bounce h-3.5"
              style={{ animationDuration: '0.4s' }}
            />
            <span
              className="w-1 bg-sky-400 rounded-full animate-bounce h-2.5"
              style={{ animationDuration: '0.8s' }}
            />
          </span>
        ) : (
          <IconPlayerPlay size={14} className="text-zinc-400 hover:text-white" />
        )}
      </button>

      {/* Track Title */}
      <span className="max-w-[90px] sm:max-w-[130px] truncate font-medium text-[11px] select-none text-white">
        {trackTitle}
      </span>

      {/* Next track button */}
      <button
        onClick={() => {
          playClickSound();
          nextTrack();
        }}
        title="Bài tiếp theo"
        className="text-zinc-400 hover:text-white transition p-0.5"
      >
        <IconPlayerTrackNext size={14} />
      </button>

      {/* Mini player toggle (PIP for YouTube / Spotify) */}
      {(sourceType === 'youtube' || sourceType === 'spotify') && (
        <button
          onClick={() => {
            playClickSound();
            setShowMiniPlayer(!showMiniPlayer);
          }}
          title={showMiniPlayer ? 'Ẩn màn hình nhỏ' : 'Hiện màn hình phát nhỏ (PIP)'}
          className={`p-0.5 transition ${showMiniPlayer ? 'text-sky-400' : 'text-zinc-400 hover:text-white'}`}
        >
          <IconPictureInPicture size={14} />
        </button>
      )}

      {/* Settings shortcut to Profile */}
      <Link
        to="/profile?tab=music"
        onClick={playClickSound}
        title="Tùy chỉnh danh sách nhạc"
        className="text-zinc-400 hover:text-sky-400 p-0.5 transition"
      >
        <IconAdjustmentsHorizontal size={14} />
      </Link>
    </div>
  );
}
