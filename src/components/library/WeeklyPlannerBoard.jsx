import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronRight, ChevronLeft, Search, X, GripVertical, Plus,
  StickyNote, Save, School, Check, CalendarDays, LayoutGrid, List
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = [
  { key: 'sun', label: 'ראשון' },
  { key: 'mon', label: 'שני' },
  { key: 'tue', label: 'שלישי' },
  { key: 'wed', label: 'רביעי' },
  { key: 'thu', label: 'חמישי' },
];

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8]; // lesson periods

const SOURCE_ICON = {
  pdf: '📄', youtube_link: '▶️', audio_recording: '🎙️', audio_file: '🎵',
  video_file: '🎬', text_note: '✍️', image: '🖼️', presentation: '📊',
  word_doc: '📝', external_link: '🔗',
};

const TYPE_BG = {
  pdf: 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200',
  youtube_link: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-200',
  audio_recording: 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-200',
  audio_file: 'bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-200',
  video_file: 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200',
  text_note: 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200',
  presentation: 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-200',
  image: 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200',
  word_doc: 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-200',
};
const TYPE_BG_DEFAULT = 'bg-muted border-border text-foreground';

// droppableId format: "day-hour"  e.g. "sun-3"
function encodeCell(day, hour) { return `${day}-${hour}`; }
function decodeCell(id) { const [day, h] = id.split('-'); return { day, hour: Number(h) }; }

// ─── Storage helpers ───────────────────────────────────────────────────────────
const CLS_KEY = 'wplanner_classes_v2';
function loadClasses() {
  try { const s = localStorage.getItem(CLS_KEY); if (s) return JSON.parse(s); } catch {}
  return ['כיתה א'];
}
function persistClasses(cls) { localStorage.setItem(CLS_KEY, JSON.stringify(cls)); }

