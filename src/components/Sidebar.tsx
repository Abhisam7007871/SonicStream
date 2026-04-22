import styles from './Sidebar.module.css';
import { Home, Search, Library, PlusSquare, Heart, Music2, Mic2 } from 'lucide-react';
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Music2 className={styles.logoIcon} size={32} />
        <span className={styles.logoText}>SonicStream</span>
      </div>

      <nav className={styles.nav}>
        <div className={styles.section}>
          <Link href="/" className={`${styles.navLink} ${styles.active}`}>
            <Home size={20} />
            <span>Home</span>
          </Link>
          <Link href="/search" className={styles.navLink}>
            <Search size={20} />
            <span>Search</span>
          </Link>
          <Link href="/library" className={styles.navLink}>
            <Library size={20} />
            <span>Your Library</span>
          </Link>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Playlists</h3>
          <button className={styles.navLink}>
            <PlusSquare size={20} />
            <span>Create Playlist</span>
          </button>
          <Link href="/collection/tracks" className={styles.navLink}>
            <Heart size={20} />
            <span>Liked Songs</span>
          </Link>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Podcasts</h3>
          <Link href="/podcasts" className={styles.navLink}>
            <Mic2 size={20} />
            <span>Latest Episodes</span>
          </Link>
        </div>
      </nav>

      <div className={styles.playlists}>
        <Link href="/playlist/1" className={styles.playlistItem}>Chill Lo-fi Beats</Link>
        <Link href="/playlist/2" className={styles.playlistItem}>Workout Energy</Link>
        <Link href="/playlist/3" className={styles.playlistItem}>Deep Focus Mix</Link>
        <Link href="/playlist/4" className={styles.playlistItem}>Morning Coffee</Link>
      </div>
    </aside>
  );
}
