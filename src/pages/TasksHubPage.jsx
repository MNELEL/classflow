import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClipboardList, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_LABELS = { pending: 'ממתין', in_progress: 'בביצוע', done: 'הושלם' };
const STATUS_ICONS = { pending: Clock, in_progress: Clock, done: CheckCircle2 };
const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export default function TasksHubPage() {
  const [expandedClass, setExpandedClass] = useState(null);
  const [filter, setFilter] = useState('all'); // all | pending | overdue

  const { data: classrooms = [] } = useQuery({
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

  // Map students to classrooms
  const studentToClass = useMemo(() => {
    const map = {};
    classrooms.forEach(c => {
      (c.student_ids || []).forEach(sid => { map[sid] = c.id; });
    });
    return map;
  }, [classrooms]);

  // Group homework + tasks by classroom
  const classData = useMemo(() => {
    const today = new Date();
    return classrooms.map(classroom => {
      const classStudentIds = (classroom.student_ids || []);
      const classStudents = students.filter(s => classStudentIds.includes(s.id));

      // Homework assigned to this class's students
      const classHomework = homework.filter(hw => {
        if (!hw.student_ids || hw.student_ids.length === 0) return false;
        return hw.student_ids.some(sid => classStudentIds.includes(sid));
      });

      // Tasks assigned to this class's students
      const classTasks = tasks.filter(t => {
        if (!t.student_id) return false;
        return classStudentIds.includes(t.student_id);
      });

      // Calculate pending counts
      const pendingHomework = classHomework.filter(hw => {
        return hw.submissions?.some(sub => !sub.submitted) || hw.status !== 'done';
      });
      const pendingTasks = classTasks.filter(t => t.status !== 'done');
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
        pendingCount: pendingHomework.length + pendingTasks.length,
        overdueCount: overdueTasks.length + overdueHomework.length,
        doneCount: classTasks.filter(t => t.status === 'done').length,
      };
    }).filter(cd => cd.studentCount > 0 || cd.homework.length > 0 || cd.tasks.length > 0);
  }, [classrooms, students, homework, tasks]);

  const filteredClasses = useMemo(() => {
    if (filter === 'pending') return classData.filter(c => c.pendingCount > 0);
    if (filter === 'overdue') return classData.filter(c => c.overdueCount > 0);
    return classData;
  }, [classData, filter]);

  const totalPending = classData.reduce((s, c) => s + c.pendingCount, 0);
  const totalOverdue = classData.reduce((s, c) => s + c.overdueCount, 0);

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
              <h1 className="font-bold text-lg">ריכוז משימות לפי כיתה</h1>
              <p className="text-xs text-muted-foreground">מה מחכה לטיפול בכל קבוצה</p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-border/60">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-indigo-600">{classData.length}</p>
                <p className="text-[10px] text-muted-foreground">כיתות פעילות</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{totalPending}</p>
                <p className="text-[10px] text-muted-foreground">ממתינות לטיפול</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
                <p className="text-[10px] text-muted-foreground">באיחור</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {[
              { value: 'all', label: 'הכל' },
              { value: 'pending', label: 'ממתינות' },
              { value: 'overdue', label: 'באיחור' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f.value ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
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
              {filteredClasses.map(({ classroom, studentCount, homework, tasks, pendingCount, overdueCount, doneCount }) => {
                const isExpanded = expandedClass === classroom.id;
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
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {overdueCount > 0 && (
                          <Badge className="bg-red-100 text-red-700 border-0 text-[10px] gap-1">
                            <AlertCircle className="w-3 h-3" /> {overdueCount}
                          </Badge>
                        )}
                        {pendingCount > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">{pendingCount} ממתינות</Badge>
                        )}
                        {pendingCount === 0 && overdueCount === 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" /> מעודכן
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

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
                                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">שיעורי בית</p>
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
                                <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1.5">משימות</p>
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