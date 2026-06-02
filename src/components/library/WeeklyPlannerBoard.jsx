import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight, ChevronLeft, Search, X, GripVertical, Plus,
  StickyNote, Save, School, Check, CalendarDays, LayoutGrid, List
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

const DAYS = [
  { key: 'sun', label: 'ראשון' },
  { key: 'mon', label: 'שני' },
  { key: 'tue', label: 'שלישי' },
  { key: 'wed', label: 'רביעי' },
  { key: 'thu', label: 'חמישי' },
];

const SOURCE_ICON = {
  pdf: '📄', youtube_link: '▶️', audio_recording: '🎙️', audio_file: '🎵',
  video_file: '🎬', text_note: '✍️', image: '🖼️', presentation: '📊',
  word_doc: '📝', external_link: '🔗',
};

const TYPE_COLORS = {
  pdf: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  youtube_link: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800',
  audio_recording: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
  audio_file: 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800',
  video_file: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  text_note: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  presentation: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
  image: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  word_doc: 'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800',
};

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

const STORAGE_KEY = 'weekly_planner_classes';

function loadClasses() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return ['כיתה א'];
}

function saveClasses(classes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
}

// ─── Library source card (draggable) ─────────────────────────────────────────
function LibraryCard({ item, idx }) {
  return (
    <Draggable draggableId={`lib-${item.id}`} index={idx}>
      {(p, snap) => (
        <div
          ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
          className={`rounded-lg border p-2 text-xs cursor-grab active:cursor-grabbing select-none transition-shadow
            ${TYPE_COLORS[item.source_type] || 'bg-muted border-border'}
            ${snap.isDragging ? 'shadow-lg rotate-1 ring-2 ring-primary/40' : 'hover:shadow-sm'}`}
        >
          <div className="flex items-start gap-1.5">
            <span className="text-base leading-none">{SOURCE_ICON[item.source_type] || '📁'}</span>
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

// ─── Slot card (placed in a day cell) ────────────────────────────────────────
function SlotCard({ slot, libItem, dayKey, idx, onRemove, onNote }) {
  if (!libItem) return null;
  return (
    <Draggable draggableId={slot.id} index={idx}>
      {(p, snap) => (
        <div
          ref={p.innerRef} {...p.draggableProps}
          className={`rounded-lg border bg-card p-1.5 text-xs select-none group
            ${snap.isDragging ? 'shadow-xl ring-2 ring-primary/50' : 'hover:shadow-sm'}
            ${TYPE_COLORS[libItem.source_type] || 'border-border'}`}
        >
          <div className="flex items-start gap-1">
            <span {...p.dragHandleProps} className="cursor-grab shrink-0 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span>{SOURCE_ICON[libItem.source_type] || '📁'}</span>
                <span className="font-medium truncate">{libItem.title}</span>
              </div>
              {slot.notes && (
                <div className="text-[10px] text-muted-foreground mt-0.5 italic truncate">💬 {slot.notes}</div>
              )}
            </div>
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onNote(dayKey, idx, slot.notes)} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                <StickyNote className="w-2.5 h-2.5" />
              </button>
              <button onClick={() => onRemove(dayKey, idx)} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Overview (all classes, current week) ────────────────────────────────────
function OverviewMode({ allPlans, classes, libraryItems, weekKey }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs min-w-[500px]">
        <thead>
          <tr>
            <th className="text-right p-2 bg-muted/50 border border-border rounded-tl-lg w-24">כיתה \ יום</th>
            {DAYS.map(d => (
              <th key={d.key} className="p-2 bg-muted/50 border border-border text-center font-semibold">{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classes.map(cls => {
            const plan = allPlans.find(p => p.week_start === weekKey && p.title === cls);
            const dayMap = {};
            plan?.days?.forEach(({ day_key, items }) => { dayMap[day_key] = items || []; });
            return (
              <tr key={cls}>
                <td className="p-2 border border-border bg-primary/5 font-semibold text-primary">{cls}</td>
                {DAYS.map(d => {
                  const items = dayMap[d.key] || [];
                  return (
                    <td key={d.key} className="p-1.5 border border-border align-top min-h-[60px]">
                      {items.length === 0 ? (
                        <span className="text-muted-foreground text-[10px] block text-center py-2">—</span>
                      ) : (
                        <div className="space-y-1">
                          {items.slice(0, 3).map(slot => {
                            const lib = libraryItems.find(i => i.id === slot.library_item_id);
                            if (!lib) return null;
                            return (
                              <div key={slot.id} className={`rounded px-1.5 py-0.5 border text-[10px] truncate ${TYPE_COLORS[lib.source_type] || 'bg-muted border-border'}`}>
                                {SOURCE_ICON[lib.source_type]} {lib.title}
                              </div>
                            );
                          })}
                          {items.length > 3 && (
                            <div className="text-[10px] text-muted-foreground text-center">+{items.length - 3} נוספים</div>
                          )}
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeeklyPlannerBoard() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState(loadClasses);
  const [activeClass, setActiveClass] = useState(() => loadClasses()[0] || 'כיתה א');
  const [newClassName, setNewClassName] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);
  const [dayItems, setDayItems] = useState(() => Object.fromEntries(DAYS.map(d => [d.key, []])));
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'overview'

  const qc = useQueryClient();
  const weekKey = format(weekStart, 'yyyy-MM-dd');
  const planKey = `${activeClass}__${weekKey}`;

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 150),
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ['weekly-plans'],
    queryFn: () => base44.entities.WeeklyPlan.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ days, weekStart: ws, title }) => {
      const existing = allPlans.find(p => p.week_start === ws && p.title === title);
      if (existing) return base44.entities.WeeklyPlan.update(existing.id, { days, week_start: ws, title });
      return base44.entities.WeeklyPlan.create({ week_start: ws, title, days });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-plans'] });
      setDirty(false);
      toast.success('נשמר ✓');
    },
  });

  // Load plan for active class + week
  useEffect(() => {
    const plan = allPlans.find(p => p.week_start === weekKey && p.title === activeClass);
    if (plan?.days) {
      const loaded = Object.fromEntries(DAYS.map(d => [d.key, []]));
      plan.days.forEach(({ day_key, items }) => { if (loaded[day_key] !== undefined) loaded[day_key] = items || []; });
      setDayItems(loaded);
    } else {
      setDayItems(Object.fromEntries(DAYS.map(d => [d.key, []])));
    }
    setDirty(false);
  }, [weekKey, activeClass, allPlans]);

  const filteredLibrary = useMemo(() => {
    const base = libraryItems.filter(i => !i.is_archived);
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(i =>
      (i.title || '').toLowerCase().includes(q) || (i.subject || '').toLowerCase().includes(q)
    );
  }, [libraryItems, search]);

  const handleSave = () => {
    const days = DAYS.map(d => ({ day_key: d.key, items: dayItems[d.key] }));
    saveMutation.mutate({ days, weekStart: weekKey, title: activeClass });
  };

  const handleDragEnd = useCallback(({ source, destination, draggableId }) => {
    if (!destination) return;
    const src = source.droppableId;
    const dst = destination.droppableId;

    // Library → day
    if (src === 'library') {
      if (dst === 'library') return;
      const libId = draggableId.replace('lib-', '');
      const slot = { id: `slot-${libId}-${Date.now()}`, library_item_id: libId, notes: '' };
      setDayItems(prev => {
        const arr = [...(prev[dst] || [])];
        arr.splice(destination.index, 0, slot);
        return { ...prev, [dst]: arr };
      });
      setDirty(true);
      return;
    }

    // Reorder within day
    if (src === dst) {
      setDayItems(prev => {
        const arr = [...prev[src]];
        const [m] = arr.splice(source.index, 1);
        arr.splice(destination.index, 0, m);
        return { ...prev, [src]: arr };
      });
      setDirty(true);
      return;
    }

    // Move between days
    if (dst !== 'library') {
      setDayItems(prev => {
        const srcArr = [...prev[src]];
        const dstArr = [...prev[dst]];
        const [m] = srcArr.splice(source.index, 1);
        dstArr.splice(destination.index, 0, m);
        return { ...prev, [src]: srcArr, [dst]: dstArr };
      });
      setDirty(true);
    }
  }, []);

  const removeFromDay = (day, idx) => {
    setDayItems(prev => { const arr = [...prev[day]]; arr.splice(idx, 1); return { ...prev, [day]: arr }; });
    setDirty(true);
  };

  const openNote = (day, idx, current) => {
    setEditingNote({ day, idx });
    setNoteText(current || '');
  };

  const saveNote = () => {
    setDayItems(prev => {
      const arr = [...prev[editingNote.day]];
      arr[editingNote.idx] = { ...arr[editingNote.idx], notes: noteText };
      return { ...prev, [editingNote.day]: arr };
    });
    setEditingNote(null);
    setDirty(true);
  };

  const addClass = () => {
    const name = newClassName.trim();
    if (!name || classes.includes(name)) return;
    const next = [...classes, name];
    setClasses(next);
    saveClasses(next);
    setActiveClass(name);
    setNewClassName('');
    setShowAddClass(false);
  };

  const removeClass = (cls) => {
    if (classes.length === 1) return;
    const next = classes.filter(c => c !== cls);
    setClasses(next);
    saveClasses(next);
    if (activeClass === cls) setActiveClass(next[0]);
  };

  const totalItems = Object.values(dayItems).reduce((s, a) => s + a.length, 0);
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3 h-full">

        {/* ── Top bar ── */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* Week navigator */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setWeekStart(w => { const n = new Date(w); n.setDate(n.getDate() - 7); return n; })}
              className="p-1.5 rounded-lg hover:bg-accent border border-border">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="text-sm font-semibold whitespace-nowrap">
              {format(weekStart, 'dd/MM')} — {format(addDays(weekStart, 4), 'dd/MM/yy')}
            </div>
            <button onClick={() => setWeekStart(w => { const n = new Date(w); n.setDate(n.getDate() + 7); return n; })}
              className="p-1.5 rounded-lg hover:bg-accent border border-border">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="text-xs text-primary hover:underline px-1">השבוע</button>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('edit')}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === 'edit' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                <LayoutGrid className="w-3 h-3" /> עריכה
              </button>
              <button onClick={() => setViewMode('overview')}
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${viewMode === 'overview' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                <List className="w-3 h-3" /> מבט-על
              </button>
            </div>

            {/* Save */}
            {viewMode === 'edit' && (
              <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending || !dirty}
                className={`gap-1 transition-all ${dirty ? '' : 'opacity-60'}`}>
                {saveMutation.isPending ? <Save className="w-3.5 h-3.5 animate-pulse" /> : dirty ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {saveMutation.isPending ? 'שומר...' : dirty ? `שמור (${totalItems})` : 'שמור'}
              </Button>
            )}
          </div>
        </div>

        {/* ── Class tabs ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <School className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {classes.map(cls => (
            <div key={cls} className="flex items-center gap-0 shrink-0">
              <button
                onClick={() => setActiveClass(cls)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                  activeClass === cls && viewMode === 'edit'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {cls}
              </button>
              {classes.length > 1 && (
                <button onClick={() => removeClass(cls)}
                  className="text-muted-foreground hover:text-destructive w-4 h-4 flex items-center justify-center rounded -mr-1 hover:bg-destructive/10">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}

          {/* Add class */}
          {showAddClass ? (
            <div className="flex items-center gap-1">
              <Input value={newClassName} onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addClass(); if (e.key === 'Escape') setShowAddClass(false); }}
                placeholder="שם כיתה..." className="h-7 text-xs w-24" autoFocus />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={addClass}>הוסף</Button>
              <button onClick={() => setShowAddClass(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => setShowAddClass(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors shrink-0">
              <Plus className="w-3 h-3" /> כיתה
            </button>
          )}
        </div>

        {/* ── Overview mode ── */}
        {viewMode === 'overview' && (
          <OverviewMode allPlans={allPlans} classes={classes} libraryItems={libraryItems} weekKey={weekKey} />
        )}

        {/* ── Edit mode: library + days ── */}
        {viewMode === 'edit' && (
          <div className="flex gap-3 overflow-x-auto pb-16">
            {/* Library panel */}
            <div className="w-44 shrink-0">
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                📚 ספרייה <span className="text-[10px] opacity-60">({filteredLibrary.length})</span>
              </div>
              <div className="relative mb-2">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input placeholder="חפש..." value={search} onChange={e => setSearch(e.target.value)} className="h-7 text-xs pr-7" />
              </div>
              <Droppable droppableId="library" isDropDisabled>
                {(p) => (
                  <div ref={p.innerRef} {...p.droppableProps}
                    className="space-y-1.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-0.5">
                    {filteredLibrary.slice(0, 40).map((item, idx) => (
                      <LibraryCard key={item.id} item={item} idx={idx} />
                    ))}
                    {p.placeholder}
                    {filteredLibrary.length === 0 && (
                      <div className="text-xs text-center text-muted-foreground py-6 opacity-60">אין תוצאות</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Day columns */}
            {DAYS.map(({ key, label }, dayIdx) => {
              const date = addDays(weekStart, dayIdx);
              const isToday = format(date, 'yyyy-MM-dd') === todayKey;
              const count = dayItems[key]?.length || 0;
              return (
                <div key={key} className="flex-1 min-w-[130px]">
                  <div className={`rounded-xl px-2 py-1.5 mb-2 text-center border transition-colors
                    ${isToday ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' : 'bg-muted border-border text-muted-foreground'}`}>
                    <div className="text-xs font-bold">{label}</div>
                    <div className="text-[10px] opacity-70">{format(date, 'dd/MM')}</div>
                    {count > 0 && (
                      <div className={`text-[10px] font-semibold mt-0.5 ${isToday ? 'text-primary-foreground/80' : 'text-primary'}`}>
                        {count} פריטים
                      </div>
                    )}
                  </div>

                  <Droppable droppableId={key}>
                    {(p, snap) => (
                      <div ref={p.innerRef} {...p.droppableProps}
                        className={`min-h-[320px] rounded-xl border-2 border-dashed p-1.5 space-y-1.5 transition-all duration-150
                          ${snap.isDraggingOver
                            ? 'border-primary bg-primary/5 scale-[1.01]'
                            : 'border-border hover:border-primary/30'}`}
                      >
                        {(dayItems[key] || []).map((slot, idx) => {
                          const libItem = libraryItems.find(i => i.id === slot.library_item_id);
                          return (
                            <SlotCard
                              key={slot.id}
                              slot={slot}
                              libItem={libItem}
                              dayKey={key}
                              idx={idx}
                              onRemove={removeFromDay}
                              onNote={openNote}
                            />
                          );
                        })}
                        {p.placeholder}
                        {count === 0 && !snap.isDraggingOver && (
                          <div className="text-center py-10 text-muted-foreground">
                            <CalendarDays className="w-5 h-5 mx-auto mb-1 opacity-20" />
                            <div className="text-[10px] opacity-40">גרור לכאן</div>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Note popup ── */}
        {editingNote && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingNote(null)}>
            <div className="bg-card rounded-2xl p-4 w-72 shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
              <div className="font-semibold text-sm flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary" /> הוסף הערה לפריט
              </div>
              <Input value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="למשל: להדגיש את הפרק השלישי..." autoFocus
                onKeyDown={e => e.key === 'Enter' && saveNote()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingNote(null)}>ביטול</Button>
                <Button size="sm" onClick={saveNote}>שמור</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}