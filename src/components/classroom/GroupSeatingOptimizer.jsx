import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, Wand2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { loadGroups, getGroupTypeLabel, getGroupTypeColor } from '@/components/students/GroupsManager';
import { getStudentSeat, getDistance } from '@/lib/seatingUtils';

export default function GroupSeatingOptimizer({ seats, students, onApplySeats }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [aiSummary, setAiSummary] = useState('');

  const groups = loadGroups();

  if (groups.length === 0) return null;

  // Analyze current group satisfaction
  function analyzeGroups() {
    return groups.map(g => {
      const members = students.filter(s =>
        s.learning_group === g.name || s.group === g.name
      );
      const seated = members.filter(s => getStudentSeat(seats, s.id));
      if (seated.length < 2) return { group: g, satisfied: true, issues: [] };

      const issues = [];
      if (g.type === 'together' || g.type === 'task') {
        // Check if members are close (distance <= 2)
        for (let i = 0; i < seated.length; i++) {
          for (let j = i + 1; j < seated.length; j++) {
            const seatA = getStudentSeat(seats, seated[i].id);
            const seatB = getStudentSeat(seats, seated[j].id);
            if (seatA && seatB && getDistance(seatA, seatB) > 2) {
              issues.push(`${seated[i].name} ו-${seated[j].name} רחוקים מדי`);
            }
          }
        }
      } else if (g.type === 'separate') {
        for (let i = 0; i < seated.length; i++) {
          for (let j = i + 1; j < seated.length; j++) {
            const seatA = getStudentSeat(seats, seated[i].id);
            const seatB = getStudentSeat(seats, seated[j].id);
            if (seatA && seatB && getDistance(seatA, seatB) < 3) {
              issues.push(`${seated[i].name} ו-${seated[j].name} קרובים מדי`);
            }
          }
        }
      }
      return { group: g, members, seated, issues, satisfied: issues.length === 0 };
    });
  }

  const analysis = analyzeGroups();
  const problemGroups = analysis.filter(a => a.issues.length > 0);

  async function runAIOptimization() {
    setLoading(true);
    setProposals([]);
    setAiSummary('');
    setOpen(true);

    try {
      const totalRows = Math.max(...seats.map(s => s.row)) + 1;
      const totalCols = Math.max(...seats.map(s => s.col)) + 1;

      const groupsDesc = groups.map(g => {
        const members = students.filter(s => s.learning_group === g.name || s.group === g.name);
        const memberSeats = members.map(m => {
          const seat = getStudentSeat(seats, m.id);
          return seat ? `${m.name}(${seat.row + 1},${seat.col + 1})` : `${m.name}(לא משובץ)`;
        });
        return `קבוצה "${g.name}" [${getGroupTypeLabel(g.type)}]: ${memberSeats.join(', ')}`;
      }).join('\n');

      const problemsDesc = problemGroups.map(a =>
        `• קבוצת "${a.group.name}": ${a.issues.join('; ')}`
      ).join('\n');

      const emptySeats = seats.filter(s => !s.student_id && !s.is_hidden && !s.is_gap && !s.is_blocked);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מומחה לסידורי ישיבה. יש לך כיתה בגודל ${totalRows}×${totalCols}.

מצב קבוצות נוכחי:
${groupsDesc}

בעיות שזוהו:
${problemsDesc || 'לא זוהו בעיות'}

מושבים פנויים: ${emptySeats.map(s => `(${s.row + 1},${s.col + 1})`).join(', ') || 'אין'}

כל התלמידים: ${seats.filter(s => s.student_id).map(s => {
  const st = students.find(x => x.id === s.student_id);
  return `${st?.name}(${s.row + 1},${s.col + 1})`;
}).join(', ')}

משימה: הצע החלפות מושבים שיביאו לכך שקבוצות מסוג "יחד/משימה" ישבו בטווח של 1-2 מושבים זה מזה, ו"רחוק" יהיו במרחק 3+ מושבים.
הצע עד 6 החלפות ספציפיות. כל החלפה מזיזה תלמיד אחד.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            moves: {
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
                  group_name: { type: 'string' },
                },
              },
            },
          },
        },
      });

      if (result?.moves?.length > 0) {
        const resolved = result.moves.map(m => {
          const student = students.find(s => s.name === m.student_name);
          const fromSeat = seats.find(s => s.row === m.from_row - 1 && s.col === m.from_col - 1);
          const toSeat = seats.find(s => s.row === m.to_row - 1 && s.col === m.to_col - 1);
          if (!student || !fromSeat || !toSeat) return null;
          return { student, fromSeat, toSeat, reason: m.reason, groupName: m.group_name };
        }).filter(Boolean);

        setProposals(resolved);
        setAiSummary(result.summary || '');
      } else {
        setAiSummary(result?.summary || 'ה-AI לא מצא שינויים נדרשים — הסידור הנוכחי תקין!');
      }
    } catch {
      toast.error('שגיאה בניתוח AI');
    }
    setLoading(false);
  }

  function applyAll() {
    // Build new seats with all moves applied
    let newSeats = seats.map(s => ({ ...s }));
    for (const p of proposals) {
      const toSeat = newSeats.find(s => s.id === p.toSeat.id);
      const fromSeat = newSeats.find(s => s.id === p.fromSeat.id);
      if (!toSeat || !fromSeat) continue;
      // Swap if target occupied, else just move
      const targetStudentId = toSeat.student_id;
      toSeat.student_id = p.student.id;
      fromSeat.student_id = targetStudentId || null;
    }
    onApplySeats(newSeats);
    toast.success(`הוחלו ${proposals.length} שינויים!`);
    setOpen(false);
  }

  function applySingle(p) {
    let newSeats = seats.map(s => ({ ...s }));
    const toSeat = newSeats.find(s => s.id === p.toSeat.id);
    const fromSeat = newSeats.find(s => s.id === p.fromSeat.id);
    if (toSeat && fromSeat) {
      const targetStudentId = toSeat.student_id;
      toSeat.student_id = p.student.id;
      fromSeat.student_id = targetStudentId || null;
    }
    onApplySeats(newSeats);
    toast.success(`הועבר: ${p.student.name}`);
    setOpen(false);
  }

  const hasProblems = problemGroups.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`w-full gap-1.5 ${hasProblems ? 'border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20' : 'text-muted-foreground'}`}
        onClick={runAIOptimization}
      >
        <Users className="w-3.5 h-3.5" />
        {hasProblems ? `⚠️ אופטימיזציית קבוצות (${problemGroups.length})` : 'אופטימיזציית קבוצות (AI)'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> אופטימיזציית ישיבת קבוצות
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm">ה-AI בודק את הקבוצות ומחפש שיפורים...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group status summary */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">סטטוס קבוצות</p>
                {analysis.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getGroupTypeColor(a.group.type)}`}>
                        {getGroupTypeLabel(a.group.type)}
                      </span>
                      <span className="text-sm font-medium">{a.group.name}</span>
                    </div>
                    {a.satisfied
                      ? <span className="text-[11px] text-emerald-600 font-medium">✓ תקין</span>
                      : <span className="text-[11px] text-red-500 font-medium">⚠️ {a.issues.length} בעיות</span>
                    }
                  </div>
                ))}
              </div>

              {aiSummary && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-muted-foreground">
                  💡 {aiSummary}
                </div>
              )}

              {proposals.length > 0 && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">הצעות שינוי</p>
                    {proposals.map((p, i) => (
                      <div key={i} className="border border-border rounded-xl p-3 space-y-2 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">{p.student.name}</p>
                            {p.groupName && (
                              <span className="text-[10px] text-muted-foreground">קבוצת {p.groupName}</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground text-left shrink-0 flex items-center gap-1">
                            <span className="bg-muted rounded px-1.5 py-0.5">{p.fromSeat.row + 1},{p.fromSeat.col + 1}</span>
                            <ArrowLeft className="w-3 h-3" />
                            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5">{p.toSeat.row + 1},{p.toSeat.col + 1}</span>
                          </div>
                        </div>
                        {p.reason && (
                          <p className="text-xs text-foreground/70 bg-muted/40 rounded-md px-2 py-1">{p.reason}</p>
                        )}
                        <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => applySingle(p)}>
                          <CheckCircle2 className="w-3 h-3 ml-1" /> החל רק זה
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full" onClick={applyAll}>
                    <Wand2 className="w-4 h-4 ml-1" /> החל את כל השינויים ({proposals.length})
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}