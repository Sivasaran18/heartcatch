import React, { useState, useRef, useCallback } from 'react';
import { PlayfieldCanvas } from './components/PlayfieldCanvas';
import { GameHUD } from './components/GameHUD';
import { ResultModal } from './components/ResultModal';
import { Lobby } from './components/Lobby';
import type { Player, FallingObject, MatchSummary, WSMessage } from './types';
import confetti from 'canvas-confetti';

const BACKEND_HTTP = import.meta.env.VITE_BACKEND_HTTP || 'http://localhost:8090';
const BACKEND_WS = import.meta.env.VITE_BACKEND_WS || 'ws://localhost:8090/ws';

export const App: React.FC = () => {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerOne, setPlayerOne] = useState<Player | null>(null);
  const [playerTwo, setPlayerTwo] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<string>('LOBBY');
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [activePlayerName, setActivePlayerName] = useState<string>('');
  const [activePlayerId, setActivePlayerId] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [combo, setCombo] = useState<number>(0);
  const [basketX, setBasketX] = useState<number>(50);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [rematchRequested, setRematchRequested] = useState<boolean>(false);
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const basketXRef = useRef<number>(50);
  const lastSentBasketX = useRef<number>(50);
  const lastSendTime = useRef<number>(0);

  // Determine opponent's name dynamically for active hearts
  const opponentName =
    activePlayerId === playerOne?.id
      ? playerTwo?.name || 'Partner'
      : playerOne?.name || 'Partner';

  const isActiveTurn = currentPlayer?.id === activePlayerId;

  // Initialize or maintain WebSocket connection
  const connectWebSocket = useCallback((code: string, playerId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${BACKEND_WS}?roomCode=${code}&playerId=${playerId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to Catch Hearts server');
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (err) {
        console.error('[WS] Parse error', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
    };

    ws.onerror = (err) => {
      console.error('[WS] Error', err);
      setError('Connection issue with game server');
    };
  }, []);

  const handleServerMessage = (msg: WSMessage) => {
    switch (msg.type) {
      case 'CATCH_HEARTS_PLAYER_READY':
        if (msg.payload?.playerOne) setPlayerOne(msg.payload.playerOne);
        if (msg.payload?.playerTwo) setPlayerTwo(msg.payload.playerTwo);
        break;

      case 'CATCH_HEARTS_STATE_SYNC':
        if (msg.payload?.playerOne) setPlayerOne(msg.payload.playerOne);
        if (msg.payload?.playerTwo) setPlayerTwo(msg.payload.playerTwo);
        if (msg.payload?.match) {
          setGameState(msg.payload.match.state);
          setTurnNumber(msg.payload.match.turnNumber);
        }
        break;

      case 'CATCH_HEARTS_MATCH_STARTED': {
        const p1 = msg.payload?.playerOne;
        const p2 = msg.payload?.playerTwo;
        if (p1) setPlayerOne(p1);
        if (p2) setPlayerTwo(p2);
        const activeName = msg.payload?.activePlayer?.name || p1?.name || '';
        const activeId = msg.payload?.activePlayer?.id || p1?.id || '';
        setActivePlayerName(activeName);
        setActivePlayerId(activeId);
        setGameState(msg.payload?.state || 'PLAYER_ONE_INTRO');
        setTurnNumber(1);
        setScore(0);
        setLives(3);
        setCombo(0);
        setBasketX(50);
        setTransitionMsg('Match Starting! Prepare to Catch Hearts!');
        setTimeout(() => setTransitionMsg(null), 2500);

        // Immediately send initial confirmed basket position to Go backend
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentPlayer && currentPlayer.id === activeId) {
          wsRef.current.send(
            JSON.stringify({
              type: 'CATCH_HEARTS_BUCKET_MOVED',
              roomCode,
              playerId: currentPlayer.id,
              payload: { x: 50.0 },
            })
          );
        }
        break;
      }

      case 'CATCH_HEARTS_TURN_STARTED': {
        const activeName = msg.payload?.activePlayer?.name || activePlayerName;
        const activeId = msg.payload?.activePlayer?.id || activePlayerId;
        setActivePlayerName(activeName);
        setActivePlayerId(activeId);
        setGameState(msg.payload?.state || 'PLAYER_ONE_ACTIVE');
        setTransitionMsg(null);

        // Immediately send active player's initial basket position on turn start
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentPlayer && currentPlayer.id === activeId) {
          wsRef.current.send(
            JSON.stringify({
              type: 'CATCH_HEARTS_BUCKET_MOVED',
              roomCode,
              playerId: currentPlayer.id,
              payload: { x: basketX },
            })
          );
        }
        break;
      }

      case 'CATCH_HEARTS_GAME_SNAPSHOT':
        const snap = msg.payload;
        if (!snap) return;
        setGameState(snap.state);
        setTurnNumber(snap.turn);
        setActivePlayerName(snap.activePlayer);
        setActivePlayerId(snap.activeId);
        setTimeLeft(snap.timeLeft);
        setScore(snap.score);
        setLives(snap.lives);
        setCombo(snap.combo);
        setObjects(snap.objects || []);
        // If observer, mirror active basket
        if (currentPlayer?.id !== snap.activeId) {
          setBasketX(snap.basketX);
        }
        break;

      case 'CATCH_HEARTS_HEART_CAUGHT':
        // Small heart sparkle confetti
        if (msg.payload?.combo >= 5) {
          confetti({ particleCount: 15, spread: 45, origin: { y: 0.85 } });
        }
        break;

      case 'CATCH_HEARTS_GOLDEN_HEART_CAUGHT':
        // Golden burst
        confetti({
          particleCount: 35,
          spread: 60,
          colors: ['#fbbf24', '#f59e0b', '#fef08a'],
          origin: { y: 0.85 },
        });
        break;

      case 'CATCH_HEARTS_BOMB_CAUGHT':
        // Screen shake or bomb alert
        setLives(msg.payload?.remainingLives ?? 0);
        break;

      case 'CATCH_HEARTS_TURN_TRANSITION':
        setGameState('TURN_TRANSITION');
        setTransitionMsg(msg.payload?.message || "Switching turns!");
        setTimeout(() => setTransitionMsg(null), 3000);
        break;

      case 'CATCH_HEARTS_MATCH_COMPLETED':
        setGameState('MATCH_RESULTS');
        setSummary(msg.payload);
        setRematchRequested(false);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        break;

      case 'CATCH_HEARTS_REMATCH_REQUESTED':
        // Other player requested rematch
        break;

      case 'CATCH_HEARTS_REMATCH_STARTED':
        setSummary(null);
        setRematchRequested(false);
        setGameState('PLAYER_ONE_INTRO');
        break;

      default:
        break;
    }
  };

  // REST: Create Room
  const handleCreateRoom = async (name: string, role: 'MALE_USER' | 'SAKHI') => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BACKEND_HTTP}/api/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');

      setRoomCode(data.roomCode);
      setCurrentPlayer(data.player);
      setPlayerOne(data.player);
      connectWebSocket(data.roomCode, data.player.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // REST: Join Room
  const handleJoinRoom = async (code: string, name: string, role: 'MALE_USER' | 'SAKHI') => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BACKEND_HTTP}/api/room/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, name, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room');

      setRoomCode(data.roomCode);
      setCurrentPlayer(data.player);
      setPlayerTwo(data.player);
      connectWebSocket(data.roomCode, data.player.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Host starts the match
  const handleStartMatch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CATCH_HEARTS_MATCH_STARTED',
          roomCode,
          playerId: currentPlayer?.id,
        })
      );
    }
  };

  // Move basket (throttled to ~30-40 updates/sec to prevent network flooding)
  // Local basket renders via PlayfieldCanvas internal ref at 60 FPS without re-rendering App
  const handleBasketMove = (x: number) => {
    // Keep basketXRef updated without re-rendering App on every pointer move
    basketXRef.current = x;
    const now = performance.now();
    if (now - lastSendTime.current > 25 && Math.abs(x - lastSentBasketX.current) > 0.4) {
      lastSendTime.current = now;
      lastSentBasketX.current = x;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'CATCH_HEARTS_BUCKET_MOVED',
            roomCode,
            playerId: currentPlayer?.id,
            payload: { x },
          })
        );
      }
    }
  };

  // Request rematch
  const handleRematch = () => {
    setRematchRequested(true);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CATCH_HEARTS_REMATCH_REQUESTED',
          roomCode,
          playerId: currentPlayer?.id,
        })
      );
    }
  };

  const isPlaying =
    gameState === 'PLAYER_ONE_ACTIVE' ||
    gameState === 'PLAYER_TWO_ACTIVE' ||
    gameState === 'PLAYER_ONE_INTRO' ||
    gameState === 'PLAYER_TWO_INTRO' ||
    gameState === 'TURN_TRANSITION' ||
    gameState === 'MATCH_RESULTS';

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] bg-gradient-to-b from-slate-950 via-[#180a1c] to-[#0d0414] text-white flex flex-col select-none overflow-hidden touch-none font-sans">
      {/* Background Heart Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(244,63,94,0.14),transparent_60%)] pointer-events-none" />

      {/* Main Flow: Lobby vs Active Game Arena */}
      {!isPlaying ? (
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartMatch={handleStartMatch}
          roomCode={roomCode || undefined}
          isHost={currentPlayer?.id === playerOne?.id}
          playerOne={playerOne}
          playerTwo={playerTwo}
          loading={loading}
          error={error}
        />
      ) : (
        <div className="relative flex-1 w-full h-full flex flex-col overflow-hidden">
          {/* Top HUD */}
          <GameHUD
            score={score}
            lives={lives}
            timeLeft={timeLeft}
            combo={combo}
            activePlayerName={activePlayerName}
            opponentName={opponentName}
            isActiveTurn={isActiveTurn}
            turnNumber={turnNumber}
          />

          {/* Turn Transition / Intro Overlay Announcement */}
          {transitionMsg && (
            <div className="absolute inset-x-4 top-24 z-30 p-4 rounded-2xl bg-slate-900/90 border border-rose-500/50 shadow-2xl backdrop-blur-md text-center animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black text-rose-400 mb-1">{transitionMsg}</h3>
              <p className="text-xs text-rose-200/90">
                Falling hearts are carrying <strong className="text-white underline">{opponentName}</strong>'s name!
              </p>
            </div>
          )}

          {/* Full Screen Playfield Canvas */}
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <PlayfieldCanvas
              objects={objects}
              basketX={basketX}
              isActiveTurn={isActiveTurn}
              onBasketMove={handleBasketMove}
              activePlayerName={activePlayerName}
            />
          </div>

          {/* Result Modal when match finishes */}
          {gameState === 'MATCH_RESULTS' && summary && (
            <ResultModal
              summary={summary}
              currentPlayer={currentPlayer}
              onRematch={handleRematch}
              rematchRequested={rematchRequested}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default App;
