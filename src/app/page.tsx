"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Play, Flame, Music2, Sparkles, TrendingUp, Globe, Heart, ArrowLeft, X } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';

interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  language?: string;
  duration?: string;
  url: string;
  albumArt?: string;
  cover?: string;
  source?: 'audiomack' | 'internal' | 'itunes' | 'youtube' | 'internetarchive' | 'jamendo';
}

const LANGUAGE_CONFIG = [
  { key: 'hindi',   label: 'Hindi Hits',   icon: '🇮🇳', color: '#ff9800', searchTerm: 'hindi bollywood songs 2024' },
  { key: 'punjabi', label: 'Punjabi Beats', icon: '🎵', color: '#e040fb', searchTerm: 'punjabi songs 2024' },
  { key: 'korean',  label: 'K-Pop Central', icon: '🇰🇷', color: '#00e5ff', searchTerm: 'kpop songs 2024' },
  { key: 'english', label: 'Global English', icon: '🌍', color: '#6366f1', searchTerm: 'english pop hits 2024' },
];

const QUICK_MIXES = [
  { id: 1, title: 'Morning Energy', color: '#6366f1', searchTerm: 'upbeat morning songs energy' },
  { id: 2, title: 'Deep Focus',     color: '#a855f7', searchTerm: 'deep focus study music instrumental' },
  { id: 3, title: 'Chill Vibes',    color: '#ec4899', searchTerm: 'chill vibes lofi relaxing songs' },
  { id: 4, title: 'Workout Mix',    color: '#f43f5e', searchTerm: 'workout gym motivation songs' },
  { id: 5, title: 'Late Night',     color: '#8b5cf6', searchTerm: 'late night romantic songs' },
  { id: 6, title: 'Release Radar',  color: '#06b6d4', searchTerm: 'new release songs 2024' },
];

const JAMENDO_GENRE_ROWS = [
  { tag: 'electronic', label: '⚡ Electronic',  color: '#06b6d4' },
  { tag: 'rock',       label: '🎸 Rock',        color: '#ef4444' },
  { tag: 'pop',        label: '🎤 Pop',         color: '#ec4899' },
  { tag: 'jazz',       label: '🎷 Jazz & Soul', color: '#f59e0b' },
  { tag: 'hiphop',     label: '🎧 Hip-Hop',     color: '#8b5cf6' },
  { tag: 'ambient',    label: '🌙 Ambient',     color: '#14b8a6' },
];

