import React from 'react';
import { Heart, Flame, ShieldAlert, Clock, Sparkles } from 'lucide-react';

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
    <div className="w-full px-3 py-2 bg-slate-900/80 backdrop-blur-md border-b border-rose-500/30 flex flex-col gap-1 z-20">
      {/* Top Banner: Turn info and dynamic name hint */}
      <div className="flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-1.5 text-rose-300">
          <span className="px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-[10px] uppercase tracking-wider">
            Turn {turnNumber} / 2
          </span>
          <span className="text-white font-semibold">{activePlayerName}</span>
          <span className="text-slate-400">is playing</span>
        </div>

        {/* Dynamic Name Explanation pill */}
        <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Hearts show: <strong className="text-white underline">{opponentName}</strong></span>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="flex items-center justify-between mt-1">
        {/* Score & Combo */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Score</span>
            <span className="text-2xl font-black text-rose-400 tracking-tight leading-none">
              {score}
            </span>
          </div>

          {combo >= 3 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 animate-pulse">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              <span className="text-xs font-extrabold">{combo}x Streak!</span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/90 border border-slate-700">
          <Clock className={`w-4 h-4 ${timeLeft <= 10 ? 'text-rose-500 animate-spin' : 'text-slate-300'}`} />
          <span className={`text-xl font-mono font-bold ${timeLeft <= 10 ? 'text-rose-400' : 'text-white'}`}>
            {Math.ceil(timeLeft)}s
          </span>
        </div>

        {/* Lives Indicator */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Lives</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((heartIndex) => (
              <Heart
                key={heartIndex}
                className={`w-5 h-5 transition-all duration-300 ${
                  heartIndex <= lives
                    ? 'text-rose-500 fill-rose-500 filter drop-shadow-[0_0_6px_rgba(244,63,94,0.8)] scale-100'
                    : 'text-slate-700 fill-slate-800 scale-90 opacity-40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Role Notice: Active player vs Observer */}
      <div className="text-center text-[11px] py-0.5">
        {isActiveTurn ? (
          <span className="text-emerald-400 font-medium">
            🎯 Drag or touch to move your basket & catch hearts! Dodge bombs!
          </span>
        ) : (
          <span className="text-sky-300 font-medium flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            Observing live — {activePlayerName}'s turn to catch {opponentName}'s hearts!
          </span>
        )}
      </div>
    </div>
  );
};

