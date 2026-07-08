import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { parseUnstructuredText } from '@/lib/parseStudents';

export default function FreeTextImport({ open, onClose, students, onUpdateStudent }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [expanded, setExpanded] = useState(null);

  async function handleAnalyze() {
    if (!text.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const studentNames = students.map(s => s.name);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מנתח טקסט העדפות כיתה. נמצאים בכיתה התלמידים הבאים: ${studentNames.join(', ')}.

קרא את הטקסט הבא ועדכן את ההעדפות לכל תלמיד שמוזכר:

"""
${text}
"""

עבור כל תלמיד שמוזכר, חלץ:
- row_preference: "front"/"middle"/"back"/"none"
- side_preference: "left"/"right"/"center"/"none"  
- height: "short"/"medium"/"tall"
- special_needs: מערך מ: ["vision","hearing","adhd","mobility","other"]
- friends: שמות תלמידים שהוא רוצה לשבת איתם (מהרשימה בלבד)
- avoid: שמות תלמידים שאסור לשבת בצמוד (מהרשימה בלבד)
- separate: שמות תלמידים שצריך מרחק גדול (מהרשימה בלבד)
- notes: הערות חופשיות

החזר JSON עם שדה "updates" - רשימת עדכונים. כלול רק תלמידים שמוזכרים בטקסט.`,
        response_json_schema: {
          type: 'object',
          properties: {
            updates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  student_name: { type: 'string' },
                  row_preference: { type: 'string' },
                  side_preference: { type: 'string' },
                  height: { type: 'string' },
                  special_needs: { type: 'array', items: { type: 'string' } },
                  friends: { type: 'array', items: { type: 'string' } },
                  avoid: { type: 'array', items: { type: 'string' } },
                  separate: { type: 'array', items: { type: 'string' } },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
      });
      if (res?.updates?.length > 0) {
        // Resolve names to IDs
        const resolved = res.updates.map(u => {
          const student = students.find(s => s.name === u.student_name || s.name.includes(u.student_name) || u.student_name.includes(s.name));
          if (!student) return null;
          const resolveName = name => students.find(s => s.name === name || s.name.includes(name))?.id;
          return {
            student,
            changes: {
              ...(u.row_preference && u.row_preference !== 'none' ? { row_preference: u.row_preference } : {}),
              ...(u.side_preference && u.side_preference !== 'none' ? { side_preference: u.side_preference } : {}),
              ...(u.height ? { height: u.height } : {}),
              ...(u.special_needs?.length ? { special_needs: u.special_needs } : {}),
              ...(u.friends?.length ? { friends: u.friends.map(resolveName).filter(Boolean) } : {}),
              ...(u.avoid?.length ? { avoid: u.avoid.map(resolveName).filter(Boolean) } : {}),
              ...(u.separate?.length ? { separate: u.separate.map(resolveName).filter(Boolean) } : {}),
              ...(u.notes ? { notes: u.notes } : {}),
            },
            raw: u,
          };
        }).filter(Boolean);
        setResults(resolved);
      } else {
        toast.error('לא נמצאו עדכונים — נסה לנסח מחדש');
      }
    } catch {
      // ── Heuristic fallback (no AI) ──
      const fallback = parseUnstructuredText(text, students);
      if (fallback.length > 0) {
        setResults(fallback);
        toast.info('הייבוא בוצע באמצעות מנוע חלופי (ללא AI)');
      } else {
        toast.error('שגיאה בניתוח — נסה לנסח מחדש');
      }
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!results?.length) return;
    let count = 0;
    for (const r of results) {
      if (Object.keys(r.changes).length === 0) continue;
      await onUpdateStudent({ ...r.student, ...r.changes });
      count++;
    }
    toast.success(`עודכנו ${count} תלמידים בהצלחה!`);
    onClose();
  }

  function reset() { setText(''); setResults(null); }

  const ROW_LABELS = { front: 'קדמי', middle: 'אמצעי', back: 'אחורי' };
  const SIDE_LABELS = { left: 'שמאל', right: 'ימין', center: 'מרכז' };
  const NEED_LABELS = { vision: '👁️ ראייה', hearing: '👂 שמיעה', adhd: '⚡ קשב', mobility: '♿ ניידות', other: '✨ אחר' };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" /> עדכון העדפות בטקסט חופשי
          </DialogTitle>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4">
            <div className="bg-accent/30 rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">כתוב בחופשיות על כל תלמיד</p>
              <p>לדוגמה: <i>"דנה צריכה לשבת בשורה קדמית בגלל בעיות ראייה, לא לשים ליד תומר. ירדן גבוה — שורה אחרונה. נועה ומיה חברות טובות."</i></p>
            </div>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="הכנס כאן הערות חופשיות על תלמידים..."
              className="min-h-[140px] text-sm"
              dir="rtl"
            />
            <Button onClick={handleAnalyze} disabled={!text.trim() || loading} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> מנתח...</> : <><Wand2 className="w-4 h-4 ml-1" /> נתח עם AI</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold">נמצאו עדכונים ל-{results.length} תלמידים</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {results.map((r, i) => {
                const hasChanges = Object.keys(r.changes).length > 0;
                return (
                  <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold hover:bg-muted/40 transition-colors"
                      onClick={() => setExpanded(expanded === i ? null : i)}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                          {r.student.name.charAt(0)}
                        </span>
                        {r.student.name}
                      </span>
                      <span className="flex items-center gap-1">
                        {hasChanges ? (
                          <Badge className="bg-primary/10 text-primary border-0 text-[10px]">{Object.keys(r.changes).length} שינויים</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">ללא שינוי</Badge>
                        )}
                        {expanded === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                    </button>
                    {expanded === i && hasChanges && (
                      <div className="px-3 pb-3 space-y-1 bg-muted/20">
                        {r.changes.row_preference && <p className="text-xs">📍 שורה: <b>{ROW_LABELS[r.changes.row_preference] || r.changes.row_preference}</b></p>}
                        {r.changes.side_preference && <p className="text-xs">↔️ צד: <b>{SIDE_LABELS[r.changes.side_preference] || r.changes.side_preference}</b></p>}
                        {r.changes.height && <p className="text-xs">📏 גובה: <b>{r.changes.height === 'tall' ? 'גבוה' : r.changes.height === 'short' ? 'נמוך' : 'בינוני'}</b></p>}
                        {r.changes.special_needs?.length > 0 && <p className="text-xs">🏥 צרכים: <b>{r.changes.special_needs.map(n => NEED_LABELS[n]).join(', ')}</b></p>}
                        {r.changes.friends?.length > 0 && <p className="text-xs">💚 חברים: <b>{r.changes.friends.map(id => students.find(s => s.id === id)?.name).filter(Boolean).join(', ')}</b></p>}
                        {r.changes.avoid?.length > 0 && <p className="text-xs">🚫 להרחיק: <b>{r.changes.avoid.map(id => students.find(s => s.id === id)?.name).filter(Boolean).join(', ')}</b></p>}
                        {r.changes.separate?.length > 0 && <p className="text-xs">↔️ מרחק: <b>{r.changes.separate.map(id => students.find(s => s.id === id)?.name).filter(Boolean).join(', ')}</b></p>}
                        {r.changes.notes && <p className="text-xs">📝 הערה: <b>{r.changes.notes}</b></p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} className="flex-1">
                <CheckCircle2 className="w-4 h-4 ml-1" /> שמור עדכונים
              </Button>
              <Button variant="outline" onClick={() => setResults(null)}>ערוך מחדש</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}