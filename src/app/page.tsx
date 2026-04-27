"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Play, Flame, Music2, Sparkles, TrendingUp, Globe, Heart } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  language: string;
  duration: string;
  url: string;
  albumArt: string;
}

const LANGUAGE_CONFIG = [
  { key: 'hindi',   label: 'Hindi Hits',   icon: '🇮🇳', color: '#ff9800' },
  { key: 'punjabi', label: 'Punjabi Beats', icon: '🎵', color: '#e040fb' },
  { key: 'korean',  label: 'K-Pop Central', icon: '🇰🇷', color: '#00e5ff' },
  { key: 'english', label: 'Global English', icon: '🌍', color: '#6366f1' },
];

const QUICK_MIXES = [
  { id: 1, title: 'Morning Energy', color: '#6366f1' },
  { id: 2, title: 'Deep Focus',     color: '#a855f7' },
  { id: 3, title: 'Chill Vibes',    color: '#ec4899' },
  { id: 4, title: 'Workout Mix',    color: '#f43f5e' },
  { id: 5, title: 'Late Night',     color: '#8b5cf6' },
  { id: 6, title: 'Release Radar',  color: '#06b6d4' },
];

export default function Home() {
  const { setCurrentTrack } = usePlayerStore();
  const [trending, setTrending] = useState<Song[]>([]);
  const [languageSongs, setLanguageSongs] = useState<Record<string, Song[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    Promise.all([
      fetch(`${API_BASE}/api/music/trending`).then(r => r.json()).catch(() => ({ results: [] })),
      ...LANGUAGE_CONFIG.map(l =>
        fetch(`${API_BASE}/api/music/language/${l.key}`).then(r => r.json()).catch(() => ({ results: [] }))
      ),
    ]).then(([trendData, ...langData]) => {
      setTrending(trendData.results || []);
      const byLang: Record<string, Song[]> = {};
      LANGUAGE_CONFIG.forEach((l, i) => {
        byLang[l.key] = (langData[i] as any).results || [];
      });
      setLanguageSongs(byLang);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handlePlay = (song: Song) => {
    setCurrentTrack({ ...song, albumArt: song.albumArt || '' });
  };

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>
            <Sparkles size={14} style={{ marginRight: '8px' }} />
            Premium Streaming
          </span>
          <h1 className={styles.heroTitle}>Discover Your <br />Perfect Sound</h1>
          <p className={styles.heroDescription}>
            Immerse yourself in high-fidelity audio from around the world. 
            Official tracks, curated playlists, and a seamless listening experience.
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.primaryButton}
              onClick={() => trending[0] && handlePlay(trending[0])}
            >
              <Play size={24} fill="currentColor" />
              <span>Listen Now</span>
            </button>
            <button className={styles.secondaryButton}>
              <Globe size={20} />
              <span>Browse All</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Access Grid */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Welcome Back</h2>
        <div className={styles.grid}>
          {QUICK_MIXES.map((mix) => (
            <div key={mix.id} className={styles.playlistCard}>
              <div
                className={styles.cardGradient}
                style={{ background: `linear-gradient(135deg, ${mix.color}, #0a0a0c)` }}
              />
              <h3 className={styles.cardTitle}>{mix.title}</h3>
              <button className={styles.cardPlayButton}>
                <Play size={24} fill="black" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Tracks */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <TrendingUp size={28} className="text-accent-primary" />
            Trending Worldwide
          </h2>
          <button className={styles.seeAll}>Explore All</button>
        </div>
        <div className={styles.horizontalScroll}>
          {(loading ? Array(8).fill(null) : trending).map((song, i) => (
            <div
              key={`trending-${song?.id ?? i}`}
              className={styles.trackCard}
              onClick={() => song && handlePlay(song)}
            >
              <div className={styles.trackArtWrapper}>
                {song?.albumArt ? (
                  <>
                    <img src={song.albumArt} alt={song.title} className={styles.trackArtImg} />
                    <div className={styles.trackPlayOverlay}>
                      <Play size={40} fill="white" />
                    </div>
                  </>
                ) : (
                  <div className={loading ? styles.skeleton : styles.trackArtPlaceholder}>
                    <div className={styles.trackPlayOverlay}>
                      <Play size={40} fill="white" />
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.trackInfo}>
                <h4 className={styles.trackName}>{song?.title ?? '—'}</h4>
                <p className={styles.trackArtist}>{song?.artist ?? 'Various Artists'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Language Specific Rows */}
      {LANGUAGE_CONFIG.map(({ key, label, color, icon }) => {
        const songs = languageSongs[key] || [];
        return (
          <section key={key} className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span style={{ fontSize: '24px' }}>{icon}</span> {label}
              </h2>
              <button className={styles.seeAll}>See All</button>
            </div>
            <div className={styles.horizontalScroll}>
              {(loading ? Array(6).fill(null) : songs).map((song, i) => (
                <div
                  key={`lang-${key}-${song?.id ?? i}`}
                  className={styles.trackCard}
                  onClick={() => song && handlePlay(song)}
                >
                  <div className={styles.trackArtWrapper}>
                    {song?.albumArt ? (
                      <>
                        <img src={song.albumArt} alt={song.title} className={styles.trackArtImg} />
                        <div className={styles.trackPlayOverlay}>
                          <Play size={40} fill="white" />
                        </div>
                      </>
                    ) : (
                      <div
                        className={loading ? styles.skeleton : styles.trackArtPlaceholder}
                        style={{ background: `linear-gradient(135deg, ${color}33, #0a0a0f)` }}
                      >
                        <div className={styles.trackPlayOverlay}>
                          <Play size={40} fill="white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.trackInfo}>
                    <h4 className={styles.trackName}>{song?.title ?? '—'}</h4>
                    <p className={styles.trackArtist}>{song?.artist ?? 'Unknown Artist'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

