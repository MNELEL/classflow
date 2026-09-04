import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronRight, ChevronLeft, Clock, BookOpen, Trash2, X, CalendarPlus, CalendarOff, CalendarClock } from 'lucide-react';
import { getDayStatus, dismissalHour } from '@/lib/scheduleRules';
import { toHebrewFull } from '@/lib/hebrewDate';
import HebrewDateNavigator from '@/components/ui/HebrewDateNavigator';
import { useSelectedDate } from '@/lib/dateContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { addWeeks, addDays, startOfWeek, format, isSameDay } from 'date-fns';
import { enqueueWrite, isOnline } from '@/lib/offlineQueue';
import SmartBellTimer from '@/components/schedule/SmartBellTimer';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';

const DAYS = [
  { key: 'sun', label: 'ראשון' },
  { key: 'mon', label: 'שני' },
  { key: 'tue', label: 'שלישי' },
  { key: 'wed', label: 'רביעי' },
  { key: 'thu', label: 'חמישי' },
  { key: 'fri', label: 'שישי' },
];

const HOURS = Array.from({ length: 10 }, (_, i) => {
  const h = 7 + i;
  return { value: h, label: `${String(h).padStart(2, '0')}:00` };
});

const SUBJECT_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800',
  'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800',
  'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
];

function getSubjectColor(subject, subjectMap) {
  if (!subjectMap[subject]) {
    subjectMap[subject] = SUBJECT_COLORS[Object.keys(subjectMap).length % SUBJECT_COLORS.length];
  }
  return subjectMap[subject];
}

function getWeekStart(date) {
  // Week starts Sunday (weekStartsOn: 0)
  return startOfWeek(date, { weekStartsOn: 0 });
}

