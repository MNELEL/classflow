import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Save, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherNotesEditor({ teacher, students, tasks, grades, behaviorEvents }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(teacher.admin_notes || '');
  const [styleSummary, setStyleSummary] = useState(teacher.style_summary || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await base44.entities.Teacher.update(teacher.id, {
        admin_notes: notes,
        style_summary: styleSummary,
      });
      qc.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('נשמר!');
    } catch {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateStyle() {
    setGenerating(true);
    try {
      const doneTasks = tasks.filter(t => t.status === 'done').length;
      const avgScore = grades.length
        ? Math.round(grades.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / grades.length)
        : null;
      const positiveEvents = behaviorEvents.filter(e => e.type === 'positive' || e.type === 'improvement').length;
      const negativeEvents = behaviorEvents.filter(e => e.type === 'negative' || e.type === 'concern').length;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מנהל פדגוגי מומחה. כתוב סיכום סגנון הוראה למורה לקראת פגישת הערכה.

פרטי המורה:
שם: ${teacher.full_name}
מקצוע: ${teacher.subject || '—'}

נתוני הכיתה שלו:
- תלמידים: ${students.length}
- משימות שהוקצו: ${tasks.length} (${doneTasks} הושלמו)
- ציונים שנרשמו: ${grades.length}${avgScore !== null ? ` (ממוצע ${avgScore}%)` : ''}
- אירועי התנהגות: ${positiveEvents} חיוביים, ${negativeEvents} שליליים
- הערות קיימות: ${teacher.admin_notes || '—'}

כתוב סיכום תמציתי בעברית (4-6 נקודות) הכולל:
1. סגנון הוראה ומעורבות
2. ניהול משימות ומעקב
3. התמודדות עם אתגרים התנהגותיים
4. נקודות חוזק
5. תחומים לשיפור
6. המלצה לפגישה`,
      });
      setStyleSummary(res);
      toast.success('סיכום סגנון הופק!');
    } catch {
      toast.error('שגיאה ביצירת סיכום');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Admin notes */}
      <div>
        <label className="text-xs font-semibold mb-1.5 block flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" /> הערות על המורה
        </label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="הערות פנימיות, חוזקות, תחומים לשיפור..."
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Style summary */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" /> סיכום לפני פגישה
          </label>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1 h-7"
            onClick={handleGenerateStyle}
            disabled={generating}
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {generating ? 'מייצר...' : 'צור עם AI'}
          </Button>
        </div>
        <Textarea
          value={styleSummary}
          onChange={e => setStyleSummary(e.target.value)}
          placeholder="סיכום סגנון הוראה - ייווצר אוטומטית או כתוב ידנית..."
          className="min-h-[120px] text-sm"
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2 h-9">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        שמור הערות וסיכום
      </Button>
    </div>
  );
}