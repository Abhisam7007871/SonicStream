import yts from 'yt-search';
import ytdl from '@distube/ytdl-core';
import ytStream from 'yt-stream';
import { execFile } from 'child_process';
import { promisify } from 'util';
import play from 'play-dl';

const execFileAsync = promisify(execFile);

// yt-dlp binary path (installed via pip)
const YTDLP_PATH = 'C:\\Users\\20kaa\\AppData\\Roaming\\Python\\Python314\\Scripts\\yt-dlp.exe';

// Cache resolved stream URLs (expire after 90 minutes — CDN tokens last ~2h)
const streamCache = new Map<string, { url: string; ts: number }>();
const CACHE_TTL = 90 * 60 * 1000;

// Cache YouTube search results
const searchCache = new Map<string, string>();

/**
 * Finds a YouTube video ID for a given query.
 */
export async function getYouTubeVideoId(query: string): Promise<string | null> {
  if (searchCache.has(query)) return searchCache.get(query)!;
  try {
    const r = await yts(query);
    const video = r.videos?.[0];
    if (video) {
      searchCache.set(query, video.videoId);
      return video.videoId;
    }
    return null;
  } catch (error) {
    console.error('YouTube search error:', error);
    return null;
  }
}

/**
 * Returns a readable stream of the audio from a YouTube video.
 */
export function getYouTubeAudioStream(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  return ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
}

/**
 * Uses yt-dlp (via python -m yt_dlp) to extract a direct audio URL.
 * Most reliable method — handles YouTube bot-detection that breaks other libs.
 */
async function getAudioUrlViaYtDlp(videoId: string): Promise<string | null> {
  try {
    console.log(`[yt-dlp] Extracting for ${videoId}`);
    const { stdout } = await execFileAsync(
      'python',
      [
        '-m', 'yt_dlp',
        '--no-playlist',
        '--no-warnings',
        '-f', 'bestaudio',
        '--get-url',
        `https://www.youtube.com/watch?v=${videoId}`,
      ],
      { timeout: 25000 }
    );
    const url = stdout.trim().split('\n')[0];
    if (url && url.startsWith('http')) {
      console.log('[yt-dlp] ✓ Got CDN URL');
      return url;
    }
    return null;
  } catch (e: any) {
    console.log(`[yt-dlp] Failed: ${e.message?.substring(0, 120)}`);
    return null;
  }
}

/**
 * Resolves a YouTube video ID to a direct CDN audio URL.
 * Returns null if all methods fail.
 */
export async function getInvidiousAudioUrl(videoId: string): Promise<string | null> {
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.url;

  const save = (url: string) => {
    streamCache.set(videoId, { url, ts: Date.now() });
    return url;
  };

  const pipedInstances = [
    'https://pipedapi.adminforge.de',
    'https://pipedapi.astartes.nl',
    'https://pipedapi.lunar.icu',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.mha.fi',
    'https://pipedapi.us.mha.fi',
    'https://piped-api.garudalinux.org',
  ];

  // Race the first 4 instances for speed
  const fetchAudio = async (baseUrl: string) => {
    try {
      const res = await fetch(`${baseUrl}/streams/${videoId}`, {
        signal: AbortSignal.timeout(6000) as any,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.ok) {
        const data = await res.json() as any;
        const stream = data.audioStreams?.find((s: any) => s.format === 'WEBM' || s.format === 'M4A');
        if (stream?.url) return stream.url;
      }
    } catch (e) {}
    throw new Error('Failed');
  };

  try {
    console.log(`[Stream] Racing Piped instances for ${videoId}...`);
    const url = await Promise.any(pipedInstances.slice(0, 5).map(fetchAudio));
    if (url) {
      console.log(`[Stream] ✓ Piped Success`);
      return save(url);
    }
  } catch (e) {}

  // Fallback to Invidious (Sequential because they are slower)
  const invidiousInstances = [
    'https://invidious.privacydev.net',
    'https://yewtu.be',
    'https://invidious.sethforprivacy.com',
    'https://invidious.kavin.rocks',
    'https://iv.melmac.space',
    'https://invidious.drgns.space',
  ];

  for (const instance of invidiousInstances) {
    try {
      console.log(`[Invidious] Trying ${instance}...`);
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(5000) as any,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.ok) {
        const data = await res.json() as any;
        const streams = [...(data.adaptiveFormats || []), ...(data.formatStreams || [])];
        const audio = streams.find((f: any) => (f.type && f.type.startsWith('audio/')) || f.container === 'm4a');
        if (audio?.url) {
          console.log(`[Invidious] ✓ Success`);
          return save(audio.url);
        }
      }
    } catch (e) {}
  }

  // ── 3. High-Quality Fallback: SoundCloud (Highly reliable on Render) ──
  try {
    console.log(`[Stream] YouTube extraction blocked. Searching SoundCloud fallback for ${videoId}...`);
    
    // Get the title first
    const { searchYouTube } = require('./youtube.service');
    const ytResults = await searchYouTube(videoId, 1).catch(() => []);
    const songTitle = ytResults[0]?.title;

    if (songTitle) {
      console.log(`[SoundCloud] Searching for: "${songTitle}"`);
      const scID = await play.getFreeClientID().catch(() => null);
      if (scID) {
        await play.setToken({ soundcloud: { client_id: scID } });
        const scResults = await play.search(songTitle, { source: { soundcloud: 'tracks' }, limit: 1 }).catch(() => []);
        
        if (scResults.length > 0) {
          const scTrack = scResults[0];
          console.log(`[SoundCloud] ✓ Found alternative: ${scTrack.name}`);
          const scStream = await play.stream(scTrack.url).catch(() => null);
          if (scStream?.url) {
            return save(scStream.url);
          }
        }
      }
    }
  } catch (e: any) {
    console.log(`[SoundCloud] Fallback failed: ${e.message}`);
  }

  console.error(`[Stream] ✗ All YouTube & SoundCloud methods exhausted for ${videoId}`);
  return null;
}

/**
 * Searches YouTube and returns normalised track objects.
 */
export async function searchYouTube(query: string, limit: number = 30) {
  try {
    const r = await yts(query);
    let videos = r.videos;

    if (videos.length > 0) {
      // Boost top-5 most-viewed results to front
      const top = videos.slice(0, 5).sort((a, b) => b.views - a.views);
      videos = [...top, ...videos.slice(5)];
    }

    return videos.slice(0, limit).map((v) => ({
      id: v.videoId,
      title: v.title,
      artist: v.author.name,
      cover: v.thumbnail,
      albumArt: v.thumbnail,
      source: 'youtube',
      url: v.url,
    }));
  } catch (error) {
    console.error('YouTube direct search error:', error);
    return [];
  }
}
