import React, { useMemo } from 'react';
import { toHebrewDay } from '@/lib/hebrewDate';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const WEEKDAY = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
function ymd(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export default function HebrewDateNavigator({ selectedDate, onChange, days = 15 }) {
  const base = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const todayStr = ymd(new Date());

  const chips = useMemo(() => {
    const half = Math.floor(days / 2);
    return Array.from({ length: days }, (_, i) => addDays(base, i - half));
  }, [selectedDate, days]);

  return (
    <div className="flex items-center gap-1.5" dir="rtl">
      <button onClick={() => onChange(ymd(addDays(base, -1)))} aria-label="יום קודם"
        className="shrink-0 h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border hover:bg-muted">
        <ChevronRight className="w-4 h-4" />
      </button>
      <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {chips.map(d => {
          const ds = ymd(d);
          const isSel = ds === selectedDate;
          const isToday = ds === todayStr;
          return (
            <button key={ds} onClick={() => onChange(ds)}
              className={cn(
                'shrink-0 w-12 py-1.5 rounded-xl border text-center transition-all min-h-[44px]',
                isSel ? 'bg-primary text-primary-foreground border-primary' :
                isToday ? 'border-primary text-primary' : 'border-border text-foreground hover:bg-muted'
              )}>
              <div className="text-[10px] opacity-80 leading-none mb-0.5">{WEEKDAY[d.getDay()]}</div>
              <div className="text-sm font-bold leading-none" dir="rtl">{toHebrewDay(d)}</div>
            </button>
          );
        })}
      </div>
      <button onClick={() => onChange(ymd(addDays(base, 1)))} aria-label="יום הבא"
        className="shrink-0 h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-border hover:bg-muted">
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
}