import React, { useState } from 'react';
import { Heart, Sparkles, Users, Play, ArrowRight, Copy, Check } from 'lucide-react';

interface LobbyProps {
  onCreateRoom: (name: string, role: 'MALE_USER' | 'SAKHI') => void;
  onJoinRoom: (roomCode: string, name: string, role: 'MALE_USER' | 'SAKHI') => void;
  onStartMatch: () => void;
  roomCode?: string;
  isHost?: boolean;
  playerOne?: any;
  playerTwo?: any;
  loading?: boolean;
  error?: string | null;
}

export const Lobby: React.FC<LobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  onStartMatch,
  roomCode,
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

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If in an active waiting room
  if (roomCode) {
    const isReady = playerOne && playerTwo;

    return (
      <div className="flex-1 w-full flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Catch Hearts Arena
          </div>

          <h2 className="text-2xl font-black text-white">Match Lobby</h2>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Share this code with your partner to join
          </p>

          {/* Room Code Badge */}
          <div className="w-full flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl mb-6">
            <div className="text-left">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Room Code
              </span>
              <span className="text-2xl font-mono font-black tracking-widest text-rose-400">
                {roomCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Participant Slots */}
          <div className="w-full space-y-3 mb-6">
            {/* Player 1 (Male User) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                  {playerOne ? playerOne.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="text-left">
                  <span className="text-xs text-slate-400 font-semibold block">
                    {playerOne?.role === 'MALE_USER' ? 'Male User' : 'Player 1'}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {playerOne?.name || 'Waiting...'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Host / Ready
              </span>
            </div>

            {/* Player 2 (Sakhi) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center font-bold text-white shadow-md">
                  {playerTwo ? playerTwo.name.charAt(0).toUpperCase() : '❤️'}
                </div>
                <div className="text-left">
                  <span className="text-xs text-slate-400 font-semibold block">
                    {playerTwo?.role === 'SAKHI' ? 'Sakhi' : 'Player 2'}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {playerTwo?.name || 'Waiting for Sakhi...'}
                  </span>
                </div>
              </div>
              {playerTwo ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-300/80 animate-pulse">
                  Waiting...
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Name Explanation Card */}
          {isReady && (
            <div className="w-full p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-left mb-6 text-xs text-rose-200 space-y-1">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                How Name Hearts Work:
              </div>
              <p>• When <strong>{playerOne.name}</strong> plays, falling hearts carry <strong>{playerTwo.name}</strong>'s name.</p>
              <p>• When <strong>{playerTwo.name}</strong> plays, falling hearts carry <strong>{playerOne.name}</strong>'s name.</p>
            </div>
          )}

          {/* Action Button */}
          {isReady ? (
            <button
              onClick={onStartMatch}
              className="w-full py-3.5 px-6 rounded-2xl font-black text-white bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transform active:scale-95 transition"
            >
              <Play className="w-5 h-5 fill-white" />
              Start Match Now!
            </button>
          ) : (
            <div className="text-xs text-slate-400 italic flex items-center justify-center gap-1.5 py-2">
              <Users className="w-4 h-4 text-slate-500" />
              Waiting for 2nd participant to join with code {roomCode}...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Initial Welcome / Create / Join Form
  return (
    <div className="flex-1 w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Game Title & Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-rose-600/30 mb-3 animate-bounce">
          <Heart className="w-9 h-9 text-white fill-white" />
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">
          Catch Hearts ❤️
        </h1>
        <p className="text-xs text-rose-300/90 mt-1 max-w-xs font-medium">
          Catch the hearts. Dodge the bombs. Win each other's hearts!
        </p>

        {/* Tab Switcher */}
        <div className="w-full grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 my-5">
          <button
            onClick={() => setTab('create')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              tab === 'create'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`py-2 text-xs font-bold rounded-xl transition ${
              tab === 'join'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Join Room
          </button>
        </div>

        {error && (
          <div className="w-full p-2.5 mb-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Inputs */}
        <div className="w-full space-y-3.5 text-left mb-5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Your Real Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Rohan or Ananya"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 transition"
              maxLength={15}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Your Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('MALE_USER')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  role === 'MALE_USER'
                    ? 'bg-blue-950/60 border-blue-500 text-blue-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Male User
              </button>
              <button
                type="button"
                onClick={() => setRole('SAKHI')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  role === 'SAKHI'
                    ? 'bg-pink-950/60 border-pink-500 text-pink-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Sakhi
              </button>
            </div>
          </div>

          {tab === 'join' && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Room Code
              </label>
              <input
                type="text"
                placeholder="5-letter code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-white font-mono uppercase text-sm tracking-widest focus:outline-none focus:border-rose-500 transition"
                maxLength={6}
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={() => {
            if (!name.trim()) return;
            if (tab === 'create') {
              onCreateRoom(name.trim(), role);
            } else {
              if (!joinCode.trim()) return;
              onJoinRoom(joinCode.trim(), name.trim(), role);
            }
          }}
          disabled={loading || !name.trim() || (tab === 'join' && !joinCode.trim())}
          className="w-full py-3.5 px-6 rounded-2xl font-black text-white bg-gradient-to-r from-rose-600 via-pink-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 transform active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {tab === 'create' ? 'Create Arena Room' : 'Join Match'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
