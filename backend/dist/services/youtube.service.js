"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYouTubeVideoId = getYouTubeVideoId;
exports.getYouTubeAudioStream = getYouTubeAudioStream;
exports.getInvidiousAudioUrl = getInvidiousAudioUrl;
exports.searchYouTube = searchYouTube;
const yt_search_1 = __importDefault(require("yt-search"));
const ytdl_core_1 = __importDefault(require("@distube/ytdl-core"));
const yt_stream_1 = __importDefault(require("yt-stream"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
// yt-dlp binary path (installed via pip)
const YTDLP_PATH = 'C:\\Users\\20kaa\\AppData\\Roaming\\Python\\Python314\\Scripts\\yt-dlp.exe';
// Cache resolved stream URLs (expire after 90 minutes — CDN tokens last ~2h)
const streamCache = new Map();
const CACHE_TTL = 90 * 60 * 1000;
// Cache YouTube search results
const searchCache = new Map();
/**
 * Finds a YouTube video ID for a given query.
 */
async function getYouTubeVideoId(query) {
    if (searchCache.has(query))
        return searchCache.get(query);
    try {
        const r = await (0, yt_search_1.default)(query);
        const video = r.videos?.[0];
        if (video) {
            searchCache.set(query, video.videoId);
            return video.videoId;
        }
        return null;
    }
    catch (error) {
        console.error('YouTube search error:', error);
        return null;
    }
}
/**
 * Returns a readable stream of the audio from a YouTube video.
 */
function getYouTubeAudioStream(videoId) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    return (0, ytdl_core_1.default)(url, { filter: 'audioonly', quality: 'highestaudio' });
}
/**
 * Uses yt-dlp (via python -m yt_dlp) to extract a direct audio URL.
 * Most reliable method — handles YouTube bot-detection that breaks other libs.
 */
async function getAudioUrlViaYtDlp(videoId) {
    try {
        console.log(`[yt-dlp] Extracting for ${videoId}`);
        const { stdout } = await execFileAsync('python', [
            '-m', 'yt_dlp',
            '--no-playlist',
            '--no-warnings',
            '-f', 'bestaudio',
            '--get-url',
            `https://www.youtube.com/watch?v=${videoId}`,
        ], { timeout: 25000 });
        const url = stdout.trim().split('\n')[0];
        if (url && url.startsWith('http')) {
            console.log('[yt-dlp] ✓ Got CDN URL');
            return url;
        }
        return null;
    }
    catch (e) {
        console.log(`[yt-dlp] Failed: ${e.message?.substring(0, 120)}`);
        return null;
    }
}
/**
 * Resolves a YouTube video ID to a direct CDN audio URL.
 * Returns null if all methods fail.
 */
async function getInvidiousAudioUrl(videoId) {
    // Return cached URL if still fresh
    const cached = streamCache.get(videoId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
        console.log(`[Stream] Cache hit for ${videoId}`);
        return cached.url;
    }
    const save = (url) => {
        streamCache.set(videoId, { url, ts: Date.now() });
        return url;
    };
    // ── 1. yt-dlp (most reliable, handles bot-detection) ──────────────────
    const ytdlpUrl = await getAudioUrlViaYtDlp(videoId);
    if (ytdlpUrl)
        return save(ytdlpUrl);
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
                signal: AbortSignal.timeout(8000),
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            if (res.ok) {
                const data = await res.json();
                const streams = data.audioStreams || [];
                if (streams.length > 0) {
                    streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                    const url = streams[0].url;
                    console.log(`[Piped] ✓ Success via ${piped}`);
                    return save(url);
                }
            }
        }
        catch (e) {
            console.log(`[Piped] ${piped} failed: ${e.message}`);
        }
    }
    // ── 3. yt-stream ──────────────────────────────────────────────────────
    try {
        console.log(`[yt-stream] Trying for ${videoId}`);
        const stream = await yt_stream_1.default.stream(videoId, { quality: 'high', type: 'audio' });
        if (stream?.url) {
            console.log('[yt-stream] ✓ Success');
            return save(stream.url);
        }
    }
    catch (e) {
        console.log(`[yt-stream] Failed: ${e.message}`);
    }
    // ── 4. ytdl-core ──────────────────────────────────────────────────────
    try {
        console.log(`[ytdl-core] Trying for ${videoId}`);
        const info = await ytdl_core_1.default.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
        const format = ytdl_core_1.default.chooseFormat(info.formats, {
            filter: 'audioonly',
            quality: 'highestaudio',
        });
        if (format?.url) {
            console.log('[ytdl-core] ✓ Success');
            return save(format.url);
        }
    }
    catch (e) {
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
                signal: AbortSignal.timeout(6000),
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });
            if (res.ok) {
                const data = await res.json();
                const audioStreams = [
                    ...(data.adaptiveFormats || []),
                    ...(data.formatStreams || []),
                ].filter((f) => (f.type && f.type.startsWith('audio/')) || f.container === 'm4a');
                if (audioStreams.length > 0) {
                    audioStreams.sort((a, b) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0));
                    const url = audioStreams[0].url;
                    console.log(`[Invidious] ✓ Success via ${instance}`);
                    return save(url);
                }
            }
        }
        catch (e) {
            console.log(`[Invidious] ${instance} failed: ${e.message}`);
        }
    }
    console.error(`[Stream] ✗ All methods exhausted for ${videoId}`);
    return null;
}
/**
 * Searches YouTube and returns normalised track objects.
 */
async function searchYouTube(query, limit = 30) {
    try {
        const r = await (0, yt_search_1.default)(query);
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
    }
    catch (error) {
        console.error('YouTube direct search error:', error);
        return [];
    }
}
//# sourceMappingURL=youtube.service.js.map