"use client";

import styles from './Sidebar.module.css';
import { Home, Search, Library, PlusSquare, Heart, Music2, Mic2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLibraryStore } from '@/store/useLibraryStore';

export default function Sidebar() {
  const pathname = usePathname();
  const { playlists } = useLibraryStore();

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
            href="/playlist/liked-songs" 
            className={`${styles.navLink} ${pathname === '/playlist/liked-songs' ? styles.active : ''}`}
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
        {playlists.filter(p => p.id !== 'liked-songs').map((playlist) => (
          <Link 
            key={playlist.id} 
            href={`/playlist/${playlist.id}`} 
            className={`${styles.playlistItem} ${pathname === `/playlist/${playlist.id}` ? styles.activeItem : ''}`}
          >
            {playlist.name}
          </Link>
        ))}
      </div>
    </aside>
  );
}