export default function Home() {
  const { setCurrentTrack, setQueue } = usePlayerStore();
  const [trending, setTrending] = useState<Song[]>([]);
  const [languageSongs, setLanguageSongs] = useState<Record<string, Song[]>>({});
  const [loading, setLoading] = useState(true);

  // Jamendo state
  const [jamendoTrending, setJamendoTrending] = useState<Song[]>([]);
  const [jamendoGenres, setJamendoGenres] = useState<Record<string, Song[]>>({});
  const [jamendoLoading, setJamendoLoading] = useState(true);

  // Expanded section state
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedSongs, setExpandedSongs] = useState<Song[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedTitle, setExpandedTitle] = useState('');

  // Quick mix loading state
  const [mixLoading, setMixLoading] = useState<number | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    // Fetch YouTube / language data
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

    // Fetch Jamendo data (legal free music)
    Promise.all([
      fetch(`${API_BASE}/api/jamendo/trending?limit=12`).then(r => r.json()).catch(() => ({ results: [] })),
      ...JAMENDO_GENRE_ROWS.map(g =>
        fetch(`${API_BASE}/api/jamendo/tags/${g.tag}?limit=10`).then(r => r.json()).catch(() => ({ results: [] }))
      ),
    ]).then(([jamTrend, ...genreData]) => {
      setJamendoTrending(jamTrend.results || []);
      const byGenre: Record<string, Song[]> = {};
      JAMENDO_GENRE_ROWS.forEach((g, i) => {
        byGenre[g.tag] = (genreData[i] as any).results || [];
      });
      setJamendoGenres(byGenre);
      setJamendoLoading(false);
    }).catch(() => setJamendoLoading(false));
  }, []);

  const handlePlay = (song: Song, songList?: Song[]) => {
    if (songList) setQueue(songList);
    setCurrentTrack({ ...song, albumArt: song.albumArt || '' });
  };

  // Quick Mix: fetch songs for mood and play
  const handleQuickMix = async (mix: typeof QUICK_MIXES[0]) => {
    setMixLoading(mix.id);
    try {
      const res = await fetch(`${API_BASE}/api/youtube/search?q=${encodeURIComponent(mix.searchTerm)}&limit=30`);
      const data = await res.json();
      const songs = data.results || [];
      if (songs.length > 0) {
        setQueue(songs);
        // Shuffle and play first
        const randomIdx = Math.floor(Math.random() * songs.length);
        handlePlay(songs[randomIdx], songs);
      }
    } catch (e) {
      console.error('Quick mix error:', e);
    }
    setMixLoading(null);
  };

  // "See All" / "Explore All" — load full list
  const handleSeeAll = async (sectionKey: string, title: string, searchTerm: string) => {
    setExpandedSection(sectionKey);
    setExpandedTitle(title);
    setExpandedLoading(true);
    setExpandedSongs([]);

    try {
      const res = await fetch(`${API_BASE}/api/youtube/search?q=${encodeURIComponent(searchTerm)}&limit=50`);
      const data = await res.json();
      setExpandedSongs(data.results || []);
    } catch (e) {
      console.error('See all error:', e);
    }
    setExpandedLoading(false);
  };

  const handleSeeAllJamendo = async (tag: string, title: string) => {
    setExpandedSection(`jamendo-${tag}`);
    setExpandedTitle(title);
    setExpandedLoading(true);
    setExpandedSongs([]);

    try {
      const res = await fetch(`${API_BASE}/api/jamendo/tags/${tag}?limit=50`);
      const data = await res.json();
      setExpandedSongs(data.results || []);
    } catch (e) {
      console.error('See all jamendo error:', e);
    }
    setExpandedLoading(false);
  };

  // If a section is expanded, show full song list
  if (expandedSection) {
    return (
      <div className={styles.home}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button 
            onClick={() => setExpandedSection(null)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 50,
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{expandedTitle}</h1>
        </div>

        {expandedLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading songs...</div>
        ) : expandedSongs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {expandedSongs.map((song, idx) => (
              <div
                key={`${song.id}-${idx}`}
                onClick={() => handlePlay(song, expandedSongs)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#666', fontWeight: 600, width: 30, textAlign: 'right', fontSize: 14 }}>{idx + 1}</span>
                  <img 
                    src={song.albumArt || song.cover || ''} 
                    alt="" 
                    style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', background: '#222' }} 
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#999' }}>{song.artist}</div>
                  </div>
                </div>
                <Play size={18} style={{ color: '#888' }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>No songs found.</div>
        )}
      </div>
    );
  }

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
              onClick={() => trending[0] && handlePlay(trending[0], trending)}
            >
              <Play size={24} fill="currentColor" />
              <span>Listen Now</span>
            </button>
            <button className={styles.secondaryButton} onClick={() => handleSeeAll('trending-all', 'Trending Worldwide', 'top hits 2024 trending songs')}>
              <Globe size={20} />
              <span>Browse All</span>
            </button>
          </div>
        </div>
      </section>

      {/* Quick Access Grid — functional mood playlists */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Welcome Back</h2>
        <div className={styles.grid}>
          {QUICK_MIXES.map((mix) => (
            <div key={mix.id} className={styles.playlistCard} onClick={() => handleQuickMix(mix)} style={{ cursor: 'pointer' }}>
              <div
                className={styles.cardGradient}
                style={{ background: `linear-gradient(135deg, ${mix.color}, #0a0a0c)` }}
              />
              <h3 className={styles.cardTitle}>
                {mixLoading === mix.id ? '⏳ Loading...' : mix.title}
              </h3>
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
          <button className={styles.seeAll} onClick={() => handleSeeAll('trending', 'Trending Worldwide', 'trending songs worldwide 2024')}>
            Explore All
          </button>
        </div>
        <div className={styles.horizontalScroll}>
          {(loading ? Array(8).fill(null) : trending).map((song, i) => (
            <div
              key={`trending-${song?.id ?? i}`}
              className={styles.trackCard}
              onClick={() => song && handlePlay(song, trending)}
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
      {LANGUAGE_CONFIG.map(({ key, label, color, icon, searchTerm }) => {
        const songs = languageSongs[key] || [];
        return (
          <section key={key} className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span style={{ fontSize: '24px' }}>{icon}</span> {label}
              </h2>
              <button className={styles.seeAll} onClick={() => handleSeeAll(key, label, searchTerm)}>
                See All
              </button>
            </div>
            <div className={styles.horizontalScroll}>
              {(loading ? Array(6).fill(null) : songs).map((song, i) => (
                <div
                  key={`lang-${key}-${song?.id ?? i}`}
                  className={styles.trackCard}
                  onClick={() => song && handlePlay(song, songs)}
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

      {/* ─── Jamendo: Free to Stream ─── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Music2 size={28} style={{ color: '#10b981' }} />
            🎵 Free to Stream (Jamendo)
          </h2>
          <button className={styles.seeAll} onClick={() => handleSeeAllJamendo('pop', '🎵 Free to Stream')}>
            Explore All
          </button>
        </div>
        <div className={styles.horizontalScroll}>
          {(jamendoLoading ? Array(10).fill(null) : jamendoTrending).map((song, i) => (
            <div
              key={`jamendo-trend-${song?.id ?? i}`}
              className={styles.trackCard}
              onClick={() => {
                if (song) handlePlay(song, jamendoTrending);
              }}
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
                    className={jamendoLoading ? styles.skeleton : styles.trackArtPlaceholder}
                    style={{ background: 'linear-gradient(135deg, #10b98133, #0a0a0f)' }}
                  >
                    <div className={styles.trackPlayOverlay}>
                      <Play size={40} fill="white" />
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.trackInfo}>
                <h4 className={styles.trackName}>{song?.title ?? '—'}</h4>
                <p className={styles.trackArtist}>{song?.artist ?? 'Independent Artist'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Jamendo Genre Rows */}
      {JAMENDO_GENRE_ROWS.map(({ tag, label, color }) => {
        const songs = jamendoGenres[tag] || [];
        return (
          <section key={`jamendo-${tag}`} className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{label}</h2>
              <button className={styles.seeAll} onClick={() => handleSeeAllJamendo(tag, label)}>
                See All
              </button>
            </div>
            <div className={styles.horizontalScroll}>
              {(jamendoLoading ? Array(6).fill(null) : songs).map((song, i) => (
                <div
                  key={`jamendo-${tag}-${song?.id ?? i}`}
                  className={styles.trackCard}
                  onClick={() => {
                    if (song) handlePlay(song, songs);
                  }}
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
                        className={jamendoLoading ? styles.skeleton : styles.trackArtPlaceholder}
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
                    <p className={styles.trackArtist}>{song?.artist ?? 'Independent Artist'}</p>
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
