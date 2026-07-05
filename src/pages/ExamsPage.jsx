import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Plus, Calendar, Users, Trophy, BarChart3, Save, X, Check, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExamsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [gradingExam, setGradingExam] = useState(null);
  const [form, setForm] = useState({ title: '', subject: '', date: '', max_score: 100, duration_minutes: 45, topics: [], notes: '' });
  const [topicInput, setTopicInput] = useState('');
  const [scores, setScores] = useState({});

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => base44.entities.Exam.list('-date', 50),
  });
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const activeStudents = students.filter(s => s.is_active !== false);

  const statusMeta = {
    scheduled: { label: 'מתוכנן', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    in_progress: { label: 'בביצוע', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    graded: { label: 'נבדק', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    published: { label: 'פורסם', color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  };

  const createExamMutation = useMutation({
    mutationFn: (data) => base44.entities.Exam.create(data),
    onMutate: async (newExam) => {
      await qc.cancelQueries({ queryKey: ['exams'] });
      const previous = qc.getQueryData(['exams']);
      qc.setQueryData(['exams'], (old = []) => [...old, { ...newExam, id: `opt-${Date.now()}` }]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.previous) qc.setQueryData(['exams'], ctx.previous); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['exams'] }),
    onSuccess: () => {
      toast.success('המבחן נוצר!');
      setShowForm(false);
      setForm({ title: '', subject: '', date: '', max_score: 100, duration_minutes: 45, topics: [], notes: '' });
    },
  });

  function handleCreateExam() {
    if (!form.title || !form.subject || !form.date) {
      toast.error('מלאו את כל השדות');
      return;
    }
    createExamMutation.mutate({
      ...form,
      student_ids: activeStudents.map(s => s.id),
      scores: [],
      status: 'scheduled',
    });
  }

  const deleteExamMutation = useMutation({
    mutationFn: (id) => base44.entities.Exam.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['exams'] });
      const previous = qc.getQueryData(['exams']);
      qc.setQueryData(['exams'], (old = []) => old.filter(e => e.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(['exams'], ctx.previous);
      toast.error('שגיאה במחיקה');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['exams'] }),
    onSuccess: () => toast.success('המבחן נמחק'),
  });

  async function saveGrades() {
    const scoresArr = activeStudents.map(s => ({
      student_id: s.id,
      student_name: s.name,
      score: scores[s.id] !== '' && scores[s.id] !== undefined ? Number(scores[s.id]) : null,
      graded_at: scores[s.id] !== '' && scores[s.id] !== undefined ? new Date().toISOString() : null,
    }));
    const graded = scoresArr.filter(s => s.score !== null);
    await base44.entities.Exam.update(gradingExam.id, { scores: scoresArr, status: graded.length === activeStudents.length ? 'graded' : 'in_progress' });
    qc.invalidateQueries({ queryKey: ['exams'] });
    toast.success(`נשמרו ${graded.length} ציונים!`);
    setGradingExam(null);
    setScores({});
  }

  function startGrading(exam) {
    setGradingExam(exam);
    const initial = {};
    exam.scores?.forEach(s => { if (s.score !== null) initial[s.student_id] = s.score; });
    setScores(initial);
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">מבחנים</h1>
            <p className="text-xs text-muted-foreground">{exams.length} מבחנים</p>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> מבחן
          </Button>
        </div>

        {/* Exam list */}
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">טוען...</div>
        ) : exams.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">אין מבחנים עדיין</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exams.map(exam => {
              const meta = statusMeta[exam.status] || statusMeta.scheduled;
              const gradedCount = exam.scores?.filter(s => s.score !== null).length || 0;
              const avg = exam.scores?.filter(s => s.score !== null).length > 0
                ? Math.round(exam.scores.filter(s => s.score !== null).reduce((sum, s) => sum + s.score, 0) / exam.scores.filter(s => s.score !== null).length)
                : null;
              return (
                <motion.div key={exam.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border rounded-2xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{exam.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{exam.subject}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${meta.bg} ${meta.color} border-0`}>{meta.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(exam.date).toLocaleDateString('he-IL')}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {exam.student_ids?.length || 0}</span>
                    {exam.duration_minutes && <span>⏱ {exam.duration_minutes} דק׳</span>}
                    <span>📊 מקסימום {exam.max_score}</span>
                  </div>
                  {exam.topics?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {exam.topics.map((t, i) => <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{t}</span>)}
                    </div>
                  )}
                  {gradedCount > 0 && (
                    <div className="bg-muted/40 rounded-xl p-2 mb-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">נבדקו {gradedCount}/{exam.student_ids?.length || 0}</span>
                      {avg !== null && <span className="font-bold text-primary">ממוצע: {avg}</span>}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                     <Button size="sm" variant="outline" className="h-8 text-xs flex-1 gap-1" onClick={() => startGrading(exam)}>
                       <Trophy className="w-3 h-3" /> בדיקה וציונים
                     </Button>
                     <Button size="icon" variant="ghost" className="h-8 w-8 min-h-[44px] min-w-[44px] text-destructive/60 hover:text-destructive" aria-label="מחק מבחן" onClick={() => deleteExamMutation.mutate(exam.id)}>
                       <Trash2 className="w-3.5 h-3.5" />
                     </Button>
                   </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Form dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader><DialogTitle>מבחן חדש</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">שם המבחן</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="מבחן בבא קמא פרק א..." className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">מקצוע</label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="גמרא" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">תאריך</label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">מקסימום נקודות</label>
                  <Input type="number" value={form.max_score} onChange={e => setForm(f => ({ ...f, max_score: Number(e.target.value) }))} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">משך (דקות)</label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} className="text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">נושאים (Enter להוספה)</label>
                <Input value={topicInput} onChange={e => setTopicInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && topicInput.trim()) { setForm(f => ({ ...f, topics: [...f.topics, topicInput.trim()] })); setTopicInput(''); } }}
                  placeholder="נושא המבחן..." className="text-sm" />
                {form.topics.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {form.topics.map((t, i) => (
                      <button key={i} onClick={() => setForm(f => ({ ...f, topics: f.topics.filter((_, j) => j !== i) }))}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                        {t} <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleCreateExam} className="w-full" disabled={createExamMutation.isPending}>צור מבחן</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Grading dialog */}
        <Dialog open={!!gradingExam} onOpenChange={v => !v && setGradingExam(null)}>
          <DialogContent dir="rtl" className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">בדיקה: {gradingExam?.title}</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground mb-2">הזינו ציון מתוך {gradingExam?.max_score} • {activeStudents.length} תלמידים</p>
            <div className="space-y-1.5">
              {activeStudents.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-xl">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center font-bold text-primary text-xs shrink-0">{s.name?.[0]}</div>
                  <span className="flex-1 text-sm truncate">{s.name}</span>
                  <Input type="number" value={scores[s.id] ?? ''} onChange={e => setScores(prev => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="—" className="w-16 h-8 text-sm text-center" min="0" max={gradingExam?.max_score} />
                  <span className="text-[10px] text-muted-foreground w-8">/{gradingExam?.max_score}</span>
                </div>
              ))}
            </div>
            <Button onClick={saveGrades} className="w-full gap-2 mt-2">
              <Save className="w-4 h-4" /> שמרו ציונים
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}