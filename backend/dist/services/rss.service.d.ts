export declare function parseFeed(feedUrl: string): Promise<{
    show: {
        title: any;
        description: any;
        author: any;
        language: any;
        cover: any;
        website: any;
        category: string[];
        feedUrl: string;
        explicit: boolean;
    };
    episodes: {
        id: string;
        source: string;
        type: string;
        title: any;
        description: string;
        showTitle: any;
        showCover: any;
        author: any;
        streamUrl: any;
        fileType: any;
        fileSize: number;
        duration: number;
        pubDate: Date;
        cover: any;
        episodeNum: any;
        seasonNum: any;
        explicit: boolean;
        language: any;
        guid: any;
    }[];
}>;
export declare function parseDuration(raw: string | number | undefined): number;
export declare function formatDuration(seconds: number): string;
export declare const INDIAN_PODCASTS: {
    title: string;
    author: string;
    language: string;
    feedUrl: string;
    cover: string;
    category: string;
}[];
//# sourceMappingURL=rss.service.d.ts.map