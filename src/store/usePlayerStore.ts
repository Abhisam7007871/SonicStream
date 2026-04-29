import { create } from 'zustand';
import { trackSongPlay } from './useAnalytics';

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

// Piped instances for frontend audio resolution (no youtube.com needed)
// Cache resolved Piped audio URLs (valid ~90 min)
const pipedCache = new Map<string, { url: string; ts: number }>();
const PIPED_CACHE_TTL = 90 * 60 * 1000; // 90 min

/**
 * Resolves a YouTube video ID to a direct audio URL via our backend
 * (which calls Piped API server-side — no CORS issues).
 */
async function resolvePipedAudio(videoId: string): Promise<string | null> {
  const cached = pipedCache.get(videoId);
  if (cached && Date.now() - cached.ts < PIPED_CACHE_TTL) return cached.url;

  try {
    console.log(`[Piped] Resolving ${videoId} via backend proxy...`);
    const res = await fetch(`${API_BASE}/api/youtube/piped-resolve?id=${videoId}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        pipedCache.set(videoId, { url: data.url, ts: Date.now() });
        console.log(`[Piped] ✓ Resolved ${videoId} via backend (${data.instance})`);
        return data.url;
      }
    }
  } catch (e: any) {
    console.log(`[Piped] Backend resolve failed: ${e.message}`);
  }
  return null;
}

/**
 * Resolves a track to a playable URL.
 * For YouTube: returns the video ID so the 2x2px iframe player picks it up.
 * For other sources: returns the direct audio URL.
 */
function resolveStreamUrl(track: Track): string {
  const rawUrl = track.url || (track as any).streamUrl || '';

  if (track.source === 'youtube') {
    // Extract video ID — the Player.tsx iframe detects bare 11-char IDs
    const videoId = String(track.id).startsWith('http')
      ? new URLSearchParams(new URL(String(track.id)).search).get('v') || String(track.id)
      : String(track.id);
    
    // Return bare video ID — Player.tsx getYouTubeVideoId() matches it
    return videoId;
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

    // Set track immediately (may use cached Piped URL or backend fallback)
    set({
      currentTrack: { ...track, albumArt, url: streamUrl },
      isPlaying: true, 
      progress: 0,
      duration: 0,
      audiomackUrl: track.source === 'audiomack' ? track.url : null,
    });

    // YouTube tracks use the 2x2px iframe player directly — no Piped resolution needed.
    // The video ID is passed as the URL, and Player.tsx iframe handles playback.

    // Track song play for analytics (non-blocking)
    trackSongPlay({
      id: track.id,
      title: track.title,
      artist: track.artist,
      source: track.source,
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

  playNext: async () => {
    const { queue, currentTrack, isShuffle, isRepeat } = get();
    
    if (queue.length === 0 && currentTrack) {
      // Queue is empty — auto-fetch similar songs from same artist
      try {
        const artistQuery = currentTrack.artist && currentTrack.artist !== 'Unknown Artist'
          ? `${currentTrack.artist} songs`
          : `${currentTrack.title} similar`;
        const res = await fetch(`${API_BASE}/api/youtube/search?q=${encodeURIComponent(artistQuery)}&limit=30`);
        const data = await res.json();
        const newTracks = (data.results || []).filter((t: Track) => t.id !== currentTrack.id);
        if (newTracks.length > 0) {
          set({ queue: newTracks, isShuffle: true });
          // Pick a random track from the new queue
          const randomIdx = Math.floor(Math.random() * newTracks.length);
          get().setCurrentTrack(newTracks[randomIdx]);
          return;
        }
      } catch (e) {
        console.error('[AutoPlay] Failed to fetch similar songs:', e);
      }
      return;
    }

    let nextIndex = 0;
    if (currentTrack) {
      const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
      
      // If we're at the end of queue and not repeating, auto-fetch more
      if (!isShuffle && currentIndex >= queue.length - 1 && !isRepeat) {
        try {
          const artistQuery = currentTrack.artist && currentTrack.artist !== 'Unknown Artist'
            ? `${currentTrack.artist} songs`
            : `${currentTrack.title} similar`;
          const res = await fetch(`${API_BASE}/api/youtube/search?q=${encodeURIComponent(artistQuery)}&limit=20`);
          const data = await res.json();
          const newTracks = (data.results || []).filter((t: Track) => 
            !queue.some(q => q.id === t.id)
          );
          if (newTracks.length > 0) {
            const extendedQueue = [...queue, ...newTracks];
            set({ queue: extendedQueue, isShuffle: true });
            const randomIdx = Math.floor(Math.random() * newTracks.length);
            get().setCurrentTrack(newTracks[randomIdx]);
            return;
          }
        } catch (e) {
          console.error('[AutoPlay] Failed to extend queue:', e);
        }
      }
      
      if (isShuffle) {
        // Avoid replaying current track when shuffling
        const otherIndices = queue.map((_, i) => i).filter(i => i !== currentIndex);
        nextIndex = otherIndices.length > 0 
          ? otherIndices[Math.floor(Math.random() * otherIndices.length)]
          : 0;
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
