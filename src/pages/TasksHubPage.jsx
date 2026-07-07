import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, Users, Loader2, BookOpen, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { he } from 'date-fns/locale';
import TaskAlertsBanner from '@/components/tasks/TaskAlertsBanner';

const STATUS_LABELS = { pending: 'ממתין', in_progress: 'בביצוע', done: 'הושלם' };
const STATUS_ICONS = { pending: Clock, in_progress: Clock, done: CheckCircle2 };
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export default function TasksHubPage() {
  const { user } = useAuth();
  const [expandedClass, setExpandedClass] = useState(null);
  const [filter, setFilter] = useState('all'); // all | pending | in_progress | done | overdue

  const { data: classrooms = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.entities.Classroom.list(),
  });
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.filter({ is_active: true }),
  });
  const { data: homework = [] } = useQuery({
    queryKey: ['homework'],
    queryFn: () => base44.entities.HomeworkAssignment.list('-due_date', 200),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-all'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  // Filter classrooms: regular teachers see only their own; admin sees all
  const visibleClassrooms = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return classrooms.filter(c => c.is_active !== false);
    return classrooms.filter(c => c.teacher_id === user.id && c.is_active !== false);
  }, [classrooms, user]);

  // Group homework + tasks by classroom
  const classData = useMemo(() => {
    const today = new Date();
    return visibleClassrooms.map(classroom => {
      const classStudentIds = (classroom.student_ids || []);
      const classStudents = students.filter(s => classStudentIds.includes(s.id));

      const classHomework = homework.filter(hw => {
        if (!hw.student_ids || hw.student_ids.length === 0) return false;
        return hw.student_ids.some(sid => classStudentIds.includes(sid));
      });

      const classTasks = tasks.filter(t => {
        if (!t.student_id) return false;
        return classStudentIds.includes(t.student_id);
      });

      // Status breakdown for tasks
      const taskStatusBreakdown = {
        pending: classTasks.filter(t => t.status === 'pending').length,
        in_progress: classTasks.filter(t => t.status === 'in_progress').length,
        done: classTasks.filter(t => t.status === 'done').length,
      };

      // Homework submission stats
      const hwSubmitted = classHomework.reduce((sum, hw) => sum + (hw.submissions?.filter(s => s.submitted).length || 0), 0);
      const hwTotal = classHomework.reduce((sum, hw) => sum + (hw.submissions?.length || hw.student_ids?.length || 0), 0);

      const pendingTasks = classTasks.filter(t => t.status !== 'done');
      const pendingHomework = classHomework.filter(hw => hw.submissions?.some(sub => !sub.submitted));

      const overdueTasks = classTasks.filter(t => {
        if (t.status === 'done' || !t.due_date) return false;
        return differenceInCalendarDays(parseISO(t.due_date), today) < 0;
      });
      const overdueHomework = classHomework.filter(hw => {
        if (!hw.due_date) return false;
        return differenceInCalendarDays(parseISO(hw.due_date), today) < 0 &&
          hw.submissions?.some(sub => !sub.submitted);
      });

      return {
        classroom,
        studentCount: classStudents.length,
        homework: classHomework,
        tasks: classTasks,
        taskStatusBreakdown,
        hwSubmitted,
        hwTotal,
        pendingCount: pendingHomework.length + pendingTasks.length,
        overdueCount: overdueTasks.length + overdueHomework.length,
        doneCount: taskStatusBreakdown.done,
        totalCount: classTasks.length + classHomework.length,
      };
    }).filter(cd => cd.studentCount > 0 || cd.homework.length > 0 || cd.tasks.length > 0);
  }, [visibleClassrooms, students, homework, tasks]);

  const filteredClasses = useMemo(() => {
    if (filter === 'pending') return classData.filter(c => c.pendingCount > 0);
    if (filter === 'in_progress') return classData.filter(c => c.taskStatusBreakdown.in_progress > 0);
    if (filter === 'done') return classData.filter(c => c.pendingCount === 0 && c.overdueCount === 0 && c.totalCount > 0);
    if (filter === 'overdue') return classData.filter(c => c.overdueCount > 0);
    return classData;
  }, [classData, filter]);

  const totalPending = classData.reduce((s, c) => s + c.pendingCount, 0);
  const totalOverdue = classData.reduce((s, c) => s + c.overdueCount, 0);
  const totalDone = classData.reduce((s, c) => s + c.doneCount, 0);

  if (loadingClasses) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="overflow-y-auto h-full">
        <div className="p-4 max-w-3xl mx-auto space-y-4 pb-8" dir="rtl">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg">לוח בקרת משימות</h1>
              <p className="text-xs text-muted-foreground">
                {user?.role === 'admin' ? 'כל הכיתות' : 'הכיתות שלך'} · מה מחכה לטיפול בכל קבוצה
              </p>
            </div>
          </div>

          {/* Daily alerts */}
          <TaskAlertsBanner classData={classData} />

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-2">
            <Card className="border-border/60">
              <CardContent className="p-2.5 text-center">
                <p className="text-xl font-bold text-indigo-600">{classData.length}</p>
                <p className="text-[9px] text-muted-foreground">כיתות</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-2.5 text-center">
                <p className="text-xl font-bold text-amber-600">{totalPending}</p>
                <p className="text-[9px] text-muted-foreground">ממתינות</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-2.5 text-center">
                <p className="text-xl font-bold text-red-600">{totalOverdue}</p>
                <p className="text-[9px] text-muted-foreground">באיחור</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-2.5 text-center">
                <p className="text-xl font-bold text-emerald-600">{totalDone}</p>
                <p className="text-[9px] text-muted-foreground">הושלמו</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1 overflow-x-auto no-scrollbar">
            {[
              { value: 'all', label: 'הכל' },
              { value: 'pending', label: 'ממתינות' },
              { value: 'in_progress', label: 'בביצוע' },
              { value: 'overdue', label: 'באיחור' },
              { value: 'done', label: 'הושלמו' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex-1 min-w-fit px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${filter === f.value ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Class cards */}
          {filteredClasses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">אין משימות להצגה</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClasses.map(({ classroom, studentCount, homework, tasks, taskStatusBreakdown, hwSubmitted, hwTotal, pendingCount, overdueCount, doneCount, totalCount }) => {
                const isExpanded = expandedClass === classroom.id;
                const taskTotal = tasks.length;
                const statusPct = taskTotal > 0 ? {
                  pending: (taskStatusBreakdown.pending / taskTotal) * 100,
                  in_progress: (taskStatusBreakdown.in_progress / taskTotal) * 100,
                  done: (taskStatusBreakdown.done / taskTotal) * 100,
                } : { pending: 0, in_progress: 0, done: 0 };

                return (
                  <Card key={classroom.id} className="border-border/60 overflow-hidden">
                    <button
                      onClick={() => setExpandedClass(isExpanded ? null : classroom.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors text-right"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{classroom.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {studentCount} תלמידים{classroom.teacher_name ? ` · ${classroom.teacher_name}` : ''}
                        </p>
                        {/* Status bar */}
                        {taskTotal > 0 && (
                          <div className="flex h-1.5 rounded-full overflow-hidden mt-1.5 gap-0.5">
                            {statusPct.pending > 0 && <div className="bg-amber-400" style={{ width: `${statusPct.pending}%` }} />}
                            {statusPct.in_progress > 0 && <div className="bg-blue-400" style={{ width: `${statusPct.in_progress}%` }} />}
                            {statusPct.done > 0 && <div className="bg-emerald-400" style={{ width: `${statusPct.done}%` }} />}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          {overdueCount > 0 && (
                            <Badge className="bg-red-100 text-red-700 border-0 text-[10px] gap-0.5">
                              <AlertCircle className="w-3 h-3" /> {overdueCount}
                            </Badge>
                          )}
                          {pendingCount > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">{pendingCount}</Badge>
                          )}
                          {pendingCount === 0 && overdueCount === 0 && totalCount > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> מעודכן
                            </Badge>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Mini status legend (always visible when tasks exist) */}
                    {taskTotal > 0 && !isExpanded && (
                      <div className="flex items-center gap-3 px-3 pb-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> {taskStatusBreakdown.pending} ממתינות</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> {taskStatusBreakdown.in_progress} בביצוע</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> {taskStatusBreakdown.done} הושלמו</span>
                      </div>
                    )}

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-3 border-t border-border/60 pt-3">
                            {/* Homework section */}
                            {homework.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                                  <p className="text-[11px] font-bold text-muted-foreground">שיעורי בית · {hwSubmitted}/{hwTotal} הגישו</p>
                                </div>
                                <div className="space-y-1.5">
                                  {homework.map(hw => {
                                    const submitted = hw.submissions?.filter(s => s.submitted).length || 0;
                                    const total = hw.submissions?.length || hw.student_ids?.length || 0;
                                    const isOverdue = hw.due_date && differenceInCalendarDays(parseISO(hw.due_date), new Date()) < 0 && submitted < total;
                                    return (
                                      <div key={hw.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate">{hw.title}</p>
                                          <p className="text-[10px] text-muted-foreground">
                                            {hw.subject && `${hw.subject} · `}
                                            {hw.due_date ? format(parseISO(hw.due_date), 'dd/MM', { locale: he }) : 'ללא תאריך'}
                                            {` · ${submitted}/${total} הגישו`}
                                          </p>
                                        </div>
                                        {isOverdue && <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">איחור</Badge>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Tasks section */}
                            {tasks.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                                  <p className="text-[11px] font-bold text-muted-foreground">משימות · {tasks.length}</p>
                                </div>
                                <div className="space-y-1.5">
                                  {tasks.map(t => {
                                    const StatusIcon = STATUS_ICONS[t.status] || Clock;
                                    const isOverdue = t.due_date && t.status !== 'done' && differenceInCalendarDays(parseISO(t.due_date), new Date()) < 0;
                                    return (
                                      <div key={t.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                                        <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${t.status === 'done' ? 'text-emerald-600' : 'text-amber-600'}`} />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate">{t.title}</p>
                                          <p className="text-[10px] text-muted-foreground">
                                            {t.subject && `${t.subject} · `}
                                            {t.due_date ? format(parseISO(t.due_date), 'dd/MM', { locale: he }) : 'ללא תאריך'}
                                          </p>
                                        </div>
                                        <Badge className={`${STATUS_COLORS[t.status]} border-0 text-[10px]`}>
                                          {STATUS_LABELS[t.status] || t.status}
                                        </Badge>
                                        {isOverdue && <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">איחור</Badge>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {homework.length === 0 && tasks.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">אין משימות לכיתה זו</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}