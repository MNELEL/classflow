import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ParentFeedbackPage() {
  const { bulletinId } = useParams();
  const [bulletin, setBulletin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadBulletin() {
      if (!bulletinId) return;
      try {
        const res = await base44.functions.invoke('bulletinFeedback', {
          action: 'get',
          bulletin_id: bulletinId,
        });
        setBulletin(res.data);
      } catch {
        toast.error('לא ניתן לטעון את העלון');
      }
      setLoading(false);
    }
    loadBulletin();
  }, [bulletinId]);

  async function handleSubmit() {
    if (rating === 0) {
      toast.error('נא לבחור דירוג');
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke('bulletinFeedback', {
        action: 'submit',
        bulletin_id: bulletinId,
        parent_name: parentName,
        rating,
        text: feedbackText,
      });
      setSubmitted(true);
      toast.success('תודה על המשוב!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'שגיאה בשליחת המשוב');
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bulletin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-lg font-semibold">העלון לא נמצא</p>
            <p className="text-sm text-muted-foreground">ייתכן שהקישור אינו תקין או פג תוקף.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avgRating = bulletin.feedbacks?.length
    ? (bulletin.feedbacks.reduce((s, f) => s + f.rating, 0) / bulletin.feedbacks.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-background py-6 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Bulletin content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">
              📰 ניוזלטר שבועי
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              {bulletin.class_name || 'הכיתה'} • {bulletin.start_date} – {bulletin.end_date}
            </p>
            {avgRating && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="text-sm text-muted-foreground">דירוג ממוצע:</span>
                <span className="font-bold text-amber-500">{avgRating}</span>
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs text-muted-foreground">({bulletin.feedbacks.length} משובים)</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {bulletin.digest_summary && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1.5">📝 סיכום השבוע</p>
                <p className="text-sm leading-relaxed">{bulletin.digest_summary}</p>
              </div>
            )}
            {bulletin.study_points?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1.5">📚 נקודות ללימוד</p>
                <ul className="space-y-1">
                  {bulletin.study_points.map((pt, i) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-primary">•</span>{pt}</li>
                  ))}
                </ul>
              </div>
            )}
            {bulletin.recap_questions?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1.5">❓ שאלות חזרה</p>
                <div className="space-y-2">
                  {bulletin.recap_questions.map((q, i) => (
                    <div key={i} className="bg-muted/40 rounded-xl p-3">
                      <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">↳ {q.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {bulletin.weekly_riddle && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">🧩 חידת השבוע</p>
                <p className="text-sm">{bulletin.weekly_riddle}</p>
              </div>
            )}
            {bulletin.activities?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1.5">🎯 פעילויות לבית</p>
                <ul className="space-y-1">
                  {bulletin.activities.map((a, i) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-green-500">✓</span>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> משוב על העלון
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-lg font-semibold">תודה על המשוב!</p>
                <p className="text-sm text-muted-foreground">המשוב שלך התקבל ויעזור לנו לשפר.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Star rating */}
                <div>
                  <p className="text-sm font-medium mb-2">דירוג</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1"
                        aria-label={`${star} כוכבים`}
                      >
                        <Star
                          className={cn(
                            'w-8 h-8 transition-colors',
                            (hoverRating || rating) >= star
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-muted-foreground/30'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name (optional) */}
                <div>
                  <p className="text-sm font-medium mb-1.5">שם (אופציונלי)</p>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="ניתן להישאר אנונימי"
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    dir="rtl"
                  />
                </div>

                {/* Feedback text */}
                <div>
                  <p className="text-sm font-medium mb-1.5">הערות (אופציונלי)</p>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="כתוב כאן את המשוב שלך..."
                    className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
                    dir="rtl"
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleSubmit}
                  disabled={submitting || rating === 0}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  שלח משוב
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}