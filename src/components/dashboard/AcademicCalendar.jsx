import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ChevronRight, ChevronLeft, BookOpen, ClipboardList, Scroll, GraduationCap } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const DAY_NAMES = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// Hebrew letter digits
const HEB_UNITS = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
const HEB_TENS  = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
const HEB_HUNDS = ['','ק','ר','ש','ת'];

function numToHeb(n) {
  if (n <= 0 || n > 30) return String(n);
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

function toHebrewDate(jsDate) {
  try {
    const hd = new Intl.DateTimeFormat('he-u-ca-hebrew', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(jsDate);
    const dayMatch = hd.match(/(\d+)/);
    const dayNum = dayMatch ? parseInt(dayMatch[1]) : jsDate.getDate();
    return { dayStr: numToHeb(dayNum), fullHebrew: hd };
  } catch {
    return { dayStr: String(jsDate.getDate()), fullHebrew: '' };
  }
}

function getHebMonthYear(jsDate) {
  try {
    return new Intl.DateTimeFormat('he-u-ca-hebrew', { month: 'long', year: 'numeric' }).format(jsDate);
  } catch {
    return format(jsDate, 'MMMM yyyy', { locale: he });
  }
}

const STORAGE_KEY_TRACKERS = 'classmanager_study_trackers';

function loadBKProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_BK) || '[]'); } catch { return []; }
}
function loadTrackers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_TRACKERS) || 'null'); } catch { return null; }
}

