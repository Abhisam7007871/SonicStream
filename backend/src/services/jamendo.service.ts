/**
 * Jamendo API Service
 * 
 * Provides access to 500,000+ Creative Commons licensed tracks.
 * All audio URLs are direct CDN links — no extraction or proxy needed.
 * 
 * API Docs: https://developer.jamendo.com/v3.0
 */

import fetch from 'node-fetch';
import NodeCache from 'node-cache';

// ── Config ────────────────────────────────────────────────────────────
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

/**
 * You MUST register a free Jamendo developer account to get your own client_id.
 * 1. Go to https://devportal.jamendo.com/
 * 2. Sign up (free)
 * 3. Create an "Application"
 * 4. Copy the client_id
 * 5. Set JAMENDO_CLIENT_ID in your backend/.env file
 *
 * Without a valid client_id, all API calls will fail with error code 5 or 11.
 */
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID || '4c2874d5';

// Cache results for 10 minutes to stay under rate limits
const cache = new NodeCache({ stdTTL: 600 });

// ── Types ─────────────────────────────────────────────────────────────

export interface JamendoTrack {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  albumArt: string;
  cover: string;          // alias for frontend compatibility
  url: string;           // direct streaming URL (mp3)
  downloadUrl: string;
  duration: number;       // seconds
  source: 'jamendo';
  license: string;        // Creative Commons license URL
  licenseName: string;    // Human-readable license name (e.g. "CC BY-NC-SA 3.0")
  shareUrl: string;       // Backlink to track on Jamendo (required by ToS clause 4.1)
  artistUrl: string;      // Backlink to artist on Jamendo
  tags: string[];
}

export interface JamendoArtist {
  id: string;
  name: string;
  website: string;
  image: string;
  joindate: string;
}

