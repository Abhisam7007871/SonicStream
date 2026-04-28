if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File extends Blob {
    name: string;
    lastModified: number;
    constructor(fileBits: any[], fileName: string, options?: any) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options?.lastModified || Date.now();
    }
  } as any;
}

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import { authMiddleware, AuthRequest } from './middleware/auth.middleware';
import { AudiomackService } from './services/audiomack.service';
import { Readable } from 'stream';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept-Ranges'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
  credentials: true
}));
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Routes
import { searchItunes, LANGUAGE_SEARCHES } from './services/itunes.service';

// ─────────────────────────────────────────────
//  MUSIC ROUTES (powered by iTunes Search API)
// ─────────────────────────────────────────────

// Search — query iTunes in real-time
app.get('/api/music/search', async (req, res) => {
  const { q, language } = req.query as { q?: string; language?: string };
  const term = q || (language ? `${language} songs 2024` : 'top hits 2024');
  try {
    const results = await searchItunes(term, 30);
    res.json({ query: term, total: results.length, results });
  } catch (err: any) {
    console.error('Search error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// YouTube Direct Search
app.get('/api/youtube/search', async (req, res) => {
  const { q } = req.query as { q?: string };
  const term = q || 'top hits 2024';
  try {
    const results = await searchYouTube(term, 30);
    res.json({ query: term, total: results.length, results });
  } catch (err: any) {
    console.error('YouTube Search error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Browse by language — uses YouTube for FULL songs (not 30s iTunes previews)
app.get('/api/music/language/:lang', async (req, res) => {
  const lang = req.params.lang.toLowerCase() as keyof typeof LANGUAGE_SEARCHES;
  const terms = LANGUAGE_SEARCHES[lang];

  if (!terms) {
    return res.status(400).json({ message: `Unknown language: ${lang}. Available: hindi, punjabi, korean, english` });
  }

  try {
    // Fetch from first 2 search terms via YouTube and merge results
    const [a, b] = await Promise.all([
      searchYouTube(terms[0] as string, 15),
      searchYouTube(terms[1] as string, 15),
    ]);
    const all = [...a, ...b];
    // Remove duplicates
    const seen = new Set<string>();
    const results = all.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    res.json({ language: lang, total: results.length, results });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Trending — uses YouTube for FULL songs (not 30s iTunes previews)
app.get('/api/music/trending', async (req, res) => {
  try {
    const [hindi, punjabi, korean, english] = await Promise.all([
      searchYouTube('hindi hits 2024', 8),
      searchYouTube('punjabi hits 2024', 8),
      searchYouTube('kpop 2024', 8),
      searchYouTube('pop hits 2024', 8),
    ]);
    const results = [...hindi, ...punjabi, ...korean, ...english];
    res.json({ total: results.length, results });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Genres list
app.get('/api/music/genres', (req, res) => {
  res.json({ genres: ['Hindi', 'Punjabi', 'Korean', 'English', 'Pop', 'R&B', 'Hip-Hop', 'Electronic', 'Indie', 'Rock'] });
});

// Languages list
app.get('/api/music/languages', (req, res) => {
  res.json({ languages: ['hindi', 'punjabi', 'korean', 'english'] });
});


app.get('/api/music/audiomack-embed', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    const data = await AudiomackService.getEmbedData(url);
    res.json(data);
  } catch (err: any) {
    console.error('Audiomack Route Error:', err);
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

// ─────────────────────────────────────────────
//  AGGREGATOR ROUTES (YouTube, Archive, RSS)
// ─────────────────────────────────────────────

import { searchYouTube, getInvidiousAudioUrl, getYouTubeVideoId } from './services/youtube.service';
import * as ia from './services/archive.service';
import { searchAllSources } from './services/freeMusic.service';
import { parseFeed, INDIAN_PODCASTS } from './services/rss.service';
import * as jamendo from './services/jamendo.service';
import { searchPodcasts, getTopPodcasts } from './services/podcast.service';

// YouTube Audio Stream Proxy Component
// Takes iTunes metadata and returns a full native stream
app.get('/api/music/stream', async (req, res) => {
  const { title, artist } = req.query as { title: string; artist: string };
  if (!title) return res.status(400).send('Missing title');
  
  try {
    const query = `${title} ${artist || ''} official audio`;
    const videoId = await getYouTubeVideoId(query);
    if (!videoId) return res.status(404).send('YouTube stream not found');
    
    const audioUrl = await getInvidiousAudioUrl(videoId);
    res.redirect(audioUrl);
  } catch (err) {
    console.error('Stream proxy error:', err);
    res.status(500).send('Stream error');
  }
});

// YouTube Direct Stream Proxy — resolves to a CDN audio URL and pipes it
app.get('/api/youtube/stream', async (req, res) => {
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).send('Missing video id');

  console.log(`[Stream] Request for video: ${id}`);
  try {
    const audioUrl = await getInvidiousAudioUrl(id);

    if (!audioUrl) {
      console.error(`[Stream] Could not resolve audio URL for ${id}`);
      return res.status(503).send('Audio extraction failed. Try another track.');
    }

    // Forward Range header
    const upstreamHeaders: any = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    if (req.headers.range) {
      upstreamHeaders['range'] = req.headers.range;
    }

    console.log(`[Stream] Proxying from CDN: ${audioUrl.substring(0, 60)}...`);

    const https = require('https');
    const http = require('http');
    const client = audioUrl.startsWith('https') ? https : http;

    const proxyReq = client.get(audioUrl, { headers: upstreamHeaders }, (proxyRes: any) => {
      // Forward status and essential headers only
      res.status(proxyRes.statusCode);
      
      const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
      headersToForward.forEach(h => {
        if (proxyRes.headers[h]) res.setHeader(h, proxyRes.headers[h]);
      });
      
      res.setHeader('Access-Control-Allow-Origin', '*');

      let bytesSent = 0;
      proxyRes.on('data', (chunk: any) => {
        bytesSent += chunk.length;
      });

      proxyRes.on('end', () => {
        console.log(`[Stream] ✓ Finished. Sent ${bytesSent} bytes for ${id}`);
      });

      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err: any) => {
      console.error('[Stream] Proxy Request Error:', err.message);
      if (!res.headersSent) res.status(500).send('Stream error');
    });

  } catch (err: any) {
    console.error('[Stream] Error:', err.message);
    if (!res.headersSent) res.status(500).send('Stream error');
  }
});


// Internet Archive endpoints (Indian catalog)
app.get('/api/archive/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const tracks = await ia.searchTracks(q as string, { limit: Number(limit) });
    res.json({ tracks, total: tracks.length, source: 'internetarchive' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/archive/indian/:category', async (req, res) => {
  try {
    const tracks = await ia.getIndianMusic(
      req.params.category,
      Number(req.query.limit) || 20
    );
    res.json({ tracks, category: req.params.category });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Podcasts (RSS feed parser)
app.get('/api/podcasts/feed', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Feed URL required' });
    const { show, episodes } = await parseFeed(url);
    res.json({ show, episodes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/podcasts/indian', (req, res) => {
  res.json({ shows: INDIAN_PODCASTS });
});

// Podcast Search (iTunes API - works globally)
app.get('/api/podcasts/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const shows = await searchPodcasts(q as string, Number(limit));
    res.json({ shows, total: shows.length });
  } catch (err: any) {
    console.error('Podcast search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Top Podcasts
app.get('/api/podcasts/top', async (req, res) => {
  try {
    const { limit = 20, country = 'us' } = req.query;
    const shows = await getTopPodcasts(Number(limit), country as string);
    res.json({ shows, total: shows.length });
  } catch (err: any) {
    console.error('Top podcasts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Unified Free Music Search (ccMixter, FMA, Musopen, etc.)
app.get('/api/music/free-search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const results = await searchAllSources(q as string, Number(limit));
    res.json({ results, total: results.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
//  JAMENDO ROUTES (legal, free Creative Commons music)
// ─────────────────────────────────────────────

// Search Jamendo tracks
app.get('/api/jamendo/search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const data = await jamendo.searchTracks(q as string, Number(limit), Number(offset));
    res.json({ results: data.tracks, total: data.total, source: 'jamendo' });
  } catch (err: any) {
    console.error('Jamendo search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Jamendo trending / popular tracks
app.get('/api/jamendo/trending', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const tracks = await jamendo.getTrendingTracks(limit);
    res.json({ results: tracks, total: tracks.length, source: 'jamendo' });
  } catch (err: any) {
    console.error('Jamendo trending error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Jamendo tracks by genre/tag
app.get('/api/jamendo/tags/:tag', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const data = await jamendo.getTracksByTag(req.params.tag, Number(limit), Number(offset));
    res.json({ results: data.tracks, total: data.total, tag: req.params.tag, source: 'jamendo' });
  } catch (err: any) {
    console.error('Jamendo tag error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Jamendo artist search
app.get('/api/jamendo/artists', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const artists = await jamendo.searchArtists(q as string, Number(limit));
    res.json({ results: artists, total: artists.length, source: 'jamendo' });
  } catch (err: any) {
    console.error('Jamendo artist error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Jamendo artist tracks
app.get('/api/jamendo/artists/:id/tracks', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const tracks = await jamendo.getArtistTracks(req.params.id, limit);
    res.json({ results: tracks, total: tracks.length, source: 'jamendo' });
  } catch (err: any) {
    console.error('Jamendo artist tracks error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Jamendo album tracks
app.get('/api/jamendo/albums/:id/tracks', async (req, res) => {
  try {
    const data = await jamendo.getAlbumTracks(req.params.id);
    res.json({ album: data.album, results: data.tracks, total: data.tracks.length, source: 'jamendo' });
  } catch (err: any) {
    console.error('Jamendo album tracks error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Jamendo autocomplete
app.get('/api/jamendo/autocomplete', async (req, res) => {
  try {
    const { prefix } = req.query;
    if (!prefix || typeof prefix !== 'string') return res.status(400).json({ error: 'Prefix required (min 2 chars)' });
    const suggestions = await jamendo.autocomplete(prefix);
    res.json(suggestions);
  } catch (err: any) {
    console.error('Jamendo autocomplete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Jamendo available genres
app.get('/api/jamendo/genres', (req, res) => {
  res.json({ genres: jamendo.JAMENDO_GENRES });
});

// Protected Playlist Routes
app.get('/api/playlists', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
  
  const playlists = await prisma.playlist.findMany({
    where: { userId: req.userId },
    include: { tracks: { include: { track: true } } }
  });
  res.json(playlists);
});

app.post('/api/playlists', authMiddleware, async (req: AuthRequest, res) => {
  const { name } = req.body;
  const playlist = await prisma.playlist.create({
    data: {
      name,
      userId: req.userId!,
    }
  });
  res.status(201).json(playlist);
});

// Export the Express app for use in unified server
export { app, prisma };

// Only self-listen if run directly (not imported by custom server)
if (require.main === module) {
  app.listen(PORT as number, '0.0.0.0', () => {
    console.log(`Backend running standalone on port ${PORT}`);
  });

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