export default function AcademicCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'bk' | 'trackers'

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
  const { data: weeklyPlans = [] } = useQuery({
    queryKey: ['weeklyPlans'],
    queryFn: () => base44.entities.WeeklyPlan.list('-week_start', 20),
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
    // Weekly plans — mark their week_start day
    weeklyPlans.forEach(wp => {
      if (!wp.week_start) return;
      const key = wp.week_start.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push({ type: 'plan', label: wp.title || 'תכנון שבועי', id: wp.id });
    });
    return map;
  }, [tasks, grades, students, weeklyPlans, studentMap]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfWeek = getDay(startOfMonth(currentMonth));
  const selectedEvents = selectedDay ? (eventsByDate[format(selectedDay, 'yyyy-MM-dd')] || []) : [];
  const hebMonthLabel = getHebMonthYear(currentMonth);

  // BK tracker data
  const [bkCompleted] = useState(loadBKProgress);
  const BK_TOTAL = 119;
  const bkPercent = Math.round((bkCompleted.length / BK_TOTAL) * 100);

  // All trackers summary
  const trackers = useMemo(() => loadTrackers() || [], []);

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader className="pb-0 pt-4 px-4">
        <CardTitle className="text-sm flex items-center justify-between gap-1.5 mb-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            <span>לוח שנה לימודי עברי</span>
          </div>
          <span className="text-[11px] font-normal text-muted-foreground">{hebMonthLabel}</span>
        </CardTitle>
        {/* Tabs */}
        <div role="tablist" className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
          {[
            { id: 'calendar', label: '📅 לוח שנה' },
            { id: 'bk', label: '📖 בבא קמא' },
            { id: 'trackers', label: '📊 הספקים' },
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-[11px] font-medium py-1 rounded-md transition-colors ${
                activeTab === tab.id ? 'bg-white dark:bg-card shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-4 pt-3">
        {/* ── CALENDAR TAB ── */}
        {activeTab === 'calendar' && (
          <>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1 rounded-lg hover:bg-accent transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold">{hebMonthLabel}</span>
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
                const hasPlan = dayEvents.some(e => e.type === 'plan');
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const today = isToday(day);
                const { dayStr } = toHebrewDate(day);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`relative flex flex-col items-center justify-start pt-1 pb-1 min-h-[40px] rounded-lg text-xs transition-colors
                      ${isSelected ? 'bg-primary text-primary-foreground' : today ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-accent'}
                      ${!isSameMonth(day, currentMonth) ? 'opacity-30' : ''}
                    `}
                  >
                    <span className="font-semibold text-[11px] leading-tight">{dayStr}</span>
                    <span className={`text-[8px] leading-none mb-0.5 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{format(day, 'd')}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasTask && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                        {hasExam && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-500'}`} />}
                        {hasPlan && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> משימות</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> מבחנים</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> תכנון שבועי</span>
            </div>

            {/* Selected day events */}
            {selectedDay && (
              <div className="mt-3 border-t border-border pt-3 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {toHebrewDate(selectedDay).fullHebrew} ({format(selectedDay, 'd/M/yyyy')}) — {selectedEvents.length > 0 ? `${selectedEvents.length} אירועים` : 'אין אירועים'}
                </p>
                {selectedEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">אין משימות, מבחנים או תכנונים ביום זה</p>
                )}
                {selectedEvents.map((ev, i) => (
                  <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                    ev.type === 'task' ? 'bg-blue-50 dark:bg-blue-900/20' :
                    ev.type === 'exam' ? 'bg-orange-50 dark:bg-orange-900/20' :
                    'bg-emerald-50 dark:bg-emerald-900/20'
                  }`}>
                    {ev.type === 'task' ? <ClipboardList className="w-3.5 h-3.5 text-blue-500 shrink-0" /> :
                     ev.type === 'exam' ? <BookOpen className="w-3.5 h-3.5 text-orange-500 shrink-0" /> :
                     <Scroll className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{ev.label}</span>
                      {ev.subject && <span className="text-muted-foreground">{ev.subject}{ev.studentName ? ` · ${ev.studentName}` : ''}</span>}
                    </div>
                    {ev.type === 'exam' && ev.score !== undefined && (
                      <Badge variant="outline" className="text-[10px] shrink-0">{ev.score}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── BAVA KAMMA TAB ── */}
        {activeTab === 'bk' && <BavaKammaCalendarView />}

        {/* ── TRACKERS TAB ── */}
        {activeTab === 'trackers' && <TrackersOverview trackers={trackers} />}
      </CardContent>
    </Card>
  );
}

// ── Embedded Bava Kamma view ──────────────────────────────────────────────────
const BK_TOTAL = 119;
const DAF_LETTERS = [
  'ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ',
  'כא','כב','כג','כד','כה','כו','כז','כח','כט','ל','לא','לב','לג','לד','לה','לו','לז','לח','לט','מ',
  'מא','מב','מג','מד','מה','מו','מז','מח','מט','נ','נא','נב','נג','נד','נה','נו','נז','נח','נט','ס',
  'סא','סב','סג','סד','סה','סו','סז','סח','סט','ע','עא','עב','עג','עד','עה','עו','עז','עח','עט','פ',
  'פא','פב','פג','פד','פה','פו','פז','פח','פט','צ','צא','צב','צג','צד','צה','צו','צז','צח','צט','ק',
  'קא','קב','קג','קד','קה','קו','קז','קח','קט','קי','קיא','קיב','קיג','קיד','קטו','קטז','קיז','קיח','קיט'
];
const BK_CHAPTERS = [
  { name: 'ארבעה אבות', dafim: DAF_LETTERS.slice(0, 11) },
  { name: 'כיצד הרגל', dafim: DAF_LETTERS.slice(11, 19) },
  { name: 'המניח', dafim: DAF_LETTERS.slice(19, 26) },
  { name: 'שור שנגח', dafim: DAF_LETTERS.slice(26, 37) },
  { name: 'שנגח את הפרה', dafim: DAF_LETTERS.slice(37, 44) },
  { name: 'מרובה', dafim: DAF_LETTERS.slice(44, 66) },
  { name: 'הכונס', dafim: DAF_LETTERS.slice(66, 80) },
  { name: 'שנגח חמור', dafim: DAF_LETTERS.slice(80, 93) },
  { name: 'הגוזל עצים', dafim: DAF_LETTERS.slice(93, 107) },
  { name: 'הגוזל בתרא', dafim: DAF_LETTERS.slice(107) },
];

function BavaKammaCalendarView() {
  const [completed, setCompleted] = useState(loadBKProgress);
  const [expandedChapter, setExpandedChapter] = useState(null);

  function toggleDaf(daf) {
    setCompleted(prev => {
      const next = prev.includes(daf) ? prev.filter(d => d !== daf) : [...prev, daf];
      localStorage.setItem(STORAGE_KEY_BK, JSON.stringify(next));
      return next;
    });
  }

  const count = completed.length;
  const percent = Math.round((count / BK_TOTAL) * 100);

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-lg">📖</div>
        <div className="flex-1">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300">בבא קמא — מעקב הספקים</p>
          <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70">{count} מתוך {BK_TOTAL} דפים הוספקו</p>
        </div>
        <div className="text-2xl font-black text-amber-600">{percent}%</div>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-muted rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Chapters */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar">
        {BK_CHAPTERS.map((ch, ci) => {
          const done = ch.dafim.filter(d => completed.includes(d)).length;
          const chPct = Math.round((done / ch.dafim.length) * 100);
          const isOpen = expandedChapter === ci;
          return (
            <div key={ch.name} className="border border-border/50 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedChapter(isOpen ? null : ci)}
              >
                <div className="flex-1 text-right">
                  <p className="text-[11px] font-semibold">{ch.name}</p>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="h-1 rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${chPct}%` }} />
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 shrink-0">{done}/{ch.dafim.length}</span>
              </button>
              {isOpen && (
                <div className="px-3 pb-2.5 flex flex-wrap gap-1 border-t border-border/30 pt-2">
                  {ch.dafim.map(daf => {
                    const isDone = completed.includes(daf);
                    return (
                      <button
                        key={daf}
                        onClick={() => toggleDaf(daf)}
                        className={`min-w-[28px] h-6 px-1 rounded text-[10px] font-semibold border transition-all ${
                          isDone ? 'bg-amber-500 border-amber-500 text-white shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-amber-400 hover:text-amber-700'
                        }`}
                      >
                        {daf}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-1 border-t border-border/40">
        <span className="text-[10px] text-muted-foreground">סה"כ {BK_TOTAL} דפים</span>
        <button
          onClick={() => { setCompleted([]); localStorage.setItem(STORAGE_KEY_BK, '[]'); }}
          className="text-[10px] text-destructive hover:underline"
        >
          איפוס
        </button>
      </div>
    </div>
  );
}

// ── Trackers overview ─────────────────────────────────────────────────────────
const TRACKER_STORAGE = 'classmanager_study_trackers';

function TrackersOverview({ trackers: initialTrackers }) {
  const [trackers, setTrackers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TRACKER_STORAGE) || 'null'); } catch { return null; }
  });
  const list = trackers || initialTrackers || [];

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">מצב כל מעקבי ההתקדמות</p>
      {list.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          אין מעקבים. הוסף מעקב חדש ב"מעקב התקדמות לימוד"
        </p>
      )}
      {list.map(tracker => {
        const done = tracker.completed?.length || 0;
        const total = tracker.items?.length || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const colors = {
          amber: { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' },
          blue: { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' },
          green: { bar: 'bg-green-500', badge: 'bg-green-100 text-green-800' },
          purple: { bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800' },
          rose: { bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-800' },
          teal: { bar: 'bg-teal-500', badge: 'bg-teal-100 text-teal-800' },
        };
        const col = colors[tracker.color] || colors.blue;
        return (
          <div key={tracker.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${col.bar}`} />
                <span className="text-xs font-semibold">{tracker.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${col.badge}`}>{done}/{total}</span>
                <span className="text-[11px] font-bold">{pct}%</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className={`h-2 rounded-full ${col.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
            {pct === 100 && (
              <p className="text-[10px] text-emerald-600 font-semibold">✅ הושלם!</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const STORAGE_KEY_BK = 'classmanager_bk_tracker';