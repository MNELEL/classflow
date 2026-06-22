import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function PreMeetingBriefing({ teacher, students, tasks, grades, behaviorEvents, meetings, onSaved }) {
  const [briefing, setBriefing] = useState(teacher.style_summary || '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const pendingTasks = tasks.length - doneTasks;
  const avgScore = grades.length
    ? Math.round(grades.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / grades.length)
    : null;
  const positiveEvents = behaviorEvents.filter(e => e.type === 'positive' || e.type === 'improvement').length;
  const negativeEvents = behaviorEvents.filter(e => e.type === 'negative' || e.type === 'concern').length;
  const lastMeeting = meetings.length
    ? [...meetings].sort((a, b) => new Date(b.meeting_date || 0) - new Date(a.meeting_date || 0))[0]
    : null;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מנהל פדגוגי מומחה. כתוב תדריך לפני פגישה אישית עם מורה. התדריך ייתן למנהל תמונה מלאה לקראת השיחה.

פרטי המורה:
שם: ${teacher.full_name}
מקצוע: ${teacher.subject || '—'}
הערות קודמות: ${teacher.admin_notes || '—'}

נתוני הכיתות שלו:
- תלמידים: ${students.length}
- משימות: ${tasks.length} (${doneTasks} הושלמו, ${pendingTasks} בתהליך)
- ציונים: ${grades.length}${avgScore !== null ? ` (ממוצע ${avgScore}%)` : ''}
- אירועי התנהגות: ${positiveEvents} חיוביים, ${negativeEvents} שליליים
${lastMeeting ? `- פגישה אחרונה: ${new Date(lastMeeting.meeting_date).toLocaleDateString('he-IL')} — ${lastMeeting.topics || '—'}` : '- אין פגישות קודמות'}

כתוב תדריך תמציתי בעברית המחולק ל-4 סעיפים ברורים:
1. תמונת מצב — סקירת פעילות המורה (משימות, ציונים, מעורבות)
2. נקודות חוזק — מה עובד טוב אצל המורה
3. נקודות לתשומת לב — תחומים שדורשים תמיכה או מעקב
4. המלצות לפגישה — 2-3 נקודות עיקריות להעלות בשיחה

היה ספציפי ומבוסס נתונים. השתמש בפורמט ברור עם כותרות.`,
      });
      setBriefing(res);
      await handleSave(res);
      toast.success('תדריך הופק ונשמר!');
    } catch {
      toast.error('שגיאה ביצירת התדריך');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(textToSave = briefing) {
    setSaving(true);
    try {
      await base44.entities.Teacher.update(teacher.id, { style_summary: textToSave });
      onSaved?.();
    } catch {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-violet-200 dark:border-violet-900/50 bg-violet-50/30 dark:bg-violet-950/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">תדריך לפני פגישה</p>
              <p className="text-[10px] text-muted-foreground">ניתוח AI מכל נתוני הכיתות</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 h-8"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : briefing ? <RefreshCw className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'מייצר...' : briefing ? 'עדכן' : 'צור תדריך'}
          </Button>
        </div>

        {generating ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 bg-violet-200/50 dark:bg-violet-800/30 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />
                <div className="h-2.5 bg-muted/40 rounded animate-pulse" style={{ width: '90%' }} />
                <div className="h-2.5 bg-muted/40 rounded animate-pulse" style={{ width: '75%' }} />
              </div>
            ))}
          </div>
        ) : briefing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm leading-relaxed whitespace-pre-wrap bg-card rounded-xl p-3 border border-border/60"
          >
            {briefing}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">לחץ "צור תדריך" לניתוח AI מכל נתוני הכיתות של המורה</p>
          </div>
        )}

        {/* Quick metrics */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <div className="bg-card rounded-lg p-1.5 text-center border border-border/40">
            <p className="text-sm font-bold text-blue-600">{students.length}</p>
            <p className="text-[9px] text-muted-foreground">תלמידים</p>
          </div>
          <div className="bg-card rounded-lg p-1.5 text-center border border-border/40">
            <p className="text-sm font-bold text-amber-600">{tasks.length}</p>
            <p className="text-[9px] text-muted-foreground">משימות</p>
          </div>
          <div className="bg-card rounded-lg p-1.5 text-center border border-border/40">
            <p className="text-sm font-bold text-emerald-600">{avgScore !== null ? `${avgScore}%` : '—'}</p>
            <p className="text-[9px] text-muted-foreground">ממוצע</p>
          </div>
          <div className="bg-card rounded-lg p-1.5 text-center border border-border/40">
            <p className="text-sm font-bold text-purple-600">{behaviorEvents.length}</p>
            <p className="text-[9px] text-muted-foreground">אירועים</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}