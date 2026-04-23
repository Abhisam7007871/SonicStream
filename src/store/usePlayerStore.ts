import { create } from 'zustand';
import { Howl } from 'howler';

interface Track {
  id: string | number;
  title: string;
  artist: string;
  albumArt: string;
  url: string;
  source?: 'audiomack' | 'internal';
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
  howl: Howl | null;
  audiomackUrl: string | null;

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
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: {
    id: '1',
    title: 'Starlight Symphony',
    artist: 'Nebula Dreams',
    albumArt: '',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Mock URL
  },
  isPlaying: false,
  volume: 0.7,
  progress: 0,
  duration: 0,
  quality: '128kbps',
  queue: [],
  howl: null,
  audiomackUrl: null,

  setCurrentTrack: (track) => {
    const { howl } = get();
    if (howl) {
      howl.stop();
      howl.unload();
    }

    if (track.source === 'audiomack') {
      set({ currentTrack: track, audiomackUrl: track.url, isPlaying: true, howl: null });
      return;
    }

    set({ audiomackUrl: null });

    // Rewrite iTunes URL to our full length proxy
    let streamUrl = track.url;
    if (!track.source || track.source === 'itunes') {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      streamUrl = `${API_BASE}/api/music/stream?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`;
    }

    const newHowl = new Howl({
      src: [streamUrl],
      html5: true, 
      volume: get().volume,
      onplay: () => set({ isPlaying: true }),
      onpause: () => set({ isPlaying: false }),
      onstop: () => set({ isPlaying: false, progress: 0 }),
      onend: () => {
        set({ isPlaying: false, progress: 0 });
        get().playNext();
      },
      onload: () => set({ duration: newHowl.duration() }),
    });

    set({ currentTrack: {...track, url: streamUrl}, howl: newHowl, isPlaying: true });
    newHowl.play();
  },

  setAudiomackUrl: (url) => set({ audiomackUrl: url }),

  togglePlay: () => {
    const { howl, isPlaying } = get();
    if (!howl) {
      const { currentTrack } = get();
      if (currentTrack) get().setCurrentTrack(currentTrack);
      return;
    }

    if (isPlaying) {
      howl.pause();
    } else {
      howl.play();
    }
  },

  setVolume: (volume) => {
    const { howl } = get();
    if (howl) howl.volume(volume);
    set({ volume });
  },

  setProgress: (progress) => {
    const { howl, duration } = get();
    if (howl && duration) {
      howl.seek(progress);
      set({ progress });
    }
  },

  updateProgress: () => {
    const { howl } = get();
    if (howl && howl.playing()) {
      set({ progress: howl.seek() });
    }
  },

  setQuality: (quality) => set({ quality }),

  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),

  playNext: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const nextTrack = queue[0];
      set((state) => ({ queue: state.queue.slice(1) }));
      get().setCurrentTrack(nextTrack);
    }
  },

  playPrevious: () => {
    // Basic implementation: restart current track or handle history if implemented
    const { howl } = get();
    if (howl) {
      howl.seek(0);
      set({ progress: 0 });
    }
  },
}));
