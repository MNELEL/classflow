import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Shuffle, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getStudentSeat, getDistance } from '@/lib/seatingUtils';

const LEVEL_PRIORITY = { excellent: 5, strong: 4, above_average: 3, average: 2, below_average: 1, weak: 0 };

/**
 * Calculates 4-5 strategic anchor positions spread across the classroom grid.
 * Returns seat objects from the available seats.
 */
function calcStrategicPositions(seats, rows, cols, count = 5) {
  const avail = seats.filter(s => !s.is_hidden && !s.is_gap && !s.is_blocked);
  if (avail.length === 0) return [];

  // Divide the classroom into a count×1 or 2×3 grid and pick the central seat of each zone
  const positions = [];

  if (count <= 4) {
    // 2×2 quadrants
    const zones = [
      { rMin: 0, rMax: Math.floor(rows / 2) - 1, cMin: 0, cMax: Math.floor(cols / 2) - 1 },
      { rMin: 0, rMax: Math.floor(rows / 2) - 1, cMin: Math.ceil(cols / 2), cMax: cols - 1 },
      { rMin: Math.ceil(rows / 2), rMax: rows - 1, cMin: 0, cMax: Math.floor(cols / 2) - 1 },
      { rMin: Math.ceil(rows / 2), rMax: rows - 1, cMin: Math.ceil(cols / 2), cMax: cols - 1 },
    ].slice(0, count);

    for (const z of zones) {
      const midR = Math.round((z.rMin + z.rMax) / 2);
      const midC = Math.round((z.cMin + z.cMax) / 2);
      // Find closest available seat to zone center
      const candidates = avail.filter(s => s.row >= z.rMin && s.row <= z.rMax && s.col >= z.cMin && s.col <= z.cMax);
      if (candidates.length === 0) continue;
      candidates.sort((a, b) => Math.abs(a.row - midR) + Math.abs(a.col - midC) - (Math.abs(b.row - midR) + Math.abs(b.col - midC)));
      positions.push(candidates[0]);
    }
  } else {
    // For 5: center + 4 corners (offset inward)
    const pad = 1;
    const anchors = [
      { r: Math.floor(rows / 2), c: Math.floor(cols / 2) },           // center
      { r: pad, c: pad },                                                // top-right
      { r: pad, c: cols - 1 - pad },                                    // top-left
      { r: rows - 1 - pad, c: pad },                                    // bottom-right
      { r: rows - 1 - pad, c: cols - 1 - pad },                        // bottom-left
    ];
    for (const anchor of anchors) {
      const candidates = [...avail].sort((a, b) =>
        Math.abs(a.row - anchor.r) + Math.abs(a.col - anchor.c) -
        (Math.abs(b.row - anchor.r) + Math.abs(b.col - anchor.c))
      );
      const pick = candidates.find(s => !positions.some(p => p.id === s.id));
      if (pick) positions.push(pick);
    }
  }

  return positions;
}

