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
export declare function search(query: string, options?: any): Promise<any>;
export declare function getItemFiles(identifier: string): Promise<ArchiveTrack[]>;
export declare function searchTracks(query: string, options?: any): Promise<ArchiveTrack[]>;
export declare const INDIAN_QUERIES: Record<string, string>;
export declare function getIndianMusic(category: string, limit?: number): Promise<ArchiveTrack[]>;
//# sourceMappingURL=archive.service.d.ts.map