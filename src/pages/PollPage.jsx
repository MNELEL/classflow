import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  MessageSquare, Plus, Sparkles, Trash2, X, Check, Radio, History, Lock, Unlock, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const OPT_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'];

export default function PollPage() {
  const qc = useQueryClient();

  const { data: classes = [] } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.entities.Classroom.list(),
  });
  const [classId, setClassId] = useState('');
  const cls = classes.find((c) => c.id === classId);

  React.useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-poll', classId],
    enabled: !!cls,
    queryFn: async () => {
      const ids = cls?.student_ids || [];
      if (ids.length === 0) return [];
      const all = await base44.entities.Student.filter({ is_active: true });
      return all.filter((s) => ids.includes(s.id));
    },
  });

  const { data: polls = [], refetch } = useQuery({
    queryKey: ['polls', classId],
    enabled: !!classId,
    queryFn: () => base44.entities.ClassPoll.filter({ class_id: classId }, '-created_date'),
  });

  const active = polls.find((p) => p.status === 'active');
  const closed = polls.filter((p) => p.status === 'closed');

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [topic, setTopic] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const addOpt = () => options.length < 4 && setOptions([...options, '']);
  const rmOpt = (i) => options.length > 2 && setOptions(options.filter((_, idx) => idx !== i));
  const setOpt = (i, v) => setOptions(options.map((o, idx) => (idx === i ? v : o)));

  const invalidatePolls = () => qc.invalidateQueries({ queryKey: ['polls', classId] });

  const createMut = useMutation({
    mutationFn: () => {
      const clean = options.map((o) => o.trim()).filter(Boolean);
      if (!question.trim()) throw new Error('נדרשת שאלה');
      if (clean.length < 2) throw new Error('נדרשות לפחות 2 אפשרויות');
      return base44.entities.ClassPoll.create({
        class_id: classId, question: question.trim(), options: clean, status: 'active', votes: [],
      });
    },
    onSuccess: () => {
      toast.success('הסקר נוצר');
      setQuestion(''); setOptions(['', '']);
      invalidatePolls();
    },
    onError: (e) => toast.error(e.message || 'יצירת הסקר נכשלה'),
  });

  async function doSuggest() {
    setAiBusy(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה עוזר למלמד/רב לייצר שאלת סקר כיתתי לדיון בת"ת/חיידר חרדי.
השאלה חייבת להיות מכבדת, חינוכית, בעברית, ומתאימה לרוח יהדות התורה.
${cls?.name ? `שם הכיתה: ${cls.name}.` : ''} ${topic.trim() ? `נושא: ${topic.trim()}.` : 'בחר נושא מעניין לדיון כיתתי.'}
תן 2-4 אפשרויות תשובה קצרות (עד 40 תווים כל אחת).`,
        response_json_schema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
          },
          required: ['question', 'options'],
        },
      });
      const q = String(result?.question ?? '').trim().slice(0, 500);
      const opts = Array.isArray(result?.options)
        ? result.options.map((o) => String(o).trim().slice(0, 200)).filter(Boolean).slice(0, 4)
        : [];
      if (!q || opts.length < 2) throw new Error('bad shape');
      setQuestion(q);
      setOptions(opts.length < 2 ? [...opts, '', ''].slice(0, 2) : opts);
      toast.success('הצעה נטענה');
    } catch {
      setQuestion('מהי המידה החשובה ביותר לעבודה עצמית בת״ת?');
      setOptions(['התמדה', 'סבלנות', 'אהבת חברים', 'יראת שמיים']);
      toast.info('נטענה הצעת ברירת מחדל');
    } finally {
      setAiBusy(false);
    }
  }

  if (classes.length === 0) {
    return (
      <AppLayout>
        <div className="px-4 py-8 max-w-2xl mx-auto text-center text-sm text-muted-foreground">
          יש ליצור כיתה לפני שאפשר להפעיל סקר.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-4 max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="w-6 h-6 text-primary" aria-hidden="true" /> סקר כיתה חי
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            סמן הצבעה עבור כל תלמיד ותצפה בתוצאות מתעדכנות בזמן אמת. ההיסטוריה נשמרת אוטומטית.
          </p>
        </div>

        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="max-w-xs" aria-label="בחירת כיתה"><SelectValue /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Tabs defaultValue={active ? 'live' : 'create'} dir="rtl">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="live"><Radio className="ms-1 h-4 w-4" aria-hidden="true" /> סקר פעיל</TabsTrigger>
            <TabsTrigger value="create"><Plus className="ms-1 h-4 w-4" aria-hidden="true" /> יצירת סקר</TabsTrigger>
            <TabsTrigger value="history"><History className="ms-1 h-4 w-4" aria-hidden="true" /> היסטוריה ({closed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="mt-4">
            {active ? (
              <LivePoll poll={active} students={students} onChanged={() => { invalidatePolls(); refetch(); }} />
            ) : (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                אין סקר פעיל. עברו ללשונית "יצירת סקר".
              </CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="create" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <Label htmlFor="topic">נושא לשאלה (רשות — עוזר ל-AI)</Label>
                    <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)}
                      placeholder="לדוגמה: מידות, פרשת השבוע, סדר לימוד..." />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={doSuggest} disabled={aiBusy} variant="outline" className="gap-2">
                      {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                      {aiBusy ? 'טוען...' : 'הצע שאלה'}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="q">שאלה</Label>
                  <Textarea id="q" value={question} onChange={(e) => setQuestion(e.target.value)}
                    maxLength={500} rows={2} placeholder="מהי השאלה שתעלה לדיון?" />
                </div>

                <div className="space-y-2">
                  <Label>אפשרויות תשובה (2-4)</Label>
                  {options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ background: OPT_COLORS[i] }} />
                      <Input value={o} onChange={(e) => setOpt(i, e.target.value)} maxLength={200} placeholder={`אפשרות ${i + 1}`} />
                      {options.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => rmOpt(i)} aria-label="הסרת אפשרות">
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {options.length < 4 && (
                    <Button variant="outline" size="sm" onClick={addOpt}>
                      <Plus className="ms-1 h-4 w-4" aria-hidden="true" /> הוסף אפשרות
                    </Button>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="gap-2">
                    {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                    {createMut.isPending ? 'יוצר...' : 'צור סקר והתחל'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {closed.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                אין סקרים שנשמרו עדיין.
              </CardContent></Card>
            ) : closed.map((p) => (
              <ClosedPollCard key={p.id} poll={p} onChanged={invalidatePolls} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function LivePoll({ poll, students, onChanged }) {
  const qc = useQueryClient();

  const { data: fresh } = useQuery({
    queryKey: ['poll-live', poll.id],
    queryFn: () => base44.entities.ClassPoll.get(poll.id),
    refetchInterval: 3000,
    initialData: poll,
  });

  const votes = fresh?.votes ?? [];
  const voteMap = useMemo(() => {
    const m = new Map();
    votes.forEach((v) => m.set(v.student_id, v.option_index));
    return m;
  }, [votes]);

  const setV = useMutation({
    mutationFn: ({ studentId, studentName, optionIndex }) => {
      const nextVotes = votes.filter((v) => v.student_id !== studentId);
      if (optionIndex !== null) {
        nextVotes.push({ student_id: studentId, student_name: studentName, option_index: optionIndex });
      }
      return base44.entities.ClassPoll.update(poll.id, { votes: nextVotes });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['poll-live', poll.id] }),
  });

  const totals = poll.options.map((_, i) => votes.filter((v) => v.option_index === i).length);
  const total = totals.reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold">{poll.question}</h2>
            <Badge variant="outline" className="shrink-0">חי</Badge>
          </div>

          <div className="space-y-3">
            {poll.options.map((opt, i) => {
              const c = totals[i];
              const pct = total > 0 ? Math.round((c / total) * 100) : 0;
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: OPT_COLORS[i] }} />
                      <span className="font-medium">{opt}</span>
                    </div>
                    <span className="tabular-nums">{c} · {pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between border-t">
            <div className="text-sm text-muted-foreground">
              הצביעו {total} מתוך {students.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={async () => {
                await base44.entities.ClassPoll.update(poll.id, { status: 'closed', closed_at: new Date().toISOString() });
                toast.success('הסקר נסגר ונשמר בהיסטוריה');
                onChanged();
              }}>
                <Lock className="ms-1 h-4 w-4" aria-hidden="true" /> סיים ושמור
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                if (!confirm('למחוק את הסקר?')) return;
                await base44.entities.ClassPoll.delete(poll.id);
                toast.success('נמחק');
                onChanged();
              }}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-bold mb-3">סימון הצבעה לתלמיד</h3>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין תלמידים בכיתה זו.</p>
          ) : (
            <div className="space-y-2 max-h-[70vh] overflow-auto">
              {students.map((s) => {
                const v = voteMap.get(s.id);
                return (
                  <div key={s.id} className="rounded-lg border p-2">
                    <div className="mb-1 text-sm font-medium">{s.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {poll.options.map((opt, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant={v === i ? 'default' : 'outline'}
                          className="h-7 text-xs"
                          style={v === i ? { background: OPT_COLORS[i], borderColor: OPT_COLORS[i] } : { borderColor: OPT_COLORS[i] }}
                          onClick={() => setV.mutate({ studentId: s.id, studentName: s.name, optionIndex: v === i ? null : i })}
                        >
                          {opt.length > 20 ? `${opt.slice(0, 20)}…` : opt}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClosedPollCard({ poll, onChanged }) {
  const totals = poll.options.map((_, i) => (poll.votes ?? []).filter((v) => v.option_index === i).length);
  const total = totals.reduce((a, b) => a + b, 0);
  const dateStr = new Date(poll.closed_at ?? poll.updated_date).toLocaleDateString('he-IL');

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold">{poll.question}</h3>
            <p className="text-xs text-muted-foreground">נסגר: {dateStr} · {total} הצבעות</p>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={async () => {
              await base44.entities.ClassPoll.update(poll.id, { status: 'active', closed_at: null });
              toast.success('הסקר נפתח מחדש');
              onChanged();
            }}>
              <Unlock className="ms-1 h-3.5 w-3.5" aria-hidden="true" /> פתח מחדש
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
              if (!confirm('למחוק?')) return;
              await base44.entities.ClassPoll.delete(poll.id);
              onChanged();
            }}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {poll.options.map((opt, i) => {
            const c = totals[i];
            const pct = total > 0 ? Math.round((c / total) * 100) : 0;
            return (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: OPT_COLORS[i] }} />
                    <span>{opt}</span>
                  </div>
                  <span className="tabular-nums text-xs text-muted-foreground">{c} · {pct}%</span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
