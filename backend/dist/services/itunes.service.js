"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGE_SEARCHES = void 0;
exports.searchItunes = searchItunes;
// iTunes Search API service - 100% Free, No API Key Required
const node_fetch_1 = __importDefault(require("node-fetch"));
// Simple in-memory cache to respect the 20 req/min rate limit
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
function formatDuration(ms) {
    if (!ms)
        return '0:30';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
function normalizeTrack(track, language) {
    return {
        id: `itunes-${track.trackId}`,
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName || 'Single',
        genre: track.primaryGenreName || language,
        language,
        duration: formatDuration(track.trackTimeMillis),
        url: track.previewUrl,
        albumArt: track.artworkUrl100?.replace('100x100', '300x300') || '',
        source: 'itunes',
    };
}
async function searchItunes(term, limit = 25, country = 'IN') {
    const key = `${term}_${limit}_${country}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL)
        return cached.data;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}&country=${country}`;
    const res = await (0, node_fetch_1.default)(url, {
        headers: { 'User-Agent': 'SonicStream/1.0' }
    });
    if (!res.ok)
        throw new Error(`iTunes API error: ${res.status}`);
    const data = await res.json();
    // Detect language from search term for labeling
    let language = 'English';
    if (term.toLowerCase().includes('hindi') || term.toLowerCase().includes('bollywood'))
        language = 'Hindi';
    else if (term.toLowerCase().includes('punjabi'))
        language = 'Punjabi';
    else if (term.toLowerCase().includes('kpop') || term.toLowerCase().includes('korean') || term.toLowerCase().includes('k-pop'))
        language = 'Korean';
    const tracks = data.results
        .filter(t => t.previewUrl) // Only include tracks with audio preview
        .map(t => normalizeTrack(t, language));
    cache.set(key, { data: tracks, ts: Date.now() });
    return tracks;
}
// Pre-defined language playlists with iTunes search terms
exports.LANGUAGE_SEARCHES = {
    hindi: ['hindi songs 2024', 'bollywood hits', 'hindi romantic', 'arijit singh', 'shreya ghoshal'],
    punjabi: ['punjabi songs 2024', 'diljit dosanjh', 'ap dhillon', 'sidhu moosewala', 'punjabi pop'],
    korean: ['kpop 2024', 'bts', 'blackpink', 'stray kids', 'newjeans kpop'],
    english: ['pop hits 2024', 'the weeknd', 'taylor swift', 'ed sheeran', 'drake'],
};
//# sourceMappingURL=itunes.service.js.map