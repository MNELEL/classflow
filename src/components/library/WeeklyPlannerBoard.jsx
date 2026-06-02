import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronLeft, Search, X, GripVertical, Plus, Clock } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { toast } from 'sonner';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];
const SOURCE_ICON = {
  pdf: '📄', youtube_link: '▶️', audio_recording: '🎙️', audio_file: '🎵',
  video_file: '🎬', text_note: '✍️', image: '🖼️', presentation: '📊',
  word_doc: '📝', external_link: '🔗',
};

const TYPE_COLORS = {
  pdf: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
  youtube_link: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300',
  audio_recording: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300',
  audio_file: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300',
  video_file: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
  text_note: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
  presentation: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300',
  image: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
  default: 'bg-secondary border-border text-secondary-foreground',
};

function getWeekStart(date) {
  // Israeli week starts Sunday
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function WeeklyPlannerBoard() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [search, setSearch] = useState('');
  const [dayItems, setDayItems] = useState(() =>
    Object.fromEntries(DAYS.map(d => [d, []]))
  );
  const [editingNote, setEditingNote] = useState(null); // {day, idx}
  const [noteText, setNoteText] = useState('');

  const queryClient = useQueryClient();
  const weekKey = format(weekStart, 'yyyy-MM-dd');

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 100),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['weekly-plans'],
    queryFn: () => base44.entities.WeeklyPlan.list('-created_date', 52),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = plans.find(p => p.week_start === weekKey);
      if (existing) {
        return base44.entities.WeeklyPlan.update(existing.id, data);
      }
      return base44.entities.WeeklyPlan.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-plans'] });
      toast.success('השבוע נשמר');
    },
  });

  // Load saved plan for current week
  useEffect(() => {
    const plan = plans.find(p => p.week_start === weekKey);
    if (plan?.days) {
      const loaded = Object.fromEntries(DAYS.map(d => [d, []]));
      plan.days.forEach(({ day_key, items }) => {
        if (loaded[day_key] !== undefined) loaded[day_key] = items || [];
      });
      setDayItems(loaded);
    } else {
      setDayItems(Object.fromEntries(DAYS.map(d => [d, []])));
    }
  }, [weekKey, plans]);

  const filteredLibrary = useMemo(() => {
    if (!search) return libraryItems.filter(i => !i.is_archived);
    const q = search.toLowerCase();
    return libraryItems.filter(i =>
      !i.is_archived &&
      ((i.title || '').toLowerCase().includes(q) ||
        (i.subject || '').toLowerCase().includes(q))
    );
  }, [libraryItems, search]);

  const handleSave = () => {
    const days = DAYS.map(d => ({ day_key: d, items: dayItems[d] }));
    saveMutation.mutate({ week_start: weekKey, days });
  };

  const handleDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;
    const srcId = source.droppableId;
    const dstId = destination.droppableId;

    // Drag from library to day
    if (srcId === 'library' && dstId !== 'library') {
      const item = libraryItems.find(i => i.id === draggableId);
      if (!item) return;
      const slot = {
        id: `${draggableId}-${Date.now()}`,
        library_item_id: draggableId,
        notes: '',
        hour: 0,
      };
      setDayItems(prev => {
        const next = { ...prev };
        const arr = [...(next[dstId] || [])];
        arr.splice(destination.index, 0, slot);
        next[dstId] = arr;
        return next;
      });
      return;
    }

    // Reorder within a day
    if (srcId === dstId && srcId !== 'library') {
      setDayItems(prev => {
        const arr = [...prev[srcId]];
        const [moved] = arr.splice(source.index, 1);
        arr.splice(destination.index, 0, moved);
        return { ...prev, [srcId]: arr };
      });
      return;
    }

    // Move between days
    if (srcId !== 'library' && dstId !== 'library' && srcId !== dstId) {
      setDayItems(prev => {
        const srcArr = [...prev[srcId]];
        const dstArr = [...prev[dstId]];
        const [moved] = srcArr.splice(source.index, 1);
        dstArr.splice(destination.index, 0, moved);
        return { ...prev, [srcId]: srcArr, [dstId]: dstArr };
      });
    }
  };

  const removeFromDay = (day, idx) => {
    setDayItems(prev => {
      const arr = [...prev[day]];
      arr.splice(idx, 1);
      return { ...prev, [day]: arr };
    });
  };

  const saveNote = (day, idx) => {
    setDayItems(prev => {
      const arr = [...prev[day]];
      arr[idx] = { ...arr[idx], notes: noteText };
      return { ...prev, [day]: arr };
    });
    setEditingNote(null);
    setNoteText('');
  };

  const totalItems = Object.values(dayItems).reduce((s, arr) => s + arr.length, 0);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3">
        {/* Week nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(w => { const n = new Date(w); n.setDate(n.getDate() - 7); return n; })}
              className="p-1.5 rounded-lg hover:bg-accent border border-border">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold">
              שבוע {format(weekStart, 'dd/MM')} — {format(addDays(weekStart, 4), 'dd/MM/yyyy')}
            </span>
            <button onClick={() => setWeekStart(w => { const n = new Date(w); n.setDate(n.getDate() + 7); return n; })}
              className="p-1.5 rounded-lg hover:bg-accent border border-border">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="text-xs text-primary hover:underline px-1">השבוע</button>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="gap-1">
            {saveMutation.isPending ? '...' : `שמור (${totalItems} פריטים)`}
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {/* Library source panel */}
          <div className="w-44 shrink-0">
            <div className="sticky top-0">
              <div className="font-semibold text-xs text-muted-foreground mb-2 px-1">📚 ספרייה</div>
              <div className="relative mb-2">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input placeholder="חפש..." value={search} onChange={e => setSearch(e.target.value)}
                  className="h-7 text-xs pr-7" />
              </div>
              <Droppable droppableId="library" isDropDisabled={true}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
                    {filteredLibrary.slice(0, 30).map((item, idx) => (
                      <Draggable key={item.id} draggableId={item.id} index={idx}>
                        {(p, snapshot) => (
                          <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                            className={`rounded-lg border p-1.5 text-xs cursor-grab active:cursor-grabbing select-none transition-shadow
                              ${TYPE_COLORS[item.source_type] || TYPE_COLORS.default}
                              ${snapshot.isDragging ? 'shadow-lg rotate-1' : ''}`}>
                            <div className="flex items-start gap-1">
                              <span className="shrink-0">{SOURCE_ICON[item.source_type] || '📁'}</span>
                              <span className="line-clamp-2 leading-tight">{item.title}</span>
                            </div>
                            {item.subject && <div className="text-[10px] opacity-60 mt-0.5">{item.subject}</div>}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {filteredLibrary.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-4">אין תוצאות</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>

          {/* Day columns */}
          {DAYS.map((day, dayIdx) => {
            const date = addDays(weekStart, dayIdx);
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            return (
              <div key={day} className="flex-1 min-w-[120px]">
                <div className={`rounded-xl p-1 mb-2 text-center text-xs font-semibold border
                  ${isToday ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                  {day}
                  <div className="text-[10px] font-normal opacity-75">{format(date, 'dd/MM')}</div>
                </div>
                <Droppable droppableId={day}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`min-h-[300px] rounded-xl border-2 border-dashed p-1.5 space-y-1.5 transition-colors
                        ${snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      {dayItems[day].map((slot, idx) => {
                        const libItem = libraryItems.find(i => i.id === slot.library_item_id);
                        if (!libItem) return null;
                        return (
                          <Draggable key={slot.id} draggableId={slot.id} index={idx}>
                            {(p, snap) => (
                              <div ref={p.innerRef} {...p.draggableProps}
                                className={`rounded-lg border p-1.5 text-xs bg-card select-none
                                  ${snap.isDragging ? 'shadow-lg' : ''}`}>
                                <div className="flex items-start gap-1">
                                  <span {...p.dragHandleProps} className="cursor-grab shrink-0 text-muted-foreground mt-0.5">
                                    <GripVertical className="w-3 h-3" />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-0.5">
                                      <span>{SOURCE_ICON[libItem.source_type] || '📁'}</span>
                                      <span className="font-medium truncate">{libItem.title}</span>
                                    </div>
                                    {slot.notes && (
                                      <div className="text-[10px] text-muted-foreground mt-0.5 italic">{slot.notes}</div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <button onClick={() => { setEditingNote({ day, idx }); setNoteText(slot.notes || ''); }}
                                      className="text-muted-foreground hover:text-foreground">
                                      <Clock className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => removeFromDay(day, idx)}
                                      className="text-muted-foreground hover:text-destructive">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {dayItems[day].length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-8 text-muted-foreground text-[10px]">
                          <Plus className="w-4 h-4 mx-auto mb-1 opacity-30" />
                          גרור לכאן
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>

        {/* Note editor popup */}
        {editingNote && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingNote(null)}>
            <div className="bg-card rounded-xl p-4 w-72 shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="font-semibold text-sm mb-2">הוסף הערה</div>
              <Input value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="הערה לפריט..." className="mb-3" autoFocus />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingNote(null)}>ביטול</Button>
                <Button size="sm" onClick={() => saveNote(editingNote.day, editingNote.idx)}>שמור</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}