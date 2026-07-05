import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Sparkles, Loader2, Printer, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function StudentAIReport({ students }) {
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: () => base44.entities.Grade.list('-date', 100),
    enabled: !!selectedId,
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list('-date', 100),
    enabled: !!selectedId,
  });

  const student = students.find(s => s.id === selectedId);

  async function generateReport() {
    if (!student) return;
    setGenerating(true);
    setReport('');
    const studentGrades = grades.filter(g => g.student_id === selectedId);
    const studentAttendance = attendance.filter(a => a.student_id === selectedId);
    const avgScore = studentGrades.length ? Math.round(studentGrades.reduce((s, g) => s + (g.score || 0), 0) / studentGrades.length) : null;
    const presentCount = studentAttendance.filter(a => a.status === 'present').length;
    const attendancePct = studentAttendance.length ? Math.round((presentCount / studentAttendance.length) * 100) : null;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `כתוב דוח פדגוגי מקצועי ומלא בעברית עבור התלמיד הבא:

שם: ${student.name}
מגדר: ${student.gender === 'male' ? 'זכר' : 'נקבה'}
רמה אקדמית: ${student.academic_level || 'לא הוגדר'}
${avgScore !== null ? `ממוצע ציונים: ${avgScore}` : ''}
${attendancePct !== null ? `% נוכחות: ${attendancePct}%` : ''}
${studentGrades.length ? `מספר מבחנים: ${studentGrades.length}` : ''}
${student.notes ? `הערות מורה: ${student.notes}` : ''}
${student.traits?.length ? `תכונות: ${student.traits.join(', ')}` : ''}
${student.achievements ? `הישגים: ${student.achievements}` : ''}

כתוב דוח מקצועי ומעמיק הכולל:
1. **סיכום כללי** — 2-3 משפטים על התלמיד
2. **נקודות חוזק** — רשימת כדורים
3. **תחומים לשיפור** — רשימת כדורים
4. **המלצות פדגוגיות** — פעולות מוחשיות למורה
5. **מסר לתלמיד** — משפט עידוד אישי

הטון: מקצועי, חם, עידודי. השתמש ב-Markdown.`,
        response_json_schema: {
          type: "object",
          properties: { content: { type: "string" } }
        }
      });
      setReport(result.content);
    } catch {
      toast.error('שגיאה ביצירת הדוח');
    }
    setGenerating(false);
  }

  function copyReport() {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('הדוח הועתק ללוח');
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-2">
        <MobileSelect value={selectedId} onValueChange={setSelectedId} placeholder="בחר תלמיד..." className="flex-1 text-sm">
          {students.filter(s => s.is_active !== false).map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </MobileSelect>
        <Button onClick={generateReport} disabled={!selectedId || generating} className="gap-1 shrink-0">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'מייצר...' : 'צור דוח AI'}
        </Button>
      </div>

      {report && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/70 rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-border/50 bg-muted/30">
            <p className="text-sm font-semibold">דוח פדגוגי — {student?.name}</p>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyReport}>
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" />
              </Button>
              {student?.parentEmail && (
                <a href={`mailto:${student.parentEmail}?subject=דוח פדגוגי — ${student.name}&body=${encodeURIComponent(report)}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">📧 שלח להורה</Button>
                </a>
              )}
            </div>
          </div>
          <div id="classpro-a4-canvas" className="p-5">
            <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed" dir="rtl">
              {report}
            </ReactMarkdown>
          </div>
        </motion.div>
      )}

      {!report && !generating && selectedId && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          לחץ על "צור דוח AI" לקבלת ניתוח פדגוגי מלא
        </div>
      )}
      {!selectedId && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
          בחר תלמיד לקבלת דוח פדגוגי מלא עם המלצות AI
        </div>
      )}
    </div>
  );
}