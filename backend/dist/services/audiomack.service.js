"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudiomackService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class AudiomackService {
    static CLIENT_ID = process.env.AUDIOMACK_CLIENT_ID;
    static CLIENT_SECRET = process.env.AUDIOMACK_CLIENT_SECRET;
    static BASE_URL = 'https://api.audiomack.com/v1';
    /**
     * Option A: oEmbed (Works without API key)
     */
    static async getEmbedData(trackUrl) {
        const endpoint = `https://audiomack.com/oembed?url=${encodeURIComponent(trackUrl)}&format=json`;
        const res = await (0, node_fetch_1.default)(endpoint, {
            headers: {
                'User-Agent': 'SonicStream/1.0 (https://github.com/Abhisam7007871/SonicStream)'
            }
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Audiomack API Error (${res.status}): ${errorText || 'Failed to fetch'}`);
        }
        return await res.json();
    }
    /**
     * Option B: Full API (Requires partner approval)
     * Placeholder methods for future integration
     */
    static async searchTracks(query, page = 1) {
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
exports.AudiomackService = AudiomackService;
//# sourceMappingURL=audiomack.service.js.map