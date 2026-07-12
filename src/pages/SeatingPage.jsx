import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import ClassroomGrid from '@/components/classroom/ClassroomGrid';
import StudentPanel from '@/components/classroom/StudentPanel';
import GridControls from '@/components/classroom/GridControls';
import ConflictHelper from '@/components/classroom/ConflictHelper';
import QuickEditMode from '@/components/classroom/QuickEditMode';
import GroupSeatingOptimizer from '@/components/classroom/GroupSeatingOptimizer';
import StrategicLeadersOptimizer from '@/components/classroom/StrategicLeadersOptimizer';
import { buildInitialSeats, smartSort, calcSatisfactionScore, getSeatAt } from '@/lib/seatingUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, EyeOff, SlidersHorizontal, Users, BarChart2, GripHorizontal, Box, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import SatisfactionReport from '@/components/classroom/SatisfactionReport';
import AISortExplainer from '@/components/classroom/AISortExplainer';
import PresentationMode3D from '@/components/classroom/PresentationMode3D';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useUrlOverlay } from '@/hooks/useUrlOverlay';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';

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

  const { data: students = [], refetch } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const handleRefresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ['students'] }); }, [qc]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);
  const [seats, setSeats] = useState([]);
  const [showNumbers, setShowNumbers] = useState(false);
  const sheetOverlay = useUrlOverlay('sheet');
  const dialogOverlay = useUrlOverlay('dialog');
  const seatOverlay = useUrlOverlay('seat');
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [quickEditSeat, setQuickEditSeat] = useState(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [showPresentation3D, setShowPresentation3D] = useState(false);

  // Undo / Redo history
  const historyRef = useRef([]);   // past states
  const futureRef  = useRef([]);   // redo states
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo]  = useState(false);

  function pushHistory(prevSeats) {
    historyRef.current = [...historyRef.current.slice(-30), prevSeats];
    futureRef.current  = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function handleUndo() {
    if (!historyRef.current.length) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current  = [seats, ...futureRef.current.slice(0, 30)];
    setSeats(prev);
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
    toast('↩️ פעולה בוטלה');
  }

  function handleRedo() {
    if (!futureRef.current.length) return;
    const next = futureRef.current[0];
    futureRef.current  = futureRef.current.slice(1);
    historyRef.current = [...historyRef.current, seats];
    setSeats(next);
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    toast('↪️ פעולה שוחזרה');
  }

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
      pushHistory(prev);
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
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      // First run the local smart algorithm — this now guarantees full placement
      // Lock fixed-seat students before sorting
      const seatsWithFixed = seats.map(s => s.fixed_seat_number ? { ...s, is_locked: true } : s);
      let sorted = smartSort(seatsWithFixed, students, { atLeastOneSatisfied });

      // Optionally enrich with AI ordering hints
      try {
        const activeStudents = students.filter(s => s.is_active !== false);
        // Include session preference overrides + custom conditions in prompt
        const prefOverrides = (() => { try { return JSON.parse(sessionStorage.getItem('cm_pref_overrides') || '{}'); } catch { return {}; } })();
        const overrideLines = Object.values(prefOverrides).map(o =>
          `  - ${o.student_name}: ${[o.row_preference && `שורה=${o.row_preference}`, o.side_preference && `צד=${o.side_preference}`, o.friends?.length && `חברים=[${o.friends.join(',')}]`, o.avoid?.length && `להרחיק=[${o.avoid.join(',')}]`, o.custom_condition].filter(Boolean).join(', ')}`
        ).join('\n');
        const customCondLines = customConditions.length > 0 ? `\nתנאים מיוחדים נוספים:\n${customConditions.map(c => `- ${c}`).join('\n')}` : '';
        const teacherInstructionsLine = teacherInstructions.trim() ? `\n\n⭐ הוראות מיוחדות מהמורה (עדיפות גבוהה, חובה למלא):\n${teacherInstructions.trim()}` : '';
        const atLeastOneLine = atLeastOneSatisfied ? '\n⚠️ חשוב: כל תלמיד חייב לקבל לפחות דרישה אחת מתוך ההעדפות שלו (מיקום / חבר בסמוך).' : '';

        // Build per-student custom conditions from entity field
        const studentCustomConds = activeStudents.filter(s => s.custom_conditions).map(s => `  - ${s.name}: ${s.custom_conditions}`).join('\n');
        const customCondsSection = studentCustomConds ? `\nתנאים אישיים של תלמידים (חובה לקחת בחשבון):\n${studentCustomConds}` : '';

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `אתה מערכת סידור ישיבה חכמה. יש ${activeStudents.length} תלמידים ו-${rows} שורות ו-${cols} טורים.

תלמידים:
${activeStudents.map(s => `- ${s.name}: גובה=${s.height||'בינוני'}, שורה=${s.row_preference||'אין'}, צרכים=[${(s.special_needs||[]).join(',')}], חברים=[${(s.friends||[]).map(fid=>students.find(x=>x.id===fid)?.name||'').filter(Boolean).join(',')}], להרחיק=[${(s.avoid||[]).map(fid=>students.find(x=>x.id===fid)?.name||'').filter(Boolean).join(',')}], שורה_קבועה=${s.permanent_row||'אין'}${s.custom_conditions ? `, תנאים="${s.custom_conditions}"` : ''}`).join('\n')}
${overrideLines ? `\nהעדפות ייבוא נוספות:\n${overrideLines}` : ''}${customCondsSection}${customCondLines}${atLeastOneLine}${teacherInstructionsLine}

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
          // Preserve locked AND fixed-seat assignments
          const newSeats = seats.map(s => ({
            ...s,
            student_id: ((s.is_locked || s.fixed_seat_number) && !s.is_blocked) ? s.student_id : null
          }));
          const lockedIds = new Set(seats.filter(s => (s.is_locked || s.fixed_seat_number) && !s.is_blocked).map(s => s.student_id));
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

      pushHistory(seats);
      setSeats(sorted);
      const placedCount = sorted.filter(s => s.student_id).length;
      const total = students.filter(s => s.is_active !== false).length;
      toast.success(`הסידור הושלם! שובצו ${placedCount} מתוך ${total} תלמידים`);
    } catch (err) {
      const sorted = smartSort(seats, students);
      setSeats(sorted);
      toast.success('הסידור החכם הושלם!');
    }
    setIsLoading(false);
  }

  const [quickSortPref, setQuickSortPref] = useState('none');
  const [atLeastOneSatisfied, setAtLeastOneSatisfied] = useState(false);
  const [customConditions, setCustomConditions] = useState([]);
  const [teacherInstructions, setTeacherInstructions] = useState('');

  function handleImportPreferences(mappings) {
    // mappings may contain: { student_name, row_preference, side_preference, friends, avoid, custom_condition }
    // or { _custom_condition } for global conditions
    // or { student_name, _bulk_only } for just name registration
    const globals = mappings.filter(m => m._custom_condition);
    if (globals.length > 0) {
      setCustomConditions(prev => [...prev, ...globals.map(g => g._custom_condition)]);
      return;
    }

    // Apply student-level preferences by updating student entities
    // We store them as temporary overrides on the seats/state — actual entity update would need a mutation
    // For now, we'll pass them forward to the smart sort as a prompt addition
    const studentMappings = mappings.filter(m => !m._custom_condition && !m._bulk_only);
    if (studentMappings.length > 0) {
      // Store as session overrides accessible to the AI sort
      const existing = JSON.parse(sessionStorage.getItem('cm_pref_overrides') || '{}');
      studentMappings.forEach(m => {
        if (m.student_name) existing[m.student_name] = m;
      });
      sessionStorage.setItem('cm_pref_overrides', JSON.stringify(existing));
    }
  }

  async function handleQuickSort() {
    pushHistory(seats);
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    const seatsWithFixed = seats.map(s => s.fixed_seat_number ? { ...s, is_locked: true } : s);
    // Apply the selected preference to all students temporarily for this sort only
    const studentsWithPref = quickSortPref === 'none' ? students : students.map(s => ({
      ...s,
      row_preference: ['front','middle','back'].includes(quickSortPref) ? quickSortPref : s.row_preference,
      side_preference: ['left','center','right'].includes(quickSortPref) ? quickSortPref : s.side_preference,
    }));
    const sorted = smartSort(seatsWithFixed, studentsWithPref);
    setSeats(sorted);
    setIsLoading(false);
    toast.success('הסידור המהיר הושלם!');
  }

  function handleClearAll() {
    pushHistory(seats);
    setSeats(prev => prev.map(s => ({ ...s, student_id: (s.is_locked || s.fixed_seat_number) ? s.student_id : null })));
    toast('הסידור נוקה');
  }

  function handleSeatClick(seat) {
    if (quickEditMode) {
      setQuickEditSeat(seat);
      return;
    }
    seatOverlay.open(seat.id);
  }

  function handleQuickAction(action, payload) {
    if (!quickEditSeat) return;
    pushHistory(seats);
    setSeats(prev => {
      const next = prev.map(s => {
        if (s.id !== quickEditSeat.id) return s;
        if (action === 'lock') return { ...s, is_locked: !s.is_locked };
        if (action === 'hide') return { ...s, is_hidden: !s.is_hidden, student_id: s.is_hidden ? s.student_id : null };
        if (action === 'gap') return { ...s, is_gap: !s.is_gap, student_id: s.is_gap ? s.student_id : null };
        if (action === 'block') {
          const blocking = payload !== null;
          return { ...s, is_blocked: blocking, block_reason: blocking ? payload : null, student_id: blocking ? null : s.student_id };
        }
        if (action === 'fixSeat') return { ...s, fixed_seat_number: payload || null, is_locked: payload ? true : s.is_locked };
        if (action === 'lockFixed') return { ...s, is_locked: !s.is_locked };
        if (action === 'pairRight') {
          // Mark this seat as paired with the one to its right → insert visual gap after
          return { ...s, pair_right: !s.pair_right };
        }
        if (action === 'pairDown') {
          return { ...s, pair_down: !s.pair_down };
        }
        if (action === 'colGapAfter') {
          // Apply to ALL seats in this column (any row) for consistent visual aisle
          const targetCol = quickEditSeat.col;
          return { ...s, col_gap_after: s.col === targetCol ? !s.col_gap_after : s.col_gap_after };
        }
        return s;
      });
      return next;
    });
    setQuickEditSeat(prev => {
      if (!prev) return null;
      if (action === 'lock') return { ...prev, is_locked: !prev.is_locked };
      if (action === 'hide') return { ...prev, is_hidden: !prev.is_hidden };
      if (action === 'gap') return { ...prev, is_gap: !prev.is_gap };
      if (action === 'block') return { ...prev, is_blocked: payload !== null, block_reason: payload };
      if (action === 'fixSeat') return { ...prev, fixed_seat_number: payload || null, is_locked: payload ? true : prev.is_locked };
      if (action === 'lockFixed') return { ...prev, is_locked: !prev.is_locked };
      if (action === 'pairRight') return { ...prev, pair_right: !prev.pair_right };
      if (action === 'pairDown') return { ...prev, pair_down: !prev.pair_down };
      if (action === 'colGapAfter') return { ...prev, col_gap_after: !prev.col_gap_after };
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
  }

  function handleToggleHide() {
    if (!selectedSeat) return;
    setSeats(prev => prev.map(s => s.id === selectedSeat.id ? { ...s, is_hidden: !s.is_hidden, student_id: s.is_hidden ? s.student_id : null } : s));
    seatOverlay.close();
  }

  const satisfactionScore = calcSatisfactionScore(seats, students);
  const seatedIds = new Set(seats.filter(s => s.student_id).map(s => s.student_id));
  const unseatedCount = students.filter(s => s.is_active !== false && !seatedIds.has(s.id)).length;

  const selectedSeat = seatOverlay.current ? seats.find(s => s.id === seatOverlay.current) || null : null;

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
        quickSortPref={quickSortPref}
        onQuickSortPrefChange={setQuickSortPref}
        onClearAll={handleClearAll}
        showNumbers={showNumbers}
        onToggleNumbers={() => setShowNumbers(v => !v)}
        satisfactionScore={satisfactionScore}
        unseatedCount={unseatedCount}
        isLoading={isLoading}
        seats={seats}
        students={students}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        atLeastOneSatisfied={atLeastOneSatisfied}
        onToggleAtLeastOne={() => setAtLeastOneSatisfied(v => !v)}
        onImportPreferences={handleImportPreferences}
        teacherInstructions={teacherInstructions}
        onTeacherInstructionsChange={setTeacherInstructions}
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
      <StrategicLeadersOptimizer
        seats={seats}
        students={students}
        rows={rows}
        cols={cols}
        onApplySeats={setSeats}
      />
      <QuickEditMode
        active={quickEditMode}
        onToggle={() => { setQuickEditMode(v => !v); setQuickEditSeat(null); }}
        onQuickAction={handleQuickAction}
        selectedSeat={quickEditSeat}
        seats={seats}
        students={students}
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
      <div className="flex relative" style={{ height: 'calc(100dvh - 121px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))', minHeight: 0 }} dir="rtl">

        {/* Desktop: fixed sidebars */}
        <div className="hidden md:flex w-52 border-l border-border bg-card overflow-y-auto shrink-0 flex-col">
          {ControlsPanel}
        </div>

        {/* Main grid */}
        <div ref={containerRef} data-pull-to-refresh className="flex-1 overflow-x-auto p-2 md:p-4 relative min-w-0" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
          <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
          {/* Mobile horizontal scroll hint */}
          <div className="md:hidden text-center text-[10px] text-muted-foreground/60 mb-1">
            ← גלול לצפייה בכל הכיתה →
          </div>
          {/* Mobile floating action buttons — bottom drawer triggers */}
          <div className="flex md:hidden gap-2 mb-3 justify-between">
            <Drawer open={sheetOverlay.isOpen('controls')} onOpenChange={(open) => open ? sheetOverlay.open('controls') : sheetOverlay.close()}>
              <DrawerTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5">
                  <SlidersHorizontal className="w-4 h-4" /> פקדים
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[75vh] overflow-y-auto" dir="rtl">
                <DrawerHeader className="pb-1 pt-2">
                  <DrawerTitle className="flex items-center gap-2 text-sm">
                    <GripHorizontal className="w-4 h-4 text-muted-foreground" /> פקדי כיתה
                  </DrawerTitle>
                </DrawerHeader>
                {ControlsPanel}
              </DrawerContent>
            </Drawer>

            <Drawer open={sheetOverlay.isOpen('students')} onOpenChange={(open) => open ? sheetOverlay.open('students') : sheetOverlay.close()}>
              <DrawerTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5">
                  <Users className="w-4 h-4" /> תלמידים
                  {unseatedCount > 0 && (
                    <Badge className="bg-warning text-white text-[10px] px-1.5 py-0">{unseatedCount}</Badge>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[75vh] overflow-y-auto" dir="rtl">
                <DrawerHeader className="pb-1 pt-2">
                  <DrawerTitle className="flex items-center gap-2 text-sm">
                    <GripHorizontal className="w-4 h-4 text-muted-foreground" /> תלמידים
                  </DrawerTitle>
                </DrawerHeader>
                {StudentsPanel}
              </DrawerContent>
            </Drawer>
          </div>

          {/* Satisfaction score bar + presentation mode */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${satisfactionScore >= 80 ? 'text-green-600' : satisfactionScore >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                {satisfactionScore}%
              </span>
              <span className="text-xs text-muted-foreground">שביעות רצון</span>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => setShowExplainer(true)}>
                <Sparkles className="w-3.5 h-3.5" /> הסברי AI
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => dialogOverlay.open('satisfaction')}>
                <BarChart2 className="w-3.5 h-3.5" /> דוח
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => setShowPresentation3D(true)}>
                <Box className="w-3.5 h-3.5" /> 3D
              </Button>
            </div>
          </div>

          <ClassroomGrid
            seats={seats}
            students={students}
            rows={rows}
            cols={cols}
            showNumbers={showNumbers}
            onSeatClick={handleSeatClick}
            onMoveStu={handleMoveStu}
            teacherView={true}
          />
        </div>

        {/* Desktop: right student sidebar */}
        <div className="hidden md:flex w-48 border-r border-border bg-card overflow-hidden flex-col shrink-0">
          {StudentsPanel}
        </div>
      </div>

      {/* Satisfaction Report Dialog */}
      <Dialog open={dialogOverlay.isOpen('satisfaction')} onOpenChange={(open) => open ? dialogOverlay.open('satisfaction') : dialogOverlay.close()}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> דוח שביעות רצון — ניקוד סידור
            </DialogTitle>
          </DialogHeader>
          <SatisfactionReport seats={seats} students={students} />
        </DialogContent>
      </Dialog>

      {/* AI Sort Explainer */}
      <AISortExplainer
        seats={seats}
        students={students}
        open={showExplainer}
        onOpenChange={setShowExplainer}
      />

      {/* 3D Presentation Mode */}
      <PresentationMode3D
        seats={seats}
        students={students}
        rows={rows}
        cols={cols}
        open={showPresentation3D}
        onClose={() => setShowPresentation3D(false)}
      />

      {/* Seat detail dialog */}
      <Dialog open={!!selectedSeat} onOpenChange={() => seatOverlay.close()}>
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
                {selectedStudent.custom_conditions && (
                  <p className="text-xs text-amber-700 mt-1 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 rounded px-2 py-1">📌 {selectedStudent.custom_conditions}</p>
                )}
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