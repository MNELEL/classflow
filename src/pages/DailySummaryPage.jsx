import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Loader2, Calendar, TrendingUp, Users, BookOpen, Award, Download, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function DailySummaryPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 30) });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 30) });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => base44.entities.Task.list('-due_date', 30) });
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => base44.entities.Reward.list('-date', 30) });
  const { data: behaviorEvents = [] } = useQuery({ queryKey: ['behavior-events'], queryFn: () => base44.entities.BehaviorEvent.list('-date', 20) });
  const { data: exams = [] } = useQuery({ queryKey: ['exams'], queryFn: () => base44.entities.Exam.list('-date', 10) });

  const today = new Date().toISOString().split('T')[0];
  const todayGrades = grades.filter(g => g.date === today);
  const todayAttendance = attendance.filter(a => a.date === today);
  const todayRewards = rewards.filter(r => r.date === today);
  const todayBehavior = behaviorEvents.filter(e => new Date(e.date).toISOString().split('T')[0] === today);
  const upcomingExams = exams.filter(e => new Date(e.date) >= new Date() && e.status === 'scheduled');
  const pendingTasks = tasks.filter(t => t.status !== 'done');

  async function generate() {
    setLoading(true);
    setSummary(null);

    const context = {
      date: new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }),
      studentsCount: students.filter(s => s.is_active !== false).length,
      attendanceToday: {
        present: todayAttendance.filter(a => a.status === 'present').length,
        absent: todayAttendance.filter(a => a.status === 'absent').length,
        late: todayAttendance.filter(a => a.status === 'late').length,
      },
      gradesToday: todayGrades.length,
      rewardsToday: todayRewards.length,
      behaviorEvents: todayBehavior.length,
      upcomingExams: upcomingExams.length,
      pendingTasks: pendingTasks.length,
      topStudents: students.filter(s => s.is_active !== false).slice(0, 5).map(s => s.name),
    };

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה עוזר פדגוגי חכם. צור סיכום יומי קצר ומעודד למורה על בסיס הנתונים של היום:

תאריך: ${context.date}
סה"כ תלמידים: ${context.studentsCount}
נוכחות היום: ${context.attendanceToday.present} נוכחים, ${context.attendanceToday.absent} נעדרים, ${context.attendanceToday.late} מאחרים
ציונים שהוזנו היום: ${context.gradesToday}
פרסים שחולקו היום: ${context.rewardsToday}
אירועי התנהגות היום: ${context.behaviorEvents}
מבחנים קרובים: ${context.upcomingExams}
משימות ממתינות: ${context.pendingTasks}
תלמידים בולטים: ${context.topStudents.join(', ')}

צור סיכום בפורמט Markdown עם:
1. ## סיכום היום - פסקה קצרה וחיובית
2. ## נקודות לתשומת לב - 2-3 נקודות חשובות (אם יש)
3. ## המלצות למחר - 2-3 המלצות פרקטיות
4. ## חיזוק חיובי - משפט עידוד למורה

השב בעברית, אישית ומעודדת.`,
    });

    setSummary(res);
    setLoading(false);
  }

  function exportSummary() {
    if (!summary) return;
    const blob = new Blob([`# סיכום יומי - ${new Date().toLocaleDateString('he-IL')}\n\n${summary}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `סיכום-${today}.md`; a.click();
  }

  const stats = [
    { icon: Users, label: 'נוכחים', value: todayAttendance.filter(a => a.status === 'present').length, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: Users, label: 'נעדרים', value: todayAttendance.filter(a => a.status === 'absent').length, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    { icon: TrendingUp, label: 'ציונים', value: todayGrades.length, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: Award, label: 'פרסים', value: todayRewards.length, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  return (
    <AppLayout>
      <div className="p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">סיכום יומי</h1>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        {/* Today stats */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border rounded-2xl p-3 text-center">
                <div className={`w-8 h-8 mx-auto rounded-xl ${s.bg} flex items-center justify-center mb-1.5`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Generate button */}
        <Button onClick={generate} disabled={loading} className="w-full gap-2 h-12" size="lg">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : summary ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'מחולל סיכום...' : summary ? 'חדש סיכום' : 'חולל סיכום יומי עם AI'}
        </Button>

        {/* Summary */}
        {summary && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-purple-600 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> הסיכום שלך
              </span>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={exportSummary}>
                <Download className="w-3 h-3" /> ייצא
              </Button>
            </div>
            <ReactMarkdown className="text-sm prose prose-sm max-w-none [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-purple-700 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_p]:leading-relaxed [&_li]:leading-relaxed">
              {summary}
            </ReactMarkdown>
          </motion.div>
        )}

        {/* Quick insights */}
        {!summary && !loading && (
          <div className="space-y-2">
            <div className="bg-card border rounded-2xl p-3 flex items-center justify-between">
              <span className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-muted-foreground" /> מבחנים קרובים</span>
              <Badge variant="outline">{upcomingExams.length}</Badge>
            </div>
            <div className="bg-card border rounded-2xl p-3 flex items-center justify-between">
              <span className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> משימות ממתינות</span>
              <Badge variant="outline">{pendingTasks.length}</Badge>
            </div>
            <div className="bg-card border rounded-2xl p-3 flex items-center justify-between">
              <span className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-muted-foreground" /> פרסים היום</span>
              <Badge variant="outline">{todayRewards.length}</Badge>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}