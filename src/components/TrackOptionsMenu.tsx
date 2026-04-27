"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './TrackOptionsMenu.module.css';
import { Plus, ListMusic, Heart, Check, Trash2, MinusCircle } from 'lucide-react';
import { useLibraryStore, Track } from '@/store/useLibraryStore';

interface TrackOptionsMenuProps {
  track: Track;
  onClose: () => void;
}

export default function TrackOptionsMenu({ track, onClose }: TrackOptionsMenuProps) {
  const { playlists, likedSongs, toggleLike, isLiked, addTrackToPlaylist, removeTrackFromPlaylist } = useLibraryStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(track);
    onClose();
  };

  const handlePlaylistToggle = (e: React.MouseEvent, playlistId: string, alreadyIn: boolean) => {
    e.stopPropagation();
    if (alreadyIn) {
      removeTrackFromPlaylist(playlistId, String(track.id));
    } else {
      addTrackToPlaylist(playlistId, track);
    }
    onClose();
  };

  return (
    <div className={styles.menu} ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button className={styles.item} onClick={handleToggleLike}>
        <Heart size={16} fill={isLiked(track.id) ? "var(--accent-primary)" : "none"} color={isLiked(track.id) ? "var(--accent-primary)" : "currentColor"} />
        <span>{isLiked(track.id) ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</span>
      </button>
      
      <div className={styles.divider} />
      <div className={styles.label}>Manage Playlists</div>
      
      <div className={styles.playlistList}>
        {playlists.filter(p => p.id !== 'liked-songs').map(playlist => {
          const alreadyIn = playlist.tracks.some(t => String(t.id) === String(track.id));
          return (
            <button 
              key={playlist.id} 
              className={styles.item} 
              onClick={(e) => handlePlaylistToggle(e, playlist.id, alreadyIn)}
            >
              <ListMusic size={16} />
              <span>{playlist.name}</span>
              {alreadyIn ? (
                <MinusCircle size={14} className={styles.removeIcon} />
              ) : (
                <Plus size={14} className={styles.addIcon} />
              )}
            </button>
          );
        })}
        {playlists.length <= 1 && <div className={styles.empty}>No playlists created yet.</div>}
      </div>
    </div>
  );
}
