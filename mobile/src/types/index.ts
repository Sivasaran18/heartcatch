export interface Player {
  id: string;
  name: string;
  role: 'MALE_USER' | 'SAKHI';
  avatar: string;
  ready: boolean;
  connected: boolean;
  score: number;
  lives: number;
  heartsCaught: number;
  goldCaught: number;
  bombsHit: number;
  currentCombo: number;
  maxCombo: number;
  basketX: number; // Normalized 0.0 - 100.0
}

export interface FallingObject {
  id: string;
  type: 'NORMAL_HEART' | 'GOLDEN_HEART' | 'BOMB';
  nameTag: string; // Opponent's confirmed name
  x: number;     // Normalized 0 - 100 percentage
  y: number;     // Normalized 0 - 100 percentage
  speed: number;
  size: number;
  caught: boolean;
  expired: boolean;
  nearMiss: boolean;
}

export interface MatchSummary {
  winnerId: string;
  winnerName: string;
  isTie: boolean;
  playerOneScore: number;
  playerTwoScore: number;
  playerOneStats: Player;
  playerTwoStats: Player;
  durationSec: number;
}

export interface GameSnapshot {
  state: string;
  turn: number;
  activePlayer: string;
  activeId: string;
  timeLeft: number;
  score: number;
  lives: number;
  combo: number;
  basketX: number;
  objects: FallingObject[];
}

export interface WSMessage<T = any> {
  type: string;
  roomCode?: string;
  playerId?: string;
  seq?: number;
  timestamp?: number;
  payload?: T;
}

// WebSocket Event Types
export const WS_EVENTS = {
  ROOM_CREATE: 'CATCH_HEARTS_ROOM_CREATE',
  ROOM_CREATED: 'CATCH_HEARTS_ROOM_CREATED',
  ROOM_JOIN: 'CATCH_HEARTS_ROOM_JOIN',
  ROOM_JOINED: 'CATCH_HEARTS_ROOM_JOINED',
  ROOM_STATE: 'CATCH_HEARTS_ROOM_STATE',

  PLAYER_READY: 'CATCH_HEARTS_PLAYER_READY',
  MATCH_STARTED: 'CATCH_HEARTS_MATCH_STARTED',

  TURN_STARTED: 'CATCH_HEARTS_TURN_STARTED',
  OBJECTS_SPAWNED: 'CATCH_HEARTS_OBJECTS_SPAWNED',
  GAME_SNAPSHOT: 'CATCH_HEARTS_GAME_SNAPSHOT',
  BUCKET_MOVED: 'CATCH_HEARTS_BUCKET_MOVED',
  HEART_CAUGHT: 'CATCH_HEARTS_HEART_CAUGHT',
  GOLDEN_HEART_CAUGHT: 'CATCH_HEARTS_GOLDEN_HEART_CAUGHT',
  BOMB_CAUGHT: 'CATCH_HEARTS_BOMB_CAUGHT',
  LIFE_LOST: 'CATCH_HEARTS_LIFE_LOST',
  COMBO_UPDATED: 'CATCH_HEARTS_COMBO_UPDATED',
  NEAR_MISS: 'CATCH_HEARTS_NEAR_MISS',

  TURN_ENDED: 'CATCH_HEARTS_TURN_ENDED',
  TURN_TRANSITION: 'CATCH_HEARTS_TURN_TRANSITION',
  MATCH_COMPLETED: 'CATCH_HEARTS_MATCH_COMPLETED',
  REMATCH_REQUESTED: 'CATCH_HEARTS_REMATCH_REQUESTED',
  REMATCH_STARTED: 'CATCH_HEARTS_REMATCH_STARTED',

  PLAYER_DISCONNECTED: 'CATCH_HEARTS_PLAYER_DISCONNECTED',
  PLAYER_RECONNECTED: 'CATCH_HEARTS_PLAYER_RECONNECTED',
  STATE_SYNC: 'CATCH_HEARTS_STATE_SYNC',
  ERROR: 'CATCH_HEARTS_ERROR',
} as const;

