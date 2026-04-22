import styles from './page.module.css';
import { Play } from 'lucide-react';

const FEATURED_PLAYLISTS = [
  { id: 1, title: 'Made For You', description: 'Personalized mix of your favorites', color: '#3d5afe' },
  { id: 2, title: 'Daily Mix 1', description: 'Electronic, Synthwave and more', color: '#7c4dff' },
  { id: 3, title: 'Release Radar', description: 'New music from artists you follow', color: '#ff4081' },
  { id: 4, title: 'Discover Weekly', description: 'Your weekly mixtape of fresh music', color: '#00e5ff' },
];

const RECENTLY_PLAYED = [
  { id: 101, title: 'Midnight City', artist: 'M83', albumArt: '/bg-1.jpg' },
  { id: 102, title: 'Blinding Lights', artist: 'The Weeknd', albumArt: '/bg-2.jpg' },
  { id: 103, title: 'Starboy', artist: 'The Weeknd', albumArt: '/bg-3.jpg' },
  { id: 104, title: 'Stay', artist: 'The Kid LAROI', albumArt: '/bg-1.jpg' },
  { id: 105, title: 'Heat Waves', artist: 'Glass Animals', albumArt: '/bg-2.jpg' },
];

export default function Home() {
  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>Featured Playlist</span>
          <h1 className={styles.heroTitle}>Celestial Melodies</h1>
          <p className={styles.heroDescription}>
            Dive into a cosmic journey of ambient soundscapes and ethereal beats. 
            Perfect for deep focus or late-night contemplation.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.primaryButton}>
              <Play size={20} fill="currentColor" />
              <span>Listen Now</span>
            </button>
            <button className={styles.secondaryButton}>Save to Library</button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Good Morning</h2>
        <div className={styles.grid}>
          {FEATURED_PLAYLISTS.map((playlist) => (
            <div key={playlist.id} className={styles.playlistCard}>
              <div className={styles.cardInfo}>
                <div 
                  className={styles.cardGradient} 
                  style={{ background: `linear-gradient(135deg, ${playlist.color}, rgba(0,0,0,0.5))` }}
                ></div>
                <h3 className={styles.cardTitle}>{playlist.title}</h3>
              </div>
              <button className={styles.cardPlayButton}>
                <Play size={20} fill="black" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Based on your music taste</h2>
          <button className={styles.seeAll}>See All</button>
        </div>
        <div className={styles.horizontalScroll}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={styles.trackCard}>
              <div className={styles.trackArtWrapper}>
                <div className={`${styles.trackArtPlaceholder} ${styles.recommendationArt}`}>
                  <div className={styles.trackPlayOverlay}>
                    <Play size={32} fill="white" />
                  </div>
                </div>
              </div>
              <div className={styles.trackInfo}>
                <h4 className={styles.trackName}>Taste Mix {i}</h4>
                <p className={styles.trackArtist}>SonicStream Curated</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Because you like The Weeknd</h2>
          <button className={styles.seeAll}>See All</button>
        </div>
        <div className={styles.horizontalScroll}>
          {RECENTLY_PLAYED.map((track) => (
            <div key={track.id + '-rec'} className={styles.trackCard}>
              <div className={styles.trackArtWrapper}>
                <div className={styles.trackArtPlaceholder}>
                  <div className={styles.trackPlayOverlay}>
                    <Play size={32} fill="white" />
                  </div>
                </div>
              </div>
              <div className={styles.trackInfo}>
                <h4 className={styles.trackName}>{track.title}</h4>
                <p className={styles.trackArtist}>{track.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recently Played</h2>
          <button className={styles.seeAll}>See All</button>
        </div>
        <div className={styles.horizontalScroll}>
          {RECENTLY_PLAYED.map((track) => (
            <div key={track.id} className={styles.trackCard}>
              <div className={styles.trackArtWrapper}>
                <div className={styles.trackArtPlaceholder}>
                  <div className={styles.trackPlayOverlay}>
                    <Play size={32} fill="white" />
                  </div>
                </div>
              </div>
              <div className={styles.trackInfo}>
                <h4 className={styles.trackName}>{track.title}</h4>
                <p className={styles.trackArtist}>{track.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
