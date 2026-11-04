import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Heart, Trophy, RotateCcw } from 'lucide-react-native';
import { MatchSummary, Player } from '../types';

interface ResultModalProps {
  summary: MatchSummary;
  currentPlayer: Player | null;
  onRematch: () => void;
  rematchRequested: boolean;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  summary,
  currentPlayer,
  onRematch,
  rematchRequested,
}) => {
  const isWinner = currentPlayer && summary.winnerId === currentPlayer.id;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Trophy / Icon */}
        <View style={styles.trophyWrapper}>
          <View style={styles.trophyInner}>
            {summary.isTie ? (
              <Heart size={36} color="#f43f5e" fill="#f43f5e" />
            ) : (
              <Trophy size={36} color="#fbbf24" fill="#fbbf24" />
            )}
          </View>
        </View>

        <Text style={styles.title}>
          {summary.isTie ? "It's a Heart Tie! ❤️" : `${summary.winnerName} Wins! 👑`}
        </Text>

        <Text style={styles.subtitle}>
          {summary.isTie
            ? 'Both lovers matched each other heart for heart!'
            : isWinner
            ? 'Congratulations! You won the heart arena!'
            : 'A wonderful performance! Both hearts beat as one!'}
        </Text>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Player 1 Card */}
          <View
            style={[
              styles.playerCard,
              summary.winnerId === summary.playerOneStats.id && styles.playerCardWinner,
            ]}
          >
            <Text style={styles.playerRole}>
              {summary.playerOneStats.role === 'MALE_USER' ? 'Male User' : 'Sakhi'}
            </Text>
            <Text style={styles.playerName} numberOfLines={1}>
              {summary.playerOneStats.name}
            </Text>
            <Text style={styles.playerScore}>{summary.playerOneScore}</Text>

            <View style={styles.statBreakdown}>
              <View style={styles.statLine}>
                <Text style={styles.statLineLabel}>Hearts:</Text>
                <Text style={styles.statLineVal}>{summary.playerOneStats.heartsCaught}</Text>
              </View>
              <View style={styles.statLine}>
                <Text style={styles.statLineLabel}>Golden:</Text>
                <Text style={[styles.statLineVal, { color: '#fbbf24' }]}>
                  {summary.playerOneStats.goldCaught}
                </Text>
              </View>
              <View style={styles.statLine}>
                <Text style={styles.statLineLabel}>Streak:</Text>
                <Text style={[styles.statLineVal, { color: '#f97316' }]}>
                  {summary.playerOneStats.maxCombo}x
                </Text>
              </View>
            </View>
          </View>

          {/* Player 2 Card */}
          <View
            style={[
              styles.playerCard,
              summary.winnerId === summary.playerTwoStats.id && styles.playerCardWinner,
            ]}
          >
            <Text style={styles.playerRole}>
              {summary.playerTwoStats.role === 'SAKHI' ? 'Sakhi' : 'Male User'}
            </Text>
            <Text style={styles.playerName} numberOfLines={1}>
              {summary.playerTwoStats.name}
            </Text>
            <Text style={styles.playerScore}>{summary.playerTwoScore}</Text>

            <View style={styles.statBreakdown}>
              <View style={styles.statLine}>
                <Text style={styles.statLineLabel}>Hearts:</Text>
                <Text style={styles.statLineVal}>{summary.playerTwoStats.heartsCaught}</Text>
              </View>
              <View style={styles.statLine}>
                <Text style={styles.statLineLabel}>Golden:</Text>
                <Text style={[styles.statLineVal, { color: '#fbbf24' }]}>
                  {summary.playerTwoStats.goldCaught}
                </Text>
              </View>
              <View style={styles.statLine}>
                <Text style={styles.statLineLabel}>Streak:</Text>
                <Text style={[styles.statLineVal, { color: '#f97316' }]}>
                  {summary.playerTwoStats.maxCombo}x
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Rematch Button */}
        <TouchableOpacity
          style={[styles.rematchBtn, rematchRequested && styles.rematchBtnDisabled]}
          disabled={rematchRequested}
          onPress={onRematch}
        >
          <RotateCcw size={18} color="#ffffff" />
          <Text style={styles.rematchBtnText}>
            {rematchRequested ? 'Waiting for opponent...' : 'Play Rematch ❤️'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 1, 8, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 50,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#16081e',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  trophyWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#fbbf24',
    padding: 3,
    marginBottom: 12,
  },
  trophyInner: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    backgroundColor: '#190a22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  playerCard: {
    flex: 1,
    backgroundColor: '#0d0413',
    borderWidth: 1,
    borderColor: '#2b1535',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  playerCardWinner: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  playerRole: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  playerScore: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f43f5e',
    marginVertical: 4,
  },
  statBreakdown: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#2b1535',
    paddingTop: 6,
    gap: 2,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLineLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  statLineVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fda4af',
  },
  rematchBtn: {
    width: '100%',
    backgroundColor: '#f43f5e',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    elevation: 4,
  },
  rematchBtnDisabled: {
    backgroundColor: '#33203e',
  },
  rematchBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
