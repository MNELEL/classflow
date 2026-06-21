import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle, CheckCircle, Clock, TrendingUp, Star, BookOpen, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function StudentDataHub({ students, grades, attendance, homework, behaviorEvents }) {
  const activeStudents = students.filter(s => s.is_active !== false);
  
  // Calculate metrics
  const studentsAtRisk = students.filter(s => {
    const studentGrades = grades.filter(g => g.student_id === s.id);
    const avgGrade = studentGrades.length > 0 
      ? studentGrades.reduce((sum, g) => sum + (g.score || 0), 0) / studentGrades.length 
      : 100;
    const studentAttendance = attendance.filter(a => a.student_id === s.id);
    const absenceRate = studentAttendance.length > 0
      ? studentAttendance.filter(a => a.status === 'absent').length / studentAttendance.length
      : 0;
    const negativeBehaviors = behaviorEvents.filter(e => e.student_id === s.id && e.type === 'negative').length;
    
    return avgGrade < 65 || absenceRate > 0.3 || negativeBehaviors >= 3;
  });

  const topPerformers = students.filter(s => {
    const studentGrades = grades.filter(g => g.student_id === s.id);
    const avgGrade = studentGrades.length > 0 
      ? studentGrades.reduce((sum, g) => sum + (g.score || 0), 0) / studentGrades.length 
      : 0;
    return avgGrade >= 90;
  });

  const pendingHomework = homework.filter(h => {
    const today = new Date();
    const dueDate = new Date(h.due_date);
    return dueDate >= today && h.submissions?.some(sub => !sub.submitted);
  });

  const overdueHomework = homework.filter(h => {
    const today = new Date();
    const dueDate = new Date(h.due_date);
    return dueDate < today && h.submissions?.some(sub => !sub.submitted);
  });

  const weeklyProgress = (() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentGrades = grades.filter(g => new Date(g.date || g.created_date) >= oneWeekAgo);
    const avgRecent = recentGrades.length > 0
      ? recentGrades.reduce((sum, g) => sum + (g.score || 0), 0) / recentGrades.length
      : null;

    const weekAttendance = attendance.filter(a => new Date(a.date) >= oneWeekAgo);
    const attendanceRate = weekAttendance.length > 0
      ? Math.round((weekAttendance.filter(a => a.status === 'present').length / weekAttendance.length) * 100)
      : null;

    return { avgRecent, attendanceRate, totalGrades: recentGrades.length };
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-6"
    >
      <Card className="border-border/60">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            נתוני תלמידים מרוכזים
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">מצטיינים</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{topPerformers.length}</p>
              <p className="text-[10px] text-muted-foreground">ממוצע ≥90</p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-muted-foreground">טעוני תמיכה</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{studentsAtRisk.length}</p>
              <p className="text-[10px] text-muted-foreground">דורשים תשומת לב</p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">משימות פתוחות</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{pendingHomework.length}</p>
              <p className="text-[10px] text-muted-foreground">ממתינות להגשה</p>
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-muted-foreground">פיגורים</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{overdueHomework.length}</p>
              <p className="text-[10px] text-muted-foreground">לא הוגשו בזמן</p>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold">התקדמות שבועית</h3>
              </div>
              <Badge variant="outline" className="text-xs">7 ימים אחרונים</Badge>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">ממוצע ציונים</p>
                <p className="text-2xl font-bold text-primary">
                  {weeklyProgress.avgRecent !== null ? Math.round(weeklyProgress.avgRecent) : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {weeklyProgress.totalGrades} ציונים השבוע
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">נוכחות ממוצעת</p>
                <p className="text-2xl font-bold text-green-600">
                  {weeklyProgress.attendanceRate !== null ? `${weeklyProgress.attendanceRate}%` : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  מתוך {activeStudents.length} תלמידים
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">מעורבות כללית</p>
                <p className="text-2xl font-bold text-purple-600">
                  {weeklyProgress.avgRecent !== null && weeklyProgress.attendanceRate !== null
                    ? Math.round((weeklyProgress.avgRecent + weeklyProgress.attendanceRate) / 2)
                    : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">שילוב ציונים ונוכחות</p>
              </div>
            </div>
          </div>

          {/* Students Needing Attention */}
          {studentsAtRisk.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                תלמידים הדורשים תשומת לב
              </h3>
              <div className="space-y-2">
                {studentsAtRisk.slice(0, 5).map(student => {
                  const studentGrades = grades.filter(g => g.student_id === student.id);
                  const avgGrade = studentGrades.length > 0 
                    ? Math.round(studentGrades.reduce((sum, g) => sum + (g.score || 0), 0) / studentGrades.length)
                    : null;
                  const studentAttendance = attendance.filter(a => a.student_id === student.id);
                  const absenceRate = studentAttendance.length > 0
                    ? Math.round((studentAttendance.filter(a => a.status === 'absent').length / studentAttendance.length) * 100)
                    : 0;

                  return (
                    <div key={student.id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-amber-700">{student.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{student.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {avgGrade !== null && avgGrade < 65 && `ממוצע: ${avgGrade} `}
                            {absenceRate > 30 && `נוכחות: ${100 - absenceRate}%`}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                        <Link to={`/students/${student.id}`}>פרטים</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Homework */}
          {pendingHomework.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                משימות שמחכות לטיפול
              </h3>
              <div className="space-y-2">
                {pendingHomework.slice(0, 5).map(hw => {
                  const totalStudents = hw.student_ids?.length || activeStudents.length;
                  const submittedCount = hw.submissions?.filter(s => s.submitted).length || 0;
                  const pendingCount = totalStudents - submittedCount;
                  const dueDate = new Date(hw.due_date);
                  const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={hw.id} className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/10 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold">{hw.title}</p>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {hw.subject || 'כללי'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>{pendingCount} מתוך {totalStudents} לא הגישו</span>
                          <span className={`flex items-center gap-1 ${daysLeft <= 2 ? 'text-red-600' : ''}`}>
                            <Clock className="w-3 h-3" />
                            {daysLeft > 0 ? `נותרו ${daysLeft} ימים` : 'היום'}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                        <Link to="/homework">ניהול</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {activeStudents.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <Users className="w-12 h-12 text-muted-foreground/20" />
              <div>
                <p className="text-sm font-semibold mb-1">אין תלמידים במערכת</p>
                <p className="text-xs text-muted-foreground mb-3">התחילו להוסיף תלמידים כדי לראות נתונים מרוכזים</p>
                <Button size="sm" asChild>
                  <Link to="/students">הוסף תלמידים</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}