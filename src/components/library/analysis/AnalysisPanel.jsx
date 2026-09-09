import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertCircle, HelpCircle, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Left-hand side of the analysis page: the smart assistant's automatic
// analysis of the recording — structured summary, key points and review
// questions, scrollable independently of the transcript panel.
export default function AnalysisPanel({ item }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-card shrink-0">
        <p className="text-sm font-semibold flex items-center gap-1.5 flex-1">
          <Sparkles className="w-4 h-4 text-primary" /> ניתוח העוזר החכם
        </p>
        {item.ai_status === 'ready' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">מוכן</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {item.ai_status === 'processing' && (
          <div className="flex items-center gap-2 text-blue-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> העוזר החכם מנתח את ההקלטה...
          </div>
        )}

        {item.ai_status === 'pending' && (
          <div className="text-center py-10 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">ניתוח AI טרם בוצע עבור הקלטה זו</p>
            <Button size="sm" variant="outline" className="mt-3"
              onClick={() => navigate(`/library/${item.id}`)}>
              פתח את הפריט לניתוח
            </Button>
          </div>
        )}

        {item.ai_status === 'error' && (
          <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/5 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{item.ai_summary || 'הניתוח נכשל. נסה שוב מפריט הספרייה.'}</p>
          </div>
        )}

        {item.ai_status === 'ready' && (
          <>
            {(item.ai_summary_sections?.length > 0) ? (
              <div className="space-y-3">
                {item.ai_summary_sections.map((s, i) => (
                  <div key={i}>
                    <p className="text-sm font-bold text-primary mb-1">{s.heading}</p>
                    <div className="text-sm leading-relaxed bg-muted/40 rounded-xl px-3 py-2">
                      <ReactMarkdown>{s.content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            ) : item.ai_summary && (
              <div className="text-sm leading-relaxed bg-muted/40 rounded-xl px-3 py-2">
                <ReactMarkdown>{item.ai_summary}</ReactMarkdown>
              </div>
            )}

            {item.ai_key_points?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">נקודות מפתח</p>
                <ul className="space-y-1.5">
                  {item.ai_key_points.map((pt, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary font-bold">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item.ai_review_questions?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> שאלות חזרה
                </p>
                <div className="space-y-2">
                  {item.ai_review_questions.map((q, i) => (
                    <div key={i} className="bg-muted/40 rounded-xl p-3 text-sm">
                      <p className="font-medium">{i + 1}. {q.question}</p>
                      {q.options?.length > 0 ? (
                        <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                          {q.options.map((o, j) => (
                            <li key={j} className={o === q.answer ? 'text-success font-semibold' : ''}>
                              {o}{o === q.answer ? ' ✓' : ''}
                            </li>
                          ))}
                        </ul>
                      ) : q.answer && (
                        <p className="mt-1.5 text-xs text-success">תשובה: {q.answer}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(item.ai_suggested_title || item.ai_suggested_category || item.ai_suggested_tags?.length > 0) && (
              <div className="border-t border-border pt-3 space-y-2">
                {item.ai_suggested_title && (
                  <p className="text-xs text-muted-foreground">כותרת מוצעת: <span className="text-foreground font-medium">{item.ai_suggested_title}</span></p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  {item.ai_suggested_category && (
                    <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{item.ai_suggested_category}</span>
                  )}
                  {(item.ai_suggested_tags || []).map((tag, i) => (
                    <span key={i} className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}