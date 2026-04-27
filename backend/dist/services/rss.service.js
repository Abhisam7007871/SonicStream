"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDIAN_PODCASTS = void 0;
exports.parseFeed = parseFeed;
exports.parseDuration = parseDuration;
exports.formatDuration = formatDuration;
const fast_xml_parser_1 = require("fast-xml-parser");
const node_fetch_1 = __importDefault(require("node-fetch"));
const parser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true
});
async function parseFeed(feedUrl) {
    const res = await (0, node_fetch_1.default)(feedUrl, {
        headers: {
            'User-Agent': 'SonicStream/1.0 Podcast Player'
        }
    });
    if (!res.ok)
        throw new Error(`Failed to fetch feed: ${res.status}`);
    const xml = await res.text();
    const result = parser.parse(xml);
    const channel = result?.rss?.channel;
    if (!channel)
        throw new Error('Invalid RSS feed');
    const show = {
        title: channel.title || '',
        description: channel.description || channel['itunes:summary'] || '',
        author: channel['itunes:author'] || channel.managingEditor || '',
        language: channel.language || 'en',
        cover: channel['itunes:image']?.['@_href'] ||
            channel.image?.url || '',
        website: channel.link || '',
        category: extractCategories(channel['itunes:category']),
        feedUrl,
        explicit: channel['itunes:explicit'] === 'yes'
    };
    const rawItems = channel.item || [];
    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
    const episodes = items
        .filter((item) => item.enclosure?.['@_url'])
        .map((item, index) => ({
        id: `rss_${hashString(feedUrl)}_${index}`,
        source: 'rss',
        type: 'podcast_episode',
        title: item.title || `Episode ${index + 1}`,
        description: stripHtml(item.description || item['itunes:summary'] || ''),
        showTitle: show.title,
        showCover: show.cover,
        author: item['itunes:author'] || show.author,
        streamUrl: item.enclosure['@_url'],
        fileType: item.enclosure['@_type'] || 'audio/mpeg',
        fileSize: parseInt(item.enclosure['@_length']) || 0,
        duration: parseDuration(item['itunes:duration']),
        pubDate: new Date(item.pubDate || item.pubdate || Date.now()),
        cover: item['itunes:image']?.['@_href'] || show.cover,
        episodeNum: item['itunes:episode'] || null,
        seasonNum: item['itunes:season'] || null,
        explicit: item['itunes:explicit'] === 'yes',
        language: show.language,
        guid: item.guid?.['#text'] || item.guid || ''
    }));
    return { show, episodes };
}
function parseDuration(raw) {
    if (!raw)
        return 0;
    const str = String(raw).trim();
    if (str.includes(':')) {
        const parts = str.split(':').map(Number);
        if (parts.length === 3)
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2)
            return parts[0] * 60 + parts[1];
    }
    return parseInt(str) || 0;
}
function formatDuration(seconds) {
    if (!seconds)
        return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0)
        return `${h}h ${m}m`;
    return `${m}m`;
}
function stripHtml(html) {
    if (!html)
        return '';
    return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}
function extractCategories(cat) {
    if (!cat)
        return [];
    if (typeof cat === 'string')
        return [cat];
    if (Array.isArray(cat))
        return cat.map((c) => c['@_text'] || c).filter(Boolean);
    return [cat['@_text']].filter(Boolean);
}
function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
}
exports.INDIAN_PODCASTS = [
    {
        title: 'The Ranveer Show',
        author: 'BeerBiceps',
        language: 'hindi',
        feedUrl: 'https://feeds.simplecast.com/7GG4vz_G',
        cover: 'https://image.simplecastcdn.com/images/7f1f31f9-9ed7-4bb1-ab3a-6ffebbe1ffba/8c7da197-09d3-4680-bcac-75f1ea8e0ed7/the-ranveer-show.jpg',
        category: 'Society & Culture'
    },
    {
        title: 'IVM Podcasts',
        author: 'Indus Vox Media',
        language: 'hindi',
        feedUrl: 'https://feeds.feedburner.com/ivmpodcasts',
        cover: 'https://static.ivmpodcasts.com/assets/images/ivm_logo.png',
        category: 'Entertainment'
    },
    {
        title: 'BBC Hindi',
        author: 'BBC',
        language: 'hindi',
        feedUrl: 'https://podcasts.files.bbci.co.uk/p02pc9pj.rss',
        cover: 'https://ichef.bbci.co.uk/images/ic/1200x675/p099pbdg.jpg',
        category: 'News'
    }
];
//# sourceMappingURL=rss.service.js.map