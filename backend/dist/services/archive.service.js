"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDIAN_QUERIES = void 0;
exports.search = search;
exports.getItemFiles = getItemFiles;
exports.searchTracks = searchTracks;
exports.getIndianMusic = getIndianMusic;
const node_fetch_1 = __importDefault(require("node-fetch"));
const https_1 = __importDefault(require("https"));
const insecureAgent = new https_1.default.Agent({ rejectUnauthorized: false });
const BASE_SEARCH = 'https://archive.org/advancedsearch.php';
const BASE_META = 'https://archive.org/metadata';
const BASE_STREAM = 'https://archive.org/download';
async function search(query, options = {}) {
    const { limit = 20, page = 1, mediaType = 'audio', sort = 'downloads desc' } = options;
    const q = `${query} AND mediatype:${mediaType}`;
    const params = new URLSearchParams({
        q,
        output: 'json',
        rows: limit.toString(),
        page: page.toString(),
        'sort[]': sort,
        'fl[]': [
            'identifier', 'title', 'creator', 'subject',
            'description', 'year', 'language', 'downloads',
            'item_size', 'format'
        ].join(',')
    });
    const res = await (0, node_fetch_1.default)(`${BASE_SEARCH}?${params}`, { agent: insecureAgent });
    const data = await res.json();
    console.log(`[Archive] Search returned ${data.response?.docs?.length || 0} items`);
    return data.response?.docs || [];
}
async function getItemFiles(identifier) {
    const res = await (0, node_fetch_1.default)(`${BASE_META}/${identifier}`, { agent: insecureAgent });
    const data = await res.json();
    const files = data.files || [];
    const audioFiles = files.filter((f) => f.name?.match(/\.(mp3|ogg|flac|m4a|opus)$/i) &&
        !f.name?.includes('_64kb') &&
        f.source !== 'derivative');
    const coverFile = files.find((f) => f.name?.match(/\.(jpg|jpeg|png)$/i) &&
        (f.name?.toLowerCase().includes('cover') ||
            f.name?.toLowerCase().includes('thumb') ||
            f.name?.toLowerCase().includes('front')));
    const coverUrl = coverFile
        ? `${BASE_STREAM}/${identifier}/${encodeURIComponent(coverFile.name)}`
        : `https://archive.org/services/img/${identifier}`;
    return audioFiles.map((f, index) => ({
        id: `archive_${identifier}_${index}`,
        source: 'internetarchive',
        type: 'song',
        title: cleanTitle(f.name, data.metadata?.title),
        artist: data.metadata?.creator || 'Unknown Artist',
        album: data.metadata?.title || identifier,
        year: data.metadata?.year,
        language: normalizeLanguage(data.metadata?.language),
        cover: coverUrl,
        albumArt: coverUrl,
        streamUrl: `${BASE_STREAM}/${identifier}/${encodeURIComponent(f.name)}`,
        url: `${BASE_STREAM}/${identifier}/${encodeURIComponent(f.name)}`,
        downloadUrl: `${BASE_STREAM}/${identifier}/${encodeURIComponent(f.name)}`,
        fileSize: f.size,
        format: f.format || getFormat(f.name),
        identifier,
        license: 'public-domain',
        downloads: data.metadata?.downloads || 0
    }));
}
async function searchTracks(query, options = {}) {
    const items = await search(query, options);
    const trackLists = await Promise.allSettled(items.map((item) => getItemFiles(item.identifier)));
    const tracks = trackLists
        .filter((r) => r.status === 'fulfilled')
        .flatMap(r => r.value);
    return tracks;
}
exports.INDIAN_QUERIES = {
    hindi: 'hindi songs bollywood subject:hindi mediatype:audio',
    oldbollywood: 'bollywood hindi songs year:[1940 TO 1980] mediatype:audio',
    classical: 'hindustani classical raga mediatype:audio',
    carnatic: 'carnatic classical music mediatype:audio',
    bhajan: 'bhajan devotional hindi mediatype:audio',
    ghazal: 'ghazal urdu hindi mediatype:audio',
    qawwali: 'qawwali sufi mediatype:audio',
    folk: 'indian folk music rajasthani punjabi mediatype:audio',
    tamil: 'tamil songs music mediatype:audio',
    telugu: 'telugu songs music mediatype:audio',
    kannada: 'kannada songs music mediatype:audio',
    punjabi: 'punjabi songs bhangra mediatype:audio',
    bengali: 'bengali songs rabindra sangeet mediatype:audio',
    marathi: 'marathi songs natya sangeet mediatype:audio',
    lata: 'lata mangeshkar mediatype:audio',
    rafi: 'mohammed rafi mediatype:audio',
    kishore: 'kishore kumar songs mediatype:audio',
    mukesh: 'mukesh songs mediatype:audio',
    asha: 'asha bhosle songs mediatype:audio',
    gulzar: 'gulzar songs mediatype:audio',
};
async function getIndianMusic(category, limit = 20) {
    const query = exports.INDIAN_QUERIES[category] || `${category} indian music mediatype:audio`;
    return await searchTracks(query, { limit, sort: 'downloads desc' });
}
function cleanTitle(filename, albumTitle) {
    return filename
        .replace(/\.(mp3|ogg|flac|m4a|opus)$/i, '')
        .replace(/^\d+[\s_-]+/, '')
        .replace(/[_-]/g, ' ')
        .trim() || albumTitle || 'Unknown Track';
}
function normalizeLanguage(lang) {
    if (!lang)
        return 'unknown';
    const l = (Array.isArray(lang) ? lang[0] : lang).toLowerCase();
    const map = {
        'hin': 'hindi', 'hindi': 'hindi',
        'tam': 'tamil', 'tamil': 'tamil',
        'tel': 'telugu', 'telugu': 'telugu',
        'kan': 'kannada', 'pun': 'punjabi',
        'ben': 'bengali', 'mar': 'marathi',
        'urd': 'urdu', 'san': 'sanskrit',
        'eng': 'english', 'en': 'english'
    };
    return map[l] || l;
}
function getFormat(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const formats = { mp3: 'MP3', ogg: 'OGG', flac: 'FLAC', m4a: 'AAC', opus: 'Opus' };
    return ext ? (formats[ext] || 'Audio') : 'Audio';
}
//# sourceMappingURL=archive.service.js.map