import fetch from 'node-fetch';

const BASE_SEARCH = 'https://archive.org/advancedsearch.php';
const BASE_META   = 'https://archive.org/metadata';
const BASE_STREAM = 'https://archive.org/download';

export interface ArchiveTrack {
  id: string;
  source: string;
  type: string;
  title: string;
  artist: string;
  album: string;
  year?: string;
  language?: string;
  cover: string;
  streamUrl: string;
  downloadUrl: string;
  fileSize: number;
  format: string;
  identifier: string;
  license: string;
  downloads: number;
}

export async function search(query: string, options: any = {}) {
  const {
    limit = 20,
    page = 1,
    mediaType = 'audio',
    sort = 'downloads desc'
  } = options;

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

  const res = await fetch(`${BASE_SEARCH}?${params}`);
  const data = await res.json() as any;
  return data.response?.docs || [];
}

export async function getItemFiles(identifier: string): Promise<ArchiveTrack[]> {
  const res = await fetch(`${BASE_META}/${identifier}`);
  const data = await res.json() as any;

  const files = data.files || [];

  const audioFiles = files.filter((f: any) =>
    f.name?.match(/\.(mp3|ogg|flac|m4a|opus)$/i) &&
    !f.name?.includes('_64kb') &&
    f.source !== 'derivative'
  );

  const coverFile = files.find((f: any) =>
    f.name?.match(/\.(jpg|jpeg|png)$/i) &&
    (f.name?.toLowerCase().includes('cover') ||
     f.name?.toLowerCase().includes('thumb') ||
     f.name?.toLowerCase().includes('front'))
  );

  const coverUrl = coverFile
    ? `${BASE_STREAM}/${identifier}/${encodeURIComponent(coverFile.name)}`
    : `https://archive.org/services/img/${identifier}`;

  return audioFiles.map((f: any, index: number) => ({
    id: `archive_${identifier}_${index}`,
    source: 'internetarchive',
    type: 'song',
    title: cleanTitle(f.name, data.metadata?.title),
    artist: data.metadata?.creator || 'Unknown Artist',
    album: data.metadata?.title || identifier,
    year: data.metadata?.year,
    language: normalizeLanguage(data.metadata?.language),
    cover: coverUrl,
    streamUrl: `${BASE_STREAM}/${identifier}/${encodeURIComponent(f.name)}`,
    downloadUrl: `${BASE_STREAM}/${identifier}/${encodeURIComponent(f.name)}`,
    fileSize: f.size,
    format: f.format || getFormat(f.name),
    identifier,
    license: 'public-domain',
    downloads: data.metadata?.downloads || 0
  }));
}

export async function searchTracks(query: string, options: any = {}): Promise<ArchiveTrack[]> {
  const items = await search(query, options);

  const trackLists = await Promise.allSettled(
    items.map((item: any) => getItemFiles(item.identifier))
  );

  const tracks = trackLists
    .filter((r): r is PromiseFulfilledResult<ArchiveTrack[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  return tracks;
}

export const INDIAN_QUERIES: Record<string, string> = {
  hindi:        'hindi songs bollywood subject:hindi mediatype:audio',
  oldbollywood: 'bollywood hindi songs year:[1940 TO 1980] mediatype:audio',
  classical:    'hindustani classical raga mediatype:audio',
  carnatic:     'carnatic classical music mediatype:audio',
  bhajan:       'bhajan devotional hindi mediatype:audio',
  ghazal:       'ghazal urdu hindi mediatype:audio',
  qawwali:      'qawwali sufi mediatype:audio',
  folk:         'indian folk music rajasthani punjabi mediatype:audio',
  tamil:        'tamil songs music mediatype:audio',
  telugu:       'telugu songs music mediatype:audio',
  kannada:      'kannada songs music mediatype:audio',
  punjabi:      'punjabi songs bhangra mediatype:audio',
  bengali:      'bengali songs rabindra sangeet mediatype:audio',
  marathi:      'marathi songs natya sangeet mediatype:audio',
  lata:         'lata mangeshkar mediatype:audio',
  rafi:         'mohammed rafi mediatype:audio',
  kishore:      'kishore kumar songs mediatype:audio',
  mukesh:       'mukesh songs mediatype:audio',
  asha:         'asha bhosle songs mediatype:audio',
  gulzar:       'gulzar songs mediatype:audio',
};

export async function getIndianMusic(category: string, limit = 20) {
  const query = INDIAN_QUERIES[category] || `${category} indian music mediatype:audio`;
  return await searchTracks(query, { limit, sort: 'downloads desc' });
}

function cleanTitle(filename: string, albumTitle?: string) {
  return filename
    .replace(/\.(mp3|ogg|flac|m4a|opus)$/i, '')
    .replace(/^\d+[\s_-]+/, '')
    .replace(/[_-]/g, ' ')
    .trim() || albumTitle || 'Unknown Track';
}

function normalizeLanguage(lang?: any) {
  if (!lang) return 'unknown';
  const l = (Array.isArray(lang) ? lang[0] : lang).toLowerCase();
  const map: Record<string, string> = {
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

function getFormat(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const formats: Record<string, string> = { mp3: 'MP3', ogg: 'OGG', flac: 'FLAC', m4a: 'AAC', opus: 'Opus' };
  return ext ? (formats[ext] || 'Audio') : 'Audio';
}
