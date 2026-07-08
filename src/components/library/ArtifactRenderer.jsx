import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ChevronLeft } from 'lucide-react';

/**
 * Renders structured AI artifacts (JSON) instead of raw markdown.
 * Falls back to markdown if no structured_data is present.
 */

const DIFFICULTY_LABELS = { easy: 'קל', medium: 'בינוני', hard: 'קשה' };
const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};
const HEBREW_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

function StructuredLessonSummary({ data }) {
  return (
    <div className="space-y-4">
      {data.title && <h2 className="text-lg font-bold text-center">{data.title}</h2>}
      {data.subject && <p className="text-sm text-muted-foreground text-center">{data.subject}</p>}
      {data.main_points?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">נקודות עיקריות</p>
          <ul className="space-y-1.5">
            {data.main_points.map((pt, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.conclusions?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">מסקנות</p>
          <ul className="space-y-1.5">
            {data.conclusions.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.thinking_task && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
          <p className="text-xs font-bold text-amber-700 mb-1">משימת חשיבה</p>
          <p className="text-sm">{data.thinking_task}</p>
        </div>
      )}
    </div>
  );
}

function StructuredLessonPlan({ data }) {
  return (
    <div className="space-y-4">
      {data.objectives?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">מטרות השיעור</p>
          <ul className="space-y-1">
            {data.objectives.map((obj, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <Circle className="w-3 h-3 text-primary shrink-0 mt-1" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.materials?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">חומר נדרש</p>
          <div className="flex flex-wrap gap-1.5">
            {data.materials.map((m, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
            ))}
          </div>
        </div>
      )}
      {data.stages?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">שלבי הוראה</p>
          <div className="space-y-2">
            {data.stages.map((stage, i) => (
              <div key={i} className="border border-border/60 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">{stage.name}</p>
                  {stage.duration_minutes && (
                    <Badge variant="outline" className="text-[10px]">{stage.duration_minutes} דק׳</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">{stage.description}</p>
                {stage.guiding_questions?.length > 0 && (
                  <ul className="space-y-0.5">
                    {stage.guiding_questions.map((q, j) => (
                      <li key={j} className="text-xs flex gap-1.5">
                        <ChevronLeft className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {data.assessment && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
          <p className="text-xs font-bold text-blue-700 mb-1">הערכה</p>
          <p className="text-sm">{data.assessment}</p>
        </div>
      )}
    </div>
  );
}

function StructuredQuestions({ data, showAnswers }) {
  if (!data.questions?.length) return null;
  return (
    <div className="space-y-3">
      {data.questions.map((q, i) => (
        <div key={i} className="border border-border/60 rounded-xl p-3">
          <div className="flex items-start gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
            <p className="text-sm font-medium flex-1">{q.question}</p>
            {q.difficulty && (
              <Badge className={`${DIFFICULTY_COLORS[q.difficulty] || ''} text-[10px] border-0`}>
                {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
              </Badge>
            )}
          </div>
          {q.options?.length > 0 && (
            <div className="grid grid-cols-1 gap-1 mb-1">
              {q.options.map((opt, j) => {
                const isCorrect = showAnswers && q.answer && (q.answer === opt || (q.correct_index !== undefined && q.correct_index === j));
                return (
                  <div key={j} className={`text-xs rounded-lg px-2.5 py-1.5 border flex items-center gap-2 ${
                    isCorrect
                      ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-border/60 bg-muted/30'
                  }`}>
                    <span className="font-bold text-muted-foreground shrink-0">{HEBREW_LETTERS[j] || j + 1}.</span>
                    <span>{opt}</span>
                    {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mr-auto" />}
                  </div>
                );
              })}
            </div>
          )}
          {showAnswers && q.answer && !q.options?.length && (
            <p className="text-xs text-emerald-700 font-semibold mt-1">✓ {q.answer}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function StructuredWorksheet({ data, showAnswers }) {
  return (
    <div className="space-y-4">
      {data.title && <h2 className="text-lg font-bold text-center">{data.title}</h2>}
      {data.activities?.length > 0 ? (
        data.activities.map((act, i) => (
          <div key={i} className="border border-border/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <p className="text-sm font-semibold">{act.instruction}</p>
            </div>
            {act.items?.length > 0 && (
              <div className="space-y-1.5 pr-8">
                {act.items.map((item, j) => (
                  <div key={j} className="text-xs border-b border-dashed border-border/40 pb-1.5">
                    {typeof item === 'string' ? item : item.text}
                    {item.answer && showAnswers && <span className="text-emerald-600 mr-2">({item.answer})</span>}
                  </div>
                ))}
              </div>
            )}
            {act.content && <p className="text-xs text-muted-foreground pr-8">{act.content}</p>}
          </div>
        ))
      ) : (
        <p className="text-xs text-muted-foreground">אין פעילויות</p>
      )}
    </div>
  );
}

function StructuredTeacherGuide({ data }) {
  return (
    <div className="space-y-4">
      {data.tips?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">טיפים פדגוגיים</p>
          <ul className="space-y-1.5">
            {data.tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.difficulty_areas?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">אזורי קושי צפויים</p>
          <div className="space-y-1.5">
            {data.difficulty_areas.map((d, i) => (
              <div key={i} className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 text-sm">{d}</div>
            ))}
          </div>
        </div>
      )}
      {data.discussion_questions?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">שאלות לדיון כיתתי</p>
          <ul className="space-y-1">
            {data.discussion_questions.map((q, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronLeft className="w-3 h-3 text-primary shrink-0 mt-1" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StructuredFlashcards({ data }) {
  if (!data.cards?.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {data.cards.map((card, i) => (
        <div key={i} className="border border-border/60 rounded-xl p-3 min-h-[80px] flex flex-col justify-center">
          <p className="text-[10px] font-bold text-primary mb-1">כרטיסיה {i + 1}</p>
          <p className="text-xs font-semibold mb-1.5">{card.front}</p>
          <div className="border-t border-dashed border-border/40 pt-1.5">
            <p className="text-xs text-muted-foreground">{card.back}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ArtifactRenderer({ artifact }) {
  const data = artifact.structured_data;
  const type = artifact.type;
  const showAnswers = artifact.includes_answers;

  // Fallback to markdown if no structured data
  if (!data) {
    return (
      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed" dir="rtl">
        {artifact.content || ''}
      </ReactMarkdown>
    );
  }

  switch (type) {
    case 'lesson_summary':
      return <StructuredLessonSummary data={data} />;
    case 'lesson_plan':
      return <StructuredLessonPlan data={data} />;
    case 'review_questions_with':
    case 'review_questions_without':
    case 'quiz':
      return <StructuredQuestions data={data} showAnswers={showAnswers} />;
    case 'worksheet':
      return <StructuredWorksheet data={data} />;
    case 'teacher_guide':
      return <StructuredTeacherGuide data={data} />;
    case 'flashcards':
      return <StructuredFlashcards data={data} />;
    case 'parent_summary':
      return (
        <div className="space-y-2">
          {data.summary && <p className="text-sm leading-relaxed">{data.summary}</p>}
          {data.highlights?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">נקודות לשיתוף</p>
              <ul className="space-y-0.5">
                {data.highlights.map((h, i) => (
                  <li key={i} className="text-xs flex gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    default:
      return (
        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed" dir="rtl">
          {artifact.content || ''}
        </ReactMarkdown>
      );
  }
}