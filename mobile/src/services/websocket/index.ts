import { API_CONFIG } from '../api/config';
import { WSMessage } from '../../types';

export type WSMessageListener = (msg: WSMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private roomCode: string = '';
  private playerId: string = '';
  private listeners: Set<WSMessageListener> = new Set();
  private reconnectTimer: any = null;
  private isExplicitlyClosed: boolean = false;

  constructor() {}

  connect(roomCode: string, playerId: string) {
    this.roomCode = roomCode;
    this.playerId = playerId;
    this.isExplicitlyClosed = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = `${API_CONFIG.WS_BASE}?roomCode=${roomCode}&playerId=${playerId}`;
    console.log('[WS] Connecting to:', url);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] Connected successfully to Go backend');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(msg));
        } catch (e) {
          console.warn('[WS] Failed to parse message', e);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Connection closed');
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS] Socket error', err);
      };
    } catch (e) {
      console.error('[WS] Connection failure', e);
    }
  }

  send(msg: Partial<WSMessage>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload: WSMessage = {
        type: msg.type || '',
        roomCode: this.roomCode,
        playerId: this.playerId,
        timestamp: Date.now(),
        ...msg,
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  // Send basket position update (0.0 to 100.0)
  sendBasketPosition(x: number) {
    this.send({
      type: 'CATCH_HEARTS_BUCKET_MOVED',
      payload: { x },
    });
  }

  // Trigger match start
  sendStartMatch() {
    this.send({
      type: 'CATCH_HEARTS_MATCH_STARTED',
    });
  }

  // Request rematch
  sendRematchRequest() {
    this.send({
      type: 'CATCH_HEARTS_REMATCH_REQUESTED',
    });
  }

  addListener(listener: WSMessageListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyClosed && this.roomCode && this.playerId) {
        console.log('[WS] Attempting reconnect...');
        this.connect(this.roomCode, this.playerId);
      }
    }, 2000);
  }
}

export const gameSocket = new WebSocketClient();

