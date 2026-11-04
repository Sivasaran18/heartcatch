import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  useWindowDimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { PlayfieldArena } from './src/game/rendering/PlayfieldArena';
import { GameHUD } from './src/components/GameHUD';
import { ResultModal } from './src/components/ResultModal';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { Player, FallingObject, MatchSummary, WSMessage } from './src/types';
import { GameApiService } from './src/services/api';
import { gameSocket } from './src/services/websocket';

import { StatusBar } from 'expo-status-bar';

export default function App() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

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

  const lastSentX = useRef<number>(50);
  const lastSendTime = useRef<number>(0);

  // Dynamic Opponent Name Tag calculation
  const opponentName =
    activePlayerId === playerOne?.id
      ? playerTwo?.name || 'Partner'
      : playerOne?.name || 'Partner';

  const isActiveTurn = currentPlayer?.id === activePlayerId;

  // Handle incoming messages from Go WebSocket server
  const handleServerMessage = useCallback(
    (msg: WSMessage) => {
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

        case 'CATCH_HEARTS_MATCH_STARTED':
          setGameState(msg.payload?.state || 'PLAYER_ONE_INTRO');
          setTurnNumber(1);
          setTransitionMsg('Match Starting! Prepare to Catch Hearts!');
          setTimeout(() => setTransitionMsg(null), 2500);
          break;

        case 'CATCH_HEARTS_TURN_STARTED':
          setGameState(msg.payload?.state || 'PLAYER_ONE_ACTIVE');
          setTransitionMsg(null);
          break;

        case 'CATCH_HEARTS_GAME_SNAPSHOT': {
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

          // Observer mirrors active player's basket
          if (currentPlayer?.id !== snap.activeId) {
            setBasketX(snap.basketX);
          }
          break;
        }

        case 'CATCH_HEARTS_BOMB_CAUGHT':
          setLives(msg.payload?.remainingLives ?? 0);
          break;

        case 'CATCH_HEARTS_TURN_TRANSITION':
          setGameState('TURN_TRANSITION');
          setTransitionMsg(msg.payload?.message || 'Switching turns!');
          setTimeout(() => setTransitionMsg(null), 3000);
          break;

        case 'CATCH_HEARTS_MATCH_COMPLETED':
          setGameState('MATCH_RESULTS');
          setSummary(msg.payload);
          setRematchRequested(false);
          break;

        case 'CATCH_HEARTS_REMATCH_STARTED':
          setSummary(null);
          setRematchRequested(false);
          setGameState('PLAYER_ONE_INTRO');
          break;

        default:
          break;
      }
    },
    [currentPlayer?.id]
  );

  useEffect(() => {
    const unsub = gameSocket.addListener(handleServerMessage);
    return () => {
      unsub();
      gameSocket.disconnect();
    };
  }, [handleServerMessage]);

  // REST Room Creation
  const handleCreateRoom = async (name: string, role: 'MALE_USER' | 'SAKHI') => {
    try {
      setLoading(true);
      setError(null);
      const data = await GameApiService.createRoom(name, role);
      setRoomCode(data.roomCode);
      setCurrentPlayer(data.player);
      setPlayerOne(data.player);
      gameSocket.connect(data.roomCode, data.player.id);
    } catch (err: any) {
      setError(err.message || 'Error creating room');
    } finally {
      setLoading(false);
    }
  };

  // REST Room Joining
  const handleJoinRoom = async (code: string, name: string, role: 'MALE_USER' | 'SAKHI') => {
    try {
      setLoading(true);
      setError(null);
      const data = await GameApiService.joinRoom(code, name, role);
      setRoomCode(data.roomCode);
      setCurrentPlayer(data.player);
      setPlayerTwo(data.player);
      gameSocket.connect(data.roomCode, data.player.id);
    } catch (err: any) {
      setError(err.message || 'Error joining room');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = () => {
    gameSocket.sendStartMatch();
  };

  // Throttled basket update to prevent network congestion
  const handleBasketMove = (x: number) => {
    setBasketX(x);
    const now = Date.now();
    if (now - lastSendTime.current > 30 && Math.abs(x - lastSentX.current) > 0.5) {
      lastSendTime.current = now;
      lastSentX.current = x;
      gameSocket.sendBasketPosition(x);
    }
  };

  const handleRematch = () => {
    setRematchRequested(true);
    gameSocket.sendRematchRequest();
  };

  const isPlaying =
    gameState === 'PLAYER_ONE_ACTIVE' ||
    gameState === 'PLAYER_TWO_ACTIVE' ||
    gameState === 'PLAYER_ONE_INTRO' ||
    gameState === 'PLAYER_TWO_INTRO' ||
    gameState === 'TURN_TRANSITION' ||
    gameState === 'MATCH_RESULTS';

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="light" />

      {/* Background Atmosphere */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.bgGradient} />
      </View>

      {!isPlaying ? (
        <LobbyScreen
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
        <View style={styles.arenaContainer}>
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

          {/* Turn Transition Announcement */}
          {transitionMsg && (
            <View style={styles.transitionBox}>
              <Text style={styles.transitionTitle}>{transitionMsg}</Text>
              <Text style={styles.transitionSubtitle}>
                Catch hearts carrying{' '}
                <Text style={styles.transitionHighlight}>{opponentName}</Text>'s name!
              </Text>
            </View>
          )}

          {/* Native 2D Full Arena */}
          <View style={styles.playfieldWrapper}>
            <PlayfieldArena
              width={windowWidth}
              height={windowHeight - (Platform.OS === 'ios' ? 140 : 120)}
              objects={objects}
              basketX={basketX}
              isActiveTurn={isActiveTurn}
              onBasketMove={handleBasketMove}
              activePlayerName={activePlayerName}
            />
          </View>

          {/* Result Modal */}
          {gameState === 'MATCH_RESULTS' && summary && (
            <ResultModal
              summary={summary}
              currentPlayer={currentPlayer}
              onRematch={handleRematch}
              rematchRequested={rematchRequested}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#09040e',
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0c0512',
  },
  arenaContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  playfieldWrapper: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  transitionBox: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 40,
    backgroundColor: 'rgba(25, 10, 34, 0.95)',
    borderWidth: 1,
    borderColor: '#f43f5e',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#f43f5e',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  transitionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fda4af',
    textAlign: 'center',
  },
  transitionSubtitle: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 4,
  },
  transitionHighlight: {
    color: '#fbbf24',
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
});
