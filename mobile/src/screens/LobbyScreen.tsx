import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Heart, Sparkles, Users, Play, Copy, Check, ArrowRight } from 'lucide-react-native';
import { Player } from '../types';

interface LobbyScreenProps {
  onCreateRoom: (name: string, role: 'MALE_USER' | 'SAKHI') => void;
  onJoinRoom: (roomCode: string, name: string, role: 'MALE_USER' | 'SAKHI') => void;
  onStartMatch: () => void;
  roomCode?: string;
  isHost?: boolean;
  playerOne?: Player | null;
  playerTwo?: Player | null;
  loading?: boolean;
  error?: string | null;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onCreateRoom,
  onJoinRoom,
  onStartMatch,
  roomCode,
  isHost,
  playerOne,
  playerTwo,
  loading,
  error,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'MALE_USER' | 'SAKHI'>('MALE_USER');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  // If already in a room waiting for players or match start
  if (roomCode) {
    const isReady = playerOne && playerTwo;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Sparkles size={14} color="#f43f5e" />
            <Text style={styles.badgeText}>Catch Hearts Arena</Text>
          </View>

          <Text style={styles.title}>Match Lobby</Text>
          <Text style={styles.subtitle}>Share this room code with your partner</Text>

          {/* Room Code Box */}
          <View style={styles.codeContainer}>
            <View>
              <Text style={styles.codeLabel}>ROOM CODE</Text>
              <Text style={styles.codeText}>{roomCode}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} color="#cbd5e1" />}
              <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          {/* Players List */}
          <View style={styles.playersContainer}>
            {/* Player 1 */}
            <View style={styles.playerRow}>
              <View style={[styles.avatar, { backgroundColor: '#3b82f6' }]}>
                <Text style={styles.avatarText}>
                  {playerOne?.name ? playerOne.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerRole}>
                  {playerOne?.role === 'MALE_USER' ? 'Male User' : 'Player 1'}
                </Text>
                <Text style={styles.playerName}>{playerOne?.name || 'Waiting...'}</Text>
              </View>
              <View style={styles.readyBadge}>
                <Text style={styles.readyText}>Host / Ready</Text>
              </View>
            </View>

            {/* Player 2 */}
            <View style={styles.playerRow}>
              <View style={[styles.avatar, { backgroundColor: '#ec4899' }]}>
                <Text style={styles.avatarText}>
                  {playerTwo?.name ? playerTwo.name.charAt(0).toUpperCase() : '❤️'}
                </Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerRole}>
                  {playerTwo?.role === 'SAKHI' ? 'Sakhi' : 'Player 2'}
                </Text>
                <Text style={styles.playerName}>{playerTwo?.name || 'Waiting for Sakhi...'}</Text>
              </View>
              {playerTwo ? (
                <View style={styles.readyBadge}>
                  <Text style={styles.readyText}>Ready</Text>
                </View>
              ) : (
                <Text style={styles.waitingNotice}>Waiting...</Text>
              )}
            </View>
          </View>

          {/* Dynamic Heart Rule Explanation */}
          {isReady && (
            <View style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <Sparkles size={14} color="#fda4af" />
                <Text style={styles.ruleTitle}>How Name Hearts Work:</Text>
              </View>
              <Text style={styles.ruleBody}>
                • When <Text style={styles.ruleName}>{playerOne.name}</Text> plays, falling hearts carry{' '}
                <Text style={styles.ruleName}>{playerTwo.name}</Text>'s name.
              </Text>
              <Text style={styles.ruleBody}>
                • When <Text style={styles.ruleName}>{playerTwo.name}</Text> plays, falling hearts carry{' '}
                <Text style={styles.ruleName}>{playerOne.name}</Text>'s name.
              </Text>
            </View>
          )}

          {/* Start Action */}
          {isReady ? (
            <TouchableOpacity style={styles.startButton} onPress={onStartMatch}>
              <Play size={18} color="#ffffff" fill="#ffffff" />
              <Text style={styles.startButtonText}>Start Match Now!</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingContainer}>
              <Users size={16} color="#64748b" />
              <Text style={styles.waitingText}>Waiting for 2nd participant to join...</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Initial Welcome / Create or Join Screen
  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <Heart size={32} color="#ffffff" fill="#ffffff" />
        </View>

        <Text style={styles.mainTitle}>Catch Hearts ❤️</Text>
        <Text style={styles.mainSubtitle}>
          Catch the hearts. Dodge the bombs. Win each other's hearts!
        </Text>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'create' && styles.tabButtonActive]}
            onPress={() => setTab('create')}
          >
            <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>
              Create Room
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === 'join' && styles.tabButtonActive]}
            onPress={() => setTab('join')}
          >
            <Text style={[styles.tabText, tab === 'join' && styles.tabTextActive]}>Join Room</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Name input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Your Real Display Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Rohan or Ananya"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
            maxLength={15}
          />
        </View>

        {/* Role Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Your Role</Text>
          <View style={styles.roleGrid}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'MALE_USER' && styles.roleButtonActiveMale]}
              onPress={() => setRole('MALE_USER')}
            >
              <Text style={[styles.roleText, role === 'MALE_USER' && styles.roleTextActiveMale]}>
                Male User
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'SAKHI' && styles.roleButtonActiveSakhi]}
              onPress={() => setRole('SAKHI')}
            >
              <Text style={[styles.roleText, role === 'SAKHI' && styles.roleTextActiveSakhi]}>
                Sakhi
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Room Code if Join */}
        {tab === 'join' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Room Code</Text>
            <TextInput
              style={[styles.textInput, styles.codeInput]}
              placeholder="5-LETTER CODE"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              maxLength={6}
            />
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionButton, (!name.trim() || loading) && styles.actionButtonDisabled]}
          disabled={!name.trim() || loading}
          onPress={() => {
            if (tab === 'create') {
              onCreateRoom(name.trim(), role);
            } else {
              if (!joinCode.trim()) return;
              onJoinRoom(joinCode.trim(), name.trim(), role);
            }
          }}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.actionButtonText}>
                {tab === 'create' ? 'Create Arena Room' : 'Join Match'}
              </Text>
              <ArrowRight size={16} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(25, 10, 34, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 12,
  },
  badgeText: {
    color: '#fda4af',
    fontSize: 12,
    fontWeight: '700',
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#f43f5e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#f43f5e',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 13,
    color: '#fda4af',
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  codeContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0c0512',
    borderWidth: 1,
    borderColor: '#33203e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  codeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f43f5e',
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#271133',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  playersContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 17, 51, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
  },
  playerInfo: {
    flex: 1,
  },
  playerRole: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  readyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  readyText: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '800',
  },
  waitingNotice: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
  },
  ruleCard: {
    width: '100%',
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ruleTitle: {
    color: '#fda4af',
    fontWeight: '800',
    fontSize: 12,
  },
  ruleBody: {
    color: '#fecdd3',
    fontSize: 12,
    lineHeight: 18,
  },
  ruleName: {
    color: '#ffffff',
    fontWeight: '800',
  },
  startButton: {
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
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  waitingText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0e0414',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#f43f5e',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0c0512',
    borderWidth: 1,
    borderColor: '#33203e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  codeInput: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#0c0512',
    borderWidth: 1,
    borderColor: '#33203e',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  roleButtonActiveMale: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderColor: '#3b82f6',
  },
  roleButtonActiveSakhi: {
    backgroundColor: 'rgba(236, 72, 153, 0.25)',
    borderColor: '#ec4899',
  },
  roleText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  roleTextActiveMale: {
    color: '#93c5fd',
    fontWeight: '900',
  },
  roleTextActiveSakhi: {
    color: '#f472b6',
    fontWeight: '900',
  },
  actionButton: {
    width: '100%',
    backgroundColor: '#f43f5e',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    elevation: 4,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
});

