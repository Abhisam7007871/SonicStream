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

// Global error handlers to prevent silent crashes on Render
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const allowedOrigins = ['https://gamapa.onrender.com', 'https://gamapamusic-b6d6.onrender.com', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept-Ranges'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
  credentials: true
}));
app.use(express.json());

// Robust request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Removed duplicate import

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

// Browse by language
app.get('/api/music/language/:lang', async (req, res) => {
  const lang = req.params.lang.toLowerCase() as keyof typeof LANGUAGE_SEARCHES;
  const terms = LANGUAGE_SEARCHES[lang];

  if (!terms) {
    return res.status(400).json({ message: `Unknown language: ${lang}. Available: hindi, punjabi, korean, english` });
  }

  try {
    // Fetch from first 2 search terms and merge results
    const [a, b] = await Promise.all([
      searchItunes(terms[0], 15),
      searchItunes(terms[1], 15),
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

// Trending — pulls from all 4 languages
app.get('/api/music/trending', async (req, res) => {
  try {
    const [hindi, punjabi, korean, english] = await Promise.all([
      searchItunes('hindi hits 2024', 6),
      searchItunes('punjabi hits 2024', 6),
      searchItunes('kpop 2024', 6),
      searchItunes('pop hits 2024', 6),
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
    let audioUrl = await getInvidiousAudioUrl(id);

    // ── FALLBACK: If YouTube fails, search all free sources (Archive, ccMixter, etc.) ──
    if (!audioUrl) {
      console.log(`[Stream] YouTube extraction failed for ${id}. Trying FreeMusic fallback...`);
      try {
        const { searchYouTube } = require('./services/youtube.service');
        const ytResults = await searchYouTube(id, 1);
        const songTitle = ytResults[0]?.title || 'hit song';
        
        const { searchAllSources } = require('./services/freeMusic.service');
        const freeResults = await searchAllSources(songTitle, 1);
        if (freeResults.length > 0) {
          console.log(`[Stream] ✓ Found FreeMusic alternative: ${freeResults[0].title}`);
          audioUrl = freeResults[0].streamUrl;
        }
      } catch (err) {
        console.error('[Stream] Fallback search failed:', err);
      }
    }

    if (!audioUrl) {
      console.error(`[Stream] ✗ All extraction methods failed for ${id}`);
      return res.status(503).send('Could not find a working stream for this song. Please try another.');
    }

    // Forward Range header
    const upstreamHeaders: any = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    if (req.headers.range) {
      upstreamHeaders['range'] = req.headers.range;
    }

    console.log(`[Stream] Proxying from CDN: ${audioUrl.substring(0, 60)}...`);

    const fetch = require('node-fetch');
    const upstreamRes = await fetch(audioUrl, {
      headers: upstreamHeaders,
      redirect: 'follow'
    });

    res.status(upstreamRes.status);
    
    const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
    headersToForward.forEach(h => {
      if (upstreamRes.headers.has(h)) {
        res.setHeader(h, upstreamRes.headers.get(h));
      }
    });
    
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (upstreamRes.body) {
      upstreamRes.body.pipe(res);
      upstreamRes.body.on('error', (err: any) => {
        console.error('[Stream] Upstream body error:', err.message);
      });
    } else {
      res.end();
    }

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

app.listen(PORT as number, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
// Trigger restart
