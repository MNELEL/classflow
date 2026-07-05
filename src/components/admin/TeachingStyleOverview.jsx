import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Sparkles, BookOpen, TrendingUp, FileText, ChevronLeft } from 'lucide-react';

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function TeachingStyleOverview({ teachers, classrooms, allStudents, allTasks, allGrades, allBehavior }) {
  const teachersWithStats = useMemo(() => {
    return teachers.map(t => {
      const tClassrooms = classrooms.filter(c => c.teacher_id === t.id);
      const studentIds = tClassrooms.flatMap(c => c.student_ids || []);
      const students = allStudents.filter(s => studentIds.includes(s.id));
      const tasks = allTasks.filter(t => studentIds.includes(t.student_id));
      const grades = allGrades.filter(g => studentIds.includes(g.student_id));
      const behavior = allBehavior.filter(e => studentIds.includes(e.student_id));
      const doneTasks = tasks.filter(t => t.status === 'done').length;
      const avgScore = grades.length
        ? Math.round(grades.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / grades.length)
        : null;
      return {
        ...t,
        stats: {
          classrooms: tClassrooms.length,
          students: students.length,
          tasks: tasks.length,
          doneTasks,
          completionRate: tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0,
          grades: grades.length,
          avgScore,
          behavior: behavior.length,
          positiveEvents: behavior.filter(e => e.type === 'positive' || e.type === 'improvement').length,
          negativeEvents: behavior.filter(e => e.type === 'negative' || e.type === 'concern').length,
        },
      };
    });
  }, [teachers, classrooms, allStudents, allTasks, allGrades, allBehavior]);

  const withSummary = teachersWithStats.filter(t => t.style_summary);
  const withoutSummary = teachersWithStats.filter(t => !t.style_summary);

  if (teachersWithStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <Users className="w-10 h-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">אין מורים במערכת</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-xl p-3 border border-border/40 text-center">
          <p className="text-xl font-bold text-primary">{teachersWithStats.length}</p>
          <p className="text-[10px] text-muted-foreground">סה"כ מורים</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border/40 text-center">
          <p className="text-xl font-bold text-violet-600">{withSummary.length}</p>
          <p className="text-[10px] text-muted-foreground">עם ניתוח סגנון</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border/40 text-center">
          <p className="text-xl font-bold text-amber-600">
            {Math.round(teachersWithStats.reduce((s, t) => s + (t.stats.completionRate || 0), 0) / (teachersWithStats.length || 1))}%
          </p>
          <p className="text-[10px] text-muted-foreground">השלמת משימות ממוצעת</p>
        </div>
      </div>

      {/* Teachers with style summaries */}
      {withSummary.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            <p className="text-xs font-semibold text-muted-foreground">מורים עם ניתוח סגנון הוראה ({withSummary.length})</p>
          </div>
          <div className="space-y-2">
            {withSummary.map((teacher, i) => (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <TeacherStyleCard teacher={teacher} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Teachers without summaries */}
      {withoutSummary.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground">ממתינים לניתוח ({withoutSummary.length})</p>
          </div>
          <div className="space-y-2">
            {withoutSummary.map(teacher => (
              <Link
                key={teacher.id}
                to="/teacher-insights"
                className="block bg-card rounded-xl border border-border/40 p-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${teacher.is_active !== false ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Users className={`w-4 h-4 ${teacher.is_active !== false ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{teacher.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {teacher.subject || '—'} · {teacher.stats.students} תלמידים · {teacher.stats.tasks} משימות
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-200">ללא ניתוח</Badge>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherStyleCard({ teacher }) {
  const { stats } = teacher;
  return (
    <Link
      to="/teacher-insights"
      className="block"
    >
      <Card className="hover:border-primary/30 transition-colors overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-start gap-3 mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${teacher.is_active !== false ? 'bg-primary/10' : 'bg-muted'}`}>
              <Users className={`w-5 h-5 ${teacher.is_active !== false ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold truncate">{teacher.full_name}</p>
                <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {teacher.subject || '—'} · {stats.classrooms} כיתות · {stats.students} תלמידים
              </p>
            </div>
            <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          {/* Style summary preview */}
          <div className="bg-violet-50/50 dark:bg-violet-950/10 rounded-lg p-2.5 border border-violet-100 dark:border-violet-900/30 mb-2">
            <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-500" /> סיכום סגנון הוראה
            </p>
            <p className="text-xs leading-relaxed line-clamp-3 whitespace-pre-wrap">{teacher.style_summary}</p>
          </div>

          {/* Quick metrics */}
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-amber-600">
              <TrendingUp className="w-3 h-3" /> {stats.completionRate}%
            </span>
            {stats.avgScore !== null && (
              <span className="flex items-center gap-1 text-emerald-600">
                <BookOpen className="w-3 h-3" /> ממוצע {stats.avgScore}%
              </span>
            )}
            <span className="flex items-center gap-1 text-blue-600">
              <FileText className="w-3 h-3" /> {stats.positiveEvents} חיובי
            </span>
            {stats.negativeEvents > 0 && (
              <span className="flex items-center gap-1 text-rose-600">
                <FileText className="w-3 h-3" /> {stats.negativeEvents} לתשומת לב
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}