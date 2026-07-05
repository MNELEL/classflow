import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle2, Circle, Plus, Trash2, Calendar, AlertCircle,
  CheckCheck, Clock, TrendingUp, Loader2
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRIORITY_CONFIG = {
  low:    { label: 'נמוכה', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  medium: { label: 'בינונית', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  high:   { label: 'דחופה', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

const STATUS_CONFIG = {
  pending:     { label: 'ממתין',     icon: Circle,       color: 'text-muted-foreground' },
  in_progress: { label: 'בביצוע',   icon: Clock,        color: 'text-amber-500'        },
  done:        { label: 'הושלם',    icon: CheckCircle2, color: 'text-emerald-500'       },
};

export default function StudentTaskList({ studentId }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', studentId],
    queryFn: () => base44.entities.Task.filter({ student_id: studentId }, '-created_date', 100),
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', studentId] });
      setTitle(''); setSubject(''); setDueDate(''); setPriority('medium');
      setShowForm(false);
      toast.success('משימה נוספה');
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['tasks', studentId] });
      const previous = qc.getQueryData(['tasks', studentId]);
      qc.setQueryData(['tasks', studentId], (old = []) =>
        old.map(t => t.id === id ? { ...t, ...data } : t)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['tasks', studentId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks', studentId] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', studentId] });
      toast.success('משימה נמחקה');
    },
  });

  const handleCreate = () => {
    if (!title.trim()) return;
    createTask.mutate({
      student_id: studentId,
      title: title.trim(),
      subject: subject || null,
      due_date: dueDate || null,
      priority,
      status: 'pending',
    });
  };

  const cycleStatus = (task) => {
    const order = ['pending', 'in_progress', 'done'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    updateTask.mutate({ id: task.id, data: { status: next } });
  };

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  // Stats
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const overdue = tasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'done').length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  if (isLoading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">

      {/* Progress summary */}
      {total > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">התקדמות בסמסטר</span>
            </div>
            <span className="text-sm font-bold text-primary">{progress}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Mini stats */}
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> {done} הושלמו
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> {inProgress} בביצוע
            </span>
            {overdue > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="w-3.5 h-3.5" /> {overdue} באיחור
              </span>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המשימות ({total})</SelectItem>
            <SelectItem value="pending">ממתינות</SelectItem>
            <SelectItem value="in_progress">בביצוע</SelectItem>
            <SelectItem value="done">הושלמו</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1 shrink-0">
          <Plus className="w-3.5 h-3.5" /> משימה
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
          <Input
            placeholder="כותרת המשימה..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="h-9 text-sm"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="מקצוע (אופציונלי)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">⚪ נמוכה</SelectItem>
                <SelectItem value="medium">🔵 בינונית</SelectItem>
                <SelectItem value="high">🔴 דחופה</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleCreate} disabled={!title.trim() || createTask.isPending} className="flex-1">
              {createTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'הוסף'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>ביטול</Button>
          </div>
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Circle className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">{filterStatus === 'all' ? 'אין משימות עדיין' : 'אין משימות בסטטוס זה'}</p>
          {filterStatus === 'all' && (
            <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> הוסף משימה ראשונה
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const pri = PRIORITY_CONFIG[task.priority];
            const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
            const isDueToday = task.due_date && isToday(parseISO(task.due_date));

            return (
              <div key={task.id}
                className={cn(
                  'flex items-start gap-3 bg-card border rounded-xl px-3.5 py-3 transition-all',
                  task.status === 'done' ? 'border-emerald-200 dark:border-emerald-900/50 opacity-70' : 'border-border',
                  isOverdue && 'border-red-200 dark:border-red-900/50'
                )}>
                {/* Status toggle */}
                <button
                  onClick={() => cycleStatus(task)}
                  className={cn('mt-0.5 shrink-0 transition-colors hover:scale-110', cfg.color)}
                >
                  <StatusIcon className="w-5 h-5" />
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium leading-tight', task.status === 'done' && 'line-through text-muted-foreground')}>
                    {task.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {task.subject && (
                      <span className="text-xs text-muted-foreground">{task.subject}</span>
                    )}
                    {task.due_date && (
                      <span className={cn('text-xs flex items-center gap-0.5',
                        isOverdue ? 'text-red-500 font-medium' : isDueToday ? 'text-amber-500 font-medium' : 'text-muted-foreground')}>
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(task.due_date), 'd MMM', { locale: he })}
                        {isOverdue && ' • באיחור'}
                        {isDueToday && !isOverdue && ' • היום'}
                      </span>
                    )}
                    {pri && (
                      <Badge className={cn('text-[10px] h-4 px-1.5 border-0', pri.color)}>{pri.label}</Badge>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteTask.mutate(task.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}