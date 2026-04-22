"use client";

import styles from './Navbar.module.css';
import { Search, ChevronLeft, ChevronRight, User, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSearchStore } from '@/store/useSearchStore';

export default function Navbar() {
  const router = useRouter();
  const { query, setQuery } = useSearchStore();

  return (
    <header className={`${styles.navbar} glass`}>
      <div className={styles.navigation}>
        <button onClick={() => router.back()} className={styles.navButton}>
          <ChevronLeft size={24} />
        </button>
        <button onClick={() => router.forward()} className={styles.navButton}>
          <ChevronRight size={24} />
        </button>
      </div>

      <div className={styles.searchContainer}>
        <Search className={styles.searchIcon} size={20} />
        <input 
          type="text" 
          placeholder="What do you want to listen to?" 
          className={styles.searchInput}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value) {
              router.push('/search');
            }
          }}
        />
      </div>

      <div className={styles.actions}>
        <button className={styles.actionButton}>
          <Bell size={20} />
        </button>
        <button className={styles.profileButton}>
          <User size={20} />
        </button>
      </div>
    </header>
  );
}
