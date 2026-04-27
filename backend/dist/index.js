"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("./middleware/auth.middleware");
const audiomack_service_1 = require("./services/audiomack.service");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept-Ranges'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
    credentials: true
}));
app.use(express_1.default.json());
// Log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
const itunes_service_1 = require("./services/itunes.service");
// ─────────────────────────────────────────────
//  MUSIC ROUTES (powered by iTunes Search API)
// ─────────────────────────────────────────────
// Search — query iTunes in real-time
app.get('/api/music/search', async (req, res) => {
    const { q, language } = req.query;
    const term = q || (language ? `${language} songs 2024` : 'top hits 2024');
    try {
        const results = await (0, itunes_service_1.searchItunes)(term, 30);
        res.json({ query: term, total: results.length, results });
    }
    catch (err) {
        console.error('Search error:', err.message);
        res.status(500).json({ message: err.message });
    }
});
// Removed duplicate import
// YouTube Direct Search
app.get('/api/youtube/search', async (req, res) => {
    const { q } = req.query;
    const term = q || 'top hits 2024';
    try {
        const results = await (0, youtube_service_1.searchYouTube)(term, 30);
        res.json({ query: term, total: results.length, results });
    }
    catch (err) {
        console.error('YouTube Search error:', err.message);
        res.status(500).json({ message: err.message });
    }
});
// Browse by language
app.get('/api/music/language/:lang', async (req, res) => {
    const lang = req.params.lang.toLowerCase();
    const terms = itunes_service_1.LANGUAGE_SEARCHES[lang];
    if (!terms) {
        return res.status(400).json({ message: `Unknown language: ${lang}. Available: hindi, punjabi, korean, english` });
    }
    try {
        // Fetch from first 2 search terms and merge results
        const [a, b] = await Promise.all([
            (0, itunes_service_1.searchItunes)(terms[0], 15),
            (0, itunes_service_1.searchItunes)(terms[1], 15),
        ]);
        const all = [...a, ...b];
        // Remove duplicates
        const seen = new Set();
        const results = all.filter(t => {
            if (seen.has(t.id))
                return false;
            seen.add(t.id);
            return true;
        });
        res.json({ language: lang, total: results.length, results });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// Trending — pulls from all 4 languages
app.get('/api/music/trending', async (req, res) => {
    try {
        const [hindi, punjabi, korean, english] = await Promise.all([
            (0, itunes_service_1.searchItunes)('hindi hits 2024', 6),
            (0, itunes_service_1.searchItunes)('punjabi hits 2024', 6),
            (0, itunes_service_1.searchItunes)('kpop 2024', 6),
            (0, itunes_service_1.searchItunes)('pop hits 2024', 6),
        ]);
        const results = [...hindi, ...punjabi, ...korean, ...english];
        res.json({ total: results.length, results });
    }
    catch (err) {
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
        const data = await audiomack_service_1.AudiomackService.getEmbedData(url);
        res.json(data);
    }
    catch (err) {
        console.error('Audiomack Route Error:', err);
        res.status(500).json({ message: err.message, stack: err.stack });
    }
});
// ─────────────────────────────────────────────
//  AGGREGATOR ROUTES (YouTube, Archive, RSS)
// ─────────────────────────────────────────────
const youtube_service_1 = require("./services/youtube.service");
const ia = __importStar(require("./services/archive.service"));
const freeMusic_service_1 = require("./services/freeMusic.service");
const rss_service_1 = require("./services/rss.service");
// YouTube Audio Stream Proxy Component
// Takes iTunes metadata and returns a full native stream
app.get('/api/music/stream', async (req, res) => {
    const { title, artist } = req.query;
    if (!title)
        return res.status(400).send('Missing title');
    try {
        const query = `${title} ${artist || ''} official audio`;
        const videoId = await (0, youtube_service_1.getYouTubeVideoId)(query);
        if (!videoId)
            return res.status(404).send('YouTube stream not found');
        const audioUrl = await (0, youtube_service_1.getInvidiousAudioUrl)(videoId);
        res.redirect(audioUrl);
    }
    catch (err) {
        console.error('Stream proxy error:', err);
        res.status(500).send('Stream error');
    }
});
// YouTube Direct Stream Proxy — resolves to a CDN audio URL and pipes it
app.get('/api/youtube/stream', async (req, res) => {
    const { id } = req.query;
    if (!id)
        return res.status(400).send('Missing video id');
    console.log(`[Stream] Request for video: ${id}`);
    try {
        const audioUrl = await (0, youtube_service_1.getInvidiousAudioUrl)(id);
        if (!audioUrl) {
            console.error(`[Stream] Could not resolve audio URL for ${id}`);
            return res.status(503).send('Audio extraction failed. Try another track.');
        }
        // Forward Range header
        const upstreamHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };
        if (req.headers.range) {
            upstreamHeaders['range'] = req.headers.range;
        }
        console.log(`[Stream] Proxying from CDN: ${audioUrl.substring(0, 60)}...`);
        const https = require('https');
        const http = require('http');
        const client = audioUrl.startsWith('https') ? https : http;
        const proxyReq = client.get(audioUrl, { headers: upstreamHeaders }, (proxyRes) => {
            // Forward status and essential headers only
            res.status(proxyRes.statusCode);
            const headersToForward = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control'];
            headersToForward.forEach(h => {
                if (proxyRes.headers[h])
                    res.setHeader(h, proxyRes.headers[h]);
            });
            res.setHeader('Access-Control-Allow-Origin', '*');
            let bytesSent = 0;
            proxyRes.on('data', (chunk) => {
                bytesSent += chunk.length;
            });
            proxyRes.on('end', () => {
                console.log(`[Stream] ✓ Finished. Sent ${bytesSent} bytes for ${id}`);
            });
            proxyRes.pipe(res);
        });
        proxyReq.on('error', (err) => {
            console.error('[Stream] Proxy Request Error:', err.message);
            if (!res.headersSent)
                res.status(500).send('Stream error');
        });
    }
    catch (err) {
        console.error('[Stream] Error:', err.message);
        if (!res.headersSent)
            res.status(500).send('Stream error');
    }
});
// Internet Archive endpoints (Indian catalog)
app.get('/api/archive/search', async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q)
            return res.status(400).json({ error: 'Query required' });
        const tracks = await ia.searchTracks(q, { limit: Number(limit) });
        res.json({ tracks, total: tracks.length, source: 'internetarchive' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/archive/indian/:category', async (req, res) => {
    try {
        const tracks = await ia.getIndianMusic(req.params.category, Number(req.query.limit) || 20);
        res.json({ tracks, category: req.params.category });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Podcasts (RSS feed parser)
app.get('/api/podcasts/feed', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || typeof url !== 'string')
            return res.status(400).json({ error: 'Feed URL required' });
        const { show, episodes } = await (0, rss_service_1.parseFeed)(url);
        res.json({ show, episodes });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/podcasts/indian', (req, res) => {
    res.json({ shows: rss_service_1.INDIAN_PODCASTS });
});
// Unified Free Music Search (ccMixter, FMA, Musopen, etc.)
app.get('/api/music/free-search', async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q)
            return res.status(400).json({ error: 'Query required' });
        const results = await (0, freeMusic_service_1.searchAllSources)(q, Number(limit));
        res.json({ results, total: results.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Protected Playlist Routes
app.get('/api/playlists', auth_middleware_1.authMiddleware, async (req, res) => {
    if (!req.userId)
        return res.status(401).json({ message: 'Unauthorized' });
    const playlists = await prisma.playlist.findMany({
        where: { userId: req.userId },
        include: { tracks: { include: { track: true } } }
    });
    res.json(playlists);
});
app.post('/api/playlists', auth_middleware_1.authMiddleware, async (req, res) => {
    const { name } = req.body;
    const playlist = await prisma.playlist.create({
        data: {
            name,
            userId: req.userId,
        }
    });
    res.status(201).json(playlist);
});
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
// Trigger restart
//# sourceMappingURL=index.js.map