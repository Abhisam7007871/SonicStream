/**
 * Podcast Search Service
 * 
 * Uses the iTunes Search API (free, no API key needed) to search podcasts worldwide.
 * Then fetches RSS feeds to get episodes with direct audio URLs.
 */

import fetch from 'node-fetch';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // Cache 5 minutes

export interface PodcastShow {
  id: string;
  title: string;
  author: string;
  cover: string;
  feedUrl: string;
  genre: string;
  description: string;
  episodeCount: number;
}

/**
 * Search podcasts using iTunes Search API.
 * Works for any podcast globally - not just Indian ones.
 */
export async function searchPodcasts(
  query: string,
  limit: number = 20
): Promise<PodcastShow[]> {
  const cacheKey = `podcast_search_${query}_${limit}`;
  const cached = cache.get<PodcastShow[]>(cacheKey);
  if (cached) return cached;

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&limit=${limit}`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);
  
  const data = await res.json() as any;
  
  const shows: PodcastShow[] = (data.results || []).map((r: any) => ({
    id: String(r.collectionId || r.trackId || ''),
    title: r.collectionName || r.trackName || 'Unknown',
    author: r.artistName || 'Unknown',
    cover: r.artworkUrl600 || r.artworkUrl100 || '',
    feedUrl: r.feedUrl || '',
    genre: r.primaryGenreName || '',
    description: r.collectionName || '',
    episodeCount: r.trackCount || 0,
  })).filter((s: PodcastShow) => s.feedUrl); // Only shows with available feed URLs

  cache.set(cacheKey, shows);
  return shows;
}

/**
 * Get top podcasts by genre/category.
 */
export async function getTopPodcasts(
  limit: number = 20,
  country: string = 'us'
): Promise<PodcastShow[]> {
  const cacheKey = `podcast_top_${country}_${limit}`;
  const cached = cache.get<PodcastShow[]>(cacheKey);
  if (cached) return cached;

  // Use iTunes RSS generator for top podcasts
  const url = `https://itunes.apple.com/search?term=podcast&media=podcast&limit=${limit}&country=${country}`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes API error: ${res.status}`);
  
  const data = await res.json() as any;
  
  const shows: PodcastShow[] = (data.results || []).map((r: any) => ({
    id: String(r.collectionId || r.trackId || ''),
    title: r.collectionName || r.trackName || 'Unknown',
    author: r.artistName || 'Unknown',
    cover: r.artworkUrl600 || r.artworkUrl100 || '',
    feedUrl: r.feedUrl || '',
    genre: r.primaryGenreName || '',
    description: r.collectionName || '',
    episodeCount: r.trackCount || 0,
  })).filter((s: PodcastShow) => s.feedUrl);

  cache.set(cacheKey, shows);
  return shows;
}
