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
exports.searchAllSources = searchAllSources;
const node_fetch_1 = __importDefault(require("node-fetch"));
const https_1 = __importDefault(require("https"));
const ArchiveService = __importStar(require("./archive.service"));
const insecureAgent = new https_1.default.Agent({ rejectUnauthorized: false });
/**
 * Searches across multiple free music sources
 */
async function searchAllSources(query, limit = 10) {
    console.log(`[FreeMusic] Searching all sources for: "${query}"`);
    const start = Date.now();
    const results = await Promise.allSettled([
        searchFMA(query, limit),
        searchInternetArchive(query, limit),
        searchCcMixter(query, limit),
        searchMusopen(query, limit),
    ]);
    const end = Date.now();
    console.log(`[FreeMusic] Search completed in ${end - start}ms`);
    const tracks = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap(r => r.value);
    console.log(`[FreeMusic] Found ${tracks.length} tracks total`);
    return tracks;
}
/**
 * Internet Archive Wrapper
 */
async function searchInternetArchive(query, limit) {
    console.log(`[FreeMusic] Fetching Internet Archive for: ${query}`);
    try {
        const tracks = await ArchiveService.searchTracks(query, { limit });
        console.log(`[FreeMusic] Internet Archive found ${tracks.length} tracks`);
        return tracks.map(t => ({
            id: t.id,
            source: 'internetarchive',
            type: 'song',
            title: t.title,
            artist: t.artist,
            album: t.album,
            cover: t.cover,
            albumArt: t.cover,
            url: t.streamUrl,
            streamUrl: t.streamUrl,
            license: t.license
        }));
    }
    catch (error) {
        console.error('[FreeMusic] Internet Archive error:', error);
        return [];
    }
}
/**
 * ccMixter API Search
 * Returns direct MP3 links from Creative Commons community
 */
async function searchCcMixter(query, limit = 10) {
    console.log(`[FreeMusic] Fetching ccMixter for: ${query}`);
    try {
        const res = await (0, node_fetch_1.default)(`https://ccmixter.org/api/query?tags=${encodeURIComponent(query)}&limit=${limit}&f=json`, { agent: insecureAgent });
        const data = await res.json();
        if (!Array.isArray(data))
            return [];
        return data.map((track, index) => ({
            id: `ccmixter_${track.upload_id || index}`,
            source: 'ccmixter',
            type: 'song',
            title: track.upload_name || 'Unknown Title',
            artist: track.user_real_name || track.user_name || 'Unknown Artist',
            album: 'ccMixter Upload',
            cover: 'https://ccmixter.org/logo.png',
            albumArt: 'https://ccmixter.org/logo.png',
            url: track.files?.[0]?.download_url || '',
            streamUrl: track.files?.[0]?.download_url || '',
            license: track.license_name || 'CC-BY-NC'
        })).filter(t => t.url);
    }
    catch (error) {
        console.error('[FreeMusic] ccMixter error:', error);
        return [];
    }
}
/**
 * Free Music Archive (FMA) Search
 * Uses the FMA public search interface
 */
async function searchFMA(query, limit) {
    // FMA API is often restricted, but we can search via FreeMusicArchive.org
    // For this implementation, we'll use a placeholder or a known public API endpoint if available.
    // Many developers use the "FMA API" but it requires an API key. 
    // Let's implement a fallback to Archive.org FMA collection if direct API is restricted.
    try {
        const res = await (0, node_fetch_1.default)(`https://archive.org/advancedsearch.php?q=collection:freemusicarchive AND ${query}&output=json&rows=${limit}`);
        const data = await res.json();
        const docs = data.response?.docs || [];
        const trackLists = await Promise.allSettled(docs.map((doc) => ArchiveService.getItemFiles(doc.identifier)));
        return trackLists
            .filter((r) => r.status === 'fulfilled')
            .flatMap(r => r.value)
            .map(t => ({
            id: t.id,
            source: 'fma',
            type: 'song',
            title: t.title,
            artist: t.artist,
            album: t.album,
            cover: t.cover,
            albumArt: t.cover,
            url: t.streamUrl,
            streamUrl: t.streamUrl,
            license: 'CC-NC-SA'
        }));
    }
    catch (error) {
        console.error('[FreeMusic] FMA error:', error);
        return [];
    }
}
/**
 * Musopen Search (Classical Music)
 */
async function searchMusopen(query, limit) {
    console.log(`[FreeMusic] Fetching Musopen for: ${query}`);
    try {
        // Musopen doesn't have a simple public search API without keys for music files.
        // We fallback to Internet Archive's Musopen collection.
        const res = await (0, node_fetch_1.default)(`https://archive.org/advancedsearch.php?q=collection:musopen AND ${query}&output=json&rows=${limit}`, { agent: insecureAgent });
        const data = await res.json();
        const docs = data.response?.docs || [];
        const trackLists = await Promise.allSettled(docs.map((doc) => ArchiveService.getItemFiles(doc.identifier)));
        return trackLists
            .filter((r) => r.status === 'fulfilled')
            .flatMap(r => r.value)
            .map(t => ({
            id: t.id,
            source: 'musopen',
            type: 'song',
            title: t.title,
            artist: t.artist,
            album: t.album,
            cover: t.cover,
            albumArt: t.cover,
            url: t.streamUrl,
            streamUrl: t.streamUrl,
            license: 'Public Domain'
        }));
    }
    catch (error) {
        console.error('[FreeMusic] Musopen error:', error);
        return [];
    }
}
//# sourceMappingURL=freeMusic.service.js.map