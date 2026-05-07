import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { isPast, parseISO, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function TasksAlert({ students }) {
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => base44.entities.Task.list(),
  });

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const now = new Date();

  const overdue = allTasks.filter(t => t.status !== 'done' && t.due_date && isPast(parseISO(t.due_date)));
  const pending = allTasks.filter(t => t.status === 'pending');

  if (overdue.length === 0 && pending.length === 0) return null;

  return (
    <Card className="border-orange-300 dark:border-orange-700 bg-orange-50/40 dark:bg-orange-900/10">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-1.5 text-orange-700 dark:text-orange-400">
          <AlertTriangle className="w-4 h-4" /> התראות משימות
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {overdue.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-red-600 mb-1 uppercase tracking-wide">⚠️ באיחור ({overdue.length})</p>
            <div className="space-y-1">
              {overdue.slice(0, 3).map(t => {
                const student = studentMap[t.student_id];
                return (
                  <div key={t.id} className="flex items-center justify-between text-xs bg-red-50 dark:bg-red-900/20 rounded-lg px-2.5 py-1.5">
                    <span className="font-medium">{student?.name || '—'}: {t.title}</span>
                    <span className="text-red-500 text-[10px]">
                      {formatDistanceToNow(parseISO(t.due_date), { locale: he, addSuffix: true })}
                    </span>
                  </div>
                );
              })}
              {overdue.length > 3 && <p className="text-[10px] text-muted-foreground pr-1">ועוד {overdue.length - 3}...</p>}
            </div>
          </div>
        )}
        {pending.length > 0 && (
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {pending.length} משימות ממתינות לביצוע
            </span>
            <Link to="/students" className="text-primary text-[11px] hover:underline">צפה ←</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}