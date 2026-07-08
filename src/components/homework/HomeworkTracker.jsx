import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { ClipboardCheck, Plus, CheckCircle2, Circle, Bell, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_LABELS = { homework: 'שיעורי בית', exam: 'מבחן', project: 'פרויקט', quiz: 'חידון' };
const TYPE_COLORS = {
  homework: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  exam: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  project: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  quiz: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function AssignmentCard({ assignment, students, onToggleSubmit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);

  const submissions = assignment.submissions || [];
  const submitted = submissions.filter(s => s.submitted);
  const pending = submissions.filter(s => !s.submitted);
  const total = submissions.length;

  async function sendReminders() {
    setSending(true);
    const names = pending.map(s => s.student_name).join(', ');
    // Build WhatsApp message
    const msg = encodeURIComponent(
      `תזכורת: המטלה "${assignment.title}" (${assignment.subject || ''}) לא הוגשה עד ${assignment.due_date}.\nנא להגיש בהקדם האפשרי.`
    );
    const waUrl = `https://wa.me/?text=${msg}`;
    window.open(waUrl, '_blank');
    toast.success(`קישור WhatsApp נפתח עבור ${pending.length} תלמידים`);
    setSending(false);
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold">{assignment.title}</span>
              <Badge className={`${TYPE_COLORS[assignment.type]} border-0 text-[10px]`}>
                {TYPE_LABELS[assignment.type] || assignment.type}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {assignment.subject && <span className="text-xs text-muted-foreground">{assignment.subject}</span>}
              <span className="text-xs text-muted-foreground">הגשה: {assignment.due_date}</span>
            </div>
            {total > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-muted rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${(submitted.length / total) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{submitted.length}/{total}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {pending.length > 0 && (
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20" onClick={sendReminders} disabled={sending}>
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                תזכורת ({pending.length})
              </Button>
            )}
            <button onClick={() => setExpanded(v => !v)} aria-label={expanded ? 'סגור פרטים' : 'פתח פרטים'} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button onClick={() => onDelete(assignment.id)} aria-label="מחק מטלה" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && submissions.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-1.5">
              <div className="flex gap-2 mb-2">
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">הגישו {submitted.length}</Badge>
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs">לא הגישו {pending.length}</Badge>
              </div>
              {submissions.map(sub => (
                <button key={sub.student_id} onClick={() => onToggleSubmit(assignment, sub.student_id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-right">
                  {sub.submitted
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={`text-sm ${sub.submitted ? 'text-muted-foreground line-through' : 'font-medium'}`}>
                    {sub.student_name}
                  </span>
                  {sub.submitted && sub.submitted_at && (
                    <span className="text-[10px] text-muted-foreground mr-auto">{new Date(sub.submitted_at).toLocaleDateString('he-IL')}</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HomeworkTracker({ students }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState('homework');

  const { data: assignments = [] } = useQuery({
    queryKey: ['homework'],
    queryFn: () => base44.entities.HomeworkAssignment.list('-due_date', 30),
  });

  const activeStudents = students.filter(s => s.is_active !== false);

  const createMutation = useMutation({
    mutationFn: () => base44.entities.HomeworkAssignment.create({
      title, subject, due_date: dueDate, type,
      student_ids: activeStudents.map(s => s.id),
      submissions: activeStudents.map(s => ({
        student_id: s.id,
        student_name: s.name,
        submitted: false,
        reminder_sent: false,
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homework'] });
      setTitle(''); setSubject(''); setDueDate(''); setShowForm(false);
      toast.success('מטלה נוצרה');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ assignment, studentId }) => {
      const updated = assignment.submissions.map(s =>
        s.student_id === studentId
          ? { ...s, submitted: !s.submitted, submitted_at: !s.submitted ? new Date().toISOString() : null }
          : s
      );
      return base44.entities.HomeworkAssignment.update(assignment.id, { submissions: updated });
    },
    onMutate: async ({ assignment, studentId }) => {
      await qc.cancelQueries({ queryKey: ['homework'] });
      const previous = qc.getQueryData(['homework']);
      qc.setQueryData(['homework'], (old = []) =>
        old.map(a => a.id === assignment.id ? {
          ...a,
          submissions: a.submissions.map(s =>
            s.student_id === studentId
              ? { ...s, submitted: !s.submitted, submitted_at: !s.submitted ? new Date().toISOString() : null }
              : s
          )
        } : a)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['homework'], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['homework'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HomeworkAssignment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['homework'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-sm">מעקב מטלות</h2>
            <p className="text-[11px] text-muted-foreground">{assignments.length} מטלות</p>
          </div>
        </div>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowForm(v => !v)}>
          <Plus className="w-3.5 h-3.5" /> מטלה חדשה
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <Input placeholder="כותרת המטלה..." value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="מקצוע" value={subject} onChange={e => setSubject(e.target.value)} className="h-9 text-sm" />
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9 text-sm" />
              </div>
              <MobileSelect value={type} onValueChange={setType} className="h-9 text-sm">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </MobileSelect>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-9 text-xs" onClick={() => createMutation.mutate()} disabled={!title || !dueDate || createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'צור מטלה'}
                </Button>
                <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setShowForm(false)}>ביטול</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {assignments.map(a => (
          <AssignmentCard
            key={a.id}
            assignment={a}
            students={activeStudents}
            onToggleSubmit={(assignment, studentId) => toggleMutation.mutate({ assignment, studentId })}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
        {assignments.length === 0 && !showForm && (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">אין מטלות עדיין</p>
          </div>
        )}
      </div>
    </div>
  );
}