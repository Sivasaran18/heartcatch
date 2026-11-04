import React from 'react';
import { Heart, Trophy, RotateCcw } from 'lucide-react';
import type { MatchSummary, Player } from '../types';

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
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-2xl shadow-rose-950/50 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Trophy / Result Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-1 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
            {summary.isTie ? (
              <Heart className="w-10 h-10 text-rose-400 fill-rose-400" />
            ) : (
              <Trophy className="w-10 h-10 text-amber-400 fill-amber-400" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black text-white tracking-tight">
          {summary.isTie ? "It's a Heart Tie! ❤️" : `${summary.winnerName} Wins! 👑`}
        </h2>
        <p className="text-sm text-slate-300 mt-1 mb-6">
          {summary.isTie
            ? 'Both lovers matched each other heart for heart!'
            : isWinner
            ? 'Congratulations! You conquered the arena with the highest love score!'
            : 'A wonderful performance! Both hearts beat as one!'}
        </p>

        {/* Score Comparison Cards */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6">
          {/* Player 1 Card */}
          <div className={`p-4 rounded-2xl border ${summary.winnerId === summary.playerOneStats.id ? 'bg-amber-950/30 border-amber-500/60' : 'bg-slate-900/60 border-slate-800'}`}>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              {summary.playerOneStats.role === 'MALE_USER' ? 'Male User' : 'Sakhi'}
            </span>
            <h4 className="text-base font-bold text-white truncate mt-0.5">
              {summary.playerOneStats.name}
            </h4>
            <div className="text-3xl font-black text-rose-400 my-1">
              {summary.playerOneScore}
            </div>
            <div className="text-[11px] text-slate-400 space-y-0.5 text-left pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span>Hearts:</span>
                <span className="text-rose-300 font-bold">{summary.playerOneStats.heartsCaught}</span>
              </div>
              <div className="flex justify-between">
                <span>Golden:</span>
                <span className="text-amber-300 font-bold">{summary.playerOneStats.goldCaught}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Streak:</span>
                <span className="text-orange-300 font-bold">{summary.playerOneStats.maxCombo}x</span>
              </div>
            </div>
          </div>

          {/* Player 2 Card */}
          <div className={`p-4 rounded-2xl border ${summary.winnerId === summary.playerTwoStats.id ? 'bg-amber-950/30 border-amber-500/60' : 'bg-slate-900/60 border-slate-800'}`}>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              {summary.playerTwoStats.role === 'SAKHI' ? 'Sakhi' : 'Male User'}
            </span>
            <h4 className="text-base font-bold text-white truncate mt-0.5">
              {summary.playerTwoStats.name}
            </h4>
            <div className="text-3xl font-black text-rose-400 my-1">
              {summary.playerTwoScore}
            </div>
            <div className="text-[11px] text-slate-400 space-y-0.5 text-left pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span>Hearts:</span>
                <span className="text-rose-300 font-bold">{summary.playerTwoStats.heartsCaught}</span>
              </div>
              <div className="flex justify-between">
                <span>Golden:</span>
                <span className="text-amber-300 font-bold">{summary.playerTwoStats.goldCaught}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Streak:</span>
                <span className="text-orange-300 font-bold">{summary.playerTwoStats.maxCombo}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rematch Button */}
        <button
          onClick={onRematch}
          disabled={rematchRequested}
          className={`w-full py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg ${
            rematchRequested
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-600/30'
          }`}
        >
          <RotateCcw className="w-5 h-5" />
          {rematchRequested ? 'Waiting for opponent to accept rematch...' : 'Play Rematch ❤️'}
        </button>
      </div>
    </div>
  );
};
