import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSelectedDate } from '@/lib/dateContext';
import HebrewDateNavigator from '@/components/ui/HebrewDateNavigator';
import TaskCheckRow from './TaskCheckRow';
import SubjectFilter from './SubjectFilter';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, CalendarDays } from 'lucide-react';
import { parseISO, differenceInCalendarDays } from 'date-fns';

function weekOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const start = new Date(d); start.setDate(d.getDate() - day);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  return { start, end };
}
function inRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

export default function WeeklyTasksManager() {
  const { selectedDate } = useSelectedDate();
  const [subjectFilter, setSubjectFilter] = useState('all');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks-all'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.filter({ is_active: true }),
  });

  const studentMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s.name])), [students]);
  const { start, end } = weekOf(selectedDate);
  const endDay = new Date(end); endDay.setHours(23, 59, 59, 999);

  const weekTasks = useMemo(
    () => tasks.filter((t) => inRange(t.due_date, start, endDay) || (t.status !== 'done' && inRange(t.created_date, start, endDay))),
    [tasks, start, endDay]
  );

  // Overdue alerts: tasks not done with due_date before selected date (and not in current week)
  const overdueAlerts = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status === 'done' || !t.due_date) return false;
        return differenceInCalendarDays(parseISO(t.due_date), new Date(selectedDate + 'T00:00:00')) < 0 && !inRange(t.due_date, start, end);
      }),
    [tasks, selectedDate, start, end]
  );

  const subjects = useMemo(() => [...new Set(weekTasks.map((t) => t.subject).filter(Boolean))].sort(), [weekTasks]);
  const shown = subjectFilter === 'all' ? weekTasks : weekTasks.filter((t) => t.subject === subjectFilter);

  const doneCount = shown.filter((t) => t.status === 'done').length;
  const totalCount = shown.length;

  return (
    <Card className="border-border/60">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-sm">מרכז מטלות שבועי</h2>
            <p className="text-[11px] text-muted-foreground">
              {totalCount > 0 ? `${doneCount} מתוך ${totalCount} הושלמו` : 'אין מטלות לשבוע זה'}
            </p>
          </div>
          {overdueAlerts.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full shrink-0">
              <AlertCircle className="w-3.5 h-3.5" /> {overdueAlerts.length} באיחור
            </span>
          )}
        </div>

        <HebrewDateNavigator />

        {subjects.length > 0 && <SubjectFilter subjects={subjects} value={subjectFilter} onChange={setSubjectFilter} />}

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : shown.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">הכל מסודר לשבוע זה</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {shown.map((t) => (
              <TaskCheckRow key={t.id} task={t} studentName={studentMap[t.student_id]} selectedDate={selectedDate} />
            ))}
          </div>
        )}

        {overdueAlerts.length > 0 && (
          <div className="border-t border-border/60 pt-2.5 space-y-1.5">
            <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> מטלות באיחור מצטבר
            </p>
            {overdueAlerts.slice(0, 5).map((t) => (
              <TaskCheckRow key={t.id} task={t} studentName={studentMap[t.student_id]} selectedDate={selectedDate} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}