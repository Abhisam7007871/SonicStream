import { create } from 'zustand';

interface Track {
  id: string | number;
  title: string;
  artist: string;
  albumArt?: string;
  cover?: string;
  url: string;
  source?: 'audiomack' | 'internal' | 'itunes' | 'youtube' | 'internetarchive';
}

type AudioQuality = '48kbps' | '128kbps' | '256kbps' | '320kbps' | 'FLAC';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  quality: AudioQuality;
  queue: Track[];
  audiomackUrl: string | null;
  isShuffle: boolean;
  isRepeat: boolean;

  // Actions
  setCurrentTrack: (track: Track) => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setQuality: (quality: AudioQuality) => void;
  addToQueue: (track: Track) => void;
  playNext: () => void;
  playPrevious: () => void;
  updateProgress: () => void;
  setAudiomackUrl: (url: string | null) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  seekForward: () => void;
  seekBackward: () => void;
  increaseVolume: () => void;
  decreaseVolume: () => void;
}

const API_BASE = 'http://127.0.0.1:4000';

/**
 * Resolves a track to a playable direct-audio URL.
 *
 * - youtube  → backend stream proxy  (avoids iframe embedding issues)
 * - itunes   → Apple CDN .m4a preview URL  (direct, works immediately)
 * - archive / others → use url / streamUrl as-is
 */
function resolveStreamUrl(track: Track): string {
  const rawUrl = track.url || (track as any).streamUrl || '';

  if (track.source === 'youtube') {
    // The video id may come as the `id` field or embedded in the url
    const videoId = String(track.id).startsWith('http')
      ? new URLSearchParams(new URL(String(track.id)).search).get('v') || String(track.id)
      : String(track.id);
    return `${API_BASE}/api/youtube/stream?id=${videoId}`;
  }

  // For iTunes the previewUrl is a 30-sec Apple-CDN .m4a — use it directly.
  // For archive / podcast the url is already a direct mp3/ogg.
  return rawUrl;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  progress: 0,
  duration: 0,
  quality: '128kbps',
  queue: [],
  audiomackUrl: null,
  isShuffle: false,
  isRepeat: false,

  setCurrentTrack: (track: Track) => {
    const albumArt = track.albumArt || track.cover || '';
    const streamUrl = resolveStreamUrl(track);

    console.log(
      `[Store] ▶ ${track.title} | source: ${track.source} | stream: ${streamUrl.substring(0, 80)}`
    );

    set({
      currentTrack: { ...track, albumArt, url: streamUrl },
      isPlaying: !!streamUrl,
      progress: 0,
      duration: 0,
      audiomackUrl: track.source === 'audiomack' ? track.url : null,
    });
  },

  setAudiomackUrl: (url) => set({ audiomackUrl: url }),

  togglePlay: () => {
    const { currentTrack } = get();
    if (!currentTrack) return;
    set((s) => ({ isPlaying: !s.isPlaying }));
  },

  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  updateProgress: () => { /* handled by ReactPlayer onProgress */ },
  setQuality: (quality) => set({ quality }),
  addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),

  playNext: () => {
    const { queue, isShuffle } = get();
    if (queue.length === 0) return;
    if (isShuffle) {
      const idx = Math.floor(Math.random() * queue.length);
      const next = queue[idx];
      set((s) => ({ queue: s.queue.filter((_, i) => i !== idx) }));
      get().setCurrentTrack(next);
    } else {
      const [next, ...rest] = queue;
      set({ queue: rest });
      get().setCurrentTrack(next);
    }
  },

  playPrevious: () => {
    // Restart current track from beginning
    set({ progress: 0 });
  },

  toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
  toggleRepeat: () => set((s) => ({ isRepeat: !s.isRepeat })),

  seekForward: () => {
    const { progress, duration } = get();
    set({ progress: Math.min(duration, progress + 10) });
  },
  seekBackward: () => {
    const { progress } = get();
    set({ progress: Math.max(0, progress - 10) });
  },
  increaseVolume: () => set((s) => ({ volume: Math.min(1, s.volume + 0.1) })),
  decreaseVolume: () => set((s) => ({ volume: Math.max(0, s.volume - 0.1) })),
}));
