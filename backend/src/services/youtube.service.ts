import yts from 'yt-search';
import ytdl from 'ytdl-core';

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
