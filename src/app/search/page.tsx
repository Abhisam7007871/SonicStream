"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useSearchStore } from '@/store/useSearchStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Play, Clock } from 'lucide-react';

const CATEGORIES = [
  { title: 'Podcasts', color: '#e13300' },
  { title: 'Made For You', color: '#1e3264' },
  { title: 'Charts', color: '#8d67ab' },
  { title: 'New Releases', color: '#e8115b' },
  { title: 'Discover', color: '#8d67ab' },
  { title: 'Live Events', color: '#7358ff' },
  { title: 'Pop', color: '#148a08' },
  { title: 'Hip-Hop', color: '#ba5d07' },
];

export default function SearchPage() {
  const { query } = useSearchStore();
  const { setCurrentTrack } = usePlayerStore();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      setLoading(true);
      fetch(`http://localhost:4000/api/music/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
          setResults(data.results);
          setLoading(false);
        });
    } else {
      setResults([]);
    }
  }, [query]);

  if (query) {
    return (
      <div className={styles.searchPage}>
        <div className={styles.resultsGrid}>
          <section className={styles.topResult}>
            <h2 className={styles.sectionTitle}>Top result</h2>
            {loading ? (
              <div className={styles.loading}>Searching...</div>
            ) : results.length > 0 ? (
              <div className={styles.topCard} onClick={() => setCurrentTrack(results[0])}>
                <div className={styles.topArt}></div>
                <h3 className={styles.topTitle}>{results[0].title}</h3>
                <p className={styles.topSubtitle}>{results[0].artist} • Song</p>
                <button className={styles.topPlayButton}>
                  <Play size={24} fill="black" />
                </button>
              </div>
            ) : (
              <div>No results found</div>
            )}
          </section>

          <section className={styles.songsList}>
            <h2 className={styles.sectionTitle}>Songs</h2>
            <div className={styles.songsContainer}>
              {results.map((song) => (
                <div 
                  key={song.id} 
                  className={styles.songRow}
                  onClick={() => setCurrentTrack(song)}
                >
                  <div className={styles.songMain}>
                    <div className={styles.songArt}></div>
                    <div className={styles.songMeta}>
                      <span className={styles.songName}>{song.title}</span>
                      <span className={styles.songArtist}>{song.artist}</span>
                    </div>
                  </div>
                  <span className={styles.songDuration}>{song.duration || '3:30'}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // No query — show browse all with genre pills
  const [genres, setGenres] = useState<string[]>([]);
  const [activeGenre, setActiveGenre] = useState<string>('All');
  const [browseResults, setBrowseResults] = useState<any[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:4000/api/music/genres')
      .then(r => r.json())
      .then(data => setGenres(['All', ...data.genres]));

    fetch('http://localhost:4000/api/music/search')
      .then(r => r.json())
      .then(data => {
        setBrowseResults(data.results || []);
        setBrowseLoading(false);
      });
  }, []);

  const filtered = activeGenre === 'All'
    ? browseResults
    : browseResults.filter((s: any) => s.genre === activeGenre);

  const GENRE_COLORS: Record<string, string> = {
    'Indie': '#7c4dff', 'Synthwave': '#e040fb', 'Ambient': '#00bcd4',
    'Pop': '#ff4081', 'R&B': '#ff9800', 'Lo-fi': '#8bc34a',
    'Electronic': '#3d5afe', 'Rock': '#f44336', 'EDM': '#00e5ff',
    'Folk': '#795548', 'Retrowave': '#e91e63', 'All': '#3d5afe',
  };

  return (
    <div className={styles.searchPage}>
      {/* Genre Pills */}
      <div className={styles.genrePills}>
        {genres.map(g => (
          <button
            key={g}
            className={`${styles.genrePill} ${activeGenre === g ? styles.genrePillActive : ''}`}
            style={activeGenre === g ? { background: GENRE_COLORS[g] || '#3d5afe', color: 'black' } : {}}
            onClick={() => setActiveGenre(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <h2 className={styles.title}>
        {activeGenre === 'All' ? `All Songs (${browseResults.length})` : `${activeGenre} (${filtered.length})`}
      </h2>

      <div className={styles.songsListFull}>
        {browseLoading
          ? Array(8).fill(null).map((_, i) => (
              <div key={i} className={`${styles.songRow} ${styles.skeletonRow}`} />
            ))
          : filtered.map((song: any) => (
              <div
                key={song.id}
                className={styles.songRow}
                onClick={() => setCurrentTrack(song)}
              >
                <div className={styles.songMain}>
                  <div
                    className={styles.songArt}
                    style={{ background: `linear-gradient(135deg, ${GENRE_COLORS[song.genre] || '#3d5afe'}, #0a0a0f)` }}
                  />
                  <div className={styles.songMeta}>
                    <span className={styles.songName}>{song.title}</span>
                    <span className={styles.songArtist}>{song.artist} • {song.album}</span>
                  </div>
                  <span className={styles.songGenreTag} style={{ color: GENRE_COLORS[song.genre] || '#3d5afe' }}>
                    {song.genre}
                  </span>
                </div>
                <span className={styles.songDuration}>{song.duration}</span>
              </div>
            ))
        }
      </div>
    </div>
  );
}
