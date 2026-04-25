"use client";

import { useEffect, useRef, useState } from 'react';
import styles from './Player.module.css';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
  Volume2, Volume1, VolumeX, Maximize2, ListMusic, Mic2, MonitorSpeaker,
  MoreHorizontal, RotateCcw, RotateCw, Plus, Minus
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import QualitySelector from './QualitySelector';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

export default function Player() {
  const {
    currentTrack, isPlaying, volume, progress, duration,
    togglePlay, setVolume, setProgress, updateProgress,
    playNext, playPrevious,
    isShuffle, isRepeat, toggleShuffle, toggleRepeat,
    seekForward, seekBackward, increaseVolume, decreaseVolume,
    setDuration
  } = usePlayerStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<any>(null);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration && !isNaN(duration) && duration > 0 ? (progress / duration) * 100 : 0;

  // Media Session API for Bluetooth/Hardware controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: (currentTrack as any).album || 'SonicStream',
        artwork: [
          { src: currentTrack.albumArt || currentTrack.cover || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', togglePlay);
      navigator.mediaSession.setActionHandler('pause', togglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        const nextProgress = Math.max(0, progress - 10);
        setProgress(nextProgress);
        playerRef.current?.seekTo(nextProgress);
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        const nextProgress = Math.min(duration, progress + 10);
        setProgress(nextProgress);
        playerRef.current?.seekTo(nextProgress);
      });
    }
  }, [currentTrack, togglePlay, playPrevious, playNext, progress, duration, setProgress]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  const handleSeek = (seconds: number) => {
    const nextProgress = Math.max(0, Math.min(duration, seconds));
    setProgress(nextProgress);
    playerRef.current?.seekTo(nextProgress);
  };

  return (
    <>
      {/* ── Hidden Audio Engine ──────────────────────────────────────────────
           Positioned off-screen (not overflow:hidden — some browsers block
           audio loading in 0×0 overflow:hidden containers).
           All sources are now plain audio URLs:
             - YouTube  → backend proxy /api/youtube/stream?id=...  (audio CDN)
             - iTunes   → Apple CDN .m4a 30-second preview
             - Archive  → direct mp3 / ogg
      ──────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          pointerEvents: 'none',
        }}
      >
        <ReactPlayer
          key={currentTrack?.id ?? 'empty'}
          ref={playerRef}
          url={currentTrack?.url || ''}
          playing={isPlaying && !!currentTrack?.url}
          volume={volume}
          muted={false}
          playsinline={true}
          loop={isRepeat}
          width="1px"
          height="1px"
          onEnded={() => {
            console.log('[Player] ✓ Track ended');
            if (isRepeat) {
              playerRef.current?.seekTo(0);
            } else {
              playNext();
            }
          }}
          onProgress={({ playedSeconds }) => {
            if (isPlaying) setProgress(playedSeconds);
          }}
          onDuration={(dur) => {
            console.log('[Player] Duration:', dur);
            setDuration(dur);
          }}
          onBuffer={() => {
            console.log('[Player] Buffering...');
            setIsLoading(true);
          }}
          onBufferEnd={() => {
            console.log('[Player] Buffer end');
            setIsLoading(false);
          }}
          onReady={() => {
            console.log('[Player] ✓ Ready:', currentTrack?.url?.substring(0, 70));
            setIsLoading(false);
            setError(null);
          }}
          onError={(e) => {
            console.error('[Player] ✗ Error:', e, '| URL:', currentTrack?.url);
            setError('Audio extraction failed — skipping...');
            setIsLoading(false);
            setTimeout(() => { setError(null); playNext(); }, 2000);
          }}
          config={{
            file: {
              forceAudio: true,
              attributes: { crossOrigin: 'anonymous' },
            },
          }}
        />
      </div>

      <footer className={`${styles.player} glass`}>
        {/* Current Song Info */}
        <div className={styles.songInfo}>
          <div className={styles.albumArt}>
            {currentTrack ? (
              currentTrack.albumArt || currentTrack.cover ? (
                <img src={currentTrack.albumArt || currentTrack.cover} alt="art" className={styles.songArt} style={{ width: '100%', height: '100%', borderRadius: 4, objectFit: 'cover' }} />
              ) : (
                <div className={styles.placeholderArt}>
                  <Music2 />
                </div>
              )
            ) : (
              <div className={styles.placeholderArt}>
                <MonitorSpeaker size={24} />
              </div>
            )}
          </div>
          <div className={styles.trackDetails}>
            <h4 className={styles.trackName}>{currentTrack?.title || 'No song selected'}</h4>
            <p className={styles.artistName}>
              {error ? <span style={{ color: '#ff4444' }}>{error}</span> : currentTrack?.artist || 'Select a track to play'}
              {isLoading && !error && <span className={styles.loadingPulse}> • Loading...</span>}
            </p>
          </div>
          <button className={styles.iconButton} disabled={!currentTrack}>
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Playback Controls */}
        <div className={styles.controls}>
          <div className={styles.controlButtons}>
            <button className={styles.iconButton} title="Shuffle" onClick={toggleShuffle} style={{ color: isShuffle ? '#1db954' : 'inherit' }}>
              <Shuffle size={16} />
            </button>
            <button className={styles.iconButton} onClick={playPrevious} disabled={!currentTrack}>
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button className={styles.iconButton} title="10s Back" onClick={() => handleSeek(progress - 10)} disabled={!currentTrack}>
              <RotateCcw size={18} />
            </button>
            <button className={styles.playButton} onClick={togglePlay} disabled={!currentTrack}>
              {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />}
            </button>
            <button className={styles.iconButton} title="10s Forward" onClick={() => handleSeek(progress + 10)} disabled={!currentTrack}>
              <RotateCw size={18} />
            </button>
            <button className={styles.iconButton} onClick={playNext} disabled={!currentTrack}>
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button className={styles.iconButton} title="Repeat" onClick={toggleRepeat} style={{ color: isRepeat ? '#1db954' : 'inherit' }}>
              <Repeat size={16} />
            </button>
          </div>

          <div className={styles.progressBarWrapper}>
            <span className={styles.timeLabel}>{formatTime(progress)}</span>
            <div
              className={styles.progressBar}
              onClick={(e) => {
                if (!currentTrack) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const nextProgress = (x / rect.width) * duration;
                setProgress(nextProgress);
                playerRef.current?.seekTo(nextProgress);
              }}
            >
              <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}>
                <div className={styles.progressKnob}></div>
              </div>
            </div>
            <span className={styles.timeLabel}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Extra Controls (Volume, Quality, etc) */}
        <div className={styles.extraControls}>
          <button className={styles.iconButton} title="Lyrics">
            <Mic2 size={18} />
          </button>
          <button className={styles.iconButton} title="Queue">
            <ListMusic size={18} />
          </button>
          <button className={styles.iconButton} title="Connect to device">
            <MonitorSpeaker size={18} />
          </button>

          <div className={styles.volumeControl}>
            <button className={styles.iconButtonSmall} onClick={decreaseVolume}>
              <Minus size={14} />
            </button>
            {volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
            <div
              className={styles.volumeBar}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setVolume(Math.max(0, Math.min(1, x / rect.width)));
              }}
            >
              <div className={styles.volumeFill} style={{ width: `${volume * 100}%` }}></div>
            </div>
            <button className={styles.iconButtonSmall} onClick={increaseVolume}>
              <Plus size={14} />
            </button>
          </div>

          <QualitySelector />

          <button className={styles.iconButton}>
            <Maximize2 size={18} />
          </button>
        </div>
      </footer>
    </>
  );
}

function Music2() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13"></path>
      <circle cx="6" cy="18" r="3"></circle>
      <circle cx="18" cy="16" r="3"></circle>
    </svg>
  );
}
