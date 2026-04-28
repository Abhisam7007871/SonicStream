"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useSearchStore } from '@/store/useSearchStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useHydratedLibraryStore as useLibraryStore } from '@/store/useLibraryStore';
import { ChevronLeft, ChevronRight, Heart, ListPlus, MoreHorizontal } from 'lucide-react';
import TrackOptionsMenu from '@/components/TrackOptionsMenu';

const TABS = ['Music', 'Podcasts'];
const LIMIT = 50;

export default function SearchPage() {
  const { query } = useSearchStore();
  const { setCurrentTrack, setQueue } = usePlayerStore();
  
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Podcast specific state
  const [shows, setShows] = useState<any[]>([]);
  const [activeShow, setActiveShow] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);

  // Fast debounce (150ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page on tab change
  useEffect(() => {
    setPage(1);
    setActiveShow(null);
  }, [activeTab]);

  // Fetch logic - Multi-source aggregation
  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
    const controller = new AbortController();

    if (activeTab === 'Music') {
      setLoading(true);
      const searchQuery = debouncedQuery.trim() || 'top hits 2024';
      
      // YouTube is primary (fast, mainstream catalog)
      fetch(
        `${API_BASE}/api/youtube/search?q=${encodeURIComponent(searchQuery)}&limit=${LIMIT}`,
        { signal: controller.signal }
      )
        .then(r => r.json())
        .then(data => {
          const ytResults = (data.results || []).map((r: any) => ({ ...r, source: r.source || 'youtube' }));
          setResults(ytResults);
          setTotal(ytResults.length);
          setLoading(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setResults([]);
            setLoading(false);
          }
        });
    }
    else if (activeTab === 'Podcasts') {
      setLoading(true);
      const searchQuery = debouncedQuery.trim();
      const endpoint = searchQuery
        ? `${API_BASE}/api/podcasts/search?q=${encodeURIComponent(searchQuery)}&limit=20`
        : `${API_BASE}/api/podcasts/search?q=top+podcasts&limit=20`;
      
      fetch(endpoint, { signal: controller.signal })
        .then(r => r.json())
        .then(data => { 
          setShows(data.shows || []); 
          setLoading(false); 
        })
        .catch((err) => { 
          if (err.name !== 'AbortError') {
            setShows([]); 
            setLoading(false); 
          }
        });
    }

    return () => controller.abort();
  }, [debouncedQuery, activeTab, page]);

  const loadPodcastFeed = (feedUrl: string, showData: any) => {
    setLoading(true);
    setActiveShow(showData);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${API_BASE}/api/podcasts/feed?url=${encodeURIComponent(feedUrl)}`)
      .then(r => r.json())
      .then(data => {
        setEpisodes(data.episodes || []);
        setLoading(false);
      })
      .catch(() => { setEpisodes([]); setLoading(false); });
  };

  const { isInLibrary } = useLibraryStore();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className={styles.searchPage}>
      {/* Simple Tabs: Music / Podcasts */}
      <div className={styles.genrePills}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`${styles.genrePill} ${activeTab === tab ? styles.genrePillActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>
        {activeTab === 'Podcasts' && activeShow 
          ? activeShow.title 
          : (debouncedQuery ? `Results for "${debouncedQuery}"` : 'Trending')}
      </h2>

      {activeTab === 'Music' && (
        <>
          <div className={styles.songsListFull}>
            {loading ? (
              <div className={styles.loading}>Searching...</div>
            ) : results.length > 0 ? (
              results.map((song, idx) => (
                <div 
                  key={`${song.source}-${song.id}-${idx}`} 
                  className={styles.songRow} 
                  onClick={() => {
                    setQueue(results);
                    setCurrentTrack(song);
                  }}
                >
                  <div className={styles.songMain}>
                    <img src={song.cover || song.albumArt || ''} alt="" className={styles.songArt} style={{ objectFit: 'cover' }} />
                    <div className={styles.songMeta}>
                      <span className={styles.songName}>{song.title}</span>
                      <span className={styles.songArtist}>{song.artist}</span>
                    </div>
                  </div>
                  <div className={styles.songActions} style={{ position: 'relative' }}>
                    <button 
                      className={`${styles.likeBtn} ${isInLibrary(song.id) ? styles.liked : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === song.id ? null : song.id);
                      }}
                    >
                      <Heart 
                        size={20} 
                        fill={isInLibrary(song.id) ? "var(--accent-primary)" : "none"} 
                        color={isInLibrary(song.id) ? "var(--accent-primary)" : "currentColor"}
                      />
                    </button>
                    {activeMenuId === song.id && (
                      <TrackOptionsMenu 
                        track={song} 
                        onClose={() => setActiveMenuId(null)} 
                      />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noResults}>No tracks found. Try a different search.</div>
            )}
          </div>
        </>
      )}

      {/* Podcasts - Show List */}
      {activeTab === 'Podcasts' && !activeShow && (
        <div className={styles.grid}>
          {loading ? <div className={styles.loading}>Searching podcasts...</div> : shows.length > 0 ? shows.map((show, idx) => (
            <div key={show.id || idx} className={styles.categoryCard} onClick={() => loadPodcastFeed(show.feedUrl, show)}>
              {show.cover && <img src={show.cover} className={styles.cardImagePlaceholder} alt="" style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }} />}
              <h3 className={styles.categoryTitle}>{show.title}</h3>
              <p className={styles.categoryAuthor}>{show.author}</p>
              {show.genre && <p style={{ fontSize: '0.7rem', color: '#888', marginTop: 4 }}>{show.genre}</p>}
            </div>
          )) : (
            <div className={styles.noResults}>No podcasts found. Try searching for a podcast name.</div>
          )}
        </div>
      )}

      {/* Podcasts - Episodes */}
      {activeTab === 'Podcasts' && activeShow && (
        <div className={styles.songsListFull}>
          <button onClick={() => setActiveShow(null)} className={styles.backBtn}>
            ← Back to Shows
          </button>
          {loading ? <div className={styles.loading}>Loading Episodes...</div> : episodes.length > 0 ? episodes.map(ep => (
            <div key={ep.id} className={styles.songRow} onClick={() => setCurrentTrack({
              id: ep.id,
              title: ep.title,
              artist: activeShow.author || ep.author || 'Podcast',
              cover: ep.cover || activeShow.cover || '',
              albumArt: ep.cover || activeShow.cover || '',
              url: ep.streamUrl || ep.url || '',
              source: 'internal' as const,
            })}>
              <div className={styles.songMain}>
                <img src={ep.cover || activeShow.cover || ''} alt="" className={styles.songArt} style={{ objectFit: 'cover' }} />
                <div className={styles.songMeta}>
                  <span className={styles.songName}>{ep.title}</span>
                  <span className={styles.songArtist}>{ep.pubDate ? new Date(ep.pubDate).toLocaleDateString() : activeShow.author}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className={styles.noResults}>No episodes found for this podcast.</div>
          )}
        </div>
      )}
    </div>
  );
}
