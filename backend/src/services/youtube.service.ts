import yts from 'yt-search';
import ytdl from '@distube/ytdl-core';
import ytStream from 'yt-stream';
import { execFile } from 'child_process';
import { promisify } from 'util';

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

  // ── 1. yt-dlp (most reliable, handles bot-detection) ──────────────────
  const ytdlpUrl = await getAudioUrlViaYtDlp(videoId);
  if (ytdlpUrl) return save(ytdlpUrl);

  // ── 2. Piped API instances ─────────────────────────────────────────────
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.moomoo.me',
    'https://api.piped.yt',
  ];

  for (const piped of pipedInstances) {
    try {
      console.log(`[Piped] Trying ${piped} for ${videoId}`);
      const res = await fetch(`${piped}/streams/${videoId}`, {
        signal: AbortSignal.timeout(8000) as any,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.ok) {
        const data = await res.json() as any;
        const streams: any[] = data.audioStreams || [];
        if (streams.length > 0) {
          streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
          const url = streams[0].url;
          console.log(`[Piped] ✓ Success via ${piped}`);
          return save(url);
        }
      }
    } catch (e: any) {
      console.log(`[Piped] ${piped} failed: ${e.message}`);
    }
  }

  // ── 3. yt-stream ──────────────────────────────────────────────────────
  try {
    console.log(`[yt-stream] Trying for ${videoId}`);
    const stream = await ytStream.stream(videoId, { quality: 'high', type: 'audio' });
    if (stream?.url) {
      console.log('[yt-stream] ✓ Success');
      return save(stream.url);
    }
  } catch (e: any) {
    console.log(`[yt-stream] Failed: ${e.message}`);
  }

  // ── 4. ytdl-core ──────────────────────────────────────────────────────
  try {
    console.log(`[ytdl-core] Trying for ${videoId}`);
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const format = ytdl.chooseFormat(info.formats, {
      filter: 'audioonly',
      quality: 'highestaudio',
    });
    if (format?.url) {
      console.log('[ytdl-core] ✓ Success');
      return save(format.url);
    }
  } catch (e: any) {
    console.log(`[ytdl-core] Failed: ${e.message}`);
  }

  // ── 5. Invidious instances ─────────────────────────────────────────────
  const invidiousInstances = [
    'https://invidious.privacydev.net',
    'https://inv.n8ms.pw',
    'https://invidious.nerdvpn.de',
    'https://yewtu.be',
    'https://inv.vern.cc',
  ];

  for (const instance of invidiousInstances) {
    try {
      console.log(`[Invidious] Trying ${instance} for ${videoId}`);
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(6000) as any,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.ok) {
        const data = await res.json() as any;
        const audioStreams = [
          ...(data.adaptiveFormats || []),
          ...(data.formatStreams || []),
        ].filter(
          (f: any) =>
            (f.type && f.type.startsWith('audio/')) || f.container === 'm4a'
        );
        if (audioStreams.length > 0) {
          audioStreams.sort(
            (a: any, b: any) =>
              (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0)
          );
          const url = audioStreams[0].url;
          console.log(`[Invidious] ✓ Success via ${instance}`);
          return save(url);
        }
      }
    } catch (e: any) {
      console.log(`[Invidious] ${instance} failed: ${e.message}`);
    }
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
