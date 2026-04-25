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
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync isPlaying state with native audio element
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('[Audio] Playback interrupted or blocked:', error);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.url]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync seek
  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - progress) > 2) {
      audioRef.current.currentTime = progress;
    }
  }, [progress]);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      setProgress(current);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
      setError(null);
    }
  };

  const handleEnded = () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  };

  const handleError = () => {
    if (currentTrack?.url) {
      setError('Playback error — auto-skipping...');
      setTimeout(() => { setError(null); playNext(); }, 2500);
    }
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const volumePct = volume * 100;

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack?.url || ''}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        crossOrigin="anonymous"
        preload="auto"
      />

      <footer
        className={styles.player}
        style={{
          '--progress-pct': `${progressPct}%`,
          '--volume-pct': `${volumePct}%`
        } as any}
      >
        <div className={styles.trackInfo}>
          {currentTrack && (
            <>
              <img
                src={currentTrack.albumArt || currentTrack.cover}
                alt={currentTrack.title}
                className={styles.albumArt}
              />
              <div className={styles.details}>
                <h4 className={styles.title}>{currentTrack.title}</h4>
                <p className={styles.artist}>{currentTrack.artist}</p>
              </div>
            </>
          )}
        </div>

        <div className={styles.controlsContainer}>
          <div className={styles.mainControls}>
            <button
              className={`${styles.iconBtn} ${isShuffle ? styles.active : ''}`}
              onClick={toggleShuffle}
            >
              <Shuffle size={16} />
            </button>
            <button className={styles.iconBtn} onClick={playPrevious}>
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              className={styles.playBtn}
              onClick={togglePlay}
              disabled={!currentTrack}
            >
              {isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />
              )}
            </button>
            <button className={styles.iconBtn} onClick={playNext}>
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button
              className={`${styles.iconBtn} ${isRepeat ? styles.active : ''}`}
              onClick={toggleRepeat}
            >
              <Repeat size={16} />
            </button>
          </div>

          <div className={styles.progressContainer}>
            <span className={styles.time}>{formatTime(progress)}</span>
            <div className={styles.progressBarWrapper}>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                step={0.1}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setProgress(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className={styles.progressBar}
              />
            </div>
            <span className={styles.time}>{formatTime(duration)}</span>
            {isLoading && !error && <span className={styles.loadingPulse}>Loading...</span>}
            {error && <span className={styles.errorText}>{error}</span>}
          </div>
        </div>

        <div className={styles.extraControls}>
          <button className={styles.iconBtn}><Mic2 size={18} /></button>
          <button className={styles.iconBtn}><ListMusic size={18} /></button>
          <button className={styles.iconBtn}><MonitorSpeaker size={18} /></button>
          <div style={{ marginLeft: '8px', marginRight: '8px' }}>
            <QualitySelector />
          </div>
          <div className={styles.volumeContainer}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className={styles.volumeSlider}
            />
            <button
              className={styles.iconBtn}
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
            >
              {volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          {/* <button className={styles.iconBtn}><Maximize2 size={18} /></button> */}
        </div>
      </footer>
    </>
  );
}
