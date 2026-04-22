"use client";

import { useEffect, useRef } from 'react';
import styles from './Player.module.css';
import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, 
  Volume2, Maximize2, ListMusic, Mic2, MonitorSpeaker,
  MoreHorizontal
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import QualitySelector from './QualitySelector';

export default function Player() {
  const { 
    currentTrack, isPlaying, volume, progress, duration, 
    togglePlay, setVolume, setProgress, updateProgress,
    playNext, playPrevious
  } = usePlayerStore();

  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        updateProgress();
      }, 1000);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying, updateProgress]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (progress / duration) * 100 : 0;

  if (!currentTrack) return null;

  return (
    <footer className={`${styles.player} glass`}>
      {/* Current Song Info */}
      <div className={styles.songInfo}>
        <div className={styles.albumArt}>
          <div className={styles.placeholderArt}>
            <Music2 />
          </div>
        </div>
        <div className={styles.trackDetails}>
          <h4 className={styles.trackName}>{currentTrack.title}</h4>
          <p className={styles.artistName}>{currentTrack.artist}</p>
        </div>
        <button className={styles.iconButton}>
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Playback Controls */}
      <div className={styles.controls}>
        <div className={styles.controlButtons}>
          <button className={styles.iconButton} title="Shuffle">
            <Shuffle size={16} />
          </button>
          <button className={styles.iconButton} onClick={playPrevious}>
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button className={styles.playButton} onClick={togglePlay}>
            {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />}
          </button>
          <button className={styles.iconButton} onClick={playNext}>
            <SkipForward size={20} fill="currentColor" />
          </button>
          <button className={styles.iconButton} title="Repeat">
            <Repeat size={16} />
          </button>
        </div>
        
        <div className={styles.progressBarWrapper}>
          <span className={styles.timeLabel}>{formatTime(progress)}</span>
          <div 
            className={styles.progressBar}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const nextProgress = (x / rect.width) * duration;
              setProgress(nextProgress);
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
          <Volume2 size={18} />
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
        </div>

        <QualitySelector />

        <button className={styles.iconButton}>
          <Maximize2 size={18} />
        </button>
      </div>
    </footer>
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
