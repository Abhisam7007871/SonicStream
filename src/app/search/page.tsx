"use client";

import styles from './page.module.css';
import { useSearchStore } from '@/store/useSearchStore';
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

const MOCK_RESULTS = [
  { id: 1, title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We\'re Dreaming', duration: '4:03' },
  { id: 2, title: 'Starboy', artist: 'The Weeknd', album: 'Starboy', duration: '3:50' },
  { id: 3, title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: '3:20' },
];

export default function SearchPage() {
  const { query } = useSearchStore();

  if (query) {
    return (
      <div className={styles.searchPage}>
        <div className={styles.resultsGrid}>
          <section className={styles.topResult}>
            <h2 className={styles.sectionTitle}>Top result</h2>
            <div className={styles.topCard}>
              <div className={styles.topArt}></div>
              <h3 className={styles.topTitle}>{MOCK_RESULTS[0].title}</h3>
              <p className={styles.topSubtitle}>{MOCK_RESULTS[0].artist} • Song</p>
              <button className={styles.topPlayButton}>
                <Play size={24} fill="black" />
              </button>
            </div>
          </section>

          <section className={styles.songsList}>
            <h2 className={styles.sectionTitle}>Songs</h2>
            <div className={styles.songsContainer}>
              {MOCK_RESULTS.map((song) => (
                <div key={song.id} className={styles.songRow}>
                  <div className={styles.songMain}>
                    <div className={styles.songArt}></div>
                    <div className={styles.songMeta}>
                      <span className={styles.songName}>{song.title}</span>
                      <span className={styles.songArtist}>{song.artist}</span>
                    </div>
                  </div>
                  <span className={styles.songDuration}>{song.duration}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.searchPage}>
      <div className={styles.browseHistory}>
        <h2 className={styles.sectionTitle}>Recent searches</h2>
        <div className={styles.historyList}>
          <div className={styles.historyItem}>
            <Clock size={16} />
            <span>The Weeknd</span>
          </div>
          <div className={styles.historyItem}>
            <Clock size={16} />
            <span>Synthwave Mix</span>
          </div>
        </div>
      </div>

      <h2 className={styles.title}>Browse all</h2>
      <div className={styles.grid}>
        {CATEGORIES.map((category) => (
          <div 
            key={category.title} 
            className={styles.categoryCard}
            style={{ backgroundColor: category.color }}
          >
            <h3 className={styles.categoryTitle}>{category.title}</h3>
            <div className={styles.cardImagePlaceholder}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
