"use client";

import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import styles from './page.module.css';
import { Play, Clock, MoreHorizontal, Music, Heart, Trash2, Pencil } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import Modal from '@/components/Modal';

export default function PlaylistPage() {
  const { id } = useParams();
  const router = useRouter();
  const { playlists, likedSongs, removeTrackFromPlaylist, deletePlaylist, toggleLike, isLiked, renamePlaylist } = useLibraryStore();
  const { setCurrentTrack, isPlaying, currentTrack, setQueue } = usePlayerStore();
  const [mounted, setMounted] = useState(false);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isLikedPage = id === 'liked-songs';
  const playlist = isLikedPage
    ? { id: 'liked-songs', name: 'Liked Songs', description: 'Songs you have liked', tracks: likedSongs, cover: '' }
    : playlists.find(p => p.id === id);

  if (!playlist) {
    return <div className={styles.error}>Playlist not found</div>;
  }

  const handlePlayAll = () => {
    if (playlist.tracks.length > 0) {
      setQueue(playlist.tracks as any);
      setCurrentTrack(playlist.tracks[0] as any);
    }
  };

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== playlist.name) {
      renamePlaylist(playlist.id, editName.trim());
      setIsRenameModalOpen(false);
    }
  };

  const handleDelete = () => {
    deletePlaylist(playlist.id);
    setIsDeleteModalOpen(false);
    router.push('/library');
  };

  const openRename = () => {
    setEditName(playlist.name);
    setIsRenameModalOpen(true);
  };

  return (
    <div className={styles.playlistPage}>
      <header className={styles.header}>
        <div className={`${styles.coverWrapper} ${isLikedPage ? styles.likedBg : ''}`}>
          {isLikedPage ? (
            <Heart size={80} fill="white" />
          ) : playlist.cover ? (
            <img src={playlist.cover} alt="" className={styles.cover} />
          ) : (
            <Music size={80} />
          )}
        </div>
        <div className={styles.headerInfo}>
          <p className={styles.type}>Playlist</p>
          <h1 className={styles.title}>{playlist.name}</h1>
          <p className={styles.description}>{playlist.description}</p>
          <p className={styles.meta}>{playlist.tracks.length} songs</p>
        </div>
      </header>

      <div className={styles.controls}>
        <button
          className={styles.playBtn}
          onClick={handlePlayAll}
          disabled={playlist.tracks.length === 0}
          title={playlist.tracks.length === 0 ? "Add some songs first!" : "Play All"}
        >
          <Play size={24} fill="black" />
        </button>
        {!isLikedPage && (
          <>
            <button className={styles.iconBtn} onClick={openRename} title="Rename Playlist">
              <Pencil size={24} />
            </button>
            <button className={styles.iconBtn} onClick={() => setIsDeleteModalOpen(true)} title="Delete Playlist">
              <Trash2 size={24} />
            </button>
          </>
        )}
      </div>

      {/* Rename Modal */}
      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        title="Edit details"
      >
        <div className={styles.inputGroup}>
          <label>Name</label>
          <input
            type="text"
            className={styles.input}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={() => setIsRenameModalOpen(false)}>Cancel</button>
          <button
            className={styles.confirmBtn}
            onClick={handleRename}
            disabled={!editName.trim() || editName.trim() === playlist.name}
          >
            Save
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Playlist"
      >
        <p className={styles.description}>
          This will delete <strong>{playlist.name}</strong> from your library.
          This action cannot be undone.
        </p>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
          <button
            className={`${styles.confirmBtn} ${styles.confirmBtnDanger}`}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </Modal>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span className={styles.colNum}>#</span>
          <span className={styles.colTitle}>Title</span>
          {/* <span className={styles.colAlbum}>Source</span> */}
          <span className={styles.colDate}>Action</span>
        </div>

        <div className={styles.trackList}>
          {playlist.tracks.map((track, index) => (
            <div
              key={`${track.id}-${index}`}
              className={`${styles.trackRow} ${currentTrack?.id === track.id ? styles.active : ''}`}
              onClick={() => {
                setQueue(playlist.tracks as any);
                setCurrentTrack(track as any);
              }}
            >
              <span className={styles.colNum}>
                {currentTrack?.id === track.id && isPlaying ? (
                  <div className={styles.playingBars}>
                    <div className={styles.bar} />
                    <div className={styles.bar} />
                    <div className={styles.bar} />
                  </div>
                ) : index + 1}
              </span>
              <div className={styles.colTitle}>
                <img src={track.cover} alt="" className={styles.trackArt} />
                <div className={styles.trackMeta}>
                  <span className={styles.trackName}>{track.title}</span>
                  <span className={styles.trackArtist}>{track.artist}</span>
                </div>
              </div>
              {/* <span className={styles.colAlbum}>{track.source || 'Unknown'}</span> */}
              <div className={styles.colDate}>
                <button
                  className={styles.rowBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    isLikedPage ? toggleLike(track) : removeTrackFromPlaylist(playlist.id, track.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {playlist.tracks.length === 0 && (
            <div className={styles.empty}>
              <Music size={48} />
              <p>No songs in this playlist yet.</p>
              <Link href="/search" className={styles.browseBtn}>Browse Songs</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
