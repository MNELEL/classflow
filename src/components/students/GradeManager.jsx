import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, TrendingUp, Wand2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';

const PERIOD_LABELS = { weekly: 'שבועי', monthly: 'חודשי', exam: 'מבחן', quiz: 'חידון', homework: 'שיעורי בית' };

export default function GradeManager({ student, open, onClose }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [form, setForm] = useState({ subject: '', test_name: '', score: '', max_score: '100', date: new Date().toISOString().split('T')[0], period: 'exam', notes: '' });

  const { data: grades = [] } = useQuery({
    queryKey: ['grades', student?.id],
    queryFn: () => base44.entities.Grade.filter({ student_id: student.id }),
    enabled: !!student?.id && open,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Grade.create({ ...data, student_id: student.id, score: Number(data.score), max_score: Number(data.max_score) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grades'] }); setShowForm(false); setForm({ subject: '', test_name: '', score: '', max_score: '100', date: new Date().toISOString().split('T')[0], period: 'exam', notes: '' }); toast.success('ציון נוסף'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Grade.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grades'] }); toast.success('ציון נמחק'); },
  });

  // Group by subject
  const bySubject = grades.reduce((acc, g) => {
    if (!acc[g.subject]) acc[g.subject] = [];
    acc[g.subject].push(g);
    return acc;
  }, {});

  const subjects = Object.keys(bySubject);

  const avgFor = (arr) => arr.length === 0 ? null : Math.round(arr.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / arr.length);

  // Chart data for a subject
  const chartData = (arr) => [...arr].sort((a, b) => new Date(a.date) - new Date(b.date)).map(g => ({
    date: g.date ? format(parseISO(g.date), 'dd/MM') : '',
    ציון: Math.round((g.score / (g.max_score || 100)) * 100),
    name: g.test_name || g.subject,
  }));

  async function getAIAdvice() {
    setAiLoading(true);
    setAiAdvice('');
    const gradesSummary = subjects.map(s => {
      const avg = avgFor(bySubject[s]);
      const recent = [...bySubject[s]].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
      return `${s}: ממוצע ${avg}%, ${recent.map(g => `${g.test_name || 'מבחן'}: ${g.score}/${g.max_score}`).join(', ')}`;
    }).join('\n');

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה יועץ חינוכי מנוסה. להלן נתוני הציונים של התלמיד ${student.name}:

${gradesSummary}

אפיון התלמיד: ${student.academic_level || 'לא צוין'}, ${student.traits?.join(', ') || 'אין מידע נוסף'}

תן המלצות פדגוגיות מפורטות:
1. ניתוח חוזקות וחולשות לפי מקצועות
2. המלצות ספציפיות לשיפור בכל מקצוע
3. אסטרטגיות למידה מותאמות לפרופיל התלמיד
4. הצעות לתגבור נקודתי

כתוב בעברית, בצורה ידידותית ומעשית, עד 200 מילים.`,
        model: 'claude_sonnet_4_6',
      });
      setAiAdvice(res || 'לא ניתן לקבל המלצות כרגע');
    } catch {
      toast.error('שגיאה בקבלת המלצות AI');
    }
    setAiLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> ציונים — {student?.name}
          </DialogTitle>
        </DialogHeader>

        {subjects.length > 0 ? (
          <Tabs defaultValue={subjects[0]} dir="rtl">
            <TabsList className="flex-wrap h-auto gap-1 mb-3">
              {subjects.map(s => (
                <TabsTrigger key={s} value={s} className="text-xs">
                  {s}
                  <Badge variant="secondary" className="mr-1 text-[9px] px-1">{avgFor(bySubject[s])}%</Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {subjects.map(s => {
              const data = chartData(bySubject[s]);
              return (
                <TabsContent key={s} value={s} className="space-y-3">
                  {data.length >= 2 && (
                    <div className="bg-muted/30 rounded-xl p-3">
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v, _, props) => [`${v}%`, props.payload?.name || s]} />
                          <Line type="monotone" dataKey="ציון" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {[...bySubject[s]].sort((a, b) => new Date(b.date) - new Date(a.date)).map(g => (
                      <div key={g.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{PERIOD_LABELS[g.period] || g.period}</Badge>
                          <span className="font-medium">{g.test_name || 'מבחן'}</span>
                          {g.date && <span className="text-[10px] text-muted-foreground">{format(parseISO(g.date), 'dd/MM/yy')}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${(g.score / (g.max_score || 100)) >= 0.7 ? 'text-emerald-600' : (g.score / (g.max_score || 100)) >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {g.score}/{g.max_score || 100}
                          </span>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => deleteMutation.mutate(g.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-4">אין ציונים עדיין</p>
        )}

        {showForm ? (
          <div className="border border-primary/30 rounded-xl p-3 space-y-2 bg-accent/10">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="מקצוע *" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              <Input placeholder="שם המבחן/משימה" value={form.test_name} onChange={e => setForm(f => ({ ...f, test_name: e.target.value }))} />
              <Input type="number" placeholder="ציון *" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} min={0} max={200} />
              <Input type="number" placeholder="מקסימום" value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: e.target.value }))} />
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                {Object.entries(PERIOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <Input placeholder="הערות" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => createMutation.mutate(form)} disabled={!form.subject.trim() || !form.score}>שמור</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>ביטול</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> הוסף ציון
          </Button>
        )}

        {grades.length >= 2 && (
          <div className="border-t border-border pt-3">
            <Button variant="outline" className="w-full gap-1.5" onClick={getAIAdvice} disabled={aiLoading}>
              {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> מנתח...</> : <><Wand2 className="w-4 h-4" /> המלצות AI לקידום אישי</>}
            </Button>
            {aiAdvice && (
              <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm leading-relaxed whitespace-pre-wrap">
                💡 {aiAdvice}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}