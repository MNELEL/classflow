import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import ClassroomGrid from '@/components/classroom/ClassroomGrid';
import StudentPanel from '@/components/classroom/StudentPanel';
import GridControls from '@/components/classroom/GridControls';
import { buildInitialSeats, smartSort, calcSatisfactionScore, getSeatAt } from '@/lib/seatingUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, EyeOff } from 'lucide-react';
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

  // Smart AI sort
  async function handleSmartSort() {
    if (students.length === 0) {
      toast.error('אין תלמידים לסידור');
      return;
    }
    setIsLoading(true);
    try {
      // Use InvokeLLM for AI-enhanced sorting
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מערכת לסידור ישיבה בכיתה. 
        
קיימים ${students.length} תלמידים עם האילוצים הבאים:
${students.map(s => `
- ${s.name}: גובה=${s.height || 'בינוני'}, העדפת שורה=${s.row_preference || 'אין'}, צרכים מיוחדים=[${(s.special_needs || []).join(',')}], חברים=[${(s.friends || []).map(fid => students.find(x => x.id === fid)?.name || fid).join(',')}], להרחיק=[${(s.avoid || []).map(fid => students.find(x => x.id === fid)?.name || fid).join(',')}]
`).join('')}

מספר שורות: ${rows}, מספר טורים: ${cols}

ספק סידור אופטימלי. החזר JSON עם שדה "assignments" - מערך של אובייקטים עם: student_name, row (0-based), col (0-based).

כללים:
1. תלמידים עם בעיות ראייה/שמיעה - שורה ראשונה
2. תלמידים גבוהים - שורות אחוריות  
3. כבד העדפות חברים (תלמידים שרוצים לשבת יחד - שים אותם בצמוד)
4. הפרד תלמידים שצריך להפריד`,
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

      if (result?.assignments) {
        const newSeats = seats.map(s => ({ ...s, student_id: s.is_locked ? s.student_id : null }));
        const lockedIds = new Set(seats.filter(s => s.is_locked).map(s => s.student_id));
        
        for (const a of result.assignments) {
          const student = students.find(s => s.name === a.student_name);
          if (!student || lockedIds.has(student.id)) continue;
          const seatIdx = newSeats.findIndex(s => s.row === a.row && s.col === a.col && !s.student_id && !s.is_hidden);
          if (seatIdx !== -1) {
            newSeats[seatIdx] = { ...newSeats[seatIdx], student_id: student.id };
          }
        }
        setSeats(newSeats);
        toast.success('סידור AI הושלם!');
      }
    } catch (err) {
      // Fallback to local algorithm
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
    setSelectedSeat(seat);
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

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-57px)]" dir="rtl">
        {/* Right sidebar - controls */}
        <div className="w-52 border-l border-border bg-card p-3 flex flex-col gap-3 overflow-y-auto shrink-0">
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
          />
          {lastSaved && (
            <p className="text-[10px] text-muted-foreground text-center">
              נשמר אוטומטית {lastSaved.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Main grid */}
        <div className="flex-1 overflow-auto p-4">
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

        {/* Left sidebar - student panel */}
        <div className="w-48 border-r border-border bg-card p-3 overflow-hidden flex flex-col shrink-0">
          <h3 className="text-xs font-bold mb-2 text-muted-foreground uppercase tracking-wider">תלמידים</h3>
          <StudentPanel
            students={students}
            seats={seats}
          />
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