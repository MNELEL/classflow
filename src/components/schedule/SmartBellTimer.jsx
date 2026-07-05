import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Bell } from 'lucide-react';

const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function SmartBellTimer({ compact = false }) {
  const [now, setNow] = useState(new Date());
  const tickRef = useRef(null);

  // Fetch active bells
  const { data: bells = [] } = useQuery({
    queryKey: ['bells'],
    queryFn: () => base44.entities.BellSchedule.list('time', 50),
  });

  // Live clock — update every second
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Compute next bell + current lesson info
  const info = useMemo(() => {
    const todayDay = now.getDay();
    const nowMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    const todayBells = bells
      .filter(b => b.is_active && b.days?.includes(todayDay))
      .map(b => {
        const [h, m] = (b.time || '').split(':').map(Number);
        return { ...b, bellMins: h * 60 + m };
      })
      .sort((a, b) => a.bellMins - b.bellMins);

    const upcoming = todayBells.filter(b => b.bellMins > nowMins);
    const nextBell = upcoming[0] || null;

    // Current lesson = between previous bell and next bell
    const prevBells = todayBells.filter(b => b.bellMins <= nowMins);
    const prevBell = prevBells[prevBells.length - 1] || null;

    let secsLeft = 0;
    let isLastBell = false;
    if (nextBell) {
      secsLeft = Math.round((nextBell.bellMins - nowMins) * 60);
    } else {
      isLastBell = true;
    }

    return { nextBell, prevBell, secsLeft, isLastBell, todayBells };
  }, [bells, now]);

  const mm = String(Math.floor(info.secsLeft / 60)).padStart(2, '0');
  const ss = String(info.secsLeft % 60).padStart(2, '0');
  const totalSecs = info.nextBell
    ? Math.round((info.nextBell.bellMins - (info.prevBell?.bellMins || 0)) * 60)
    : 0;
  const pct = totalSecs > 0 ? Math.min(100, (1 - info.secsLeft / totalSecs) * 100) : 0;

  if (bells.length === 0) return null;

  // No more bells today
  if (info.isLastBell) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
        <Bell className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">סיום יום — אין צלצולים נוספים היום</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
        <Clock className="w-4 h-4 text-amber-500" />
        <span className="text-xs text-muted-foreground">{info.nextBell?.name}:</span>
        <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400 tabular-nums">{mm}:{ss}</span>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-l from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800"
    >
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#f59e0b" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Bell className="w-4 h-4 text-amber-500" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">הצלצול הבא</p>
        <p className="font-bold text-sm truncate">{info.nextBell?.name} — {info.nextBell?.time}</p>
        {info.prevBell && (
          <p className="text-[10px] text-muted-foreground/70 truncate">שיעור נוכחי: {info.prevBell.label || info.prevBell.name}</p>
        )}
      </div>
      <div className="text-left shrink-0">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={mm + ss}
            initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
            className="font-mono font-black text-2xl text-amber-600 dark:text-amber-400 tabular-nums block"
          >
            {mm}:{ss}
          </motion.span>
        </AnimatePresence>
        <p className="text-[10px] text-muted-foreground">דקות:שניות</p>
      </div>
    </motion.div>
  );
}