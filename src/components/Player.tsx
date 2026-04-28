"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './Player.module.css';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
  Volume2, Volume1, VolumeX, ListMusic, Mic2, MonitorSpeaker,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import QualitySelector from './QualitySelector';

// ── YouTube IFrame API loader ──────────────────────────────────────────
let ytApiLoaded = false;
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (ytApiLoaded && (window as any).YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    if ((window as any).YT?.Player) {
      ytApiLoaded = true;
      resolve();
      return;
    }
    (window as any).onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  return match ? match[1] : null;
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
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [ytReady, setYtReady] = useState(false);

  const trackUrl = currentTrack?.url || '';
  const ytVideoId = getYouTubeVideoId(trackUrl);
  const isYT = !!ytVideoId;

  // ── Initialize YouTube Player once ───────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    loadYouTubeApi().then(() => {
      if (ytPlayerRef.current) return; // Already initialized
      
      ytPlayerRef.current = new (window as any).YT.Player('yt-player-container', {
        height: '180',
        width: '320',
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            console.log('[YT] Player ready');
            setYtReady(true);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            const YT = (window as any).YT.PlayerState;
            
            if (state === YT.PLAYING) {
              setIsLoading(false);
              setError(null);
              // Get duration
              const dur = ytPlayerRef.current?.getDuration?.();
              if (dur) setDuration(dur);
            } else if (state === YT.BUFFERING) {
              setIsLoading(true);
            } else if (state === YT.ENDED) {
              if (isRepeat) {
                ytPlayerRef.current?.seekTo(0);
                ytPlayerRef.current?.playVideo();
              } else {
                playNext();
              }
            }
          },
          onError: (event: any) => {
            console.warn('[YT] Error:', event.data);
            setError('Video unavailable');
            setTimeout(() => { setError(null); playNext(); }, 2000);
          },
        },
      });
    });

    return () => {
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    };
  }, []);

  // ── Load YouTube video when track changes ────────────────────────────
  useEffect(() => {
    if (!isYT || !ytReady || !ytPlayerRef.current) return;
    
    console.log('[YT] Loading video:', ytVideoId);
    setIsLoading(true);
    setError(null);
    
    try {
      ytPlayerRef.current.loadVideoById(ytVideoId);
    } catch (e) {
      console.error('[YT] loadVideoById failed:', e);
    }
  }, [ytVideoId, ytReady, isYT]);

  // ── Sync play/pause to YouTube ───────────────────────────────────────
  useEffect(() => {
    if (!isYT || !ytReady || !ytPlayerRef.current) return;
    
    try {
      if (isPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    } catch (e) { /* player not ready yet */ }
  }, [isPlaying, isYT, ytReady]);

  // ── Sync volume to YouTube ───────────────────────────────────────────
  useEffect(() => {
    if (!isYT || !ytReady || !ytPlayerRef.current) return;
    try {
      ytPlayerRef.current.setVolume(volume * 100);
    } catch (e) { /* ignore */ }
  }, [volume, isYT, ytReady]);

  // ── Progress polling for YouTube ─────────────────────────────────────
  useEffect(() => {
    if (ytIntervalRef.current) {
      clearInterval(ytIntervalRef.current);
      ytIntervalRef.current = null;
    }
    
    if (isYT && isPlaying && ytReady) {
      ytIntervalRef.current = setInterval(() => {
        if (ytPlayerRef.current?.getCurrentTime) {
          const currentTime = ytPlayerRef.current.getCurrentTime();
          setProgress(currentTime);
          
          const dur = ytPlayerRef.current.getDuration?.();
          if (dur && dur > 0) setDuration(dur);
        }
      }, 500);
    }
    
    return () => {
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    };
  }, [isYT, isPlaying, ytReady]);

  // ── Native <audio> sync (for non-YouTube tracks) ────────────────────
  useEffect(() => {
    if (isYT || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.error('[Audio] Playback error:', err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, trackUrl, isYT]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!isYT && audioRef.current && Math.abs(audioRef.current.currentTime - progress) > 2) {
      audioRef.current.currentTime = progress;
    }
  }, [progress, isYT]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (val: number) => {
    setProgress(val);
    if (isYT && ytReady && ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(val, true);
    } else if (!isYT && audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleEnded = () => {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      playNext();
    }
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const volumePct = volume * 100;

  return (
    <>
      {/* Native <audio> for non-YouTube sources */}
      {!isYT && (
        <audio
          key={currentTrack?.id || 'none'}
          ref={audioRef}
          src={trackUrl}
          onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              setIsLoading(false);
              setError(null);
            }
          }}
          onEnded={handleEnded}
          onError={() => {
            setError('Playback error');
            setTimeout(() => { setError(null); playNext(); }, 2000);
          }}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          crossOrigin="anonymous"
          preload="auto"
        />
      )}

      {/* YouTube Player - visible mini player when active, hidden when not */}
      <div style={{ 
        position: 'fixed', 
        bottom: 90, 
        right: 16, 
        width: isYT ? 320 : 1,
        height: isYT ? 180 : 1,
        borderRadius: 8,
        overflow: 'hidden',
        zIndex: 9999,
        boxShadow: isYT ? '0 4px 20px rgba(0,0,0,0.6)' : 'none',
        opacity: isYT ? 1 : 0,
        pointerEvents: isYT ? 'auto' : 'none',
        transition: 'opacity 0.3s',
      }}>
        <div id="yt-player-container" ref={ytContainerRef} />
      </div>

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
            <button className={`${styles.iconBtn} ${isShuffle ? styles.active : ''}`} onClick={toggleShuffle}>
              <Shuffle size={16} />
            </button>
            <button className={styles.iconBtn} onClick={playPrevious}>
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button className={styles.playBtn} onClick={togglePlay} disabled={!currentTrack}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
            </button>
            <button className={styles.iconBtn} onClick={playNext}>
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button className={`${styles.iconBtn} ${isRepeat ? styles.active : ''}`} onClick={toggleRepeat}>
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
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className={styles.volumeSlider}
            />
            <button className={styles.iconBtn} onClick={() => setVolume(volume === 0 ? 0.7 : 0)}>
              {volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
