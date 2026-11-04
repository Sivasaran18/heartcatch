import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Heart, Flame, ShieldAlert, Clock, Sparkles } from 'lucide-react-native';
import { Theme } from '../theme';

interface GameHUDProps {
  score: number;
  lives: number;
  timeLeft: number;
  combo: number;
  activePlayerName: string;
  opponentName: string;
  isActiveTurn: boolean;
  turnNumber: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  lives,
  timeLeft,
  combo,
  activePlayerName,
  opponentName,
  isActiveTurn,
  turnNumber,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Banner: Turn info and dynamic name display notice */}
      <View style={styles.topRow}>
        <View style={styles.turnBadge}>
          <Text style={styles.turnBadgeText}>Turn {turnNumber} / 2</Text>
          <Text style={styles.turnPlayerText}>{activePlayerName} is playing</Text>
        </View>

        <View style={styles.nameNoticeBadge}>
          <Sparkles size={12} color="#fbbf24" />
          <Text style={styles.nameNoticeText}>
            Hearts show: <Text style={styles.nameHighlight}>{opponentName}</Text>
          </Text>
        </View>
      </View>

      {/* Main Stats Row: Score, Streak, Timer, Lives */}
      <View style={styles.statsRow}>
        {/* Score & Combo */}
        <View style={styles.scoreCol}>
          <Text style={styles.statLabel}>SCORE</Text>
          <Text style={styles.scoreText}>{score}</Text>
          {combo >= 3 && (
            <View style={styles.streakBadge}>
              <Flame size={12} color="#f97316" />
              <Text style={styles.streakText}>{combo}x Streak!</Text>
            </View>
          )}
        </View>

        {/* Timer */}
        <View style={styles.timerBadge}>
          <Clock size={16} color={timeLeft <= 10 ? '#ef4444' : '#cbd5e1'} />
          <Text style={[styles.timerText, timeLeft <= 10 && styles.timerUrgent]}>
            {Math.ceil(timeLeft)}s
          </Text>
        </View>

        {/* Lives */}
        <View style={styles.livesCol}>
          <Text style={styles.statLabel}>LIVES</Text>
          <View style={styles.heartsRow}>
            {[1, 2, 3].map((heartIndex) => (
              <Heart
                key={heartIndex}
                size={18}
                color={heartIndex <= lives ? '#f43f5e' : '#334155'}
                fill={heartIndex <= lives ? '#f43f5e' : 'transparent'}
                style={styles.heartIcon}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Sub-banner: Active control instructions vs Live Spectator notice */}
      <View style={styles.noticeBar}>
        {isActiveTurn ? (
          <Text style={styles.activeNotice}>
            🎯 Drag your basket left & right to catch {opponentName}'s hearts! Dodge bombs!
          </Text>
        ) : (
          <View style={styles.observerRow}>
            <ShieldAlert size={14} color="#38bdf8" />
            <Text style={styles.observerNotice}>
              Observing live — {activePlayerName}'s turn to catch {opponentName}'s hearts!
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'rgba(15, 6, 23, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 63, 94, 0.35)',
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
    zIndex: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  turnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  turnBadgeText: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    color: '#fda4af',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    textTransform: 'uppercase',
  },
  turnPlayerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  nameNoticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  nameNoticeText: {
    color: '#fef08a',
    fontSize: 11,
    fontWeight: '600',
  },
  nameHighlight: {
    color: '#ffffff',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  scoreCol: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f43f5e',
    lineHeight: 24,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
    gap: 2,
  },
  streakText: {
    color: '#fdba74',
    fontSize: 10,
    fontWeight: '800',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  timerUrgent: {
    color: '#ef4444',
  },
  livesCol: {
    alignItems: 'flex-end',
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  heartIcon: {
    marginLeft: 2,
  },
  noticeBar: {
    marginTop: 4,
    alignItems: 'center',
  },
  activeNotice: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  observerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  observerNotice: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
});
