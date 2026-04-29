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

  // ── 2. Cobalt API (very reliable, doesn't touch YouTube directly) ─────
  try {
    console.log(`[Cobalt] Trying for ${videoId}`);
    const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isAudioOnly: true,
        aFormat: 'mp3',
        filenamePattern: 'basic',
      }),
      signal: AbortSignal.timeout(12000) as any,
    });
    if (cobaltRes.ok) {
      const cobaltData = await cobaltRes.json() as any;
      if (cobaltData.url) {
        console.log('[Cobalt] ✓ Success');
        return save(cobaltData.url);
      }
    }
  } catch (e: any) {
    console.log(`[Cobalt] Failed: ${e.message}`);
  }

  // ── 3. Piped API instances ─────────────────────────────────────────────
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.moomoo.me',
    'https://api.piped.yt',
    'https://pipedapi.in.projectsegfau.lt',
    'https://pipedapi.adminforge.de',
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

// ── Label / non-artist channel names to replace with extracted artist ──
const LABEL_CHANNELS = new Set([
  't-series', 'tseries', 'sony music india', 'sony music south',
  'zee music company', 'speed records', 'tips official', 'tips music',
  'yrf', 'saregama music', 'saregama', 'aditya music', 'lahari music',
  'mango music', 'lehren retro', 'ultra music', 'universal music india',
  'sony music entertainment', 'warner music india', 'vevo',
  'atlantic records', 'republic records', 'interscope records',
  'columbia records', 'rca records', 'def jam recordings',
  'capitol records', 'universal music', 'sony music',
  'warner records', 'big machine records', 'island records',
  'epic records', 'virgin records', 'parlophone records',
  'shemaroo', 'shemaroo filmi gaane', 'eros now music',
  'pen studios', 'pen music', 'divo music', 'think music india',
  'sun music', 'junglee music', 'venus',
]);

/**
 * Cleans a YouTube video title to show just the song name.
 * Removes "(Official Video)", "| Artist | Label", "[HD]", etc.
 */
