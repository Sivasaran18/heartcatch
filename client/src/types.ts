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
  basketX: number;
}

export interface FallingObject {
  id: string;
  type: 'NORMAL_HEART' | 'GOLDEN_HEART' | 'BOMB';
  nameTag: string;
  x: number;     // 0 - 100 percentage
  y: number;     // 0 - 100 percentage
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

