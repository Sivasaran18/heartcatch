import { API_CONFIG } from './config';
import { Player } from '../../types';

export interface CreateRoomResponse {
  roomCode: string;
  player: Player;
}

export interface JoinRoomResponse {
  roomCode: string;
  player: Player;
  engine?: any;
}

export const GameApiService = {
  // Check Go backend server health
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_CONFIG.HTTP_BASE}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch (e) {
      console.warn('[API] Health check failed', e);
      return false;
    }
  },

  // Create Room for Male User or Sakhi
  async createRoom(name: string, role: 'MALE_USER' | 'SAKHI', avatar: string = ''): Promise<CreateRoomResponse> {
    const res = await fetch(`${API_CONFIG.HTTP_BASE}/api/room/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, avatar }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create room');
    }

    return await res.json();
  },

  // Join Room with code
  async joinRoom(roomCode: string, name: string, role: 'MALE_USER' | 'SAKHI', avatar: string = ''): Promise<JoinRoomResponse> {
    const res = await fetch(`${API_CONFIG.HTTP_BASE}/api/room/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, name, role, avatar }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to join room');
    }

    return await res.json();
  },
};

