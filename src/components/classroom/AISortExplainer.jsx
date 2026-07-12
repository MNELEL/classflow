import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, ArrowLeft, Users, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getStudentSeat, getDistance, isAdjacent } from '@/lib/seatingUtils';

export default function AISortExplainer({ seats, students, open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [explanations, setExplanations] = useState([]);

  async function generateExplanations() {
    setLoading(true);
    setExplanations([]);
    try {
      const seated = students.filter(s => s.is_active !== false && getStudentSeat(seats, s.id));
      if (seated.length === 0) {
        toast.error('אין תלמידים משובצים בכיתה');
        setLoading(false);
        return;
      }

      const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
      const pairs = [];
      for (const student of seated) {
        const mySeat = getStudentSeat(seats, student.id);
        const neighbors = seats
          .filter(s => s.student_id && isAdjacent(mySeat, s))
          .map(s => studentMap[s.student_id])
          .filter(Boolean);

        if (neighbors.length === 0) continue;

        const friendIds = student.friends || [];
        const avoidIds = student.avoid || [];

        pairs.push({
          student: student.name,
          row: mySeat.row + 1,
          col: mySeat.col + 1,
          neighbors: neighbors.map(n => ({
            name: n.name,
            isFriend: friendIds.includes(n.id),
            isAvoid: avoidIds.includes(n.id),
          })),
          academic_level: student.academic_level,
          special_needs: student.special_needs || [],
        });
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מומחה חינוכי המסביר סידורי ישיבה בכיתה. עבור כל תלמיד, הסבר בקצרה (משפט אחד) למה הוא יושב ליד השכנים שלו והאם המיקום מתאים לו.

הנה רשימת תלמידים והשכנים שלהם:
${JSON.stringify(pairs, null, 2)}

לכל תלמיד, כתוב הסבר קצר וברור בעברית שמציין:
- האם השכנים הם חברים שלו (חיובי) או שמורחקים ממנו (שלילי)
- האם המיקום (שורה) מתאים לרמה האקדמית שלו
- המלצה אם יש בעיה שכדאי לשקול

ענה בפורמט JSON בלבד.`,
        response_json_schema: {
          type: 'object',
          properties: {
            explanations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  student_name: { type: 'string' },
                  explanation: { type: 'string', description: 'הסבר קצר על המיקום והשכנים' },
                  status: { type: 'string', enum: ['good', 'neutral', 'needs_attention'] },
                },
              },
            },
          },
        },
      });

      setExplanations(result?.explanations || []);
    } catch {
      toast.error('שגיאה ביצירת הסברים');
    }
    setLoading(false);
  }

  React.useEffect(() => {
    if (open && explanations.length === 0 && !loading) {
      generateExplanations();
    }
  }, [open]);

  const statusConfig = {
    good: { label: 'מתאים', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: '✓' },
    neutral: { label: 'נייטרלי', color: 'bg-muted text-muted-foreground', icon: '~' },
    needs_attention: { label: 'דרוש תשומת לב', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '⚠' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> הסברי סידור AI
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm">ה-AI מנתח את הסידור ומכין הסברים...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {explanations.map((exp, i) => {
              const cfg = statusConfig[exp.status] || statusConfig.neutral;
              return (
                <div key={i} className="border border-border rounded-xl p-3 space-y-1.5 hover:border-primary/20 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm">{exp.student_name}</span>
                    </div>
                    <Badge className={`text-[10px] border-0 ${cfg.color}`}>{cfg.icon} {cfg.label}</Badge>
                  </div>
                  <p className="text-xs text-foreground/70 leading-relaxed">{exp.explanation}</p>
                </div>
              );
            })}
            {explanations.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-6">אין הסברים זמינים</p>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={generateExplanations}>
              <Sparkles className="w-3.5 h-3.5 ml-1" /> נתח שוב
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}