import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Printer, Save, Star, StarOff, Trash2, ChevronDown, ChevronUp, BookOpen, Brain } from 'lucide-react';
import { loadStyleProfile, buildStyleInstruction } from '@/lib/teacherStyle';
import TeacherStylePanel from '@/components/library/TeacherStylePanel';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';

const QUESTION_TYPES = ['רב-ברירה', 'שאלה פתוחה', 'נכון/לא נכון', 'השלמת משפט'];
const DIFFICULTIES = ['קל', 'בינוני', 'קשה'];
const GRADE_LEVELS = ['א-ב', 'ג-ד', 'ה-ו', 'ז-ח', 'ט-י', 'י"א-י"ב'];

export default function WorksheetGeneratorPage() {
  const qc = useQueryClient();
  const handleRefresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ['worksheets'] }); }, [qc]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);
  const [form, setForm] = useState({ subject: '', topic: '', grade_level: 'ה-ו', difficulty: 'בינוני', num_questions: 5, question_types: ['רב-ברירה', 'שאלה פתוחה'] });
  const [generated, setGenerated] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showAnswers, setShowAnswers] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const { data: worksheets = [] } = useQuery({ queryKey: ['worksheets'], queryFn: () => base44.entities.Worksheet.list('-created_date', 30) });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Worksheet.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['worksheets'] }); toast.success('דף העבודה נשמר!'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Worksheet.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worksheets'] }),
  });
  const favMutation = useMutation({
    mutationFn: ({ id, val }) => base44.entities.Worksheet.update(id, { is_favorite: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worksheets'] }),
  });

  async function generate() {
    if (!form.subject || !form.topic) { toast.error('יש למלא מקצוע ונושא'); return; }
    setGenerating(true);
    try {
      const styleProfile = loadStyleProfile();
      const styleInstruction = buildStyleInstruction(styleProfile);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${styleInstruction ? styleInstruction + '\n\n' : ''}צור דף עבודה בעברית לתלמידים בנושא המבוקש בלבד.
מקצוע: ${form.subject}
נושא: ${form.topic}
שכבת גיל: ${form.grade_level}
רמת קושי: ${form.difficulty}
מספר שאלות: ${form.num_questions}
סוגי שאלות: ${form.question_types.join(', ')}

חשוב: כל השאלות חייבות להתייחס ישירות לנושא "${form.topic}" ב${form.subject}. אל תיצור שאלות על נושאים אחרים.

החזר אובייקט JSON עם:
- title: כותרת לדף העבודה
- instructions: הוראות כלליות לתלמיד (1-2 משפטים)
- questions: מערך של שאלות, כל שאלה עם: id (מספר), type (סוג), question (טקסט השאלה), options (מערך של 4 אפשרויות רק לרב-ברירה, אחרת []), answer (תשובה נכונה), points (נקודות: 10 לקל, 15 לבינוני, 20 לקשה)`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            instructions: { type: 'string' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  question: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  answer: { type: 'string' },
                  points: { type: 'number' }
                }
              }
            }
          }
        }
      });
      setGenerated({ ...res, subject: form.subject, topic: form.topic, grade_level: form.grade_level, difficulty: form.difficulty, question_types: form.question_types });
      setShowAnswers({});
    } catch (e) {
      toast.error('שגיאה בייצור — נסה שוב');
    }
    setGenerating(false);
  }

  function handleSave() {
    if (!generated) return;
    saveMutation.mutate({
      title: generated.title,
      subject: generated.subject,
      topic: generated.topic,
      grade_level: generated.grade_level,
      difficulty: generated.difficulty,
      question_types: generated.question_types,
      questions: generated.questions,
      instructions: generated.instructions,
      num_questions: generated.questions?.length || form.num_questions,
    });
  }

  function printWorksheet() {
    const w = window.open('', '_blank');
    const qs = generated.questions || [];
    const totalPoints = qs.reduce((s, q) => s + (q.points || 10), 0);
    w.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>${generated.title}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; direction: rtl; }
        h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
        .instructions { background: #f5f5f5; border-right: 4px solid #6366f1; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; }
        .question { margin-bottom: 20px; page-break-inside: avoid; }
        .question-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 6px; }
        .options { list-style: none; padding: 0; }
        .options li { padding: 4px 8px; margin: 3px 0; border: 1px solid #ddd; border-radius: 4px; }
        .answer-line { border-bottom: 1px solid #999; min-height: 28px; margin: 6px 0; }
        .total { text-align: left; font-weight: bold; margin-top: 20px; border-top: 1px solid #333; padding-top: 8px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <h1>${generated.title}</h1>
      <div class="meta">מקצוע: ${generated.subject} | נושא: ${generated.topic} | שכבה: ${generated.grade_level} | רמה: ${generated.difficulty}</div>
      ${generated.instructions ? `<div class="instructions">📋 ${generated.instructions}</div>` : ''}
      <div class="meta">שם תלמיד: __________________ כיתה: ________ תאריך: ________</div>
      ${qs.map((q, i) => `
        <div class="question">
          <div class="question-header"><span>שאלה ${i + 1} — ${q.type}</span><span>${q.points || 10} נקודות</span></div>
          <p>${q.question}</p>
          ${q.options?.length ? `<ul class="options">${q.options.map((o, j) => `<li>${['א','ב','ג','ד'][j]}. ${o}</li>`).join('')}</ul>` : ''}
          ${q.type === 'שאלה פתוחה' ? '<div class="answer-line"></div><div class="answer-line"></div>' : ''}
          ${q.type === 'נכון/לא נכון' ? '<p>נכון / לא נכון (הקף)</p>' : ''}
          ${q.type === 'השלמת משפט' ? '<div class="answer-line"></div>' : ''}
        </div>
      `).join('')}
      <div class="total">סה"כ נקודות: ${totalPoints}</div>
      </body></html>`);
    w.document.close();
    w.print();
  }

  function toggleQType(t) {
    setForm(f => ({
      ...f,
      question_types: f.question_types.includes(t) ? f.question_types.filter(x => x !== t) : [...f.question_types, t]
    }));
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="p-4 max-w-2xl mx-auto overflow-y-auto h-full space-y-5" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">מחולל דפי עבודה</h1>
            <p className="text-xs text-muted-foreground">יצירת דפי עבודה מותאמים אישית עם AI</p>
          </div>
        </div>

        {/* Teacher style */}
        <TeacherStylePanel />

        {/* Generator form */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">מקצוע *</Label>
                <Input placeholder="מתמטיקה, מדעים..." value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">נושא *</Label>
                <Input placeholder="שברים, פוטוסינתזה..." value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">שכבת גיל</Label>
                <MobileSelect value={form.grade_level} onValueChange={v => setForm(f => ({ ...f, grade_level: v }))} className="h-9 text-sm">
                  {GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </MobileSelect>
              </div>
              <div>
                <Label className="text-xs mb-1 block">רמת קושי</Label>
                <MobileSelect value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))} className="h-9 text-sm">
                  {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </MobileSelect>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">מספר שאלות: {form.num_questions}</Label>
              <input type="range" min={3} max={20} value={form.num_questions} onChange={e => setForm(f => ({ ...f, num_questions: +e.target.value }))}
                className="w-full accent-primary" />
            </div>

            <div>
              <Label className="text-xs mb-1 block">סוגי שאלות</Label>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map(t => (
                  <button key={t} onClick={() => toggleQType(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${form.question_types.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={generate} disabled={generating}>
              {generating ? <><Sparkles className="w-4 h-4 ml-1 animate-pulse" /> מייצר...</> : <><Sparkles className="w-4 h-4 ml-1" /> צור דף עבודה</>}
            </Button>
          </CardContent>
        </Card>

        {/* Generated worksheet */}
        {generated && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/30">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{generated.title}</CardTitle>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{generated.subject}</Badge>
                      <Badge variant="secondary" className="text-xs">{generated.grade_level}</Badge>
                      <Badge variant="outline" className="text-xs">{generated.difficulty}</Badge>
                      <Badge variant="outline" className="text-xs">{generated.questions?.length} שאלות</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={handleSave} disabled={saveMutation.isPending}>
                      <Save className="w-3.5 h-3.5 ml-1" /> שמור
                    </Button>
                    <Button size="sm" onClick={printWorksheet}>
                      <Printer className="w-3.5 h-3.5 ml-1" /> הדפס PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {generated.instructions && (
                  <div className="bg-primary/5 border-r-4 border-primary rounded-lg p-3 text-sm">{generated.instructions}</div>
                )}
                {(generated.questions || []).map((q, i) => (
                  <div key={q.id || i} className="bg-muted/30 rounded-xl p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <span className="text-xs text-muted-foreground font-medium">{i + 1}. {q.type} • {q.points} נק'</span>
                        <p className="text-sm font-medium mt-0.5">{q.question}</p>
                        {q.options?.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {q.options.map((o, j) => (
                              <div key={j} className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5">
                                {['א','ב','ג','ד'][j]}. {o}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAnswers(prev => ({ ...prev, [i]: !prev[i] }))}
                      className="mt-2 text-xs text-primary flex items-center gap-1"
                    >
                      {showAnswers[i] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showAnswers[i] ? 'הסתר תשובה' : 'הצג תשובה'}
                    </button>
                    {showAnswers[i] && (
                      <div className="mt-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg px-2.5 py-1.5">
                        ✓ {q.answer}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Saved worksheets */}
        {worksheets.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">דפי עבודה שמורים</h2>
            {worksheets.map(ws => (
              <Card key={ws.id} className="border-border/60">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === ws.id ? null : ws.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ws.title}</p>
                      <p className="text-xs text-muted-foreground">{ws.subject} • {ws.grade_level} • {ws.questions?.length || 0} שאלות</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); favMutation.mutate({ id: ws.id, val: !ws.is_favorite }); }} aria-label={ws.is_favorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                      className={ws.is_favorite ? 'text-yellow-500' : 'text-muted-foreground'}>
                      {ws.is_favorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(ws.id); }} aria-label="מחק דף עבודה" className="text-destructive/50 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedId === ws.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                {expandedId === ws.id && ws.questions?.length > 0 && (
                  <CardContent className="px-3 pb-3 pt-0 space-y-2 border-t border-border/50">
                    <Button size="sm" className="w-full" onClick={() => { setGenerated(ws); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      טען לעריכה
                    </Button>
                    {ws.questions.slice(0, 3).map((q, i) => (
                      <div key={i} className="text-xs bg-muted/30 rounded-lg p-2">
                        <span className="font-medium">{i + 1}. {q.type}</span> — {q.question}
                      </div>
                    ))}
                    {ws.questions.length > 3 && <p className="text-xs text-muted-foreground text-center">...ועוד {ws.questions.length - 3}</p>}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}