import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_HEIGHTS = ['h-28', 'h-20', 'h-16'];
const PODIUM_BG = [
  'bg-yellow-400 dark:bg-yellow-500',
  'bg-slate-300 dark:bg-slate-500',
  'bg-amber-600 dark:bg-amber-700',
];

export default function Leaderboard({ students, pointsMap, kioskMode = false }) {
  const sorted = [...students]
    .map(s => ({ ...s, total: pointsMap[s.id] || 0 }))
    .sort((a, b) => b.total - a.total);

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3, kioskMode ? 3 : 10);

  return (
    <div className={kioskMode ? 'p-8' : ''}>
      {/* Podium */}
      <div className="flex items-end justify-center gap-3 mb-8 mt-4">
        {[top3[1], top3[0], top3[2]].map((s, idx) => {
          const rank = idx === 0 ? 1 : idx === 1 ? 0 : 2;
          if (!s) return <div key={idx} className="w-20" />;
          return (
            <motion.div key={s.id} initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: rank * 0.15, type: 'spring', damping: 14 }}
              style={{ transformOrigin: 'bottom' }}
              className="flex flex-col items-center">
              <div className="mb-2 text-center">
                <p className="text-2xl">{MEDALS[rank]}</p>
                <p className={`font-bold ${kioskMode ? 'text-lg' : 'text-sm'}`}>{s.name}</p>
                <p className={`text-primary font-black ${kioskMode ? 'text-2xl' : 'text-base'}`}>{s.total}</p>
                <p className="text-xs text-muted-foreground">נק'</p>
              </div>
              <div className={`w-20 ${PODIUM_HEIGHTS[rank]} ${PODIUM_BG[rank]} rounded-t-xl flex items-end justify-center pb-2`}>
                <span className={`font-black text-white ${kioskMode ? 'text-2xl' : 'text-lg'}`}>{rank + 1}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Rest */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-4 py-2.5">
              <span className="w-6 text-center font-bold text-muted-foreground text-sm">{i + 4}</span>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary">
                {s.name[0]}
              </div>
              <span className="flex-1 font-medium text-sm">{s.name}</span>
              <span className="font-black text-primary">{s.total}</span>
            </motion.div>
          ))}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">אין נקודות עדיין</p>
        </div>
      )}
    </div>
  );
}