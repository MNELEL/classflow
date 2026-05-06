import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Wand2, Loader2, Shuffle } from 'lucide-react';
import { detectConflicts, isAdjacent, getStudentSeat } from '@/lib/seatingUtils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function getConflictingSeats(seats, students) {
  return seats.filter(seat => {
    if (!seat.student_id || seat.is_hidden) return false;
    return detectConflicts(seat, seats, students).type === 'conflict';
  });
}

export default function ConflictHelper({ seats, students, onApplySuggestion }) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');

  const conflictSeats = getConflictingSeats(seats, students);

  async function generateAISuggestions() {
    setLoading(true);
    setSuggestions([]);
    setAiExplanation('');
    setOpen(true);

    try {
      const conflictDetails = conflictSeats.map(seat => {
        const student = students.find(s => s.id === seat.student_id);
        const avoidNames = (student?.avoid || [])
          .map(aid => students.find(s => s.id === aid)?.name)
          .filter(Boolean);
        const adjacentOccupied = seats.filter(s => s.student_id && isAdjacent(seat, s));
        const conflictingNeighbors = adjacentOccupied
          .filter(s => student?.avoid?.includes(s.student_id))
          .map(s => students.find(st => st.id === s.student_id)?.name)
          .filter(Boolean);
        return {
          student_name: student?.name,
          seat_row: seat.row,
          seat_col: seat.col,
          avoid_names: avoidNames,
          conflicting_neighbors: conflictingNeighbors,
          row_preference: student?.row_preference || 'none',
          friends: (student?.friends || []).map(fid => students.find(s => s.id === fid)?.name).filter(Boolean),
        };
      });

      const emptySeats = seats.filter(s => !s.student_id && !s.is_hidden && !s.is_gap && !s.is_blocked);
      const occupiedSeats = seats.filter(s => s.student_id && !s.is_locked && !s.is_hidden);
      const totalRows = Math.max(...seats.map(s => s.row)) + 1;
      const totalCols = Math.max(...seats.map(s => s.col)) + 1;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מומחה לסידורי ישיבה בכיתה. עליך לפתור קונפליקטים בין תלמידים שיושבים בצמוד אחד לשני למרות שצריך להפריד ביניהם.

גודל הכיתה: ${totalRows} שורות × ${totalCols} טורים.

קונפליקטים קיימים:
${conflictDetails.map(c => `• ${c.student_name} (מושב שורה ${c.seat_row + 1} טור ${c.seat_col + 1}): קונפליקט עם [${c.conflicting_neighbors.join(', ')}], העדפת שורה: ${c.row_preference}, חברים: [${c.friends.join(', ')}]`).join('\n')}

מושבים פנויים: ${emptySeats.map(s => `(${s.row + 1},${s.col + 1})`).join(', ')}

מושבים תפוסים (ניתן להחלפה): ${occupiedSeats.map(s => {
  const st = students.find(x => x.id === s.student_id);
  return `(${s.row + 1},${s.col + 1})=${st?.name || '?'}`;
}).join(', ')}

הצע עד 5 פתרונות קונקרטיים. כל פתרון מזיז תלמיד אחד למושב אחר (פנוי או החלפה עם תלמיד אחר).
עדיפות: להעביר למושב פנוי תוך שמירת העדפות. אם אין אפשרות — הצע החלפה.
הסבר בקצרה למה כל הצעה טובה.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  student_name: { type: 'string' },
                  from_row: { type: 'number' },
                  from_col: { type: 'number' },
                  to_row: { type: 'number' },
                  to_col: { type: 'number' },
                  reason: { type: 'string' },
                  score: { type: 'number' },
                },
              },
            },
          },
        },
      });

      if (result?.suggestions?.length > 0) {
        const resolved = result.suggestions.map(s => {
          const student = students.find(x => x.name === s.student_name);
          const fromSeat = seats.find(x => x.row === s.from_row - 1 && x.col === s.from_col - 1);
          const toSeat = seats.find(x => x.row === s.to_row - 1 && x.col === s.to_col - 1);
          if (!student || !fromSeat || !toSeat) return null;
          return {
            student,
            fromSeat,
            toSeat,
            reason: s.reason,
            score: s.score ?? 80,
          };
        }).filter(Boolean);

        setSuggestions(resolved);
        setAiExplanation(result.summary || '');
      } else {
        toast.error('ה-AI לא מצא פתרונות מתאימים');
      }
    } catch {
      toast.error('שגיאה בקבלת הצעות AI — נסה שוב');
    }
    setLoading(false);
  }

  function applySuggestion(s) {
    onApplySuggestion(s.student.id, s.fromSeat.id, s.toSeat.id);
    toast.success(`הועבר: ${s.student.name}`);
    setOpen(false);
  }

  if (conflictSeats.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
        onClick={generateAISuggestions}
      >
        <Wand2 className="w-3.5 h-3.5 ml-1" />
        פתור {conflictSeats.length} קונפליקטים (AI)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> פתרון קונפליקטים בעזרת AI
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm">ה-AI מנתח את הכיתה ומחפש פתרונות...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">אין הצעות זמינות</p>
          ) : (
            <div className="space-y-3">
              {aiExplanation && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                  💡 {aiExplanation}
                </div>
              )}
              {suggestions.map((s, i) => (
                <div key={i} className="border border-border rounded-xl p-3 space-y-2 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{s.student.name}</span>
                    <Badge
                      className={
                        s.score >= 80 ? 'bg-emerald-500 text-white' :
                        s.score >= 55 ? 'bg-yellow-500 text-white' :
                        'bg-orange-400 text-white'
                      }
                    >
                      {s.score >= 80 ? '✓ מומלץ' : s.score >= 55 ? 'סביר' : 'חלקי'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    שורה {s.fromSeat.row + 1}, טור {s.fromSeat.col + 1} → שורה {s.toSeat.row + 1}, טור {s.toSeat.col + 1}
                  </p>
                  {s.reason && (
                    <p className="text-xs text-foreground/70 bg-muted/40 rounded-md px-2 py-1">{s.reason}</p>
                  )}
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