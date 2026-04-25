"use client";

import styles from './Sidebar.module.css';
import { Home, Search, Library, PlusSquare, Heart, Music2, Mic2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: <Home size={20} />, label: 'Home' },
    { href: '/search', icon: <Search size={20} />, label: 'Search' },
    { href: '/library', icon: <Library size={20} />, label: 'Your Library' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Music2 className={styles.logoIcon} size={32} />
        <span className={styles.logoText}>GaMaPa</span>
      </div>

      <nav className={styles.nav}>
        <div className={styles.section}>
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Playlists</h3>
          <button className={styles.navLink}>
            <PlusSquare size={20} />
            <span>Create Playlist</span>
          </button>
          <Link 
            href="/collection/tracks" 
            className={`${styles.navLink} ${pathname === '/collection/tracks' ? styles.active : ''}`}
          >
            <Heart size={20} />
            <span>Liked Songs</span>
          </Link>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Podcasts</h3>
          <Link 
            href="/podcasts" 
            className={`${styles.navLink} ${pathname === '/podcasts' ? styles.active : ''}`}
          >
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