// ── Add Lesson Dialog ──
function AddLessonDialog({ open, onClose, defaultDay, defaultHour, onSave, libraryItems }) {
  const [form, setForm] = useState({
    day: defaultDay || 'sun',
    hour: defaultHour || 8,
    title: '',
    subject: '',
    duration: 1,
    notes: '',
    library_item_id: '',
  });

  React.useEffect(() => {
    if (open) setForm(f => ({ ...f, day: defaultDay || 'sun', hour: defaultHour || 8 }));
  }, [open, defaultDay, defaultHour]);

  function handleSave() {
    if (!form.title.trim()) { toast.error('חובה להזין כותרת'); return; }
    onSave(form);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> הוספת שיעור
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">יום</label>
              <MobileSelect value={form.day} onValueChange={v => setForm(f => ({ ...f, day: v }))} className="w-full text-sm border border-border rounded-lg h-9 bg-background">
                {DAYS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
              </MobileSelect>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">שעה</label>
              <MobileSelect value={String(form.hour)} onValueChange={v => setForm(f => ({ ...f, hour: Number(v) }))} className="w-full text-sm border border-border rounded-lg h-9 bg-background">
                {HOURS.map(h => <SelectItem key={h.value} value={String(h.value)}>{h.label}</SelectItem>)}
              </MobileSelect>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">כותרת השיעור *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="למשל: פרשת בשלח - פתיחה"
              className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">מקצוע / נושא</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="למשל: תנ״ך, מתמטיקה..."
              className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">משך (שעות)</label>
            <div className="flex gap-2">
              {[1, 2].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, duration: n }))}
                  className={`flex-1 py-1 rounded-lg border text-sm font-medium transition-colors ${form.duration === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                  {n} שע׳
                </button>
              ))}
            </div>
          </div>

          {libraryItems?.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">קישור לפריט ספרייה (אופציונלי)</label>
              <MobileSelect value={form.library_item_id || '_none'} onValueChange={v => setForm(f => ({ ...f, library_item_id: v === '_none' ? '' : v }))} placeholder="— בחר פריט —" className="w-full text-sm border border-border rounded-lg h-9 bg-background">
                <SelectItem value="_none">— בחר פריט —</SelectItem>
                {libraryItems.map(item => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}
              </MobileSelect>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground block mb-1">הערות</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="הערות נוספות..."
              className="w-full text-sm border border-border rounded-lg px-3 py-1.5 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={handleSave}><Plus className="w-4 h-4 ml-1" /> הוסף</Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Lesson Card ──
function LessonCard({ lesson, color, onDelete, libraryItem }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={`relative rounded-xl border px-2.5 py-2 text-xs group ${color}`} style={{ minHeight: 52 }}>
      <div className="font-semibold leading-tight line-clamp-2">{lesson.title}</div>
      {lesson.subject && <div className="opacity-70 mt-0.5 truncate">{lesson.subject}</div>}
      {libraryItem && (
        <div className="mt-1 flex items-center gap-1 opacity-60">
          <BookOpen className="w-3 h-3 shrink-0" />
          <span className="truncate">{libraryItem.title}</span>
        </div>
      )}
      {lesson.notes && <div className="mt-0.5 opacity-60 line-clamp-1">{lesson.notes}</div>}
      {confirm ? (
        <div className="absolute inset-0 rounded-xl bg-destructive/90 flex items-center justify-center gap-2 z-10">
          <button onClick={() => { onDelete(); setConfirm(false); }} className="text-white text-[11px] font-bold px-2 py-1 bg-white/20 rounded-lg">מחק</button>
          <button onClick={() => setConfirm(false)} className="text-white/80 text-[11px]"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 touch-show transition-opacity p-0.5 rounded hover:bg-black/10"
          aria-label="מחק שיעור"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Main Page ──
export default function WeeklySchedulePage() {
  const qc = useQueryClient();
  const handleRefresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ['weekly-plans'] }); }, [qc]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const [addDialog, setAddDialog] = useState({ open: false, day: null, hour: null });
  const [syncing, setSyncing] = useState(false);
  const [mobileDay, setMobileDay] = useState(() => {
    const d = new Date().getDay();
    return d > 5 ? 0 : d; // Sunday–Friday = 0–5; Saturday → Sunday
  });
  useEffect(() => {
    const d = new Date(selectedDate + 'T00:00:00').getDay();
    setMobileDay(d > 5 ? 0 : d);
  }, [selectedDate]);

  const weekStart = useMemo(() => getWeekStart(new Date(selectedDate + 'T00:00:00')), [selectedDate]);
  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 4);
    return `${format(weekStart, 'd/M')} – ${format(end, 'd/M/yyyy')}`;
  }, [weekStart]);

  // Load WeeklyPlan for current week
  const weekKey = format(weekStart, 'yyyy-MM-dd');
  const { data: plans = [] } = useQuery({
    queryKey: ['weekly-plans', weekKey],
    queryFn: () => base44.entities.WeeklyPlan.filter({ week_start: weekKey }),
  });

  // Load library items for linking
  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library-items-light'],
    queryFn: () => base44.entities.LibraryItem.list('-updated_date', 100),
  });

  // Load school calendar rules (no-school days, early dismissal, Rosh Chodesh, etc.)
  const { data: calendarRules = [] } = useQuery({
    queryKey: ['schoolCalendarRules'],
    queryFn: () => base44.entities.SchoolCalendarRule.list(),
  });

  // Per-day status for the displayed week
  const dayStatuses = useMemo(() => {
    return DAYS.map((d, i) => {
      const date = addDays(weekStart, i);
      const status = getDayStatus(calendarRules, date);
      const maxHour = status.earlyDismissal ? (dismissalHour(status.earlyDismissal.dismissal_time) ?? 16) : 16;
      return { ...status, date, hebrew: toHebrewFull(date), maxHour };
    });
  }, [calendarRules, weekStart]);

  // Use first matching plan, or create if needed
  const plan = plans[0] || null;

  const createPlan = useMutation({
    mutationFn: async (data) => {
      // שמירה מקומית עם המצב המלא של השבוע (data.days) — אין צורך בבדיקת קונפליקט
      // מורכבת כי זו החלפה מלאה של המצב הנוכחי, לא diff.
      if (!isOnline()) {
        enqueueWrite('weekly_plan', { mode: 'create', payload: data, week_start: data.week_start });
        return { ...data, id: `queued-${Date.now()}`, __queued: true };
      }
      try {
        return await base44.entities.WeeklyPlan.create(data);
      } catch (err) {
        const looksLikeNetworkError = err?.message?.toLowerCase?.().includes('network')
          || err?.message?.toLowerCase?.().includes('fetch')
          || err?.name === 'TypeError';
        if (looksLikeNetworkError) {
          enqueueWrite('weekly_plan', { mode: 'create', payload: data, week_start: data.week_start });
          return { ...data, id: `queued-${Date.now()}`, __queued: true };
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries(['weekly-plans', weekKey]);
      if (result?.__queued) toast.success('השינוי נשמר מקומי ויסונכן כשהחיבור יחזור');
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, data }) => {
      if (!isOnline()) {
        enqueueWrite('weekly_plan', { mode: 'update', id, payload: data, week_start: weekKey });
        return { id, ...data, __queued: true };
      }
      try {
        return await base44.entities.WeeklyPlan.update(id, data);
      } catch (err) {
        const looksLikeNetworkError = err?.message?.toLowerCase?.().includes('network')
          || err?.message?.toLowerCase?.().includes('fetch')
          || err?.name === 'TypeError';
        if (looksLikeNetworkError) {
          enqueueWrite('weekly_plan', { mode: 'update', id, payload: data, week_start: weekKey });
          return { id, ...data, __queued: true };
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries(['weekly-plans', weekKey]);
      if (result?.__queued) toast.success('השינוי נשמר מקומי ויסונכן כשהחיבור יחזור');
    },
  });

  // Build lesson map: { day -> { hour -> lesson[] } }
  const lessonMap = useMemo(() => {
    const map = {};
    DAYS.forEach(d => { map[d.key] = {}; HOURS.forEach(h => { map[d.key][h.value] = []; }); });
    if (!plan?.days) return map;
    for (const dayBlock of plan.days) {
      if (!map[dayBlock.day_key]) continue;
      for (const item of (dayBlock.items || [])) {
        const h = item.hour || 8;
        if (!map[dayBlock.day_key][h]) map[dayBlock.day_key][h] = [];
        map[dayBlock.day_key][h].push(item);
      }
    }
    return map;
  }, [plan]);

  // Subject → color mapping (stable per render)
  const subjectColorMap = useMemo(() => {
    const map = {};
    if (!plan?.days) return map;
    for (const dayBlock of plan.days) {
      for (const item of (dayBlock.items || [])) {
        if (item.subject) getSubjectColor(item.subject, map);
      }
    }
    return map;
  }, [plan]);

  async function handleSyncCalendar() {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncScheduleToCalendar', { week_start: weekKey });
      const d = res.data || {};
      toast.success(`סונכרן ליומן ✓ נוצרו ${d.created || 0} · עודכנו ${d.updated || 0} · נמחקו ${d.deleted || 0}`);
    } catch (e) {
      toast.error('סנכרון נכשל: ' + (e?.message || ''));
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddLesson(form) {
    const newItem = {
      id: `lesson_${Date.now()}`,
      title: form.title,
      subject: form.subject,
      hour: form.hour,
      duration: form.duration,
      notes: form.notes,
      library_item_id: form.library_item_id || null,
    };

    const days = DAYS.map(d => {
      const existing = plan?.days?.find(b => b.day_key === d.key);
      const items = existing?.items || [];
      return {
        day_key: d.key,
        items: d.key === form.day ? [...items, newItem] : items,
      };
    });

    if (plan) {
      await updatePlan.mutateAsync({ id: plan.id, data: { days } });
    } else {
      await createPlan.mutateAsync({ week_start: weekKey, days });
    }
    toast.success('השיעור נוסף!');
  }

  async function handleDeleteLesson(day, lessonId) {
    const days = (plan?.days || DAYS.map(d => ({ day_key: d.key, items: [] }))).map(b => ({
      ...b,
      items: (b.items || []).filter(i => i.id !== lessonId),
    }));
    await updatePlan.mutateAsync({ id: plan.id, data: { days } });
    toast('השיעור נמחק');
  }

  // ── Drag & Drop: move a lesson between cells (day/hour) ──
  function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination || !plan) return;
    if (source.droppableId === destination.droppableId) return;

    const [srcDay] = source.droppableId.split('-');
    const [destDay, destHourStr] = destination.droppableId.split('-');
    const destHour = Number(destHourStr);

    let moved = null;
    const days = DAYS.map(d => {
      const existing = plan?.days?.find(b => b.day_key === d.key);
      const items = [...(existing?.items || [])];
      if (d.key === srcDay) {
        moved = items.find(i => i.id === draggableId);
        return { day_key: d.key, items: items.filter(i => i.id !== draggableId) };
      }
      return { day_key: d.key, items };
    });

    if (!moved) return;
    const destBlock = days.find(d => d.day_key === destDay);
    if (destBlock) {
      destBlock.items = [...destBlock.items, { ...moved, hour: destHour }];
    }

    updatePlan.mutate({ id: plan.id, data: { days } });
    toast.success('השיעור הועבר');
  }

  const totalLessons = useMemo(() => {
    if (!plan?.days) return 0;
    return plan.days.reduce((s, d) => s + (d.items?.length || 0), 0);
  }, [plan]);

  const subjectList = useMemo(() => Object.keys(subjectColorMap), [subjectColorMap]);

  return (
    <AppLayout>
      <div ref={containerRef} className="min-h-full bg-background" dir="rtl" style={{ touchAction: 'pan-y' }}>
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />

        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 overflow-x-hidden">
          {/* Smart bell timer */}
          <div className="mb-3">
            <SmartBellTimer />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-bold">לוח שבועי</h1>
              <p className="text-xs text-muted-foreground">{weekLabel} · {totalLessons} שיעורים</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="outline" className="h-8 w-8" aria-label="סנכרן ליומן Google" onClick={handleSyncCalendar} disabled={syncing}>
                <CalendarPlus className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
              </Button>
              <Button size="sm" className="gap-1" onClick={() => setAddDialog({ open: true, day: 'sun', hour: 8 })}>
                <Plus className="w-4 h-4" /> הוסף
              </Button>
            </div>
          </div>

          <div className="mt-2">
            <HebrewDateNavigator />
          </div>

          {/* Subject legend */}
          {subjectList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {subjectList.map(sub => (
                <span key={sub} className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${subjectColorMap[sub]}`}>{sub}</span>
              ))}
            </div>
          )}
        </div>

        {/* Mobile single-day view */}
        <div className="md:hidden px-2 pb-6">
          {(() => {
            const day = DAYS[mobileDay];
            const date = addDays(weekStart, mobileDay);
            const isToday = isSameDay(date, new Date());
            const status = dayStatuses[mobileDay] || {};
            return (
              <>
                <div className="flex items-center justify-center mb-2">
                  <div className={`text-center py-1 px-4 rounded-xl text-sm font-bold ${status.noSchool ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {day.label} · {format(date, 'd/M')}
                    <span className={`block text-[10px] font-normal mt-0.5 ${isToday ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{status.hebrew}</span>
                  </div>
                </div>
                {status.noSchool ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-900/10">
                    <CalendarOff className="w-7 h-7 text-rose-500 mb-2" />
                    <div className="text-sm font-bold text-rose-700 dark:text-rose-300">אין לימודים</div>
                    {status.noSchool.name && <div className="text-xs text-muted-foreground mt-1">{status.noSchool.name}</div>}
                    <div className="text-[11px] text-muted-foreground mt-0.5">{status.hebrew}</div>
                  </div>
                ) : (
                  <>
                    {status.earlyDismissal && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-900/15 rounded-lg px-2 py-1 mb-1 flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5" /> סיום מוקדם ב-{status.earlyDismissal.dismissal_time || ''}
                      </div>
                    )}
                    {HOURS.filter(h => h.value <= (status.maxHour || 16)).map(hour => {
                      const lessons = lessonMap[day.key]?.[hour.value] || [];
                      return (
                        <div key={hour.value} className="flex gap-1 mb-1">
                          <div className="w-12 shrink-0 flex items-start justify-center pt-2">
                            <span className="text-[11px] text-muted-foreground font-medium">{hour.label}</span>
                          </div>
                          <div
                            className="flex-1 min-h-[56px] rounded-xl border border-border/50 bg-card/60 p-1 flex flex-col gap-1 cursor-pointer hover:border-primary/30 hover:bg-accent/20 transition-colors"
                            onClick={(e) => {
                              if (e.target.closest('[data-no-cell]')) return;
                              setAddDialog({ open: true, day: day.key, hour: hour.value });
                            }}
                          >
                            {lessons.map(lesson => {
                              const color = getSubjectColor(lesson.subject || '', subjectColorMap);
                              const libItem = lesson.library_item_id ? libraryItems.find(l => l.id === lesson.library_item_id) : null;
                              return (
                                <div key={lesson.id} data-no-cell>
                                  <LessonCard
                                    lesson={lesson}
                                    color={color}
                                    libraryItem={libItem}
                                    onDelete={() => handleDeleteLesson(day.key, lesson.id)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            );
          })()}
        </div>

        {/* Desktop full grid */}
        <DragDropContext onDragEnd={handleDragEnd}>
        <div className="hidden md:block overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="min-w-[720px] max-w-full px-2 pb-6" style={{ zoom: 'var(--timetable-zoom, 1)', transformOrigin: 'top center' }}>

            {/* Day headers */}
            <div className="grid gap-1 mt-3 mb-1" style={{ gridTemplateColumns: '48px repeat(6, 1fr)' }}>
              <div />
              {DAYS.map((d, i) => {
                const date = addDays(weekStart, i);
                const isToday = isSameDay(date, new Date());
                const st = dayStatuses[i] || {};
                return (
                  <div key={d.key} className={`text-center py-2 rounded-xl text-xs font-bold ${st.noSchool ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <div>{d.label}</div>
                    <div className={`text-[11px] font-normal mt-0.5 ${isToday ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>{format(date, 'd/M')}</div>
                    {st.earlyDismissal && !st.noSchool && (
                      <div className="text-[9px] mt-0.5 text-amber-600 dark:text-amber-400 font-normal">סיום {st.earlyDismissal.dismissal_time || ''}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hour rows */}
            {HOURS.map(hour => (
              <div key={hour.value} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '48px repeat(6, 1fr)' }}>
                {/* Hour label */}
                <div className="flex items-start justify-center pt-2">
                  <span className="text-[11px] text-muted-foreground font-medium">{hour.label}</span>
                </div>

                {/* Day cells */}
                {DAYS.map((day, di) => {
                  const st = dayStatuses[di] || {};
                  const lessons = lessonMap[day.key]?.[hour.value] || [];
                  const ended = st.maxHour != null && hour.value > st.maxHour;
                  if (st.noSchool || ended) {
                    return (
                      <div key={day.key} className="min-h-[64px] rounded-xl border border-dashed border-border/40 bg-muted/20 flex items-center justify-center">
                        {st.noSchool && hour.value === HOURS[0].value && (
                          <div className="text-center px-1">
                            <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400">אין לימודים</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">{st.noSchool.name}</div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Droppable key={day.key} droppableId={`${day.key}-${hour.value}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[64px] rounded-xl border p-1 flex flex-col gap-1 group cursor-pointer transition-colors ${
                            snapshot.isDraggingOver
                              ? 'border-primary bg-accent/30'
                              : 'border-border/50 bg-card/60 hover:border-primary/30 hover:bg-accent/20'
                          }`}
                          onClick={(e) => {
                            if (e.target.closest('[data-no-cell]')) return;
                            setAddDialog({ open: true, day: day.key, hour: hour.value });
                          }}
                        >
                          {lessons.map((lesson, index) => {
                            const color = getSubjectColor(lesson.subject || '', subjectColorMap);
                            const libItem = lesson.library_item_id ? libraryItems.find(l => l.id === lesson.library_item_id) : null;
                            return (
                              <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                                {(p, s) => (
                                  <div
                                    ref={p.innerRef}
                                    {...p.draggableProps}
                                    {...p.dragHandleProps}
                                    data-no-cell
                                    className={`cursor-grab active:cursor-grabbing ${s.isDragging ? 'opacity-90 shadow-lg ring-2 ring-primary/40 rounded-xl' : ''}`}
                                  >
                                    <LessonCard
                                      lesson={lesson}
                                      color={color}
                                      libraryItem={libItem}
                                      onDelete={() => handleDeleteLesson(day.key, lesson.id)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          {lessons.length === 0 && (
                            <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        </DragDropContext>

        <AddLessonDialog
          open={addDialog.open}
          defaultDay={addDialog.day}
          defaultHour={addDialog.hour}
          libraryItems={libraryItems}
          onClose={() => setAddDialog({ open: false, day: null, hour: null })}
          onSave={handleAddLesson}
        />
      </div>
    </AppLayout>
  );
}