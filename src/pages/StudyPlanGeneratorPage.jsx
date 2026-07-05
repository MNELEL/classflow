import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Sparkles, Loader2, BookOpen, Plus, ChevronDown, ChevronUp, Trash2, Calendar, Target, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const SUBJECTS = ['גמרא', 'הלכה', 'תנ"ך', 'פרשת שבוע', 'מחשבה', 'ספרות', 'מתמטיקה', 'אנגלית', 'היסטוריה', 'מדעים', 'אחר'];
const GRADE_LEVELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳', 'י׳', 'י"א', 'י"ב'];

export default function StudyPlanGeneratorPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', subject: '', grade_level: '', start_date: '', end_date: '',
    total_weeks: 8, notes: '', goals_free_text: '', teaching_style: '',
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showList, setShowList] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ['study-plans'],
    queryFn: () => base44.entities.StudyPlan.list('-created_date', 30),
  });

  async function generate() {
    if (!form.subject || !form.grade_level) {
      toast.error('יש לבחור מקצוע ושכבת גיל');
      return;
    }
    setGenerating(true);
    setGenerated(null);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה מומחה פדגוגי. צור תוכנית לימודים מפורטת ומקצועית:

מקצוע: ${form.subject}
שכבת גיל: כיתה ${form.grade_level}
משך: ${form.total_weeks} שבועות
${form.title ? `שם התוכנית: ${form.title}` : ''}
${form.notes ? `הנחיות מיוחדות: ${form.notes}` : ''}
${form.goals_free_text ? `יעדים כלליים: ${form.goals_free_text}` : ''}
${form.teaching_style ? `סגנון הוראה: ${form.teaching_style}` : ''}

צור תוכנית עם ${form.total_weeks} שבועות. לכל שבוע:
- topic: נושא השבוע
- goals: רשימה של 2-3 יעדים לימודיים ברורים
- resources: רשימת 2-3 משאבים/פעילויות מומלצות
- assessments: הערכה/חזרה מומלצת

כלול גם:
- title: כותרת יפה לתוכנית
- overview: תיאור כללי של התוכנית (2-3 משפטים)
- key_principles: 3 עקרונות מנחים להוראה

השב בעברית, פרקטי ומלא.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          overview: { type: 'string' },
          key_principles: { type: 'array', items: { type: 'string' } },
          weeks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week_num: { type: 'number' },
                topic: { type: 'string' },
                goals: { type: 'array', items: { type: 'string' } },
                resources: { type: 'array', items: { type: 'string' } },
                assessments: { type: 'string' },
              }
            }
          }
        }
      }
    });

    setGenerated(res);
    setExpandedWeek(0);
    setGenerating(false);
  }

  async function savePlan() {
    if (!generated) return;
    setSaving(true);
    await base44.entities.StudyPlan.create({
      title: generated.title || form.title || `תוכנית ${form.subject}`,
      subject: form.subject,
      grade_level: form.grade_level,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      weeks: generated.weeks || [],
      total_weeks: form.total_weeks,
      notes: generated.overview || '',
    });
    qc.invalidateQueries({ queryKey: ['study-plans'] });
    toast.success('תוכנית נשמרה!');
    setSaving(false);
  }

  function exportText() {
    if (!generated) return;
    let text = `# ${generated.title}\n\n${generated.overview}\n\n`;
    if (generated.key_principles?.length) {
      text += `## עקרונות מנחים\n${generated.key_principles.map(p => `- ${p}`).join('\n')}\n\n`;
    }
    generated.weeks?.forEach(w => {
      text += `## שבוע ${w.week_num}: ${w.topic}\n`;
      text += `**יעדים:** ${(w.goals || []).join(' | ')}\n`;
      text += `**משאבים:** ${(w.resources || []).join(' | ')}\n`;
      text += `**הערכה:** ${w.assessments || ''}\n\n`;
    });
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${generated.title || 'תוכנית'}.md`; a.click();
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg">מחולל תוכניות לימוד</h1>
              <p className="text-xs text-muted-foreground">צור תוכנית לימודים שבועית מפורטת עם AI</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowList(true)}>
            <FileText className="w-4 h-4" /> {plans.length} תוכניות
          </Button>
        </div>

        {/* Form */}
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold">פרטי התוכנית</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">מקצוע *</label>
              <MobileSelect value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))} placeholder="בחר מקצוע..." className="h-9 text-sm">
                {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </MobileSelect>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">כיתה *</label>
              <MobileSelect value={form.grade_level} onValueChange={v => setForm(f => ({ ...f, grade_level: v }))} placeholder="בחר כיתה..." className="h-9 text-sm">
                {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </MobileSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">שם התוכנית</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="תוכנית גמרא תשפ״ו..." className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">מספר שבועות</label>
              <MobileSelect value={String(form.total_weeks)} onValueChange={v => setForm(f => ({ ...f, total_weeks: Number(v) }))} className="h-9 text-sm">
                {[4,6,8,10,12,16,20,30,36].map(n => <SelectItem key={n} value={String(n)}>{n} שבועות</SelectItem>)}
              </MobileSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">תאריך התחלה</label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">תאריך סיום</label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="h-9 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">יעדים ומטרות (טקסט חופשי)</label>
            <Input value={form.goals_free_text} onChange={e => setForm(f => ({ ...f, goals_free_text: e.target.value }))} placeholder="למשל: ללמד בבא קמא פרק א-ג, לכסות דיני נזיקין..." className="h-9 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">הנחיות מיוחדות / סגנון הוראה</label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="שיטת חברותא, למידה חוויתית, שילוב מקורות..." className="h-9 text-sm" />
          </div>

          <Button className="w-full gap-2" onClick={generate} disabled={generating || !form.subject || !form.grade_level}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'מחולל תוכנית...' : 'צרו תוכנית לימוד עם AI'}
          </Button>
        </div>

        {/* Generated plan */}
        <AnimatePresence>
          {generated && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Plan header */}
              <div className="bg-gradient-to-l from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-base">{generated.title}</h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{generated.overview}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={exportText}>
                      <Download className="w-3.5 h-3.5" /> ייצא
                    </Button>
                    <Button size="sm" className="gap-1 h-8 text-xs" onClick={savePlan} disabled={saving}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      שמור
                    </Button>
                  </div>
                </div>

                {generated.key_principles?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {generated.key_principles.map((p, i) => (
                      <span key={i} className="text-[11px] bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full border border-violet-200 dark:border-violet-700">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Week cards */}
              <div className="space-y-2">
                {(generated.weeks || []).map((week, i) => (
                  <div key={i} className="border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedWeek(expandedWeek === i ? -1 : i)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-xs font-bold shrink-0">
                          {week.week_num}
                        </span>
                        <span className="font-semibold text-sm text-right">{week.topic}</span>
                      </div>
                      {expandedWeek === i ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {expandedWeek === i && (
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-2 space-y-3 bg-muted/20 border-t">
                            {week.goals?.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Target className="w-3 h-3" /> יעדים</p>
                                <ul className="space-y-1">
                                  {week.goals.map((g, j) => (
                                    <li key={j} className="text-xs flex gap-2 items-start">
                                      <span className="text-primary mt-0.5">•</span>{g}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {week.resources?.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><BookOpen className="w-3 h-3" /> משאבים ופעילויות</p>
                                <ul className="space-y-1">
                                  {week.resources.map((r, j) => (
                                    <li key={j} className="text-xs flex gap-2 items-start">
                                      <span className="text-emerald-500 mt-0.5">→</span>{r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {week.assessments && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> הערכה</p>
                                <p className="text-xs text-muted-foreground">{week.assessments}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved plans list */}
        <Dialog open={showList} onOpenChange={setShowList}>
          <DialogContent dir="rtl" className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>תוכניות לימוד שמורות</DialogTitle>
            </DialogHeader>
            {plans.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">אין תוכניות עדיין</p>
            ) : (
              <div className="space-y-2">
                {plans.map(plan => (
                  <div key={plan.id} className="border rounded-xl p-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">{plan.subject} • {plan.grade_level} • {plan.total_weeks} שבועות</p>
                    </div>
                    <button onClick={async () => { await base44.entities.StudyPlan.delete(plan.id); qc.invalidateQueries({ queryKey: ['study-plans'] }); }}
                      className="p-2 hover:bg-destructive/10 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}