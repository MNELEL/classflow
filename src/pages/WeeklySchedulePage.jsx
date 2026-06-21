import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronRight, ChevronLeft, Clock, BookOpen, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const DAYS = [
  { key: 'sun', label: 'ראשון' },
  { key: 'mon', label: 'שני' },
  { key: 'tue', label: 'שלישי' },
  { key: 'wed', label: 'רביעי' },
  { key: 'thu', label: 'חמישי' },
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
  const d = moment(date);
  // Week starts Sunday
  const day = d.day();
  return d.subtract(day, 'days').startOf('day');
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
              <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background">
                {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">שעה</label>
              <select value={form.hour} onChange={e => setForm(f => ({ ...f, hour: Number(e.target.value) }))}
                className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background">
                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
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
              <select value={form.library_item_id} onChange={e => setForm(f => ({ ...f, library_item_id: e.target.value }))}
                className="w-full text-sm border border-border rounded-lg px-2 py-1.5 bg-background">
                <option value="">— בחר פריט —</option>
                {libraryItems.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
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
          className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10"
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [addDialog, setAddDialog] = useState({ open: false, day: null, hour: null });

  const weekStart = useMemo(() => getWeekStart(moment().add(weekOffset, 'weeks')), [weekOffset]);
  const weekLabel = useMemo(() => {
    const end = weekStart.clone().add(4, 'days');
    return `${weekStart.format('D/M')} – ${end.format('D/M/YYYY')}`;
  }, [weekStart]);

  // Load WeeklyPlan for current week
  const weekKey = weekStart.format('YYYY-MM-DD');
  const { data: plans = [] } = useQuery({
    queryKey: ['weekly-plans', weekKey],
    queryFn: () => base44.entities.WeeklyPlan.filter({ week_start: weekKey }),
  });

  // Load library items for linking
  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library-items-light'],
    queryFn: () => base44.entities.LibraryItem.list('-updated_date', 100),
  });

  // Use first matching plan, or create if needed
  const plan = plans[0] || null;

  const createPlan = useMutation({
    mutationFn: (data) => base44.entities.WeeklyPlan.create(data),
    onSuccess: () => qc.invalidateQueries(['weekly-plans', weekKey]),
  });

  const updatePlan = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WeeklyPlan.update(id, data),
    onSuccess: () => qc.invalidateQueries(['weekly-plans', weekKey]),
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

  const totalLessons = useMemo(() => {
    if (!plan?.days) return 0;
    return plan.days.reduce((s, d) => s + (d.items?.length || 0), 0);
  }, [plan]);

  const subjectList = useMemo(() => Object.keys(subjectColorMap), [subjectColorMap]);

  return (
    <AppLayout>
      <div className="min-h-full bg-background" dir="rtl">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-bold">לוח שבועי</h1>
              <p className="text-xs text-muted-foreground">{weekLabel} · {totalLessons} שיעורים</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setWeekOffset(v => v - 1)}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setWeekOffset(0)}
                className="h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors">
                השבוע
              </button>
              <button onClick={() => setWeekOffset(v => v + 1)}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Button size="sm" className="gap-1 mr-1" onClick={() => setAddDialog({ open: true, day: 'sun', hour: 8 })}>
                <Plus className="w-4 h-4" /> הוסף
              </Button>
            </div>
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

        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px] px-2 pb-6">

            {/* Day headers */}
            <div className="grid gap-1 mt-3 mb-1" style={{ gridTemplateColumns: '48px repeat(5, 1fr)' }}>
              <div />
              {DAYS.map((d, i) => {
                const date = weekStart.clone().add(i, 'days');
                const isToday = date.isSame(moment(), 'day');
                return (
                  <div key={d.key} className={`text-center py-2 rounded-xl text-xs font-bold ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <div>{d.label}</div>
                    <div className={`text-[10px] font-normal mt-0.5 ${isToday ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>{date.format('D/M')}</div>
                  </div>
                );
              })}
            </div>

            {/* Hour rows */}
            {HOURS.map(hour => (
              <div key={hour.value} className="grid gap-1 mb-1" style={{ gridTemplateColumns: '48px repeat(5, 1fr)' }}>
                {/* Hour label */}
                <div className="flex items-start justify-center pt-2">
                  <span className="text-[11px] text-muted-foreground font-medium">{hour.label}</span>
                </div>

                {/* Day cells */}
                {DAYS.map(day => {
                  const lessons = lessonMap[day.key]?.[hour.value] || [];
                  return (
                    <div
                      key={day.key}
                      className="min-h-[64px] rounded-xl border border-border/50 bg-card/60 p-1 flex flex-col gap-1 group cursor-pointer hover:border-primary/30 hover:bg-accent/20 transition-colors"
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
                      {lessons.length === 0 && (
                        <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

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