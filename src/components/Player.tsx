"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './Player.module.css';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
  Volume2, Volume1, VolumeX, ListMusic, Mic2, MonitorSpeaker,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import QualitySelector from './QualitySelector';

// ── YouTube IFrame API ─────────────────────────────────────────────────
let ytApiLoaded = false;
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (ytApiLoaded) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if ((window as any).YT?.Player) { ytApiLoaded = true; resolve(); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => { ytApiLoaded = true; resolve(); };
    // Fallback timeout
    setTimeout(() => { resolve(); }, 8000);
  });
  return ytApiPromise;
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  // youtube.com/watch?v=ID
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
  } catch {}
  // Just a bare video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
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
  const silentAudioRef = useRef<HTMLAudioElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [ytReady, setYtReady] = useState(false);

  const trackUrl = currentTrack?.url || '';
  const ytVideoId = getYouTubeVideoId(trackUrl);
  const isYT = !!ytVideoId;

  // ── Initialize YouTube IFrame Player (2x2px hidden iframe) ──────────
  useEffect(() => {
    if (ytPlayerRef.current) return; // already initialized
    loadYouTubeApi().then(() => {
      if (!(window as any).YT?.Player || !ytContainerRef.current) return;
      console.log('[YT] Creating 2x2px IFrame player');
      ytPlayerRef.current = new (window as any).YT.Player('yt-player-container', {
        height: '2',
        width: '2',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            console.log('[YT] Player ready');
            setYtReady(true);
          },
          onStateChange: (event: any) => {
            const YT = (window as any).YT;
            if (event.data === YT.PlayerState.ENDED) {
              if (isRepeat) {
                ytPlayerRef.current?.seekTo(0, true);
                ytPlayerRef.current?.playVideo();
              } else {
                playNext();
              }
            } else if (event.data === YT.PlayerState.PLAYING) {
              setIsLoading(false);
              setError(null);
            } else if (event.data === YT.PlayerState.BUFFERING) {
              setIsLoading(true);
            }
          },
          onError: (event: any) => {
            console.error('[YT] Player error:', event.data);
            setError('YouTube playback error');
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
    try { ytPlayerRef.current.setVolume(volume * 100); } catch (e) {}
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
    return () => { if (ytIntervalRef.current) clearInterval(ytIntervalRef.current); };
  }, [isYT, isPlaying, ytReady]);

  // ── Silent audio keepalive — prevents browser from throttling YT in background ──
  useEffect(() => {
    if (!silentAudioRef.current) return;
    if (isYT && isPlaying) {
      silentAudioRef.current.play().catch(() => {});
    } else if (!isYT || !isPlaying) {
      silentAudioRef.current.pause();
    }
  }, [isYT, isPlaying]);

  // ── Native <audio> sync (for non-YouTube tracks) ────────────────────
  useEffect(() => {
    if (isYT || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(err => console.error('[Audio] Playback error:', err));
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

  // ── Media Session API — background playback & lock screen controls ──
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title || 'Unknown',
      artist: currentTrack.artist || 'Unknown Artist',
      album: 'SonicStream',
      artwork: [
        { src: currentTrack.albumArt || currentTrack.cover || '', sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) togglePlay(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) togglePlay(); });
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) handleSeek(details.seekTime);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      handleSeek(Math.max(0, progress - (details.seekOffset || 10)));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      handleSeek(Math.min(duration, progress + (details.seekOffset || 10)));
    });
  }, [currentTrack, isPlaying, progress, duration]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: Math.min(progress, duration),
      });
    } catch (e) { /* ignore */ }
  }, [progress, duration]);

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

      {/* Silent audio keepalive - keeps browser audio pipeline active for YT background playback */}
      <audio
        ref={silentAudioRef}
        src="/silence.wav"
        loop
        playsInline
        style={{ display: 'none' }}
      />

      {/* YouTube Player - tiny 2x2px iframe, visually hidden */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        right: 0, 
        width: 2,
        height: 2,
        overflow: 'hidden',
        opacity: 0.01,
        pointerEvents: 'none',
        zIndex: -1,
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
