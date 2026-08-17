import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Clock } from 'lucide-react';
import { parseISO, differenceInCalendarDays } from 'date-fns';

export default function TaskCheckRow({ task, studentName, selectedDate }) {
  const queryClient = useQueryClient();
  const isDone = task.status === 'done';
  const isOverdue =
    task.due_date &&
    !isDone &&
    differenceInCalendarDays(parseISO(task.due_date), new Date(selectedDate + 'T00:00:00')) < 0;

  const toggle = useMutation({
    mutationFn: (next) => base44.entities.Task.update(task.id, { status: next }),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ['tasks-all'] });
      const prev = queryClient.getQueryData(['tasks-all']);
      queryClient.setQueryData(['tasks-all'], (old = []) =>
        old.map((t) => (t.id === task.id ? { ...t, status: next } : t))
      );
      return { prev };
    },
    onError: (_e, _n, ctx) => ctx?.prev && queryClient.setQueryData(['tasks-all'], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks-all'] }),
  });

  return (
    <div className="flex items-center gap-2.5 bg-muted/30 rounded-lg px-2.5 py-2">
      <button
        onClick={() => toggle.mutate(isDone ? 'pending' : 'done')}
        disabled={toggle.isPending}
        aria-label={isDone ? 'סמן כלא הושלם' : 'סמן כי הושלם'}
        className={cn(
          'shrink-0 h-6 w-6 rounded-md border-2 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px]',
          isDone
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-muted-foreground/40 hover:border-primary hover:bg-primary/10'
        )}
      >
        {isDone && <Check className="w-4 h-4" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium truncate', isDone && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {studentName && `${studentName}`}
          {task.subject && ` · ${task.subject}`}
          {task.due_date && ` · ${parseISO(task.due_date).toLocaleDateString('he-IL')}`}
        </p>
      </div>
      {isOverdue && (
        <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-semibold shrink-0">
          <AlertCircle className="w-3 h-3" /> איחור
        </span>
      )}
      {!isDone && !isOverdue && (
        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      )}
    </div>
  );
}