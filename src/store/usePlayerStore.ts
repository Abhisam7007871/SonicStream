import { create } from 'zustand';

interface Track {
  id: string | number;
  title: string;
  artist: string;
  albumArt?: string;
  cover?: string;
  url: string;
  source?: 'audiomack' | 'internal' | 'itunes' | 'youtube' | 'internetarchive' | 'jamendo';
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
  setQueue: (tracks: Track[]) => void;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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
    // Pass YouTube URL directly — ReactPlayer handles it natively
    const videoId = String(track.id).startsWith('http')
      ? new URLSearchParams(new URL(String(track.id)).search).get('v') || String(track.id)
      : String(track.id);
    
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // For Jamendo — direct CDN URL plays instantly
  // For iTunes — 30-sec Apple-CDN .m4a preview
  // For archive / podcast — direct mp3/ogg
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

    console.log(`[PlayerStore] setCurrentTrack:`, {
      title: track.title,
      id: track.id,
      source: track.source,
      resolvedUrl: streamUrl
    });

    set({
      currentTrack: { ...track, albumArt, url: streamUrl },
      isPlaying: true, 
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
  setQueue: (tracks) => set({ queue: tracks }),

  playNext: () => {
    const { queue, currentTrack, isShuffle, isRepeat } = get();
    if (queue.length === 0) return;

    let nextIndex = 0;
    if (currentTrack) {
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      if (isShuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      } else {
        nextIndex = (currentIndex + 1) % queue.length;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      get().setCurrentTrack(nextTrack);
    }
  },

  playPrevious: () => {
    const { queue, currentTrack, progress } = get();
    
    // If progress is > 3s, just restart the song
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }

    if (queue.length === 0) return;

    let prevIndex = 0;
    if (currentTrack) {
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    }

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      get().setCurrentTrack(prevTrack);
    }
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
