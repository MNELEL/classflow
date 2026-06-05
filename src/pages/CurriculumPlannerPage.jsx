import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookMarked, Plus, Sparkles, Loader2, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import WeekCard from '@/components/curriculum/WeekCard';
import AppLayout from '@/components/layout/AppLayout';

export default function CurriculumPlannerPage() {
  const [showForm, setShowForm] = useState(false);
  const [weekLabel, setWeekLabel] = useState('');
  const [weekStart, setWeekStart] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [freeText, setFreeText] = useState('');
  const [processing, setProcessing] = useState(false);
  const qc = useQueryClient();

  const { data: weeks = [], isLoading } = useQuery({
    queryKey: ['curriculum_weeks'],
    queryFn: () => base44.entities.CurriculumWeek.list('-week_start', 30),
  });

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library_items_mini'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 200),
    staleTime: 60000,
  });

  async function handleGenerate() {
    if (!freeText.trim()) { toast.error('יש לכתוב את ההספקים'); return; }
    setProcessing(true);
    try {
      // Build library context
      const libraryContext = libraryItems.slice(0, 60).map(i => ({
        id: i.id,
        title: i.title,
        subject: i.subject,
        category: i.category,
        tags: i.tags,
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה עוזר למורה יהודי/כללי לתכנן הספקים שבועיים.
המורה כתב: "${freeText}"
מקצוע/נושא: "${subject || 'לא צוין'}"

משימתך:
1. פרק את הטקסט להספקים ספציפיים (כל יחידת תוכן = פריט נפרד).
2. לכל הספק — מצא קישורים רלוונטיים ממקורות אמינים: Sefaria (sefaria.org), HebrewBooks (hebrewbooks.org), מאגרי ידע חינמיים.
3. לכל הספק — בדוק אם קיים בספרייה הפנימית (הרשימה למטה) ואם כן — ציין את ה-id שלו.
4. הצע המשך לוגי לשבוע הבא ("suggested_next").

ספריית המורה:
${JSON.stringify(libraryContext)}

הנחיות לקישורים:
- לתלמוד בבלי: https://www.sefaria.org/[מסכת].[דף][עמוד]?lang=he
- לתנ"ך: https://www.sefaria.org/[ספר].[פרק].[פסוק]?lang=he
- לספרות הלכה כללית: https://hebrewbooks.org/
- לחומרים כלליים תן קישור לחיפוש או אתר רלוונטי.

החזר JSON בלבד.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            goals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  description: { type: 'string' },
                  source_type: { type: 'string' },
                  external_links: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        url: { type: 'string' }
                      }
                    }
                  },
                  library_item_ids: { type: 'array', items: { type: 'string' } },
                  is_completed: { type: 'boolean' },
                  suggested_next: { type: 'string' }
                }
              }
            }
          }
        }
      });

      const goals = (result.goals || []).map((g, i) => ({ ...g, id: g.id || String(Date.now() + i), is_completed: false }));

      await base44.entities.CurriculumWeek.create({
        week_label: weekLabel || `שבוע ${new Date(weekStart).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}`,
        week_start: weekStart,
        subject: subject || undefined,
        free_text_goals: freeText,
        parsed_goals: goals,
        status: 'planned',
      });

      qc.invalidateQueries({ queryKey: ['curriculum_weeks'] });
      toast.success(`נוצר שבוע עם ${goals.length} הספקים!`);
      setShowForm(false);
      setFreeText('');
      setWeekLabel('');
      setSubject('');
    } catch (err) {
      toast.error('שגיאה בעיבוד: ' + (err?.message || ''));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <BookMarked className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="font-bold text-lg">עוזר ההספקים</h1>
                <p className="text-xs text-muted-foreground">תכנון וחיפוש חומרים שבועי</p>
              </div>
            </div>
            <Button onClick={() => setShowForm(v => !v)} size="sm" className="gap-1.5 min-h-[40px]">
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'ביטול' : 'שבוע חדש'}
            </Button>
          </div>

          {/* New Week Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                  <p className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> הגדרת הספקים שבועיים
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">שם השבוע (אופציונלי)</label>
                      <Input value={weekLabel} onChange={e => setWeekLabel(e.target.value)} placeholder="שבוע א' תשפ״ו" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">תאריך התחלה</label>
                      <Input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">מקצוע / מסכת / נושא</label>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="גמרא, תנ&quot;ך, מתמטיקה..." className="h-9 text-sm" />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">מה צריך להספיק השבוע? (כתוב בחופשיות)</label>
                    <Textarea
                      value={freeText}
                      onChange={e => setFreeText(e.target.value)}
                      placeholder={'דוגמה:\nבבא קמא דף ל עמוד א עד דף ל עמוד ב\nפרשת השבוע — בראשית פרקים א-ב\nחשבון — כפל וחילוק עד 100'}
                      className="text-sm min-h-[120px] leading-relaxed"
                    />
                  </div>

                  <Button onClick={handleGenerate} disabled={processing} className="w-full gap-2 min-h-[44px]">
                    {processing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> מחפש חומרים ומעבד...</>
                    ) : (
                      <><Search className="w-4 h-4" /> עבד והכן חומרים</>
                    )}
                  </Button>

                  {processing && (
                    <p className="text-[11px] text-indigo-600 text-center animate-pulse">
                      AI מחפש קישורים לחומרים ומתאם עם הספרייה שלך...
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Weeks List */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : weeks.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <BookMarked className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">אין שבועות מתוכננים עדיין</p>
              <p className="text-xs text-muted-foreground">לחץ "שבוע חדש" כדי להתחיל</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weeks.map(w => (
                <WeekCard key={w.id} week={w} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}