function cleanTitle(raw: string): string {
  let t = raw;

  // Remove common YouTube suffixes in parentheses/brackets
  t = t.replace(/\s*[\(\[]\s*(Official\s*(Music\s*)?Video|Official\s*Audio|Official\s*Lyric\s*Video|Full\s*Video(\s*Song)?|Video\s*Song|Audio\s*Song|Lyric\s*Video|Lyrics?\s*Video|HD|HQ|4K|1080p|720p|Visualizer|Visualiser|Audio|MV|M\/V|Teaser|Trailer|Promo)\s*[\)\]]/gi, '');

  // Remove "Full Video Song", "Video Song" etc. without brackets
  t = t.replace(/\s*-?\s*(Full\s+Video\s+Song|Video\s+Song|Official\s+Music\s+Video|Official\s+Video|Official\s+Audio|Audio\s+Song|Lyric\s+Video)/gi, '');

  // Remove everything after | (usually "| Artist | Label")
  t = t.replace(/\s*\|.*$/, '');

  // Remove "ft." or "feat." artist names at end
  // Keep the main part but trim featured artists from title
  // t = t.replace(/\s+(ft\.?|feat\.?)\s+.*/i, '');

  // Remove trailing " - " with label/channel names
  t = t.replace(/\s*-\s*(T-Series|Sony Music|YRF|Zee Music|Saregama|Vevo).*$/i, '');

  // Remove hashtags
  t = t.replace(/#\w+/g, '');

  // Remove extra whitespace, dashes at end
  t = t.replace(/\s*[-–—:]\s*$/, '').trim();

  // Limit to 60 chars
  if (t.length > 60) {
    t = t.substring(0, 57) + '...';
  }

  return t || raw.substring(0, 60);
}

/**
 * Tries to extract real artist name from the title (before " - " or " – ").
 * Falls back to channel name if not a label.
 */
function cleanArtist(channelName: string, title: string): string {
  const isLabel = LABEL_CHANNELS.has(channelName.toLowerCase().trim());

  if (isLabel) {
    // Try to extract artist from title pattern: "Artist - Song Name"
    const dashMatch = title.match(/^(.+?)\s*[-–—]\s+/);
    if (dashMatch) {
      let artist = dashMatch[1].trim();
      // Remove "Song Name by Artist" patterns
      if (artist.length > 2 && artist.length < 60) {
        return artist;
      }
    }

    // Try to extract from "Song | Artist | Label" pattern  
    const pipeMatch = title.match(/\|\s*([^|]+)/);
    if (pipeMatch) {
      const candidate = pipeMatch[1].trim();
      // Make sure it's not another label
      if (!LABEL_CHANNELS.has(candidate.toLowerCase()) && candidate.length < 40) {
        return candidate;
      }
    }

    return 'Unknown Artist';
  }

  // Channel name is the actual artist
  // Clean common suffixes like "VEVO", " - Topic"
  let name = channelName
    .replace(/VEVO$/i, '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/Official$/i, '')
    .trim();

  return name || channelName;
}

/**
 * Searches YouTube and returns normalised track objects.
 */
export async function searchYouTube(query: string, limit: number = 50) {
  try {
    // Add "song" or "audio" to query to bias toward music
    const musicQuery = query.match(/(song|audio|lyrics|music)/i) ? query : `${query} songs`;
    
    console.log(`[YT Search] Searching: "${musicQuery}" (limit: ${limit})`);
    
    // Primary search
    let allVideos: any[] = [];
    const seenIds = new Set<string>();

    try {
      const r1 = await yts(musicQuery);
      for (const v of (r1.videos || [])) {
        if (!seenIds.has(v.videoId)) {
          seenIds.add(v.videoId);
          allVideos.push(v);
        }
      }
      console.log(`[YT Search] Primary: ${allVideos.length} results`);
    } catch (e: any) {
      console.error(`[YT Search] Primary search failed: ${e.message}`);
    }

    // Secondary search for more results (only if we need more)
    if (allVideos.length < limit) {
      try {
        const r2 = await yts(`${query} music`);
        for (const v of (r2.videos || [])) {
          if (!seenIds.has(v.videoId)) {
            seenIds.add(v.videoId);
            allVideos.push(v);
          }
        }
        console.log(`[YT Search] After secondary: ${allVideos.length} results`);
      } catch (e: any) {
        console.error(`[YT Search] Secondary search failed: ${e.message}`);
      }
    }

    let videos = allVideos;

    // Filter out non-music content (compilations, podcasts, very long videos)
    videos = videos.filter(v => {
      const dur = v.seconds || 0;
      // Skip videos > 12 min (likely full albums/compilations)
      if (dur > 720) return false;
      // Skip very short clips < 30 sec
      if (dur < 30) return false;
      // Skip titles with common non-song patterns
      const lowerTitle = v.title.toLowerCase();
      if (lowerTitle.includes('compilation') || lowerTitle.includes('jukebox') || 
          lowerTitle.includes('all songs') || lowerTitle.includes('full album') ||
          lowerTitle.includes('top 10') || lowerTitle.includes('top 20') ||
          lowerTitle.includes('best of') || lowerTitle.includes('mashup mix')) {
        return false;
      }
      return true;
    });

    if (videos.length > 0) {
      // Boost top-5 most-viewed results to front
      const top = videos.slice(0, 5).sort((a, b) => b.views - a.views);
      videos = [...top, ...videos.slice(5)];
    }

    return videos.slice(0, limit).map((v) => ({
      id: v.videoId,
      title: cleanTitle(v.title),
      artist: cleanArtist(v.author.name, v.title),
      // Proxy thumbnails through Piped to avoid i.ytimg.com DNS block
      cover: `https://pipedproxy.kavin.rocks/vi/${v.videoId}/hq720.jpg`,
      albumArt: `https://pipedproxy.kavin.rocks/vi/${v.videoId}/hq720.jpg`,
      source: 'youtube',
      url: v.url,
    }));
  } catch (error) {
    console.error('YouTube direct search error:', error);
    return [];
  }
}
