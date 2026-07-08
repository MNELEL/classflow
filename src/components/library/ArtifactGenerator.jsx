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
import { loadStyleProfile, buildStyleInstruction } from '@/lib/teacherStyle';

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

// Structured prompts + JSON schemas per artifact type
const ARTIFACT_CONFIG = {
  lesson_summary: {
    prompt: 'צור סיכום שיעור מובנה. כלול נקודות עיקריות (3-6), מסקנות (2-3), ומשימת חשיבה אחת לתלמיד.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subject: { type: 'string' },
        main_points: { type: 'array', items: { type: 'string' } },
        conclusions: { type: 'array', items: { type: 'string' } },
        thinking_task: { type: 'string' },
      },
      required: ['main_points', 'conclusions'],
    },
  },
  lesson_plan: {
    prompt: 'צור מערך שיעור מלא עם מטרות, חומר נדרש, שלבי הוראה (פתיחה/גוף/סיכום) כולל משך זמן ושאלות הנחיה לכל שלב, ואופן הערכה.',
    schema: {
      type: 'object',
      properties: {
        objectives: { type: 'array', items: { type: 'string' } },
        materials: { type: 'array', items: { type: 'string' } },
        stages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              duration_minutes: { type: 'number' },
              guiding_questions: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'description'],
          },
        },
        assessment: { type: 'string' },
      },
      required: ['objectives', 'stages'],
    },
  },
  review_questions_with: {
    prompt: 'צור {count} שאלות חזרה מדורגות בקושי (קל→קשה). כלול סוגים מגוונים: רב-ברירה (עם 4 אפשרויות), שאלות פתוחות, ונכון/לא נכון. לכל שאלה צרף תשובה מלאה.',
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              type: { type: 'string', description: 'multiple_choice / open / true_false' },
              options: { type: 'array', items: { type: 'string' } },
              answer: { type: 'string' },
              difficulty: { type: 'string', description: 'easy / medium / hard' },
            },
            required: ['question', 'answer', 'difficulty'],
          },
        },
      },
      required: ['questions'],
    },
  },
  review_questions_without: {
    prompt: 'צור {count} שאלות חזרה מדורגות בקושי. שאלות בלבד ללא תשובות. כלול רב-ברירה (4 אפשרויות) ושאלות פתוחות.',
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              type: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              difficulty: { type: 'string' },
            },
            required: ['question', 'difficulty'],
          },
        },
      },
      required: ['questions'],
    },
  },
  worksheet: {
    prompt: 'צור דף עבודה לתלמיד עם 3-5 פעילויות מגוונות: השלמת משפטים, התאמות, שאלות פתוחות. כלול הוראות ברורות לכל פעילות.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        activities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'fill_blank / matching / open / multiple_choice' },
              instruction: { type: 'string' },
              items: { type: 'array', items: { type: 'string' } },
            },
            required: ['instruction', 'items'],
          },
        },
      },
      required: ['activities'],
    },
  },
  teacher_guide: {
    prompt: 'צור מדריך הוראה מפורט עם טיפים פדגוגיים (3-5), אזורי קושי צפויים (2-3), ושאלות הנחיה לדיון כיתתי (3-4).',
    schema: {
      type: 'object',
      properties: {
        tips: { type: 'array', items: { type: 'string' } },
        difficulty_areas: { type: 'array', items: { type: 'string' } },
        discussion_questions: { type: 'array', items: { type: 'string' } },
      },
      required: ['tips', 'discussion_questions'],
    },
  },
  parent_summary: {
    prompt: 'צור סיכום קצר וידידותי להורים על מה נלמד בשיעור (2-3 משפטים). כלול 2-3 נקודות לשיתוף. טון חם ולא טכני.',
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        highlights: { type: 'array', items: { type: 'string' } },
      },
      required: ['summary'],
    },
  },
  quiz: {
    prompt: 'צור חידון בן {count} שאלות עם 4 אפשרויות לכל שאלה. סמן את התשובה הנכונה באמצעות correct_index (0-3).',
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              correct_index: { type: 'number', description: '0-3' },
              difficulty: { type: 'string' },
            },
            required: ['question', 'options', 'correct_index'],
          },
        },
      },
      required: ['questions'],
    },
  },
  flashcards: {
    prompt: 'צור {count} כרטיסיות לחזרה. כל כרטיסיה: front = מושג/שאלה קצרה, back = הגדרה/תשובה.',
    schema: {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string' },
              back: { type: 'string' },
            },
            required: ['front', 'back'],
          },
        },
      },
      required: ['cards'],
    },
  },
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
      const config = ARTIFACT_CONFIG[artifactType];
      const prompt = config.prompt.replace('{count}', questionCount);
      const content = [
        item.transcript, item.ai_summary,
        ...(item.ai_key_points || [])
      ].filter(Boolean).join('\n\n');

      const styleProfile = await loadStyleProfile();
      const styleInstruction = buildStyleInstruction(styleProfile);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${styleInstruction ? styleInstruction + '\n\n' : ''}בהתבסס על חומר הלימוד הבא בלבד (אל תמציא מידע שאינו בחומר):
כותרת: ${item.title}
נושא: ${item.subject || item.category || ''}
תוכן: ${content.slice(0, 3000)}

${prompt}
${additionalInstructions ? `הוראות נוספות: ${additionalInstructions}` : ''}

כתוב בעברית בלבד. החזר אך ורק אובייקט JSON תקין.`,
        response_json_schema: config.schema,
      });

      const newArtifact = {
        id: Date.now().toString(),
        type: artifactType,
        title: `${ARTIFACT_TYPES.find(t => t.id === artifactType)?.label} — ${item.title}`,
        content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        structured_data: typeof result === 'object' ? result : null,
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