function getWeekStart(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

// Empty grid: { day: { hour: [] } }
function emptyGrid() {
  const g = {};
  DAYS.forEach(({ key }) => { g[key] = {}; HOURS.forEach(h => { g[key][h] = []; }); });
  return g;
}

// Serialize grid → days array for storage
function gridToDays(grid) {
  return DAYS.flatMap(({ key }) =>
    HOURS.map(h => ({ day_key: key, hour: h, items: grid[key][h] || [] }))
  );
}

// Deserialize days array → grid
function daysToGrid(days) {
  const g = emptyGrid();
  (days || []).forEach(({ day_key, hour, items }) => {
    if (g[day_key] && hour) g[day_key][hour] = items || [];
  });
  return g;
}

// ─── Draggable library card ───────────────────────────────────────────────────
function LibCard({ item, idx }) {
  return (
    <Draggable draggableId={`lib||${item.id}`} index={idx}>
      {(p, snap) => (
        <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
          className={`rounded-lg border p-2 text-xs cursor-grab active:cursor-grabbing select-none transition-shadow
            ${TYPE_BG[item.source_type] || TYPE_BG_DEFAULT}
            ${snap.isDragging ? 'shadow-xl ring-2 ring-primary/40 rotate-1' : 'hover:shadow-md'}`}>
          <div className="flex items-start gap-1.5">
            <span className="text-sm leading-none shrink-0">{SOURCE_ICON[item.source_type] || '📁'}</span>
            <div className="min-w-0">
              <div className="font-medium leading-tight line-clamp-2">{item.title}</div>
              {item.subject && <div className="text-[10px] opacity-60 mt-0.5">{item.subject}</div>}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Cell chip (item inside a time slot) ─────────────────────────────────────
function CellChip({ slot, libItem, idx, onRemove, onNote }) {
  return (
    <Draggable draggableId={slot.id} index={idx}>
      {(p, snap) => (
        <div ref={p.innerRef} {...p.draggableProps}
          className={`rounded border text-[11px] px-1 py-0.5 select-none group flex items-center gap-0.5
            ${TYPE_BG[libItem?.source_type] || TYPE_BG_DEFAULT}
            ${snap.isDragging ? 'shadow-xl ring-2 ring-primary/50' : ''}`}>
          <span {...p.dragHandleProps} className="cursor-grab shrink-0 opacity-0 group-hover:opacity-60">
            <GripVertical className="w-2.5 h-2.5" />
          </span>
          <span className="shrink-0">{SOURCE_ICON[libItem?.source_type] || '📁'}</span>
          <span className="truncate flex-1 font-medium">{libItem?.title || '—'}</span>
          {slot.notes && <span className="text-[10px] opacity-60 truncate max-w-[40px]">💬</span>}
          <button onClick={() => onNote(slot)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 shrink-0">
            <StickyNote className="w-2.5 h-2.5" />
          </button>
          <button onClick={() => onRemove(slot.id)} className="opacity-0 group-hover:opacity-80 hover:!opacity-100 shrink-0 hover:text-red-600">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </Draggable>
  );
}

// ─── Overview table (all classes) ─────────────────────────────────────────────
function OverviewTable({ allPlans, classes, libraryItems, weekKey }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-xs min-w-[500px]">
        <thead>
          <tr className="bg-muted/60">
            <th className="p-2 border-b border-r border-border text-right font-semibold w-20">כיתה \ יום</th>
            {DAYS.map(d => (
              <th key={d.key} className="p-2 border-b border-r border-border text-center font-semibold">{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classes.map((cls, ci) => {
            const plan = allPlans.find(p => p.week_start === weekKey && p.title === cls);
            const grid = daysToGrid(plan?.days);
            return (
              <tr key={cls} className={ci % 2 === 0 ? '' : 'bg-muted/20'}>
                <td className="p-2 border-b border-r border-border font-semibold text-primary">{cls}</td>
                {DAYS.map(d => {
                  const daySlots = HOURS.flatMap(h => grid[d.key][h] || []);
                  const uniqueItems = [...new Map(daySlots.map(s => [s.library_item_id, s])).values()];
                  return (
                    <td key={d.key} className="p-1.5 border-b border-r border-border align-top">
                      {uniqueItems.length === 0 ? (
                        <span className="text-muted-foreground text-center block py-1">—</span>
                      ) : (
                        <div className="space-y-0.5">
                          {uniqueItems.slice(0, 4).map(slot => {
                            const lib = libraryItems.find(i => i.id === slot.library_item_id);
                            return lib ? (
                              <div key={slot.id} className={`rounded px-1.5 py-0.5 border truncate ${TYPE_BG[lib.source_type] || TYPE_BG_DEFAULT}`}>
                                {SOURCE_ICON[lib.source_type]} {lib.title}
                              </div>
                            ) : null;
                          })}
                          {uniqueItems.length > 4 && <div className="text-muted-foreground text-center">+{uniqueItems.length - 4}</div>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WeeklyPlannerBoard() {
  const isMobile = useIsMobile();
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [classes, setClasses] = useState(loadClasses);
  const [activeClass, setActiveClass] = useState(() => loadClasses()[0]);
  const [newClassName, setNewClassName] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const [grid, setGrid] = useState(emptyGrid);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'overview'
  const [noteModal, setNoteModal] = useState(null); // { slot, day, hour }
  const [noteText, setNoteText] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);

  const qc = useQueryClient();
  const weekKey = format(weekStart, 'yyyy-MM-dd');

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 150),
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ['weekly-plans'],
    queryFn: () => base44.entities.WeeklyPlan.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ days, title }) => {
      const existing = allPlans.find(p => p.week_start === weekKey && p.title === title);
      const payload = { week_start: weekKey, title, days };
      return existing
        ? base44.entities.WeeklyPlan.update(existing.id, payload)
        : base44.entities.WeeklyPlan.create(payload);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['weekly-plans'] });
      setDirty(false);
      toast.success('השבוע נשמר ✓');
      // Auto-sync to Google Drive (non-blocking)
      base44.functions.invoke('driveFiles', {
        action: 'savePlan',
        weekKey,
        className: vars.title,
        planData: vars.days,
      }).then(res => {
        if (res.data?.fileId) toast.message('☁️ סונכרן עם Google Drive');
      }).catch(() => {/* Drive not connected — silently skip */});
    },
  });

  // Load plan when class/week changes
  useEffect(() => {
    const plan = allPlans.find(p => p.week_start === weekKey && p.title === activeClass);
    setGrid(plan ? daysToGrid(plan.days) : emptyGrid());
    setDirty(false);
  }, [weekKey, activeClass, allPlans]);

  const filteredLibrary = useMemo(() => {
    const base = libraryItems.filter(i => !i.is_archived);
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.subject || '').toLowerCase().includes(q)
    );
  }, [libraryItems, search]);

  const handleSave = () => {
    saveMutation.mutate({ days: gridToDays(grid), title: activeClass });
  };

  const handleDragEnd = useCallback(({ source, destination, draggableId }) => {
    if (!destination) return;
    const src = source.droppableId;
    const dst = destination.droppableId;
    if (dst === 'library') return;

    // ── Library → cell ────────────────────────────────────────────────────────
    if (src === 'library') {
      const libId = draggableId.replace('lib||', '');
      const { day, hour } = decodeCell(dst);
      const slot = { id: `s-${libId}-${Date.now()}`, library_item_id: libId, notes: '' };
      setGrid(prev => {
        const g = structuredClone(prev);
        const arr = g[day][hour] || [];
        arr.splice(destination.index, 0, slot);
        g[day][hour] = arr;
        return g;
      });
      setDirty(true);
      return;
    }

    // ── Cell → same or different cell ─────────────────────────────────────────
    const { day: srcDay, hour: srcHour } = decodeCell(src);
    const { day: dstDay, hour: dstHour } = decodeCell(dst);

    setGrid(prev => {
      const g = structuredClone(prev);
      const srcArr = g[srcDay][srcHour] || [];
      const mIdx = srcArr.findIndex(s => s.id === draggableId);
      if (mIdx === -1) return prev;
      const [moved] = srcArr.splice(mIdx, 1);
      g[srcDay][srcHour] = srcArr;
      const dstArr = g[dstDay][dstHour] || [];
      dstArr.splice(destination.index, 0, moved);
      g[dstDay][dstHour] = dstArr;
      return g;
    });
    setDirty(true);
  }, []);

  const removeSlot = useCallback((slotId) => {
    setGrid(prev => {
      const g = structuredClone(prev);
      DAYS.forEach(({ key: d }) => HOURS.forEach(h => {
        g[d][h] = (g[d][h] || []).filter(s => s.id !== slotId);
      }));
      return g;
    });
    setDirty(true);
  }, []);

  const openNoteModal = useCallback((slot) => {
    setNoteModal(slot);
    setNoteText(slot.notes || '');
  }, []);

  const saveNote = () => {
    setGrid(prev => {
      const g = structuredClone(prev);
      DAYS.forEach(({ key: d }) => HOURS.forEach(h => {
        g[d][h] = (g[d][h] || []).map(s => s.id === noteModal.id ? { ...s, notes: noteText } : s);
      }));
      return g;
    });
    setNoteModal(null);
    setDirty(true);
  };

  const addClass = () => {
    const name = newClassName.trim();
    if (!name || classes.includes(name)) return;
    const next = [...classes, name];
    setClasses(next); persistClasses(next);
    setActiveClass(name);
    setNewClassName(''); setShowAddClass(false);
  };

  const removeClass = (cls) => {
    if (classes.length === 1) return;
    const next = classes.filter(c => c !== cls);
    setClasses(next); persistClasses(next);
    if (activeClass === cls) setActiveClass(next[0]);
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const totalSlots = DAYS.reduce((s, { key: d }) => s + HOURS.reduce((ss, h) => ss + (grid[d]?.[h]?.length || 0), 0), 0);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3">

        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* Week nav */}
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekStart(w => { const n = new Date(w); n.setDate(n.getDate() - 7); return n; })}
              aria-label="שבוע קודם"
              className="p-1.5 rounded-lg hover:bg-accent border border-border">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold px-1 whitespace-nowrap">
              {format(weekStart, 'dd/MM')} — {format(addDays(weekStart, 4), 'dd/MM/yy')}
            </span>
            <button onClick={() => setWeekStart(w => { const n = new Date(w); n.setDate(n.getDate() + 7); return n; })}
              aria-label="שבוע הבא"
              className="p-1.5 rounded-lg hover:bg-accent border border-border">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekStart(getWeekStart())}
              aria-label="חזור לשבוע הנוכחי"
              className="text-xs text-primary hover:underline px-1">השבוע</button>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden text-xs">
              <button onClick={() => setViewMode('edit')}
                className={`px-2.5 py-1.5 flex items-center gap-1 transition-colors ${viewMode === 'edit' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                <LayoutGrid className="w-3 h-3" /> עריכה
              </button>
              <button onClick={() => setViewMode('overview')}
                className={`px-2.5 py-1.5 flex items-center gap-1 transition-colors ${viewMode === 'overview' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                <List className="w-3 h-3" /> מבט-על
              </button>
            </div>
            {viewMode === 'edit' && (
              <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending || !dirty}
                aria-label={saveMutation.isPending ? 'שומר' : dirty ? `שמור (${totalSlots})` : 'נשמר'}
                className={`gap-1 ${!dirty ? 'opacity-50' : ''}`}>
                {saveMutation.isPending ? <Save className="w-3.5 h-3.5 animate-pulse" /> : dirty ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {saveMutation.isPending ? 'שומר...' : dirty ? `שמור (${totalSlots})` : 'נשמר'}
              </Button>
            )}
          </div>
        </div>

        {/* ── Class tabs ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap">
          <School className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {classes.map(cls => (
            <div key={cls} className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => { setActiveClass(cls); setViewMode('edit'); }}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  activeClass === cls && viewMode === 'edit'
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}>{cls}</button>
              {classes.length > 1 && (
                <button onClick={() => removeClass(cls)}
                  className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-destructive rounded">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
          {showAddClass ? (
            <div className="flex items-center gap-1">
              <Input value={newClassName} onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addClass(); if (e.key === 'Escape') setShowAddClass(false); }}
                placeholder="שם כיתה..." className="h-7 text-xs w-24" autoFocus />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={addClass}>הוסף</Button>
              <button onClick={() => setShowAddClass(false)}><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
            </div>
          ) : (
            <button onClick={() => setShowAddClass(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors shrink-0">
              <Plus className="w-3 h-3" /> כיתה
            </button>
          )}
        </div>

        {/* ── Overview mode ─────────────────────────────────────────────────── */}
        {viewMode === 'overview' && (
          <OverviewTable allPlans={allPlans} classes={classes} libraryItems={libraryItems} weekKey={weekKey} />
        )}

        {/* ── Edit mode: side-by-side library + timetable grid ──────────────── */}
        {viewMode === 'edit' && (
          <div className="flex flex-col sm:flex-row gap-3 pb-4">
            {/* Mobile notice for wide grid */}
            {isMobile && (
              <div className="space-y-2 text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-xl sm:hidden">
                <p>הטבלה המלאה זמינה במסך רחב יותר</p>
                <p>השתמש בגלילה אופקית לצפייה בלוח השבועי</p>
              </div>
            )}

            {/* Mobile library toggle */}
            {isMobile && (
              <Button size="sm" variant="outline" className="gap-1.5 self-start" onClick={() => setShowLibrary(v => !v)}>
                📚 ספרייה ({filteredLibrary.length}) {showLibrary ? '▲' : '▼'}
              </Button>
            )}

            {/* Library panel — hidden on mobile by default, shown when toggled */}
            <div className={`w-full sm:w-40 shrink-0 flex flex-col gap-2 ${isMobile && !showLibrary ? 'hidden' : ''}`}>
              <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                📚 ספרייה <span className="opacity-50">({filteredLibrary.length})</span>
              </div>
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input placeholder="חפש..." value={search} onChange={e => setSearch(e.target.value)} className="h-7 text-xs pr-7" />
              </div>
              <Droppable droppableId="library" isDropDisabled>
                {(p) => (
                  <div ref={p.innerRef} {...p.droppableProps}
                    className="space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto">
                    {filteredLibrary.slice(0, 40).map((item, idx) => <LibCard key={item.id} item={item} idx={idx} />)}
                    {p.placeholder}
                    {filteredLibrary.length === 0 && (
                      <p className="text-xs text-center text-muted-foreground py-4 opacity-60">אין תוצאות</p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>

            {/* ── Timetable grid ────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="min-w-[320px]">
                {/* Header row */}
                <div className="grid gap-px mb-px" style={{ gridTemplateColumns: `36px repeat(${DAYS.length}, 1fr)` }}>
                  <div /> {/* hour label column */}
                  {DAYS.map(({ key, label }, di) => {
                    const date = addDays(weekStart, di);
                    const isToday = format(date, 'yyyy-MM-dd') === todayStr;
                    return (
                      <div key={key}
                        className={`rounded-t-xl text-center py-1.5 text-xs font-bold border transition-colors
                          ${isToday ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                        {label}
                        <div className="text-[9px] font-normal opacity-70">{format(date, 'dd/MM')}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Hour rows */}
                {HOURS.map(hour => (
                  <div key={hour} className="grid gap-px mb-px" style={{ gridTemplateColumns: `36px repeat(${DAYS.length}, 1fr)` }}>
                    {/* Hour label */}
                    <div className="flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted/40 border border-border rounded-lg">
                      {hour}
                    </div>

                    {/* Day cells */}
                    {DAYS.map(({ key: dayKey }, di) => {
                      const cellId = encodeCell(dayKey, hour);
                      const slots = grid[dayKey]?.[hour] || [];
                      const date = addDays(weekStart, di);
                      const isToday = format(date, 'yyyy-MM-dd') === todayStr;
                      return (
                        <Droppable key={dayKey} droppableId={cellId}>
                          {(p, snap) => (
                            <div ref={p.innerRef} {...p.droppableProps}
                              className={`rounded-lg border min-h-[52px] p-1 space-y-0.5 transition-all duration-100
                                ${snap.isDraggingOver
                                  ? 'border-primary bg-primary/8 ring-1 ring-primary/30'
                                  : isToday
                                    ? 'border-primary/30 bg-primary/5'
                                    : 'border-border hover:border-primary/30 bg-card'}`}>
                              {slots.map((slot, idx) => {
                                const lib = libraryItems.find(i => i.id === slot.library_item_id);
                                return (
                                  <CellChip
                                    key={slot.id}
                                    slot={slot}
                                    libItem={lib}
                                    idx={idx}
                                    onRemove={removeSlot}
                                    onNote={openNoteModal}
                                  />
                                );
                              })}
                              {p.placeholder}
                              {slots.length === 0 && !snap.isDraggingOver && (
                                <div className="flex items-center justify-center h-8 opacity-0 hover:opacity-100 transition-opacity">
                                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/30" />
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
          </div>
        )}

        {/* ── Note modal ────────────────────────────────────────────────────── */}
        {noteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setNoteModal(null)}>
            <div className="bg-card rounded-2xl p-4 w-72 shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
              <div className="font-semibold text-sm flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary" /> הוסף הערה לפריט
              </div>
              <Input value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="למשל: להדגיש פרק ג'..." autoFocus
                onKeyDown={e => e.key === 'Enter' && saveNote()} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setNoteModal(null)}>ביטול</Button>
                <Button size="sm" onClick={saveNote}>שמור</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}