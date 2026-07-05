import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, ChevronLeft, Grid3X3, List } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, addWeeks, subWeeks, addMonths, subMonths, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { toHebrewDay, toHebrewMonthYear } from '@/lib/hebrewDate';

const TYPE_COLORS = {
  homework: 'bg-blue-500',
  exam: 'bg-red-500',
  project: 'bg-purple-500',
  quiz: 'bg-amber-500',
};
const TYPE_LABELS = { homework: 'שב"ד', exam: 'מבחן', project: 'פרויקט', quiz: 'חידון' };

export default function AcademicCalendar() {
  const [view, setView] = useState('week');
  const [current, setCurrent] = useState(new Date());
  const [showHebrew, setShowHebrew] = useState(true);

  const { data: assignments = [] } = useQuery({
    queryKey: ['homework'],
    queryFn: () => base44.entities.HomeworkAssignment.list('-due_date', 50),
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: () => base44.entities.Grade.list('-date', 50),
  });

  const days = view === 'week'
    ? eachDayOfInterval({ start: startOfWeek(current, { weekStartsOn: 0 }), end: endOfWeek(current, { weekStartsOn: 0 }) })
    : eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });

  function getEventsForDay(day) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const hw = assignments.filter(a => a.due_date === dateStr);
    // Exams from grades (unique test_name+date)
    const exams = grades.filter(g => g.date === dateStr && g.period === 'exam');
    const uniqueExams = [...new Map(exams.map(e => [`${e.test_name}${e.date}`, e])).values()];
    return [...hw.map(a => ({ ...a, _kind: 'homework' })), ...uniqueExams.map(e => ({ ...e, _kind: 'exam', title: e.test_name || e.subject, type: 'exam' }))];
  }

  const prev = () => view === 'week' ? setCurrent(subWeeks(current, 1)) : setCurrent(subMonths(current, 1));
  const next = () => view === 'week' ? setCurrent(addWeeks(current, 1)) : setCurrent(addMonths(current, 1));

  const today = new Date();
  const periodLabel = view === 'week'
    ? `${format(days[0], 'd MMM', { locale: he })} – ${format(days[days.length - 1], 'd MMM yyyy', { locale: he })}${showHebrew ? ` · ${toHebrewMonthYear(days[0])}` : ''}`
    : `${format(current, 'MMMM yyyy', { locale: he })}${showHebrew ? ` · ${toHebrewMonthYear(current)}` : ''}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-sm">לוח שנה לימודי</h2>
            <p className="text-[11px] text-muted-foreground">{periodLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={prev}><ChevronRight className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCurrent(new Date())} title="היום">
            <span className="text-[11px] font-bold">{format(today, 'd')}</span>
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={next}><ChevronLeft className="w-4 h-4" /></Button>
          <Button size="sm" variant={view === 'week' ? 'default' : 'ghost'} className="h-8 px-2 text-xs" onClick={() => setView('week')}>
            <List className="w-3 h-3" />
          </Button>
          <Button size="sm" variant={view === 'month' ? 'default' : 'ghost'} className="h-8 px-2 text-xs" onClick={() => setView('month')}>
            <Grid3X3 className="w-3 h-3" />
          </Button>
          <Button size="sm" variant={showHebrew ? 'default' : 'ghost'} className="h-8 px-2 text-xs" onClick={() => setShowHebrew(!showHebrew)} title="תאריך עברי">
            <span className="text-[11px] font-bold">עב</span>
          </Button>
        </div>
      </div>

      {/* Week view */}
      {view === 'week' && (
        <div className="grid grid-cols-7 gap-1">
          {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}'</div>
          ))}
          {days.map(day => {
            const events = getEventsForDay(day);
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className={`rounded-xl border min-h-[80px] p-1.5 ${isToday ? 'border-primary bg-primary/5' : 'border-border/40 bg-card'}`}>
                <div className="text-center mb-1">
                   <p className={`text-[11px] font-bold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                     {format(day, 'd')}
                   </p>
                   {showHebrew && (
                     <p className="text-[8px] text-muted-foreground/70 leading-none">{toHebrewDay(day)}</p>
                   )}
                 </div>
                <div className="space-y-0.5">
                  {events.map((ev, i) => (
                    <div key={i} className={`${TYPE_COLORS[ev.type] || 'bg-gray-400'} rounded px-1 py-0.5`}>
                      <p className="text-[9px] text-white font-semibold truncate">{TYPE_LABELS[ev.type] || ''} {ev.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month view */}
      {view === 'month' && (
        <div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}'</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {/* Empty cells before month start */}
            {Array.from({ length: startOfMonth(current).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map(day => {
              const events = getEventsForDay(day);
              const isToday = isSameDay(day, today);
              return (
                <div key={day.toISOString()} className={`rounded-lg border p-1 min-h-[44px] ${isToday ? 'border-primary bg-primary/5' : 'border-border/30 bg-card'}`}>
                  <p className={`text-[10px] font-bold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{format(day, 'd')}</p>
                  {showHebrew && <p className="text-[7px] text-muted-foreground/60 leading-none">{toHebrewDay(day)}</p>}
                  {events.slice(0, 2).map((ev, i) => (
                    <div key={i} className={`${TYPE_COLORS[ev.type] || 'bg-gray-400'} rounded w-full h-1.5 mt-0.5`} title={ev.title} />
                  ))}
                  {events.length > 2 && <p className="text-[8px] text-muted-foreground">+{events.length - 2}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${TYPE_COLORS[k]}`} />
            <span className="text-[10px] text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}