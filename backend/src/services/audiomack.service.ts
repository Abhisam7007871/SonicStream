import fetch from 'node-fetch';

export interface AudiomackEmbedResponse {
  html: string;
  title: string;
  author_name: string;
  thumbnail_url: string;
  version: string;
  type: string;
  provider_name: string;
}

export class AudiomackService {
  private static CLIENT_ID = process.env.AUDIOMACK_CLIENT_ID;
  private static CLIENT_SECRET = process.env.AUDIOMACK_CLIENT_SECRET;
  private static BASE_URL = 'https://api.audiomack.com/v1';

  /**
   * Option A: oEmbed (Works without API key)
   */
  static async getEmbedData(trackUrl: string): Promise<AudiomackEmbedResponse> {
    const endpoint = `https://audiomack.com/oembed?url=${encodeURIComponent(trackUrl)}&format=json`;
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'SonicStream/1.0 (https://github.com/Abhisam7007871/SonicStream)'
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Audiomack API Error (${res.status}): ${errorText || 'Failed to fetch'}`);
    }
    return await res.json() as AudiomackEmbedResponse;
  }

  /**
   * Option B: Full API (Requires partner approval)
   * Placeholder methods for future integration
   */
  static async searchTracks(query: string, page: number = 1) {
    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      // Mocked response for now until approval
      return [
        { id: 'am-1', title: `Audiomack Result: ${query}`, artist: 'Independent Artist' }
      ];
    }
    // Full API logic would go here
    return [];
  }
}
