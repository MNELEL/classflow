import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import ClassroomGrid from '@/components/classroom/ClassroomGrid';
import StudentPanel from '@/components/classroom/StudentPanel';
import GridControls from '@/components/classroom/GridControls';
import ConflictHelper from '@/components/classroom/ConflictHelper';
import QuickEditMode from '@/components/classroom/QuickEditMode';
import GroupSeatingOptimizer from '@/components/classroom/GroupSeatingOptimizer';
import { buildInitialSeats, smartSort, calcSatisfactionScore, getSeatAt } from '@/lib/seatingUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, EyeOff, SlidersHorizontal, Users } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'classmanager_seats';
const ARRANGEMENT_KEY = 'classmanager_arrangement';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = localStorage.getItem(ARRANGEMENT_KEY);
    return {
      seats: raw ? JSON.parse(raw) : null,
      arrangement: arr ? JSON.parse(arr) : { rows: 5, cols: 6, name: 'ברירת מחדל' },
    };
  } catch {
    return { seats: null, arrangement: { rows: 5, cols: 6, name: 'ברירת מחדל' } };
  }
}

export default function SeatingPage() {
  const qc = useQueryClient();

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);
  const [seats, setSeats] = useState([]);
  const [showNumbers, setShowNumbers] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [quickEditSeat, setQuickEditSeat] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const { seats: savedSeats, arrangement } = loadFromStorage();
    setRows(arrangement.rows);
    setCols(arrangement.cols);
    if (savedSeats) {
      setSeats(savedSeats);
    } else {
      setSeats(buildInitialSeats(arrangement.rows, arrangement.cols));
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    if (seats.length === 0) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seats));
    localStorage.setItem(ARRANGEMENT_KEY, JSON.stringify({ rows, cols }));
    setLastSaved(new Date());
  }, [seats, rows, cols]);

  // Rebuild grid when size changes
  function handleRowsChange(newRows) {
    setRows(newRows);
    setSeats(prev => {
      const newSeats = buildInitialSeats(newRows, cols);
      // Preserve existing seat data
      return newSeats.map(ns => {
        const existing = prev.find(s => s.id === ns.id);
        return existing || ns;
      });
    });
  }

  function handleColsChange(newCols) {
    setCols(newCols);
    setSeats(prev => {
      const newSeats = buildInitialSeats(rows, newCols);
      return newSeats.map(ns => {
        const existing = prev.find(s => s.id === ns.id);
        return existing || ns;
      });
    });
  }

  // Move student between seats
  function handleMoveStu(studentId, fromSeatId, toSeatId) {
    setSeats(prev => {
      const newSeats = prev.map(s => {
        if (s.id === toSeatId) {
          // If target has student, swap
          const targetStudent = s.student_id;
          if (fromSeatId && targetStudent) {
            // Will handle below
          }
          return { ...s, student_id: studentId };
        }
        if (s.id === fromSeatId) {
          // If target had student, put it here
          const target = prev.find(x => x.id === toSeatId);
          return { ...s, student_id: target?.student_id || null };
        }
        // Remove from any other seat
        if (!fromSeatId && s.student_id === studentId) {
          return { ...s, student_id: null };
        }
        return s;
      });
      return newSeats;
    });
  }

  // Smart AI sort — guarantees ALL students are placed
  async function handleSmartSort() {
    if (students.length === 0) {
      toast.error('אין תלמידים לסידור');
      return;
    }
    setIsLoading(true);
    try {
      // First run the local smart algorithm — this now guarantees full placement
      let sorted = smartSort(seats, students);

      // Optionally enrich with AI ordering hints
      try {
        const activeStudents = students.filter(s => s.is_active !== false);
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `אתה מערכת סידור ישיבה חכמה. יש ${activeStudents.length} תלמידים ו-${rows} שורות ו-${cols} טורים.

תלמידים:
${activeStudents.map(s => `- ${s.name}: גובה=${s.height||'בינוני'}, שורה=${s.row_preference||'אין'}, צרכים=[${(s.special_needs||[]).join(',')}], חברים=[${(s.friends||[]).map(fid=>students.find(x=>x.id===fid)?.name||'').filter(Boolean).join(',')}], להרחיק=[${(s.avoid||[]).map(fid=>students.find(x=>x.id===fid)?.name||'').filter(Boolean).join(',')}], שורה_קבועה=${s.permanent_row||'אין'}`).join('\n')}

שבץ את כל ${activeStudents.length} התלמידים. חובה להחזיר assignment לכל תלמיד. כל מושב (row,col) יכול להכיל תלמיד אחד בלבד. row ו-col הם 0-based.`,
          response_json_schema: {
            type: 'object',
            properties: {
              assignments: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    student_name: { type: 'string' },
                    row: { type: 'number' },
                    col: { type: 'number' },
                  }
                }
              }
            }
          }
        });

        if (result?.assignments?.length > 0) {
          const newSeats = seats.map(s => ({ ...s, student_id: (s.is_locked && !s.is_blocked) ? s.student_id : null }));
          const lockedIds = new Set(seats.filter(s => s.is_locked && !s.is_blocked).map(s => s.student_id));
          const usedSeats = new Set();

          for (const a of result.assignments) {
            const student = students.find(s => s.name === a.student_name || s.name.includes(a.student_name));
            if (!student || lockedIds.has(student.id)) continue;
            const seatIdx = newSeats.findIndex(s => s.row === a.row && s.col === a.col && !s.student_id && !s.is_hidden && !s.is_gap && !s.is_blocked && !usedSeats.has(s.id));
            if (seatIdx !== -1) {
              newSeats[seatIdx] = { ...newSeats[seatIdx], student_id: student.id };
              usedSeats.add(newSeats[seatIdx].id);
            }
          }

          // Fill any remaining unplaced students with the local algorithm result
          const placedIds = new Set(newSeats.filter(s => s.student_id).map(s => s.student_id));
          const unplaced = students.filter(s => s.is_active !== false && !placedIds.has(s.id) && !lockedIds.has(s.id));
          const emptyAvail = newSeats.filter(s => !s.student_id && !s.is_hidden && !s.is_gap && !s.is_blocked);
          for (let i = 0; i < unplaced.length && i < emptyAvail.length; i++) {
            const idx = newSeats.findIndex(s => s.id === emptyAvail[i].id);
            if (idx !== -1) newSeats[idx] = { ...newSeats[idx], student_id: unplaced[i].id };
          }

          sorted = newSeats;
        }
      } catch {
        // AI failed — keep local result which already has full placement
      }

      setSeats(sorted);
      const placedCount = sorted.filter(s => s.student_id).length;
      const total = students.filter(s => s.is_active !== false).length;
      toast.success(`סידור הושלם! שובצו ${placedCount} מתוך ${total} תלמידים`);
    } catch (err) {
      const sorted = smartSort(seats, students);
      setSeats(sorted);
      toast.success('סידור חכם הושלם!');
    }
    setIsLoading(false);
  }

  function handleQuickSort() {
    const sorted = smartSort(seats, students);
    setSeats(sorted);
    toast.success('סידור מהיר הושלם!');
  }

  function handleClearAll() {
    setSeats(prev => prev.map(s => ({ ...s, student_id: s.is_locked ? s.student_id : null })));
    toast('הסידור נוקה');
  }

  function handleSeatClick(seat) {
    if (quickEditMode) {
      setQuickEditSeat(seat);
      return;
    }
    setSelectedSeat(seat);
  }

  function handleQuickAction(action, payload) {
    if (!quickEditSeat) return;
    setSeats(prev => prev.map(s => {
      if (s.id !== quickEditSeat.id) return s;
      if (action === 'lock') return { ...s, is_locked: !s.is_locked };
      if (action === 'hide') return { ...s, is_hidden: !s.is_hidden, student_id: s.is_hidden ? s.student_id : null };
      if (action === 'gap') return { ...s, is_gap: !s.is_gap, student_id: s.is_gap ? s.student_id : null };
      if (action === 'block') {
        const blocking = payload !== null; // null = unblock
        return { ...s, is_blocked: blocking, block_reason: blocking ? payload : null, student_id: blocking ? null : s.student_id };
      }
      return s;
    }));
    setQuickEditSeat(prev => {
      if (!prev) return null;
      if (action === 'lock') return { ...prev, is_locked: !prev.is_locked };
      if (action === 'hide') return { ...prev, is_hidden: !prev.is_hidden };
      if (action === 'gap') return { ...prev, is_gap: !prev.is_gap };
      if (action === 'block') return { ...prev, is_blocked: payload !== null, block_reason: payload };
      return prev;
    });
  }

  function handleApplyConflictSuggestion(studentId, fromSeatId, toSeatId) {
    handleMoveStu(studentId, fromSeatId, toSeatId);
    toast.success('הצעת הסידור הוחלה');
  }

  function handleToggleLock() {
    if (!selectedSeat) return;
    setSeats(prev => prev.map(s => s.id === selectedSeat.id ? { ...s, is_locked: !s.is_locked } : s));
    setSelectedSeat(prev => prev ? { ...prev, is_locked: !prev.is_locked } : null);
  }

  function handleToggleHide() {
    if (!selectedSeat) return;
    setSeats(prev => prev.map(s => s.id === selectedSeat.id ? { ...s, is_hidden: !s.is_hidden, student_id: s.is_hidden ? s.student_id : null } : s));
    setSelectedSeat(null);
  }

  const satisfactionScore = calcSatisfactionScore(seats, students);
  const seatedIds = new Set(seats.filter(s => s.student_id).map(s => s.student_id));
  const unseatedCount = students.filter(s => s.is_active !== false && !seatedIds.has(s.id)).length;

  const selectedStudent = selectedSeat?.student_id
    ? students.find(s => s.id === selectedSeat.student_id)
    : null;

  const ControlsPanel = (
    <div className="flex flex-col gap-3 p-3">
      <GridControls
        rows={rows} cols={cols}
        onRowsChange={handleRowsChange}
        onColsChange={handleColsChange}
        onSmartSort={handleSmartSort}
        onQuickSort={handleQuickSort}
        onClearAll={handleClearAll}
        showNumbers={showNumbers}
        onToggleNumbers={() => setShowNumbers(v => !v)}
        satisfactionScore={satisfactionScore}
        unseatedCount={unseatedCount}
        isLoading={isLoading}
        seats={seats}
        students={students}
      />
      <ConflictHelper
        seats={seats}
        students={students}
        onApplySuggestion={handleApplyConflictSuggestion}
      />
      <GroupSeatingOptimizer
        seats={seats}
        students={students}
        onApplySeats={setSeats}
      />
      <QuickEditMode
        active={quickEditMode}
        onToggle={() => { setQuickEditMode(v => !v); setQuickEditSeat(null); }}
        onQuickAction={handleQuickAction}
        selectedSeat={quickEditSeat}
      />
      {lastSaved && (
        <p className="text-[10px] text-muted-foreground text-center">
          נשמר {lastSaved.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );

  const StudentsPanel = (
    <div className="p-3 h-full flex flex-col">
      <h3 className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wider">תלמידים</h3>
      <StudentPanel students={students} seats={seats} />
    </div>
  );

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-57px-64px)] relative" dir="rtl">

        {/* Desktop: fixed sidebars */}
        <div className="hidden md:flex w-52 border-l border-border bg-card overflow-y-auto shrink-0 flex-col">
          {ControlsPanel}
        </div>

        {/* Main grid */}
        <div className="flex-1 overflow-auto p-2 md:p-4 relative">
          {/* Mobile floating action buttons */}
          <div className="flex md:hidden gap-2 mb-3 justify-between">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" /> פקדים
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 overflow-y-auto p-0" dir="rtl">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>פקדי כיתה</SheetTitle>
                </SheetHeader>
                {ControlsPanel}
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5">
                  <Users className="w-4 h-4" /> תלמידים
                  {unseatedCount > 0 && (
                    <Badge className="bg-warning text-white text-[10px] px-1.5 py-0">{unseatedCount}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 overflow-y-auto p-0" dir="rtl">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>תלמידים</SheetTitle>
                </SheetHeader>
                {StudentsPanel}
              </SheetContent>
            </Sheet>
          </div>

          <ClassroomGrid
            seats={seats}
            students={students}
            rows={rows}
            cols={cols}
            showNumbers={showNumbers}
            onSeatClick={handleSeatClick}
            onMoveStu={handleMoveStu}
          />
        </div>

        {/* Desktop: right student sidebar */}
        <div className="hidden md:flex w-48 border-r border-border bg-card overflow-hidden flex-col shrink-0">
          {StudentsPanel}
        </div>
      </div>

      {/* Seat detail dialog */}
      <Dialog open={!!selectedSeat} onOpenChange={() => setSelectedSeat(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              מושב {selectedSeat?.row !== undefined ? `שורה ${selectedSeat.row + 1}, עמודה ${selectedSeat.col + 1}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedStudent ? (
              <div className="bg-accent/30 rounded-lg p-3">
                <p className="font-semibold">{selectedStudent.name}</p>
                {selectedStudent.group && <p className="text-xs text-muted-foreground">קבוצה: {selectedStudent.group}</p>}
                {selectedStudent.special_needs?.length > 0 && (
                  <p className="text-xs text-muted-foreground">צרכים: {selectedStudent.special_needs.join(', ')}</p>
                )}
                {selectedStudent.notes && <p className="text-xs text-muted-foreground">{selectedStudent.notes}</p>}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">מושב ריק</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleToggleLock}>
                {selectedSeat?.is_locked ? <Unlock className="w-4 h-4 ml-1" /> : <Lock className="w-4 h-4 ml-1" />}
                {selectedSeat?.is_locked ? 'בטל נעילה' : 'נעל מושב'}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={handleToggleHide}>
                <EyeOff className="w-4 h-4 ml-1" />
                {selectedSeat?.is_hidden ? 'הצג מושב' : 'הסתר מושב'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}