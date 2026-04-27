"use client";

import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import styles from './page.module.css';
import { Heart, Play, Plus, Music } from 'lucide-react';
import Link from 'next/link';

import Modal from '@/components/Modal';
import { useState } from 'react';

export default function LibraryPage() {
  const { playlists, likedSongs, createPlaylist } = useLibraryStore();
  const { setCurrentTrack, setQueue } = usePlayerStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreateModalOpen(false);
    }
  };

  const handlePlayLiked = () => {
    if (likedSongs.length > 0) {
      setQueue(likedSongs);
      setCurrentTrack(likedSongs[0]);
    }
  };

  return (
    <div className={styles.libraryPage}>
      <header className={styles.header}>
        <h1 className={styles.title}>Your Library</h1>
        <button className={styles.createBtn} onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={20} />
          Create Playlist
        </button>
      </header>

      {/* Create Playlist Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Playlist"
      >
        <div className={styles.inputGroup}>
          <label>Playlist Name</label>
          <input
            type="text"
            className={styles.input}
            placeholder="My Awesome Playlist"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
          />
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
          <button
            className={styles.confirmBtn}
            onClick={handleCreatePlaylist}
            disabled={!newPlaylistName.trim()}
          >
            Create
          </button>
        </div>
      </Modal>

      <div className={styles.sections}>
        {/* Liked Songs Special Card */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Highlights</h2>
          <div className={styles.highlightsGrid}>
            <Link href="/playlist/liked-songs" className={styles.likedSongsCard}>
              <div className={styles.likedSongsContent}>
                <div className={styles.likedIcon}>
                  <Heart size={32} fill="white" />
                </div>
                <div className={styles.likedDetails}>
                  <h3 className={styles.likedTitle}>Liked Songs</h3>
                  <p className={styles.likedCount}>{likedSongs.length} songs</p>
                </div>
              </div>
              <button
                className={styles.playBtn}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePlayLiked();
                }}
                disabled={likedSongs.length === 0}
              >
                <Play size={24} fill="black" />
              </button>
            </Link>
          </div>
        </section>

        {/* Custom Playlists */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Playlists</h2>
          <div className={styles.grid}>
            {playlists.filter(p => p.id !== 'liked-songs').map((playlist) => (
              <Link href={`/playlist/${playlist.id}`} key={playlist.id} className={styles.card}>
                <div className={styles.imageWrapper}>
                  {playlist.cover ? (
                    <img src={playlist.cover} alt={playlist.name} className={styles.image} />
                  ) : (
                    <div className={styles.placeholder}>
                      <Music size={40} />
                    </div>
                  )}
                  <button className={styles.cardPlayBtn}>
                    <Play size={20} fill="black" />
                  </button>
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>{playlist.name}</h3>
                  <p className={styles.cardMeta}>{playlist.tracks.length} tracks</p>
                </div>
              </Link>
            ))}

            <div className={styles.addCard} onClick={handleCreatePlaylist}>
              <div className={styles.addIcon}>
                <Plus size={40} />
              </div>
              <p>New Playlist</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