export default function StrategicLeadersOptimizer({ seats, students, rows, cols, onApplySeats }) {
  const [open, setOpen] = useState(false);
  const [selectedLeaders, setSelectedLeaders] = useState([]);
  const [leaderCount, setLeaderCount] = useState(5);
  const [applied, setApplied] = useState(false);

  // Students sorted by academic level
  const rankedStudents = useMemo(() =>
    [...students.filter(s => s.is_active !== false)].sort((a, b) =>
      (LEVEL_PRIORITY[b.academic_level] ?? 2) - (LEVEL_PRIORITY[a.academic_level] ?? 2)
    ), [students]);

  const topStudents = rankedStudents.slice(0, 8); // top 8 to choose from

  function toggleLeader(id) {
    setSelectedLeaders(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < leaderCount ? [...prev, id] : prev
    );
  }

  function autoSelectLeaders() {
    const auto = rankedStudents
      .filter(s => (LEVEL_PRIORITY[s.academic_level] ?? 2) >= 3)
      .slice(0, leaderCount)
      .map(s => s.id);
    setSelectedLeaders(auto);
  }

  function applyStrategicLayout() {
    if (selectedLeaders.length === 0) {
      toast.error('בחר לפחות תלמיד אחד');
      return;
    }

    const positions = calcStrategicPositions(seats, rows, cols, selectedLeaders.length);

    if (positions.length < selectedLeaders.length) {
      toast.error('אין מספיק מושבים פנויים לפיזור האסטרטגי');
      return;
    }

    // Spread leaders across strategic positions — maximize distance between them
    const leaderStudents = selectedLeaders.map(id => students.find(s => s.id === id)).filter(Boolean);

    // Sort positions and leaders: pair strongest to center (positions[0])
    const sortedLeaders = [...leaderStudents].sort((a, b) =>
      (LEVEL_PRIORITY[b.academic_level] ?? 2) - (LEVEL_PRIORITY[a.academic_level] ?? 2)
    );

    const newSeats = seats.map(s => {
      // Remove leaders from wherever they are now (if not locked)
      if (selectedLeaders.includes(s.student_id) && !s.is_locked) {
        return { ...s, student_id: null };
      }
      return s;
    });

    // Place each leader in their strategic position
    positions.forEach((pos, i) => {
      const leader = sortedLeaders[i];
      if (!leader) return;
      const idx = newSeats.findIndex(s => s.id === pos.id);
      if (idx !== -1) {
        // If someone is in that seat (non-leader, non-locked), displace them
        const displaced = newSeats[idx].student_id;
        newSeats[idx] = { ...newSeats[idx], student_id: leader.id };

        // Find the displaced student an empty seat
        if (displaced && !selectedLeaders.includes(displaced)) {
          const empty = newSeats.find(s => !s.student_id && !s.is_hidden && !s.is_gap && !s.is_blocked && !s.is_locked);
          if (empty) {
            const ei = newSeats.findIndex(s => s.id === empty.id);
            newSeats[ei] = { ...newSeats[ei], student_id: displaced };
          }
        }
      }
    });

    onApplySeats(newSeats);
    setApplied(true);
    toast.success(`${sortedLeaders.length} תלמידים מובילים שובצו אסטרטגית!`);
    setOpen(false);
  }

  const LEVEL_LABELS = {
    excellent: { label: 'מצטיין ⭐', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    strong: { label: 'חזק 🟢', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
    above_average: { label: 'מעל ממוצע 🔵', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
    average: { label: 'בינוני 🟡', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' },
  };

  const strategicSeats = useMemo(() =>
    calcStrategicPositions(seats, rows, cols, leaderCount),
    [seats, rows, cols, leaderCount]
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20 dark:border-purple-700 dark:text-purple-400"
        onClick={() => { setOpen(true); setApplied(false); }}
      >
        <Crown className="w-3.5 h-3.5" />
        פיזור מובילים אסטרטגי
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-600" />
              פיזור מובילים אסטרטגי
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-xs text-purple-800 dark:text-purple-300 flex gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>האלגוריתם יפזר את המובילים שתבחר בנקודות אסטרטגיות בכיתה כדי ליצור אווירת לימוד רצינית בכל פינה.</p>
            </div>

            {/* Leader count */}
            <div>
              <label className="text-xs font-semibold block mb-2">כמה מובילים לפזר?</label>
              <div className="flex gap-2">
                {[4, 5].map(n => (
                  <button key={n} onClick={() => { setLeaderCount(n); setSelectedLeaders(prev => prev.slice(0, n)); }}
                    className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${leaderCount === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                    {n} מובילים
                  </button>
                ))}
              </div>
            </div>

            {/* Strategic positions preview */}
            <div>
              <label className="text-xs font-semibold block mb-2">
                מיקומים אסטרטגיים בכיתה ({strategicSeats.length} נקודות)
              </label>
              <div className="bg-muted/30 rounded-xl p-3">
                <div className="text-center text-[10px] text-muted-foreground bg-muted rounded-md py-1 mb-2">🖥️ לוח המורה</div>
                <div
                  className="grid gap-0.5 mx-auto"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, maxWidth: '240px' }}
                >
                  {Array.from({ length: rows }).map((_, r) =>
                    Array.from({ length: cols }).map((_, c) => {
                      const isStrategic = strategicSeats.some(s => s.row === r && s.col === c);
                      const seat = seats.find(s => s.row === r && s.col === c);
                      const isHidden = seat?.is_hidden || seat?.is_gap;
                      return (
                        <div key={`${r}-${c}`}
                          className={`h-4 rounded-sm border transition-colors ${isHidden ? 'border-transparent' : isStrategic ? 'bg-purple-500 border-purple-600' : 'bg-muted/60 border-border'}`}
                        />
                      );
                    })
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span className="w-3 h-3 rounded-sm bg-purple-500 shrink-0" /> נקודות פיזור אסטרטגי
                </div>
              </div>
            </div>

            {/* Student selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold">בחר מובילים ({selectedLeaders.length}/{leaderCount})</label>
                <button onClick={autoSelectLeaders} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  <Shuffle className="w-3 h-3" /> בחר אוטומטית
                </button>
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {rankedStudents.map(s => {
                  const lvl = LEVEL_LABELS[s.academic_level];
                  const selected = selectedLeaders.includes(s.id);
                  const disabled = !selected && selectedLeaders.length >= leaderCount;
                  return (
                    <button key={s.id} onClick={() => !disabled && toggleLeader(s.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors ${
                        selected ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' :
                        disabled ? 'border-border opacity-40 cursor-not-allowed' :
                        'border-border hover:border-primary/40'
                      }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-purple-500 bg-purple-500' : 'border-muted-foreground'}`}>
                          {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="font-medium">{s.name}</span>
                      </div>
                      {lvl && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${lvl.color}`}>{lvl.label}</span>
                      )}
                    </button>
                  );
                })}
                {rankedStudents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">אין תלמידים פעילים</p>
                )}
              </div>
            </div>

            {/* Apply */}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" onClick={applyStrategicLayout} disabled={selectedLeaders.length === 0}>
                <Crown className="w-4 h-4 ml-1" /> שבץ {selectedLeaders.length} מובילים
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>ביטול</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}