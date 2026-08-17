import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import HebrewDateNavigator from '@/components/ui/HebrewDateNavigator';
import { CheckCircle2, Circle, Target, ListChecks, Loader2 } from 'lucide-react';
import { startOfWeek, addDays, format, isWithinInterval } from 'date-fns';
import { formatDate, formatDateLong } from '@/lib/formatDate';
import { useSelectedDate } from '@/lib/dateContext';

function ymd(d) { return format(d, 'yyyy-MM-dd'); }

export default function WeeklyTasksPage() {
  const qc = useQueryClient();
  const { selectedDate } = useSelectedDate();
  const weekStart = useMemo(() => startOfWeek(new Date(selectedDate + 'T00:00:00'), { weekStartsOn: 0 }), [selectedDate]);
  const weekEnd = addDays(weekStart, 6);
  const weekKey = ymd(weekStart);

  const { data: curriculumWeeks = [] } = useQuery({
    queryKey: ['curriculum-weeks', weekKey],
    queryFn: () => base44.entities.CurriculumWeek.filter({ week_start: weekKey }),
  });
  const cw = curriculumWeeks[0] || null;
  const goals = cw?.parsed_goals || [];

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks-week', weekKey],
    queryFn: () => base44.entities.Task.list('-due_date', 200),
  });
  const weekTasks = useMemo(() => tasks.filter(t => {
    try { return isWithinInterval(new Date(t.due_date), { start: weekStart, end: weekEnd }); } catch { return false; }
  }), [tasks, weekStart, weekEnd]);

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const studentName = (id) => students.find(s => s.id === id)?.name || '—';

  const updateGoalMutation = useMutation({
    mutationFn: ({ cw, goalId, value }) => {
      const parsed = (cw.parsed_goals || []).map(g => g.id === goalId ? { ...g, is_completed: value } : g);
      return base44.entities.CurriculumWeek.update(cw.id, { parsed_goals: parsed });
    },
    onMutate: async ({ cw, goalId, value }) => {
      await qc.cancelQueries({ queryKey: ['curriculum-weeks', weekKey] });
      const prev = qc.getQueryData(['curriculum-weeks', weekKey]);
      qc.setQueryData(['curriculum-weeks', weekKey], (old = []) =>
        old.map(w => w.id === cw.id ? { ...w, parsed_goals: (w.parsed_goals || []).map(g => g.id === goalId ? { ...g, is_completed: value } : g) } : w)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['curriculum-weeks', weekKey], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['curriculum-weeks', weekKey] }),
  });

  const toggleTask = useMutation({
    mutationFn: ({ task }) => base44.entities.Task.update(task.id, { status: task.status === 'done' ? 'pending' : 'done' }),
    onMutate: async ({ task }) => {
      await qc.cancelQueries({ queryKey: ['tasks-week', weekKey] });
      const prev = qc.getQueryData(['tasks-week', weekKey]);
      qc.setQueryData(['tasks-week', weekKey], (old = []) => old.map(t => t.id === task.id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['tasks-week', weekKey], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks-week', weekKey] }),
  });

  const completedGoals = goals.filter(g => g.is_completed).length;
  const doneTasks = weekTasks.filter(t => t.status === 'done').length;
  const goalPct = goals.length ? Math.round(completedGoals / goals.length * 100) : 0;
  const taskPct = weekTasks.length ? Math.round(doneTasks / weekTasks.length * 100) : 0;

  return (
    <AppLayout>
      <div className="p-4 space-y-4 max-w-2xl mx-auto" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
            <ListChecks className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">ניהול מטלות שבועי</h1>
            <p className="text-xs text-muted-foreground">{formatDateLong(weekStart)}</p>
          </div>
        </div>

        <HebrewDateNavigator />

        {/* Curriculum goals progress */}
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold flex items-center gap-1.5"><Target className="w-4 h-4 text-primary" /> מטרות השבוע — תכנון לימודי</span>
            <span className="text-xs text-muted-foreground">{completedGoals}/{goals.length}</span>
          </div>
          {goals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">אין מטרות מוגדרות לשבוע זה. צרו תכנון לימודי בעמוד התכנון.</p>
          ) : (
            <>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${goalPct}%` }} />
              </div>
              <div className="space-y-1.5">
                {goals.map(g => (
                  <button key={g.id} onClick={() => updateGoalMutation.mutate({ cw, goalId: g.id, value: !g.is_completed })}
                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors text-right">
                    {g.is_completed ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <span className={`text-sm flex-1 ${g.is_completed ? 'text-muted-foreground line-through' : ''}`}>{g.description || g.id}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Class tasks progress */}
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold flex items-center gap-1.5"><ListChecks className="w-4 h-4 text-indigo-600" /> משימות הכיתה לשבוע</span>
            <span className="text-xs text-muted-foreground">{doneTasks}/{weekTasks.length}</span>
          </div>
          {loadingTasks ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : weekTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">אין משימות לשבוע זה.</p>
          ) : (
            <>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${taskPct}%` }} />
              </div>
              <div className="space-y-1.5">
                {weekTasks.map(t => (
                  <button key={t.id} onClick={() => toggleTask.mutate({ task: t })}
                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors text-right">
                    {t.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <span className={`text-sm flex-1 ${t.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>{t.title}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{studentName(t.student_id)}</span>
                    {t.due_date && <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(t.due_date)}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}