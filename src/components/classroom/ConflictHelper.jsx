import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Shuffle } from 'lucide-react';
import { detectConflicts, getDistance, isAdjacent, getStudentSeat } from '@/lib/seatingUtils';

function getConflictingSeats(seats, students) {
  return seats.filter(seat => {
    if (!seat.student_id || seat.is_hidden) return false;
    const c = detectConflicts(seat, seats, students);
    return c.type === 'conflict';
  });
}

export default function ConflictHelper({ seats, students, onApplySuggestion }) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const conflictSeats = getConflictingSeats(seats, students);

  function generateSuggestions() {
    const results = [];
    for (const confSeat of conflictSeats) {
      const student = students.find(s => s.id === confSeat.student_id);
      if (!student) continue;

      // Find available empty seats
      const emptySeats = seats.filter(s => !s.student_id && !s.is_hidden && !s.is_gap && s.id !== confSeat.id);
      const scored = emptySeats.map(emptySeat => {
        let score = 100;
        // Penalty: if avoid is adjacent in new position
        if (student.avoid) {
          for (const aid of student.avoid) {
            const avoidSeat = getStudentSeat(seats, aid);
            if (avoidSeat && isAdjacent(emptySeat, avoidSeat)) score -= 40;
          }
        }
        // Bonus: friends nearby
        if (student.friends) {
          for (const fid of student.friends) {
            const friendSeat = getStudentSeat(seats, fid);
            if (friendSeat && isAdjacent(emptySeat, friendSeat)) score += 20;
          }
        }
        // Row preference
        const totalRows = Math.max(...seats.map(s => s.row)) + 1;
        if (student.row_preference === 'front') score += (totalRows - emptySeat.row) * 5;
        else if (student.row_preference === 'back') score += emptySeat.row * 5;
        return { seat: emptySeat, score };
      }).sort((a, b) => b.score - a.score).slice(0, 2);

      for (const { seat: targetSeat, score } of scored) {
        results.push({
          student,
          fromSeat: confSeat,
          toSeat: targetSeat,
          matchScore: Math.min(100, Math.max(0, score)),
        });
      }
    }
    setSuggestions(results.slice(0, 6));
    setOpen(true);
  }

  function applySuggestion(s) {
    onApplySuggestion(s.student.id, s.fromSeat.id, s.toSeat.id);
    setOpen(false);
  }

  if (conflictSeats.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-red-300 text-red-600 hover:bg-red-50"
        onClick={generateSuggestions}
      >
        <AlertTriangle className="w-3.5 h-3.5 ml-1" />
        פתור {conflictSeats.length} קונפליקטים
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shuffle className="w-4 h-4" /> הצעות לפתרון קונפליקטים
            </DialogTitle>
          </DialogHeader>
          {suggestions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">אין מושבים פנויים מתאימים</p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div key={i} className="border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{s.student.name}</span>
                    <Badge
                      className={
                        s.matchScore >= 75 ? 'bg-green-500 text-white' :
                        s.matchScore >= 40 ? 'bg-yellow-500 text-white' :
                        'bg-orange-400 text-white'
                      }
                    >
                      {s.matchScore >= 75 ? 'מתאים מאוד' : s.matchScore >= 40 ? 'חצי מתאים' : 'רבע מתאים'}
                      {' '}({s.matchScore}%)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    מושב {s.fromSeat.row + 1}/{s.fromSeat.col + 1} → שורה {s.toSeat.row + 1}, טור {s.toSeat.col + 1}
                  </p>
                  <Button size="sm" className="w-full" onClick={() => applySuggestion(s)}>
                    <CheckCircle2 className="w-3.5 h-3.5 ml-1" /> החל הצעה זו
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}