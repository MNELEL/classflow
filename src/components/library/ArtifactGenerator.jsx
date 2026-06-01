import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const ARTIFACT_TYPES = [
  { id: 'lesson_summary',            label: 'סיכום שיעור',            icon: '📋' },
  { id: 'lesson_plan',               label: 'מערך שיעור',             icon: '📐' },
  { id: 'review_questions_with',     label: 'שאלות חזרה עם תשובות',   icon: '❓' },
  { id: 'review_questions_without',  label: 'שאלות חזרה ללא תשובות',  icon: '📝' },
  { id: 'worksheet',                 label: 'דף עבודה לתלמיד',        icon: '📓' },
  { id: 'teacher_guide',             label: 'מדריך למורה',            icon: '👨‍🏫' },
  { id: 'parent_summary',            label: 'סיכום להורים',           icon: '📨' },
  { id: 'quiz',                      label: 'חידון',                  icon: '🏆' },
  { id: 'flashcards',                label: 'כרטיסיות חזרה',          icon: '🃏' },
];

const PROMPTS = {
  lesson_summary: 'כתוב סיכום שיעור מובנה בעברית ברורה. כלול: כותרת, נושא, נקודות עיקריות, מסקנות, ומשימה לחשיבה.',
  lesson_plan: 'כתוב מערך שיעור מלא הכולל: מטרות שיעור, חומר נדרש, שלבי הוראה (פתיחה/גוף/סיכום), שאלות הנחיה, הערכה.',
  review_questions_with: 'צור {count} שאלות חזרה מדורגות בקושי (קל→קשה) עם תשובות מלאות. כלול שאלות סגורות ופתוחות.',
  review_questions_without: 'צור {count} שאלות חזרה מדורגות בקושי. שאלות בלבד, ללא תשובות. פורמט מוכן להדפסה.',
  worksheet: 'צור דף עבודה לתלמיד הכולל: שם, תאריך, פעילויות מגוונות (השלמה/התאמה/כתיבה חופשית).',
  teacher_guide: 'כתוב מדריך הוראה מפורט עם טיפים פדגוגיים, אזורי קושי צפויים, ושאלות הנחיה לדיון כיתתי.',
  parent_summary: 'כתוב סיכום קצר וידידותי להורים (3-4 משפטים) על מה נלמד. טון חם ולא טכני.',
  quiz: 'צור חידון בן {count} שאלות עם 4 תשובות אפשריות לכל שאלה. סמן תשובה נכונה.',
  flashcards: 'צור {count} כרטיסיות לחזרה. פורמט: **צד א׳:** מושג/שאלה | **צד ב׳:** הגדרה/תשובה',
};

export default function ArtifactGenerator({ open, onClose, item }) {
  const qc = useQueryClient();
  const [artifactType, setArtifactType] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!artifactType) { toast.error('בחר סוג חומר'); return; }
    setGenerating(true);
    try {
      const prompt = (PROMPTS[artifactType] || '').replace('{count}', questionCount);
      const content = [
        item.transcript, item.ai_summary,
        ...(item.ai_key_points || [])
      ].filter(Boolean).join('\n\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `בהתבסס על חומר הלימוד הבא:
כותרת: ${item.title}
נושא: ${item.subject || item.category || ''}
תוכן: ${content.slice(0, 3000)}

${prompt}
${additionalInstructions ? `הוראות נוספות: ${additionalInstructions}` : ''}

כתוב בעברית. השתמש ב-Markdown לעיצוב.`,
        response_json_schema: {
          type: "object",
          properties: { content: { type: "string" } }
        }
      });

      const newArtifact = {
        id: Date.now().toString(),
        type: artifactType,
        title: `${ARTIFACT_TYPES.find(t => t.id === artifactType)?.label} — ${item.title}`,
        content: result.content,
        includes_answers: artifactType.includes('_with') || artifactType === 'quiz',
        created_at: format(new Date(), 'yyyy-MM-dd'),
      };

      const existing = item.generated_artifacts || [];
      await base44.entities.LibraryItem.update(item.id, {
        generated_artifacts: [...existing, newArtifact]
      });

      qc.invalidateQueries({ queryKey: ['library'] });
      qc.invalidateQueries({ queryKey: ['library-item', item.id] });
      toast.success('חומר נוצר בהצלחה!');
      onClose(newArtifact);
    } catch {
      toast.error('שגיאה ביצירת חומר');
    }
    setGenerating(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose(null)}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> יצירת חומר לימודי עם AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">מה לצור?</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ARTIFACT_TYPES.map(t => (
                <button key={t.id} onClick={() => setArtifactType(t.id)}
                  className={cn("flex items-center gap-2 p-2.5 rounded-lg border text-xs text-right transition-all",
                    artifactType === t.id ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/40")}>
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {['review_questions_with', 'review_questions_without', 'quiz', 'flashcards'].includes(artifactType) && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">מספר שאלות:</label>
              <Input type="number" value={questionCount} onChange={e => setQuestionCount(+e.target.value)}
                min={3} max={30} className="w-20 h-8 text-sm" />
            </div>
          )}

          <Textarea placeholder="הוראות נוספות (אופציונלי)..." value={additionalInstructions}
            onChange={e => setAdditionalInstructions(e.target.value)} className="text-sm min-h-[60px] resize-none" dir="rtl" />

          <Button className="w-full gap-2" onClick={handleGenerate} disabled={!artifactType || generating}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'יוצר...' : 'צור עם AI ✨'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}