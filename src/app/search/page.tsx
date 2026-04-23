"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useSearchStore } from '@/store/useSearchStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Play } from 'lucide-react';

const TABS = ['Global (YouTube)', 'Mainstream', 'Regional Classics', 'Open Library', 'Podcasts'];

export default function SearchPage() {
  const { query } = useSearchStore();
  const { setCurrentTrack } = usePlayerStore();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Podcast specific state
  const [shows, setShows] = useState<any[]>([]);
  const [activeShow, setActiveShow] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);

  // Fetch logic based on tab and query
  useEffect(() => {
    setLoading(true);
    
    if (activeTab === 'Global (YouTube)') {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
      const endpoint = query.trim() 
        ? `${API_BASE}/api/youtube/search?q=${encodeURIComponent(query)}`
        : `${API_BASE}/api/youtube/search?q=top+music+hits+2024`;
      
      fetch(endpoint)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then(data => { setResults(data.results || []); setLoading(false); })
        .catch(err => { 
          console.error('[Search] YouTube search failed:', err);
          setResults([]);
          setLoading(false);
        });
    }
    else if (activeTab === 'Mainstream') {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
      const endpoint = query.trim() 
        ? `${API_BASE}/api/music/search?q=${encodeURIComponent(query)}`
        : `${API_BASE}/api/music/search?q=top+hits+2024`;
      
      fetch(endpoint)
        .then(r => r.json())
        .then(data => { setResults(data.results || []); setLoading(false); });
    } 
    else if (activeTab === 'Regional Classics') {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
      const endpoint = query.trim()
        ? `${API_BASE}/api/archive/search?q=${encodeURIComponent(query)}`
        : `${API_BASE}/api/archive/indian/oldbollywood`;
        
      fetch(endpoint)
        .then(r => r.json())
        .then(data => { setResults(data.tracks || []); setLoading(false); });
    }
    else if (activeTab === 'Open Library') {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
      const endpoint = query.trim()
        ? `${API_BASE}/api/music/free-search?q=${encodeURIComponent(query)}`
        : `${API_BASE}/api/music/free-search?q=remix+instrumental`;
        
      fetch(endpoint)
        .then(r => r.json())
        .then(data => { setResults(data.results || []); setLoading(false); })
        .catch(err => { console.error('[Search] Free search failed:', err); setResults([]); setLoading(false); });
    }
    else if (activeTab === 'Podcasts') {
      // Load top Indian podcasts
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
      fetch(`${API_BASE}/api/podcasts/indian`)
        .then(r => r.json())
        .then(data => { setShows(data.shows || []); setLoading(false); });
    }
  }, [query, activeTab]);

  // Load episodes when a podcast is clicked
  const loadPodcastFeed = (feedUrl: string, showData: any) => {
    setLoading(true);
    setActiveShow(showData);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    fetch(`${API_BASE}/api/podcasts/feed?url=${encodeURIComponent(feedUrl)}`)
      .then(r => r.json())
      .then(data => {
        setEpisodes(data.episodes || []);
        setLoading(false);
      });
  };

  return (
    <div className={styles.searchPage}>
      {/* Source Tabs */}
      <div className={styles.genrePills}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`${styles.genrePill} ${activeTab === tab ? styles.genrePillActive : ''}`}
            onClick={() => { setActiveTab(tab); setActiveShow(null); }}
            style={activeTab === tab ? { background: 'white', color: 'black' } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>
        {activeTab === 'Podcasts' && activeShow ? activeShow.title : (query ? `Results for "${query}"` : 'Browse')}
      </h2>

      {/* Mainstream & Archive Songs List */}
      {activeTab !== 'Podcasts' && (
        <div className={styles.songsListFull}>
          {loading ? (
            <div className={styles.loading}>Searching global catalog...</div>
          ) : results.length > 0 ? (
            results.map((song) => (
              <div 
                key={song.id} 
                className={styles.songRow}
                onClick={() => setCurrentTrack(song)}
              >
                <div className={styles.songMain}>
                  {song.cover ? (
                    <img src={song.cover} alt="cover" className={styles.songArt} style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className={styles.songArt} style={{ background: '#333' }} />
                  )}
                  <div className={styles.songMeta}>
                    <span className={styles.songName}>{song.title}</span>
                    <span className={styles.songArtist}>{song.artist}</span>
                  </div>
                  {song.source === 'internetarchive' && (
                    <span className={styles.songGenreTag} style={{ color: '#00e5ff' }}>Public Domain</span>
                  )}
                  {song.source === 'ccmixter' && (
                    <span className={styles.songGenreTag} style={{ color: '#7c4dff' }}>ccMixter</span>
                  )}
                  {song.source === 'fma' && (
                    <span className={styles.songGenreTag} style={{ color: '#ff4081' }}>FMA</span>
                  )}
                  {song.source === 'musopen' && (
                    <span className={styles.songGenreTag} style={{ color: '#00bcd4' }}>Classical</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div>No tracks found.</div>
          )}
        </div>
      )}

      {/* Podcasts Content */}
      {activeTab === 'Podcasts' && !activeShow && (
        <div className={styles.grid}>
          {loading ? <div>Loading Podcasts...</div> : shows.map((show, idx) => (
            <div key={idx} className={styles.categoryCard} style={{ background: '#27272a' }} onClick={() => loadPodcastFeed(show.feedUrl, show)}>
              <h3 className={styles.categoryTitle}>{show.title}</h3>
              <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: 4 }}>{show.author}</p>
              {show.cover && <img src={show.cover} className={styles.cardImagePlaceholder} alt="" />}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Podcasts' && activeShow && (
        <div className={styles.songsListFull}>
          <button onClick={() => setActiveShow(null)} style={{ marginBottom: 16, background: 'transparent', color: 'white', border: '1px solid #555', padding: '6px 16px', borderRadius: 20, cursor: 'pointer' }}>
            ← Back to Shows
          </button>
          {loading ? <div>Loading Episodes...</div> : episodes.map(ep => (
            <div key={ep.id} className={styles.songRow} onClick={() => setCurrentTrack({...ep, url: ep.streamUrl})}>
              <div className={styles.songMain}>
                <img src={ep.cover} alt="" className={styles.songArt} style={{ objectFit: 'cover' }} />
                <div className={styles.songMeta}>
                  <span className={styles.songName}>{ep.title}</span>
                  <span className={styles.songArtist}>{new Date(ep.pubDate).toLocaleDateString()} • {Math.floor(ep.duration/60)} mins</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
    </div>
  );
}
