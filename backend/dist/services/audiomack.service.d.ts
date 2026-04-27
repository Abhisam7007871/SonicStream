export interface AudiomackEmbedResponse {
    html: string;
    title: string;
    author_name: string;
    thumbnail_url: string;
    version: string;
    type: string;
    provider_name: string;
}
export declare class AudiomackService {
    private static CLIENT_ID;
    private static CLIENT_SECRET;
    private static BASE_URL;
    /**
     * Option A: oEmbed (Works without API key)
     */
    static getEmbedData(trackUrl: string): Promise<AudiomackEmbedResponse>;
    /**
     * Option B: Full API (Requires partner approval)
     * Placeholder methods for future integration
     */
    static searchTracks(query: string, page?: number): Promise<{
        id: string;
        title: string;
        artist: string;
    }[]>;
}
//# sourceMappingURL=audiomack.service.d.ts.map