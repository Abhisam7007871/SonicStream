/**
 * Finds a YouTube video ID for a given query.
 */
export declare function getYouTubeVideoId(query: string): Promise<string | null>;
/**
 * Returns a readable stream of the audio from a YouTube video.
 */
export declare function getYouTubeAudioStream(videoId: string): import("node:stream").Readable;
/**
 * Resolves a YouTube video ID to a direct CDN audio URL.
 * Returns null if all methods fail.
 */
export declare function getInvidiousAudioUrl(videoId: string): Promise<string | null>;
/**
 * Searches YouTube and returns normalised track objects.
 */
export declare function searchYouTube(query: string, limit?: number): Promise<any>;
//# sourceMappingURL=youtube.service.d.ts.map