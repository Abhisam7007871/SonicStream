import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url: string;
  duration?: number;
  source?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover: string;
  tracks: Track[];
}

interface LibraryState {
  likedSongs: Track[];
  playlists: Playlist[];
  
  toggleLike: (track: Track) => void;
  isLiked: (trackId: string) => boolean;
  isInLibrary: (trackId: string) => boolean;
  
  createPlaylist: (name: string, description?: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  renamePlaylist: (playlistId: string, newName: string) => void;
  deletePlaylist: (playlistId: string) => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      likedSongs: [],
      playlists: [],

      toggleLike: (track) => {
        const { likedSongs } = get();
        const isLiked = likedSongs.some(s => s.id === track.id);
        
        if (isLiked) {
          set({ likedSongs: likedSongs.filter(s => s.id !== track.id) });
        } else {
          set({ likedSongs: [...likedSongs, track] });
        }
      },

      isLiked: (trackId) => {
        return get().likedSongs.some(s => String(s.id) === String(trackId));
      },

      isInLibrary: (trackId) => {
        const { likedSongs, playlists } = get();
        const inLiked = likedSongs.some(s => String(s.id) === String(trackId));
        const inPlaylists = playlists.some(p => p.tracks.some(t => String(t.id) === String(trackId)));
        return inLiked || inPlaylists;
      },

      createPlaylist: (name, description = '') => {
        const newPlaylist: Playlist = {
          id: Math.random().toString(36).substring(7),
          name,
          description,
          cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300&h=300&fit=crop',
          tracks: []
        };
        set({ playlists: [...get().playlists, newPlaylist] });
      },

      renamePlaylist: (playlistId, newName) => {
        if (playlistId === 'liked-songs') return;
        set({
          playlists: get().playlists.map(p => 
            p.id === playlistId ? { ...p, name: newName } : p
          )
        });
      },

      addTrackToPlaylist: (playlistId, track) => {
        set({
          playlists: get().playlists.map(p => 
            p.id === playlistId 
              ? { ...p, tracks: p.tracks.some(t => t.id === track.id) ? p.tracks : [...p.tracks, track] }
              : p
          )
        });
      },

      removeTrackFromPlaylist: (playlistId, trackId) => {
        set({
          playlists: get().playlists.map(p => 
            p.id === playlistId 
              ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId) }
              : p
          )
        });
      },

      deletePlaylist: (playlistId) => {
        if (playlistId === 'liked-songs') return;
        set({ playlists: get().playlists.filter(p => p.id !== playlistId) });
      }
    }),
    {
      name: 'gamapa-library-storage',
      skipHydration: true,
    }
  )
);

/**
 * Hook to safely use the library store with SSR/hydration support.
 * Prevents the infinite re-render loop caused by persist + Next.js SSR mismatch.
 */
export function useHydratedLibraryStore() {
  const [hydrated, setHydrated] = useState(false);
  const store = useLibraryStore();

  useEffect(() => {
    // Manually trigger hydration after client mount
    useLibraryStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  return {
    ...store,
    // Return safe defaults before hydration
    likedSongs: hydrated ? store.likedSongs : [],
    playlists: hydrated ? store.playlists : [],
    isLiked: hydrated ? store.isLiked : () => false,
    isInLibrary: hydrated ? store.isInLibrary : () => false,
    hydrated,
  };
}
