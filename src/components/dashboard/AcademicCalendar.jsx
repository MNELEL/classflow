import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChevronRight, ChevronLeft, BookOpen, ClipboardList } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, addMonths, subMonths, isToday } from 'date-fns';
import { he } from 'date-fns/locale';

const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// Hebrew month names
const HEB_MONTHS = [
  'תשרי','חשון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיון','תמוז','אב','אלול',
  'אדר א׳','אדר ב׳'
];

// Hebrew letter digits
const HEB_UNITS = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
const HEB_TENS  = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
const HEB_HUNDS = ['','ק','ר','ש','ת'];

function numToHeb(n) {
  if (n <= 0 || n > 30) return String(n);
  // 15 & 16 special cases (avoid divine name)
  if (n === 15) return 'ט״ו';
  if (n === 16) return 'ט״ז';
  let s = '';
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  s += HEB_HUNDS[h] || '';
  s += HEB_TENS[t] || '';
  s += HEB_UNITS[u] || '';
  if (s.length === 1) return s + '׳';
  return s.slice(0, -1) + '״' + s.slice(-1);
}

// Meeus/Jones/Butcher algorithm for Hebrew date conversion
function toHebrewDate(jsDate) {
  // Use Intl API if available (best method)
  try {
    const hd = new Intl.DateTimeFormat('he-u-ca-hebrew', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(jsDate);
    // Extract the day number from the formatted Hebrew string
    const dayMatch = hd.match(/(\d+)/);
    const dayNum = dayMatch ? parseInt(dayMatch[1]) : jsDate.getDate();
    return { dayStr: numToHeb(dayNum), fullHebrew: hd };
  } catch {
    return { dayStr: String(jsDate.getDate()), fullHebrew: '' };
  }
}

export default function AcademicCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showHebrew, setShowHebrew] = useState(true);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-due_date', 200),
  });
  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: () => base44.entities.Grade.list('-date', 200),
  });
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const studentMap = useMemo(() => {
    const m = {};
    students.forEach(s => { m[s.id] = s.name; });
    return m;
  }, [students]);

  const eventsByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.due_date) return;
      const key = t.due_date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push({ type: 'task', label: t.title, subject: t.subject, id: t.id, studentName: studentMap[t.student_id] });
    });
    grades.forEach(g => {
      if (!g.date) return;
      const key = g.date.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push({ type: 'exam', label: g.test_name || 'מבחן', subject: g.subject, id: g.id, score: g.score, studentName: studentMap[g.student_id] });
    });
    return map;
  }, [tasks, grades, studentMap]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfWeek = getDay(startOfMonth(currentMonth));

  const selectedEvents = selectedDay ? (eventsByDate[format(selectedDay, 'yyyy-MM-dd')] || []) : [];

  // Hebrew month/year label for header
  const hebMonthLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('he-u-ca-hebrew', { month: 'long', year: 'numeric' }).format(currentMonth);
    } catch {
      return format(currentMonth, 'MMMM yyyy', { locale: he });
    }
  }, [currentMonth]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" /> לוח שנה לימודי
          </div>
          <button
            onClick={() => setShowHebrew(v => !v)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${showHebrew ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground'}`}
          >
            {showHebrew ? '🔤 עברי' : '🔢 לועזי'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1 rounded-lg hover:bg-accent transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="text-center">
            {showHebrew ? (
              <span className="text-sm font-semibold">{hebMonthLabel}</span>
            ) : (
              <span className="text-sm font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: he })}</span>
            )}
          </div>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1 rounded-lg hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {daysInMonth.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[key] || [];
            const hasTask = dayEvents.some(e => e.type === 'task');
            const hasExam = dayEvents.some(e => e.type === 'exam');
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);
            const { dayStr } = toHebrewDate(day);

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative flex flex-col items-center justify-start pt-1 pb-1 min-h-[38px] rounded-lg text-xs transition-colors
                  ${isSelected ? 'bg-primary text-primary-foreground' : today ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-accent'}
                  ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}
                `}
              >
                {showHebrew ? (
                  <span className="font-medium text-[10px] leading-tight">{dayStr}</span>
                ) : (
                  <span className="font-medium">{format(day, 'd')}</span>
                )}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasTask && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                    {hasExam && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-500'}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> משימות</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> מבחנים</span>
        </div>

        {/* Selected day events */}
        {selectedDay && (
          <div className="mt-3 border-t border-border pt-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {showHebrew
                ? toHebrewDate(selectedDay).fullHebrew
                : format(selectedDay, 'd MMMM yyyy', { locale: he })
              } — {selectedEvents.length > 0 ? `${selectedEvents.length} אירועים` : 'אין אירועים'}
            </p>
            {selectedEvents.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">אין משימות או מבחנים ביום זה</p>
            )}
            {selectedEvents.map((ev, i) => (
              <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${ev.type === 'task' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                {ev.type === 'task'
                  ? <ClipboardList className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  : <BookOpen className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{ev.label}</span>
                  <span className="text-muted-foreground">{ev.subject}{ev.studentName ? ` · ${ev.studentName}` : ''}</span>
                </div>
                {ev.type === 'exam' && ev.score !== undefined && (
                  <Badge variant="outline" className="text-[10px] shrink-0">{ev.score}</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}