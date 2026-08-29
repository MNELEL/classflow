import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import TeacherProgressCard from '@/components/admin/TeacherProgressCard';
import AuditLogViewer from '@/components/admin/AuditLogViewer';
import RlsTestPanel from '@/components/admin/RlsTestPanel';
import IngestAuditViewer from '@/components/admin/IngestAuditViewer';
import AdminCharts from '@/components/admin/AdminCharts';
import {
  Users, BookOpen, ClipboardList, School, ArrowRight,
  CheckCircle2, Clock, AlertCircle, Archive, GraduationCap, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { resolveScopedStudentIds, countClassroomStudents } from '@/lib/classroomStudents';

const TASK_STATUS = {
  pending:     { label: 'ממתינות',  icon: Clock,        color: 'text-amber-600' },
  in_progress: { label: 'בביצוע',   icon: AlertCircle,  color: 'text-blue-600' },
  done:        { label: 'הושלמו',   icon: CheckCircle2, color: 'text-emerald-600' },
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [classFilter, setClassFilter] = useState('active');
  const [yearFilter, setYearFilter] = useState('all');

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
    enabled: isAdmin,
  });
  const { data: classrooms = [] } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.entities.Classroom.list(),
    enabled: isAdmin,
  });
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students-overview'],
    queryFn: () => base44.entities.Student.list(),
    enabled: isAdmin,
  });
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks-overview'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
    enabled: isAdmin,
  });

  // Distinct academic years present in classrooms (for the filter dropdown)
  const yearsList = useMemo(() => {
    const set = new Set(classrooms.map(c => c.year).filter(Boolean));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [classrooms]);

  // Scope the entire dashboard by the selected academic year — focused picture
  const scopedClassrooms = useMemo(() => {
    if (yearFilter === 'all') return classrooms;
    return classrooms.filter(c => c.year === yearFilter);
  }, [classrooms, yearFilter]);

  const scopedStudentIds = useMemo(
    () => resolveScopedStudentIds(scopedClassrooms, allStudents),
    [scopedClassrooms, allStudents]
  );
  const scopedTasks = useMemo(
    () => allTasks.filter(t => scopedStudentIds.has(t.student_id)),
    [allTasks, scopedStudentIds]
  );

  const activeTeachers = teachers.filter(t => t.is_active !== false);
  const activeClassrooms = scopedClassrooms.filter(c => c.is_active !== false);
  const archivedClassrooms = scopedClassrooms.filter(c => c.is_active === false);
  const pendingTasks = scopedTasks.filter(t => t.status === 'pending');
  const inProgressTasks = scopedTasks.filter(t => t.status === 'in_progress');
  const doneTasks = scopedTasks.filter(t => t.status === 'done');

  const teacherProgress = useMemo(() => {
    return teachers.map(teacher => {
      const teacherClassrooms = scopedClassrooms.filter(c => c.teacher_id === teacher.id);
      const studentIds = resolveScopedStudentIds(teacherClassrooms, allStudents);
      const teacherTasks = scopedTasks.filter(t => studentIds.has(t.student_id));
      const doneCount = teacherTasks.filter(t => t.status === 'done').length;
      return {
        ...teacher,
        classroomCount: teacherClassrooms.length,
        studentCount: studentIds.size,
        taskCount: teacherTasks.length,
        doneCount,
        completionRate: teacherTasks.length > 0 ? Math.round(doneCount / teacherTasks.length * 100) : 0,
      };
    });
  }, [teachers, scopedClassrooms, scopedTasks, allStudents]);

  const filteredClassrooms = useMemo(() => {
    if (classFilter === 'active') return activeClassrooms;
    if (classFilter === 'archived') return archivedClassrooms;
    return scopedClassrooms;
  }, [classFilter, scopedClassrooms, activeClassrooms, archivedClassrooms]);

  const studentMap = useMemo(() => Object.fromEntries(allStudents.map(s => [s.id, s])), [allStudents]);
  const scopedStudentCount = scopedStudentIds.size;

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-5 max-w-4xl mx-auto" dir="rtl">
          <div className="flex flex-col items-center py-20 gap-4">
            <p className="text-xl font-bold">אין הרשאה</p>
            <Button onClick={() => navigate('/')}>חזור לדף הבית</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-6xl mx-auto pb-8" dir="rtl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="mb-2 gap-1">
              <ArrowRight className="w-4 h-4" /> חזרה לניהול
            </Button>
            <h1 className="text-2xl font-bold">דשבורד מרוכז</h1>
            <p className="text-muted-foreground text-sm">תמונת מצב כללית: מורים, כיתות ומשימות</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/monthly-reports')} className="gap-1">
              <FileText className="w-4 h-4" /> תעודות חודשיות
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">שנת לימודים:</span>
              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="h-8 text-xs rounded-md border border-input bg-transparent px-2"
                aria-label="סינון לפי שנת לימודים"
              >
                <option value="all">הכל</option>
                {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatCard icon={Users} label="מורים" value={teachers.length} sub={`${activeTeachers.length} פעילים`} color="text-blue-600" />
          <StatCard icon={BookOpen} label="כיתות פעילות" value={activeClassrooms.length} sub={`${archivedClassrooms.length} בארכיון`} color="text-purple-600" />
          <StatCard icon={School} label="תלמידים" value={scopedStudentCount} sub={yearFilter === 'all' ? 'סהכ במערכת' : `בשנה ${yearFilter}`} color="text-green-600" />
          <StatCard icon={Clock} label="משימות ממתינות" value={pendingTasks.length} sub={`${inProgressTasks.length} בביצוע`} color="text-amber-600" />
          <StatCard icon={CheckCircle2} label="משימות שהושלמו" value={doneTasks.length} sub={`מתוך ${scopedTasks.length} סה"כ`} color="text-emerald-600" />
          <StatCard icon={Archive} label="כיתות בארכיון" value={archivedClassrooms.length} sub="לא פעילות" color="text-muted-foreground" />
        </motion.div>

        {/* Charts */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="mb-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            תרשימי התקדמות
          </h2>
          <AdminCharts teachers={teacherProgress} tasks={scopedTasks} />
        </motion.div>

        {/* Teachers' Progress */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            התקדמות מורים ({teachers.length})
          </h2>
          {teacherProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין מורים במערכת</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teacherProgress.map(t => <TeacherProgressCard key={t.id} teacher={t} />)}
            </div>
          )}
        </motion.div>

        {/* Classrooms with archive filter */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              כיתות
            </h2>
            <div className="flex gap-1">
              {[
                { key: 'active', label: 'פעילות', count: activeClassrooms.length },
                { key: 'archived', label: 'ארכיון', count: archivedClassrooms.length },
                { key: 'all', label: 'הכל', count: classrooms.length },
              ].map(f => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={classFilter === f.key ? 'default' : 'outline'}
                  onClick={() => setClassFilter(f.key)}
                  className="text-xs h-8"
                >
                  {f.label} ({f.count})
                </Button>
              ))}
            </div>
          </div>
          {filteredClassrooms.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">אין כיתות להצגה</p>
          ) : (
            <div className="space-y-2">
              {filteredClassrooms.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.is_active !== false ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-muted'}`}>
                      <GraduationCap className={`w-4 h-4 ${c.is_active !== false ? 'text-purple-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{c.teacher_name || 'לא משויך'}</span>
                        {c.grade_level && <span>• שכבה {c.grade_level}</span>}
                        <span>• {countClassroomStudents(c, allStudents)} תלמידים</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={c.is_active !== false ? 'default' : 'secondary'} className="text-xs shrink-0">
                    {c.is_active !== false ? 'פעילה' : 'בארכיון'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Remaining Tasks */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            משימות לפי סטטוס
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(TASK_STATUS).map(([status, meta]) => {
              const tasks = allTasks.filter(t => t.status === status);
              const Icon = meta.icon;
              return (
                <Card key={status} className="border-border/60">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Icon className={`w-4 h-4 ${meta.color}`} /> {meta.label} ({tasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      {tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">אין משימות</p>
                      ) : (
                        tasks.slice(0, 15).map(t => (
                          <div key={t.id} className="text-xs p-2 bg-muted/30 rounded-lg">
                            <p className="font-medium truncate">{t.title}</p>
                            <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                              {studentMap[t.student_id]?.full_name && <span className="truncate">{studentMap[t.student_id].full_name}</span>}
                              {t.due_date && <span>• יעד {t.due_date}</span>}
                            </div>
                          </div>
                        ))
                      )}
                      {tasks.length > 15 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">+{tasks.length - 15} נוספות</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* Audit Log + RLS Tests */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <AuditLogViewer />
          <RlsTestPanel />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="mt-4">
          <IngestAuditViewer />
        </motion.div>
      </div>
    </AppLayout>
  );
}