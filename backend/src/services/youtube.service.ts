import yts from 'yt-search';
import ytdl from '@distube/ytdl-core';
import ytStream from 'yt-stream';

// Cache to prevent searching for the same song multiple times
const memoryCache = new Map<string, string>();

/**
 * Finds a YouTube video ID for a given artist + title query.
 */
export async function getYouTubeVideoId(query: string): Promise<string | null> {
  if (memoryCache.has(query)) {
    return memoryCache.get(query)!;
  }

  try {
    const r = await yts(query);
    const videos = r.videos;
    
    if (videos && videos.length > 0) {
      // Pick the first result, typically the official audio/video
      const topResult = videos[0];
      memoryCache.set(query, topResult.videoId);
      return topResult.videoId;
    }
    return null;
  } catch (error) {
    console.error('YouTube search error:', error);
    return null;
  }
}

/**
 * Returns a readable stream of the audio from a YouTube video
 */
export function getYouTubeAudioStream(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  // ytdl-core extracts the highest quality audio-only stream
  return ytdl(url, {
    filter: 'audioonly',
    quality: 'highestaudio',
  });
}

export async function getInvidiousAudioUrl(videoId: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // 1. Try Piped API (Highly reliable direct stream)
  try {
    console.log(`[Piped] Extracting for: ${videoId}`);
    const res = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`, { 
      signal: AbortSignal.timeout(5000) as any,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.ok) {
      const data = await res.json();
      const audioStreams = data.audioStreams || [];
      if (audioStreams.length > 0) {
        audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        console.log('[Piped] Success!');
        return audioStreams[0].url;
      }
    }
  } catch (e: any) {
    console.log(`[Piped] Failed: ${e.message}`);
  }

  // 2. Try yt-stream
  try {
    console.log(`[yt-stream] Extracting for: ${videoId}`);
    const stream = await ytStream.stream(videoId, { quality: 'high', type: 'audio' });
    if (stream && stream.url) {
      console.log('[yt-stream] Success!');
      return stream.url;
    }
  } catch (e: any) {
    console.log(`[yt-stream] Failed: ${e.message}`);
  }

  // 3. Try play-dl
  try {
    console.log(`[play-dl] Extracting for: ${videoId}`);
    const source = await play.stream(videoId, { quality: 1 }); 
    if (source && source.url) {
      console.log('[play-dl] Success!');
      return source.url;
    }
  } catch (e: any) {
    console.log(`[play-dl] Failed: ${e.message}`);
  }

  // 4. Try ytdl-core
  try {
    console.log(`[ytdl-core] Extracting for: ${videoId}`);
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
    if (format && format.url) {
      console.log('[ytdl-core] Success!');
      return format.url;
    }
  } catch (e: any) {
    console.log(`[ytdl-core] Failed: ${e.message}`);
  }

  // 5. Fallback to Invidious instances
  const instancesToTry = [
    'https://invidious.privacydev.net',
    'https://inv.n8ms.pw',
    'https://invidious.nerdvpn.de',
    'https://invidious.flokinet.to',
    'https://yewtu.be',
    'https://inv.vern.cc'
  ];

  for (const instance of instancesToTry) {
    try {
      console.log(`[Invidious] Trying instance: ${instance}`);
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, { 
        signal: AbortSignal.timeout(4000) as any,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const data = await res.json();
        const audioStreams = [
          ...(data.adaptiveFormats || []),
          ...(data.formatStreams || [])
        ].filter((f: any) => (f.type && f.type.startsWith('audio/')) || f.container === 'm4a');

        if (audioStreams.length > 0) {
          audioStreams.sort((a: any, b: any) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));
          console.log(`[Invidious] Success using ${instance}`);
          return audioStreams[0].url;
        }
      }
    } catch (e: any) {
      console.log(`[Invidious] Instance ${instance} failed: ${e.message}`);
    }
  }
  
  console.log('[Stream] All extraction failed. Using YouTube direct fallback.');
  return url;
}

export async function searchYouTube(query: string, limit: number = 30) {
  try {
    const r = await yts(query);
    let videos = r.videos;
    
    if (videos.length > 0) {
      // Sort the top 5 most relevant results by views to surface the official/most viewed video first
      const topRelevant = videos.slice(0, 5);
      topRelevant.sort((a, b) => b.views - a.views);
      videos = [...topRelevant, ...videos.slice(5)];
    }
    
    videos = videos.slice(0, limit);
    
    return videos.map(v => ({
      id: v.videoId,
      title: v.title,
      artist: v.author.name,
      cover: v.thumbnail,
      albumArt: v.thumbnail,
      source: 'youtube',
      url: v.url
    }));
  } catch (error) {
    console.error('YouTube direct search error:', error);
    return [];
  }
}
