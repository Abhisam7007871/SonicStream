"use client";

import { useState, useRef, useEffect } from 'react';
import styles from './TrackOptionsMenu.module.css';
import { Plus, ListMusic, Heart, Check, Trash2, MinusCircle, ListPlus, PlusSquare } from 'lucide-react';
import { useHydratedLibraryStore as useLibraryStore, Track } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';

interface TrackOptionsMenuProps {
  track: Track;
  onClose: () => void;
}

export default function TrackOptionsMenu({ track, onClose }: TrackOptionsMenuProps) {
  const { playlists, likedSongs, toggleLike, isLiked, addTrackToPlaylist, removeTrackFromPlaylist, createPlaylist } = useLibraryStore();
  const { addToQueue } = usePlayerStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

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

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue({
      id: track.id,
      title: track.title,
      artist: track.artist,
      cover: track.cover,
      albumArt: (track as any).albumArt || track.cover || '',
      url: track.url,
      source: (track as any).source || 'youtube',
    });
    onClose();
  };

  const handleCreatePlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowNewPlaylist(false);
    }
  };

  return (
    <div className={styles.menu} ref={menuRef} onClick={(e) => e.stopPropagation()}>
      {/* Add to Queue */}
      <button className={styles.item} onClick={handleAddToQueue}>
        <ListPlus size={16} />
        <span>Add to Queue</span>
      </button>

      <button className={styles.item} onClick={handleToggleLike}>
        <Heart size={16} fill={isLiked(track.id) ? "var(--accent-primary)" : "none"} color={isLiked(track.id) ? "var(--accent-primary)" : "currentColor"} />
        <span>{isLiked(track.id) ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</span>
      </button>
      
      <div className={styles.divider} />
      <div className={styles.label}>Add to Playlist</div>
      
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

        {/* Create New Playlist inline */}
        {showNewPlaylist ? (
          <div style={{ display: 'flex', gap: 4, padding: '4px 0' }} onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreatePlaylist(e as any); if (e.key === 'Escape') setShowNewPlaylist(false); }}
              placeholder="Playlist name..."
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                padding: '6px 8px',
                fontSize: '0.8rem',
                color: 'white',
                outline: 'none',
              }}
            />
            <button 
              onClick={handleCreatePlaylist}
              style={{
                background: 'var(--accent-primary, #1db954)',
                border: 'none',
                borderRadius: 6,
                padding: '6px 10px',
                cursor: 'pointer',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Create
            </button>
          </div>
        ) : (
          <button className={styles.item} onClick={(e) => { e.stopPropagation(); setShowNewPlaylist(true); }}>
            <PlusSquare size={16} />
            <span>Create New Playlist</span>
          </button>
        )}
      </div>
    </div>
  );
}
