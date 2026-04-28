/**
 * Analytics tracker — tracks users via device ID (localStorage)
 * 
 * Strategy:
 * 1. Generate unique deviceId on first visit → store in localStorage
 * 2. On app load → POST /api/analytics/session (creates session + upserts unique user)
 * 3. On song play → POST /api/analytics/play (tracks what was played)
 * 4. Periodic heartbeat → keeps session active
 * 
 * View stats at: GET /api/analytics/dashboard
 */

const API_BASE = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || '') 
  : '';

// Generate a UUID v4
function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get or create device ID
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let deviceId = localStorage.getItem('sonic_device_id');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('sonic_device_id', deviceId);
  }
  return deviceId;
}

// Get logged in user ID (if any)
function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    // Decode JWT payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
}

let sessionId: string | null = null;
let heartbeatInterval: any = null;

// Track session on app load
export async function trackSession(): Promise<void> {
  try {
    const deviceId = getDeviceId();
    const userId = getUserId();
    
    const res = await fetch(`${API_BASE}/api/analytics/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, userId, platform: 'web' }),
    });
    
    const data = await res.json();
    sessionId = data.sessionId;
    
    // Start heartbeat every 2 minutes
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (sessionId) {
        fetch(`${API_BASE}/api/analytics/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
      }
    }, 2 * 60 * 1000);
    
    console.log('[Analytics] Session tracked:', sessionId);
  } catch (e) {
    console.log('[Analytics] Session tracking failed (non-critical)');
  }
}

// Track song play
export async function trackSongPlay(song: {
  id: string | number;
  title: string;
  artist: string;
  source?: string;
}): Promise<void> {
  try {
    const deviceId = getDeviceId();
    const userId = getUserId();
    
    await fetch(`${API_BASE}/api/analytics/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        userId,
        songId: String(song.id),
        songTitle: song.title,
        artist: song.artist,
        source: song.source || 'youtube',
      }),
    });
  } catch {
    // Non-critical — don't block playback
  }
}
