"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Play, Flame, Music2 } from 'lucide-react';
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
  { key: 'hindi',   label: '🇮🇳 Hindi',   color: '#ff9800' },
  { key: 'punjabi', label: '🎵 Punjabi',  color: '#e040fb' },
  { key: 'korean',  label: '🇰🇷 Korean',  color: '#00e5ff' },
  { key: 'english', label: '🌍 English',  color: '#3d5afe' },
];

const FEATURED_PLAYLISTS = [
  { id: 1, title: 'Made For You',     color: '#3d5afe' },
  { id: 2, title: 'Daily Mix 1',      color: '#7c4dff' },
  { id: 3, title: 'Release Radar',    color: '#ff4081' },
  { id: 4, title: 'Discover Weekly',  color: '#00e5ff' },
  { id: 5, title: 'Chill Vibes',      color: '#00bcd4' },
  { id: 6, title: 'Late Night Drive', color: '#e91e63' },
];

export default function Home() {
  const { setCurrentTrack } = usePlayerStore();
  const [trending, setTrending] = useState<Song[]>([]);
  const [languageSongs, setLanguageSongs] = useState<Record<string, Song[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    Promise.all([
      fetch(`${API_BASE}/api/music/trending`).then(r => r.json()),
      ...LANGUAGE_CONFIG.map(l =>
        fetch(`${API_BASE}/api/music/language/${l.key}`).then(r => r.json())
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
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>🔥 Now Streaming</span>
          <h1 className={styles.heroTitle}>Music for Everyone</h1>
          <p className={styles.heroDescription}>
            Real songs in Hindi 🇮🇳, Punjabi 🎵, Korean 🇰🇷 & English 🌍 — free, with album art & previews.
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.primaryButton}
              onClick={() => trending[0] && handlePlay(trending[0])}
            >
              <Play size={20} fill="currentColor" />
              <span>Play Trending</span>
            </button>
            <button className={styles.secondaryButton}>
              <Music2 size={16} /> 4 Languages
            </button>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Good Morning 👋</h2>
        <div className={styles.grid}>
          {FEATURED_PLAYLISTS.map((playlist) => (
            <div key={playlist.id} className={styles.playlistCard}>
              <div className={styles.cardInfo}>
                <div
                  className={styles.cardGradient}
                  style={{ background: `linear-gradient(135deg, ${playlist.color}, rgba(0,0,0,0.5))` }}
                />
                <h3 className={styles.cardTitle}>{playlist.title}</h3>
              </div>
              <button className={styles.cardPlayButton}>
                <Play size={20} fill="black" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Flame size={20} /> Trending Across Languages</h2>
          <button className={styles.seeAll}>See All</button>
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
                    <div className={styles.trackPlayOverlay}><Play size={28} fill="white" /></div>
                  </>
                ) : (
                  <div className={styles.trackArtPlaceholder}>
                    <div className={styles.trackPlayOverlay}><Play size={28} fill="white" /></div>
                  </div>
                )}
              </div>
              <div className={styles.trackInfo}>
                <h4 className={styles.trackName}>{song?.title ?? '—'}</h4>
                <p className={styles.trackArtist}>{song?.artist ?? ''}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Language Rows */}
      {LANGUAGE_CONFIG.map(({ key, label, color }) => {
        const songs = languageSongs[key] || [];
        return (
          <section key={key} className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle} style={{ color }}>{label}</h2>
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
                        <div className={styles.trackPlayOverlay}><Play size={28} fill="white" /></div>
                      </>
                    ) : (
                      <div
                        className={styles.trackArtPlaceholder}
                        style={{ background: `linear-gradient(135deg, ${color}55, #0a0a0f)` }}
                      >
                        <div className={styles.trackPlayOverlay}><Play size={28} fill="white" /></div>
                      </div>
                    )}
                  </div>
                  <div className={styles.trackInfo}>
                    <h4 className={styles.trackName}>{song?.title ?? '—'}</h4>
                    <p className={styles.trackArtist}>{song?.artist ?? ''}</p>
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
