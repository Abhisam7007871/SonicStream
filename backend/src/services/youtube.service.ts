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
  // Return cached URL if still fresh
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log(`[Stream] Cache hit for ${videoId}`);
    return cached.url;
  }

  const save = (url: string) => {
    streamCache.set(videoId, { url, ts: Date.now() });
    return url;
  };

  // ── 1. Piped API instances ─────────────────────────────────────────────
  const pipedInstances = [
    'https://pipedapi.adminforge.de',
    'https://pipedapi.astartes.nl',
    'https://pipedapi.lunar.icu',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://api.piped.yt',
    'https://pipedapi.mha.fi',
    'https://pipedapi.us.mha.fi',
  ];

  for (const piped of pipedInstances) {
    try {
      console.log(`[Piped] Trying ${piped} for ${videoId}`);
      const res = await fetch(`${piped}/streams/${videoId}`, {
        signal: AbortSignal.timeout(5000) as any,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json() as any;
        const stream = data.audioStreams?.find((s: any) => s.format === 'WEBM' || s.format === 'M4A');
        if (stream?.url) {
          console.log(`[Piped] ✓ Success via ${piped}`);
          return save(stream.url);
        }
      }
    } catch (e: any) {
      // failover
    }
  }

  // ── 2. Invidious instances ─────────────────────────────────────────────
  const invidiousInstances = [
    'https://invidious.privacydev.net',
    'https://yewtu.be',
    'https://invidious.sethforprivacy.com',
    'https://invidious.kavin.rocks',
    'https://iv.melmac.space',
    'https://invidious.drgns.space',
    'https://invidious.tiekoetter.com',
  ];

  for (const instance of invidiousInstances) {
    try {
      console.log(`[Invidious] Trying ${instance} for ${videoId}`);
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(5000) as any,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json() as any;
        const audioStreams = [
          ...(data.adaptiveFormats || []),
          ...(data.formatStreams || []),
        ].filter((f: any) => (f.type && f.type.startsWith('audio/')) || f.container === 'm4a');

        if (audioStreams.length > 0) {
          audioStreams.sort((a: any, b: any) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));
          console.log(`[Invidious] ✓ Success via ${instance}`);
          return save(audioStreams[0].url);
        }
      }
    } catch (e: any) {
      // failover
    }
  }

  // ── 3. Fallback to Local Libs (Likely blocked on Render) ──────────────
  try {
    console.log(`[play-dl] Final fallback attempt for ${videoId}`);
    const info = await play.video_info(`https://www.youtube.com/watch?v=${videoId}`).catch(() => null);
    if (info) {
      const audioFormats = (info.format || []).filter(f => 
        f.mimeType?.includes('audio') || (f.mimeType?.includes('video/mp4') && f.audioQuality)
      );
      if (audioFormats.length > 0 && audioFormats[0].url) {
        console.log('[play-dl] ✓ Success');
        return save(audioFormats[0].url);
      }
    }
  } catch (e: any) {
    console.log(`[play-dl] Blocked: ${e.message}`);
  }

  console.error(`[Stream] ✗ All methods exhausted for ${videoId}`);
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
