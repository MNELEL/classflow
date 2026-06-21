import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, TrendingUp, BookOpen, ClipboardList, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

export default function WeeklyActivitySummary() {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-all'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });
  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 50),
    staleTime: 60_000,
  });
  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: () => base44.entities.Grade.list('-date', 100),
    staleTime: 60_000,
  });

  const weekInterval = useMemo(() => {
    const now = new Date();
    return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
  }, []);

  // Lesson plans completed this week (library items with lesson_log entries this week)
  const lessonsCompletedThisWeek = useMemo(() => {
    return libraryItems.filter(item =>
      item.lesson_log?.some(log => {
        if (!log.date) return false;
        return isWithinInterval(parseISO(log.date), weekInterval);
      })
    ).length;
  }, [libraryItems, weekInterval]);

  // Tasks needing attention: overdue or high priority pending
  const tasksNeedAttention = useMemo(() => {
    const now = new Date();
    return tasks.filter(t => {
      if (t.status === 'done') return false;
      const overdue = t.due_date && parseISO(t.due_date) < now;
      const urgent = t.priority === 'high' && t.status === 'pending';
      return overdue || urgent;
    });
  }, [tasks]);

  // Avg student task progress (% done out of all tasks per student)
  const avgProgress = useMemo(() => {
    if (!tasks.length) return null;
    const studentMap = {};
    tasks.forEach(t => {
      if (!studentMap[t.student_id]) studentMap[t.student_id] = { total: 0, done: 0 };
      studentMap[t.student_id].total++;
      if (t.status === 'done') studentMap[t.student_id].done++;
    });
    const rates = Object.values(studentMap).map(s => s.total > 0 ? (s.done / s.total) * 100 : 0);
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [tasks]);

  // Grades added this week
  const gradesThisWeek = useMemo(() =>
    grades.filter(g => g.date && isWithinInterval(parseISO(g.date), weekInterval)).length,
    [grades, weekInterval]);

  const hasData = tasks.length > 0 || lessonsCompletedThisWeek > 0 || gradesThisWeek > 0;

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden mb-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-primary/5">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">סיכום פעילות שבועית</span>
        </div>
        <Link to="/homework" className="flex items-center gap-0.5 text-xs text-primary hover:underline">
          לכל המטלות <ChevronLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {!hasData ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          אין עדיין פעילות שבועית לסיכום
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-x-reverse divide-border/40">

          {/* Lessons completed */}
          <div className="px-4 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              מערכי שיעור הושלמו
            </div>
            <p className="text-2xl font-bold text-blue-600">{lessonsCompletedThisWeek}</p>
            <p className="text-xs text-muted-foreground">השבוע</p>
          </div>

          {/* Grades this week */}
          <div className="px-4 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ציונים הוזנו
            </div>
            <p className="text-2xl font-bold text-emerald-600">{gradesThisWeek}</p>
            <p className="text-xs text-muted-foreground">השבוע</p>
          </div>

          {/* Tasks needing attention */}
          <div className="px-4 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              מטלות דורשות תשומת לב
            </div>
            <p className={`text-2xl font-bold ${tasksNeedAttention.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {tasksNeedAttention.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {tasksNeedAttention.length > 0 ? 'באיחור או דחוף' : 'הכל בסדר ✓'}
            </p>
          </div>

          {/* Avg student progress */}
          <div className="px-4 py-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              התקדמות תלמידים
            </div>
            <p className={`text-2xl font-bold ${avgProgress === null ? 'text-muted-foreground' : avgProgress >= 70 ? 'text-primary' : avgProgress >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
              {avgProgress !== null ? `${avgProgress}%` : '—'}
            </p>
            {avgProgress !== null && (
              <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${avgProgress >= 70 ? 'bg-primary' : avgProgress >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${avgProgress}%` }}
                />
              </div>
            )}
            {avgProgress === null && <p className="text-xs text-muted-foreground">אין משימות</p>}
          </div>

        </div>
      )}
    </div>
  );
}