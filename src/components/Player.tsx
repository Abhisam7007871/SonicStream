"use client";

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './Player.module.css';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
  Volume2, Volume1, VolumeX, ListMusic, Mic2, MonitorSpeaker,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import QualitySelector from './QualitySelector';

// Dynamically import ReactPlayer (client-only, no SSR)
const ReactPlayer = dynamic(() => import('react-player').then(mod => mod.default || mod) as any, { ssr: false }) as any;

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

export default function Player() {
  const {
    currentTrack, isPlaying, volume, progress, duration,
    togglePlay, setVolume, setProgress,
    playNext, playPrevious,
    isShuffle, isRepeat, toggleShuffle, toggleRepeat,
    setDuration
  } = usePlayerStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const reactPlayerRef = useRef<any>(null);

  const trackUrl = currentTrack?.url || '';
  const isYT = isYouTubeUrl(trackUrl);

  // ─── Native <audio> sync (for non-YouTube tracks) ───
  useEffect(() => {
    if (isYT || !audioRef.current) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error('[Audio] Playback interrupted:', err);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, trackUrl, isYT]);

  // Sync volume to <audio>
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync seek to <audio>
  useEffect(() => {
    if (!isYT && audioRef.current && Math.abs(audioRef.current.currentTime - progress) > 2) {
      audioRef.current.currentTime = progress;
    }
  }, [progress, isYT]);

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ─── <audio> event handlers ───
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
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
      if (isYT && reactPlayerRef.current) {
        reactPlayerRef.current.seekTo(0);
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  };

  const handleError = (e: any) => {
    console.warn('[Audio] Playback error:', e);
    if (currentTrack?.url) {
      setError('Playback error — skipping...');
      setTimeout(() => {
        setError(null);
        playNext();
      }, 3000);
    }
  };

  // ─── ReactPlayer event handlers (YouTube) ───
  const handleYTProgress = (state: { playedSeconds: number }) => {
    setProgress(state.playedSeconds);
  };

  const handleYTDuration = (dur: number) => {
    setDuration(dur);
    setIsLoading(false);
    setError(null);
  };

  const handleYTError = (e: any) => {
    console.warn('[YouTube] Playback error:', e);
    setError('Video unavailable — skipping...');
    setTimeout(() => {
      setError(null);
      playNext();
    }, 3000);
  };

  const handleSeek = (val: number) => {
    setProgress(val);
    if (isYT && reactPlayerRef.current) {
      reactPlayerRef.current.seekTo(val);
    } else if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const volumePct = volume * 100;

  return (
    <>
      {/* Native <audio> for non-YouTube sources (Jamendo, iTunes, podcasts, etc.) */}
      {!isYT && (
        <audio
          key={currentTrack?.id || 'none'}
          ref={audioRef}
          src={trackUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          crossOrigin="anonymous"
          preload="auto"
        />
      )}

      {/* ReactPlayer for YouTube — small thumbnail in corner */}
      {isYT && (
        <div style={{ 
          position: 'fixed', 
          bottom: 90, 
          right: 16, 
          width: 200, 
          height: 113, 
          borderRadius: 8, 
          overflow: 'hidden', 
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <ReactPlayer
            ref={reactPlayerRef}
            url={trackUrl}
            playing={isPlaying}
            volume={volume}
            onProgress={handleYTProgress as any}
            onDuration={handleYTDuration as any}
            onEnded={handleEnded}
            onError={handleYTError as any}
            onBuffer={() => setIsLoading(true)}
            onBufferEnd={() => setIsLoading(false)}
            onReady={() => { setIsLoading(false); setError(null); }}
            width="100%"
            height="100%"
            config={{
              youtube: {
                embedOptions: {
                  autoplay: 1,
                  controls: 0,
                  modestbranding: 1,
                  rel: 0,
                },
              },
            } as any}
          />
        </div>
      )}

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
                <p className={styles.artist}>
                  {currentTrack.artist}
                  {(currentTrack as any).source === 'jamendo' && (currentTrack as any).shareUrl && (
                    <a
                      href={(currentTrack as any).shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginLeft: 6, fontSize: '0.65rem', color: '#10b981', textDecoration: 'none', opacity: 0.8 }}
                      title="View on Jamendo — Creative Commons licensed"
                    >
                      via Jamendo
                    </a>
                  )}
                </p>
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
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
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
        </div>
      </footer>
    </>
  );
}
