export interface UnifiedTrack {
    id: string;
    source: string;
    type: string;
    title: string;
    artist: string;
    album: string;
    cover: string;
    albumArt: string;
    url: string;
    streamUrl: string;
    license: string;
    duration?: number;
}
/**
 * Searches across multiple free music sources
 */
export declare function searchAllSources(query: string, limit?: number): Promise<UnifiedTrack[]>;
//# sourceMappingURL=freeMusic.service.d.ts.map