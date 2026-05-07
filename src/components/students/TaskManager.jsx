import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  pending: { label: 'ממתין', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'בטיפול', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <AlertCircle className="w-3 h-3" /> },
  done: { label: 'הושלם', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
};

const PRIORITY_CONFIG = {
  low: { label: 'נמוכה', color: 'text-muted-foreground' },
  medium: { label: 'בינונית', color: 'text-yellow-600' },
  high: { label: 'גבוהה', color: 'text-red-600' },
};

export default function TaskManager({ student, open, onClose }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', subject: '', priority: 'medium', status: 'pending' });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', student?.id],
    queryFn: () => base44.entities.Task.filter({ student_id: student.id }),
    enabled: !!student?.id && open,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create({ ...data, student_id: student.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); setForm({ title: '', description: '', due_date: '', subject: '', priority: 'medium', status: 'pending' }); toast.success('משימה נוספה'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('משימה נמחקה'); },
  });

  function cycleStatus(task) {
    const next = { pending: 'in_progress', in_progress: 'done', done: 'pending' };
    updateMutation.mutate({ id: task.id, data: { status: next[task.status] } });
  }

  const isOverdue = (t) => t.due_date && t.status !== 'done' && isPast(parseISO(t.due_date));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            משימות — {student?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {tasks.length === 0 && !showForm && (
            <p className="text-center text-muted-foreground text-sm py-4">אין משימות עדיין</p>
          )}
          {tasks.map(task => {
            const cfg = STATUS_CONFIG[task.status];
            const overdue = isOverdue(task);
            return (
              <div key={task.id} className={`border rounded-xl p-3 space-y-1 transition-colors ${overdue ? 'border-red-300 bg-red-50/30 dark:bg-red-900/10' : 'border-border'}`}>
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => cycleStatus(task)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border-0 transition-colors ${cfg.color}`}>
                    {cfg.icon} {cfg.label}
                  </button>
                  <span className="font-semibold text-sm flex-1 text-right">{task.title}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => deleteMutation.mutate(task.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                {task.description && <p className="text-xs text-muted-foreground pr-1">{task.description}</p>}
                <div className="flex items-center gap-2 flex-wrap">
                  {task.subject && <Badge variant="outline" className="text-[10px]">{task.subject}</Badge>}
                  {task.priority && <span className={`text-[10px] font-medium ${PRIORITY_CONFIG[task.priority]?.color}`}>עדיפות {PRIORITY_CONFIG[task.priority]?.label}</span>}
                  {task.due_date && (
                    <span className={`text-[10px] flex items-center gap-1 ${overdue ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                      <Calendar className="w-2.5 h-2.5" />
                      {overdue ? '⚠️ ' : ''}{format(parseISO(task.due_date), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showForm ? (
          <div className="border border-primary/30 rounded-xl p-3 space-y-2 bg-accent/10">
            <Input placeholder="כותרת המשימה *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Input placeholder="תיאור (אופציונלי)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="מקצוע" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={`flex-1 text-xs py-1 rounded-lg border transition-colors ${form.priority === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40'}`}>
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => createMutation.mutate(form)} disabled={!form.title.trim()}>שמור</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>ביטול</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> הוסף משימה
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}