export interface JamendoAlbum {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  image: string;
  releasedate: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

function buildUrl(endpoint: string, params: Record<string, string | number | boolean>): string {
  const url = new URL(`${JAMENDO_BASE}${endpoint}`);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('format', 'json');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function jamendoGet(endpoint: string, params: Record<string, string | number | boolean>): Promise<any> {
  if (!CLIENT_ID) {
    throw new Error(
      'JAMENDO_CLIENT_ID is not set. Register at https://devportal.jamendo.com/ (free) and add JAMENDO_CLIENT_ID to backend/.env'
    );
  }

  const url = buildUrl(endpoint, params);
  const cacheKey = url;
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Jamendo API error: ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json() as any;
  
  if (data.headers?.status === 'failed') {
    throw new Error(`Jamendo API: ${data.headers.error_message || 'Unknown error'}`);
  }

  cache.set(cacheKey, data);
  return data;
}

/**
 * Normalize a raw Jamendo track object into our app's Track shape.
 */
function normalizeTrack(raw: any): JamendoTrack {
  const trackId = String(raw.id);
  const artistId = String(raw.artist_id || '');
  const cover = raw.album_image || raw.image || '';
  return {
    id: trackId,
    title: raw.name || raw.title || 'Unknown',
    artist: raw.artist_name || 'Unknown Artist',
    artistId,
    album: raw.album_name || '',
    albumId: String(raw.album_id || ''),
    albumArt: cover,
    cover,                              // alias for frontend compatibility
    url: raw.audio || '',              // direct stream URL
    downloadUrl: raw.audiodownload || '',
    duration: Number(raw.duration) || 0,
    source: 'jamendo',
    license: raw.license_ccurl || '',
    licenseName: raw.license_ccurl
      ? raw.license_ccurl.replace('http://creativecommons.org/licenses/', 'CC ').replace(/\/$/, '').replace(/\//g, '-').toUpperCase()
      : 'Creative Commons',
    // ToS Clause 4.1: backlink to content page on Jamendo
    shareUrl: raw.shareurl || `https://www.jamendo.com/track/${trackId}`,
    artistUrl: artistId ? `https://www.jamendo.com/artist/${artistId}` : '',
    tags: [],  // tags come from musicinfo submethod
  };
}

function normalizeArtist(raw: any): JamendoArtist {
  return {
    id: String(raw.id),
    name: raw.name || 'Unknown',
    website: raw.website || '',
    image: raw.image || '',
    joindate: raw.joindate || '',
  };
}

function normalizeAlbum(raw: any): JamendoAlbum {
  return {
    id: String(raw.id),
    name: raw.name || 'Unknown',
    artist: raw.artist_name || 'Unknown',
    artistId: String(raw.artist_id || ''),
    image: raw.image || '',
    releasedate: raw.releasedate || '',
  };
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Search tracks by name / keyword.
 */
export async function searchTracks(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ tracks: JamendoTrack[]; total: number }> {
  const data = await jamendoGet('/tracks', {
    search: query,           // searches track name + artist + album + tags
    limit,
    offset,
    include: 'musicinfo',
    audioformat: 'ogg',
    imagesize: 300,
    boost: 'popularity_total',  // boost popular tracks to top while keeping relevance
    fullcount: true,
  });

  const tracks: JamendoTrack[] = (data.results || []).map((r: any) => {
    const t = normalizeTrack(r);
    if (r.musicinfo?.tags?.genres) {
      t.tags = r.musicinfo.tags.genres;
    }
    return t;
  });

  return {
    tracks,
    total: data.headers?.results_fullcount || tracks.length,
  };
}

/**
 * Get trending / popular tracks.
 */
export async function getTrendingTracks(limit: number = 20): Promise<JamendoTrack[]> {
  const data = await jamendoGet('/tracks', {
    order: 'popularity_week',
    limit,
    audioformat: 'ogg',
    imagesize: 300,
    include: 'musicinfo',
  });

  return (data.results || []).map((r: any) => {
    const t = normalizeTrack(r);
    if (r.musicinfo?.tags?.genres) {
      t.tags = r.musicinfo.tags.genres;
    }
    return t;
  });
}

/**
 * Get tracks by genre/tag (e.g. 'rock', 'electronic', 'pop', 'hiphop', 'jazz').
 */
export async function getTracksByTag(
  tag: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ tracks: JamendoTrack[]; total: number }> {
  const data = await jamendoGet('/tracks', {
    tags: tag,
    limit,
    offset,
    audioformat: 'ogg',
    imagesize: 300,
    order: 'popularity_total',
    fullcount: true,
  });

  const tracks = (data.results || []).map(normalizeTrack);
  return {
    tracks,
    total: data.headers?.results_fullcount || tracks.length,
  };
}

/**
 * Search artists by name.
 */
export async function searchArtists(
  query: string,
  limit: number = 20
): Promise<JamendoArtist[]> {
  const data = await jamendoGet('/artists', {
    namesearch: query,
    limit,
    order: 'popularity_total',
  });

  return (data.results || []).map(normalizeArtist);
}

/**
 * Get artist's tracks.
 */
export async function getArtistTracks(
  artistId: string,
  limit: number = 50
): Promise<JamendoTrack[]> {
  const data = await jamendoGet('/artists/tracks', {
    id: artistId,
    limit,
    audioformat: 'ogg',
    imagesize: 300,
    track_type: 'single+albumtrack',
  });

  if (!data.results?.[0]?.tracks) return [];

  return data.results[0].tracks.map((raw: any) => {
    raw.artist_name = data.results[0].name;
    raw.artist_id = data.results[0].id;
    return normalizeTrack(raw);
  });
}

/**
 * Get all tracks from an album.
 */
export async function getAlbumTracks(albumId: string): Promise<{
  album: JamendoAlbum | null;
  tracks: JamendoTrack[];
}> {
  const data = await jamendoGet('/albums/tracks', {
    id: albumId,
    audioformat: 'ogg',
    imagesize: 300,
  });

  if (!data.results?.[0]) return { album: null, tracks: [] };

  const raw = data.results[0];
  const album = normalizeAlbum(raw);

  const tracks: JamendoTrack[] = (raw.tracks || []).map((t: any) => {
    t.artist_name = raw.artist_name;
    t.artist_id = raw.artist_id;
    t.album_name = raw.name;
    t.album_id = raw.id;
    if (!t.image) t.image = raw.image;
    return normalizeTrack(t);
  });

  return { album, tracks };
}

/**
 * Autocomplete for search suggestions.
 */
export async function autocomplete(
  prefix: string,
  limit: number = 5
): Promise<{
  tracks: string[];
  artists: string[];
  albums: string[];
  tags: string[];
}> {
  if (prefix.length < 2) {
    return { tracks: [], artists: [], albums: [], tags: [] };
  }

  const data = await jamendoGet('/autocomplete', {
    prefix,
    limit,
    entity: 'artists+tracks+albums+tags',
    matchcount: true,
  });

  const results = data.results || {};
  return {
    tracks: (results.tracks || []).map((r: any) => r.match),
    artists: (results.artists || []).map((r: any) => r.match),
    albums: (results.albums || []).map((r: any) => r.match),
    tags: (results.tags || []).map((r: any) => r.match),
  };
}

/**
 * Get editorial feeds (homepage features).
 */
export async function getFeeds(limit: number = 5): Promise<any[]> {
  const data = await jamendoGet('/feeds', { limit });
  return data.results || [];
}

/**
 * Get similar tracks to a given track.
 */
export async function getSimilarTracks(
  trackId: string,
  limit: number = 10
): Promise<JamendoTrack[]> {
  const data = await jamendoGet('/tracks/similar', {
    id: trackId,
    limit,
    audioformat: 'ogg',
    imagesize: 300,
  });
  return (data.results || []).map(normalizeTrack);
}

/**
 * Get playlists by name search.
 */
export async function searchPlaylists(
  query: string,
  limit: number = 10
): Promise<any[]> {
  const data = await jamendoGet('/playlists', {
    namesearch: query,
    limit,
  });
  return data.results || [];
}

/**
 * Get tracks from a playlist.
 */
export async function getPlaylistTracks(
  playlistId: string,
  limit: number = 50
): Promise<JamendoTrack[]> {
  const data = await jamendoGet('/playlists/tracks', {
    id: playlistId,
    limit,
    audioformat: 'ogg',
    imagesize: 300,
    track_type: 'single+albumtrack',
  });
  if (!data.results?.[0]?.tracks) return [];
  return data.results[0].tracks.map(normalizeTrack);
}

/**
 * Get available radios.
 */
export async function getRadios(): Promise<any[]> {
  const data = await jamendoGet('/radios', {
    limit: 200,
    imagesize: 150,
  });
  return data.results || [];
}

/**
 * Available genre tags that work well with Jamendo.
 */
export const JAMENDO_GENRES = [
  'rock', 'pop', 'electronic', 'hiphop', 'jazz', 'classical',
  'metal', 'folk', 'reggae', 'blues', 'ambient', 'country',
  'funk', 'soul', 'indie', 'punk', 'latin', 'world',
  'lounge', 'soundtrack', 'dance', 'chillout',
] as const;
