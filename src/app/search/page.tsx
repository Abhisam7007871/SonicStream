"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useSearchStore } from '@/store/useSearchStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import TrackOptionsMenu from '@/components/TrackOptionsMenu';

const TABS = ['Global (YouTube)', 'Mainstream', 'Regional Classics', 'Open Library', 'Podcasts'];
const LIMIT = 25;

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

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page on tab change
  useEffect(() => {
    setPage(1);
    setActiveShow(null);
  }, [activeTab]);

  // Fetch logic
  useEffect(() => {
    setLoading(true);
    const API_BASE = 'http://localhost:4000';
    
    if (activeTab === 'Global (YouTube)') {
      const endpoint = `${API_BASE}/api/youtube/search?q=${encodeURIComponent(debouncedQuery || 'top music hits 2024')}&page=${page}&limit=${LIMIT}`;
      fetch(endpoint)
        .then(r => r.json())
        .then(data => { 
          setResults(data.results || []); 
          setTotal(data.total || 0);
          setLoading(false); 
        })
        .catch(() => { setResults([]); setLoading(false); });
    }
    else if (activeTab === 'Mainstream') {
      const endpoint = `${API_BASE}/api/music/search?q=${encodeURIComponent(debouncedQuery || 'top hits 2024')}&page=${page}&limit=${LIMIT}`;
      fetch(endpoint)
        .then(r => r.json())
        .then(data => { 
          setResults(data.results || []); 
          setTotal(data.total || 0);
          setLoading(false); 
        });
    } 
    else if (activeTab === 'Regional Classics') {
      const endpoint = debouncedQuery.trim()
        ? `${API_BASE}/api/archive/search?q=${encodeURIComponent(debouncedQuery)}&page=${page}&limit=${LIMIT}`
        : `${API_BASE}/api/archive/indian/oldbollywood?limit=100`;
        
      fetch(endpoint)
        .then(r => r.json())
        .then(data => { 
          setResults(data.tracks || []); 
          setTotal(data.total || data.tracks?.length || 0);
          setLoading(false); 
        });
    }
    else if (activeTab === 'Open Library') {
      const endpoint = `${API_BASE}/api/music/free-search?q=${encodeURIComponent(debouncedQuery || 'remix instrumental')}&page=${page}&limit=${LIMIT}`;
      fetch(endpoint)
        .then(r => r.json())
        .then(data => { 
          setResults(data.results || []); 
          setTotal(data.total || 0);
          setLoading(false); 
        });
    }
    else if (activeTab === 'Podcasts') {
      fetch(`${API_BASE}/api/podcasts/indian`)
        .then(r => r.json())
        .then(data => { 
          setShows(data.shows || []); 
          setLoading(false); 
        });
    }
  }, [debouncedQuery, activeTab, page]);

  const loadPodcastFeed = (feedUrl: string, showData: any) => {
    setLoading(true);
    setActiveShow(showData);
    fetch(`http://localhost:4000/api/podcasts/feed?url=${encodeURIComponent(feedUrl)}`)
      .then(r => r.json())
      .then(data => {
        setEpisodes(data.episodes || []);
        setLoading(false);
      });
  };

  const totalPages = Math.ceil(total / LIMIT);

  const { likedSongs, toggleLike, isLiked, isInLibrary } = useLibraryStore();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className={styles.searchPage}>
      {/* Source Tabs */}
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
        {activeTab === 'Podcasts' && activeShow ? activeShow.title : (debouncedQuery ? `Results for "${debouncedQuery}"` : 'Browse')}
      </h2>

      {activeTab !== 'Podcasts' && (
        <>
          <div className={styles.songsListFull}>
            {loading ? (
              <div className={styles.loading}>Searching global catalog...</div>
            ) : results.length > 0 ? (
              results.map((song) => (
                <div 
                  key={song.id} 
                  className={styles.songRow} 
                  onClick={() => {
                    setQueue(results);
                    setCurrentTrack(song);
                  }}
                >
                  <div className={styles.songMain}>
                    <img src={song.cover || song.albumArt} alt="" className={styles.songArt} style={{ objectFit: 'cover' }} />
                    <div className={styles.songMeta}>
                      <span className={styles.songName}>{song.title}</span>
                      <span className={styles.songArtist}>{song.artist}</span>
                    </div>
                    {song.source !== 'youtube' && <span className={styles.songGenreTag}>{song.source}</span>}
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
              <div className={styles.noResults}>No tracks found.</div>
            )}
          </div>

          {/* Pagination Controls */}
          {total > LIMIT && (
            <div className={styles.pagination}>
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className={styles.pageBtn}
              >
                <ChevronLeft size={20} /> Previous
              </button>
              <span className={styles.pageInfo}>Page {page} of {totalPages || 1}</span>
              <button 
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)}
                className={styles.pageBtn}
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Podcasts Content */}
      {activeTab === 'Podcasts' && !activeShow && (
        <div className={styles.grid}>
          {loading ? <div>Loading Podcasts...</div> : shows.map((show, idx) => (
            <div key={idx} className={styles.categoryCard} onClick={() => loadPodcastFeed(show.feedUrl, show)}>
              <h3 className={styles.categoryTitle}>{show.title}</h3>
              <p className={styles.categoryAuthor}>{show.author}</p>
              {show.cover && <img src={show.cover} className={styles.cardImagePlaceholder} alt="" />}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Podcasts' && activeShow && (
        <div className={styles.songsListFull}>
          <button onClick={() => setActiveShow(null)} className={styles.backBtn}>
            ← Back to Shows
          </button>
          {loading ? <div>Loading Episodes...</div> : episodes.map(ep => (
            <div key={ep.id} className={styles.songRow} onClick={() => setCurrentTrack({...ep, url: ep.streamUrl})}>
              <div className={styles.songMain}>
                <img src={ep.cover} alt="" className={styles.songArt} style={{ objectFit: 'cover' }} />
                <div className={styles.songMeta}>
                  <span className={styles.songName}>{ep.title}</span>
                  <span className={styles.songArtist}>{new Date(ep.pubDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
