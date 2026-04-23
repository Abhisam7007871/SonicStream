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
    console.log('[Store] Setting track:', track.title, 'Source:', track.source);
    const API_BASE = 'http://127.0.0.1:4000'; // Hardcoded for reliability
    
    // Normalize image and initial stream URL
    const albumArt = track.albumArt || track.cover || '';
    let streamUrl = track.url || (track as any).streamUrl || '';

    // 1. Handle YouTube source
    if (track.source === 'youtube') {
      streamUrl = `https://www.youtube.com/watch?v=${track.id}`;
      console.log('[Store] Using direct YouTube URL:', streamUrl);
    } 
    
    // 2. Set state IMMEDIATELY to capture user interaction context
    set({ 
      currentTrack: { ...track, albumArt, url: streamUrl }, 
      isPlaying: true, 
      progress: 0,
      audiomackUrl: track.source === 'audiomack' ? track.url : null
    });
    
    // 3. Background resolution for iTunes/Generic tracks
    if (!track.source || track.source === 'itunes') {
      console.log('[Store] Resolving iTunes track in background...');
      fetch(`${API_BASE}/api/youtube/search?q=${encodeURIComponent(track.title + ' ' + track.artist + ' audio')}`)
        .then(res => res.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            const ytId = data.results[0].id;
            const finalUrl = `https://www.youtube.com/watch?v=${ytId}`;
            console.log('[Store] Background resolution success:', finalUrl);
            set((state) => ({
              currentTrack: state.currentTrack?.id === track.id 
                ? { ...state.currentTrack, url: finalUrl, source: 'youtube' } 
                : state.currentTrack
            }));
          }
        })
        .catch(err => console.error('[Store] Background resolution failed:', err));
    }
  },

  setAudiomackUrl: (url) => set({ audiomackUrl: url }),

  togglePlay: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });
  },

  setVolume: (volume) => {
    set({ volume });
  },

  setProgress: (progress) => {
    set({ progress });
  },

  setDuration: (duration) => {
    set({ duration });
  },

  updateProgress: () => {
    // handled by ReactPlayer onProgress
  },

  setQuality: (quality) => set({ quality }),

  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),

  playNext: () => {
    const { queue, isShuffle } = get();
    if (queue.length > 0) {
      if (isShuffle) {
        const randomIndex = Math.floor(Math.random() * queue.length);
        const nextTrack = queue[randomIndex];
        set((state) => ({ queue: state.queue.filter((_, i) => i !== randomIndex) }));
        get().setCurrentTrack(nextTrack);
      } else {
        const nextTrack = queue[0];
        set((state) => ({ queue: state.queue.slice(1) }));
        get().setCurrentTrack(nextTrack);
      }
    }
  },

  playPrevious: () => {
    set({ progress: 0 });
  },

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
  seekForward: () => {
    const { progress, duration } = get();
    set({ progress: Math.min(duration, progress + 10) });
  },
  seekBackward: () => {
    const { progress } = get();
    set({ progress: Math.max(0, progress - 10) });
  },
  increaseVolume: () => {
    const { volume } = get();
    set({ volume: Math.min(1, volume + 0.1) });
  },
  decreaseVolume: () => {
    const { volume } = get();
    set({ volume: Math.max(0, volume - 0.1) });
  },
}));
