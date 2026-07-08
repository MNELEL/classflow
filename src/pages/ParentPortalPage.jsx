import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, GraduationCap, CalendarCheck, BookOpen, Star, Share2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import StudentReportPDF from '@/components/parents/StudentReportPDF';
import SharedLessonsPanel from '@/components/parents/SharedLessonsPanel';

const STATUS_LABELS = { present: 'נוכח', absent: 'נעדר', late: 'איחר' };
const STATUS_COLOR = { present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };

export default function ParentPortalPage() {
  const [selectedId, setSelectedId] = useState('');

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.filter({ is_active: true }) });
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 50) });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 60) });
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => base44.entities.Reward.list('-date', 50) });
  const { data: bulletins = [] } = useQuery({ queryKey: ['bulletins'], queryFn: () => base44.entities.WeeklyBulletin.list('-created_date', 5) });

  const qc = useQueryClient();
  const handleRefresh = useCallback(async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['grades'] }), qc.invalidateQueries({ queryKey: ['attendance'] }), qc.invalidateQueries({ queryKey: ['rewards'] }), qc.invalidateQueries({ queryKey: ['bulletins'] })]); }, [qc]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const student = students.find(s => s.id === selectedId);
  const sGrades = grades.filter(g => g.student_id === selectedId);
  const sAttendance = attendance.filter(a => a.student_id === selectedId);
  const sRewards = rewards.filter(r => r.student_id === selectedId);

  return (
    <AppLayout>
      <div ref={containerRef} className="relative p-4 max-w-lg mx-auto space-y-4 overflow-y-auto h-full pb-8" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl">👨‍👩‍👧</div>
          <div>
            <h1 className="font-bold text-base">פורטל הורים</h1>
            <p className="text-xs text-muted-foreground">מידע על ילדכם</p>
          </div>
        </div>

        <MobileSelect value={selectedId} onValueChange={setSelectedId} placeholder="בחר תלמיד..." className="text-sm">
          {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </MobileSelect>

        {student && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Student header */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-black text-xl">
                {student.name[0]}
              </div>
              <div>
                <p className="font-bold">{student.name}</p>
                {student.learning_group && <p className="text-xs text-muted-foreground">קבוצה: {student.learning_group}</p>}
              </div>
            </div>

            <Tabs defaultValue="overview" dir="rtl">
              <TabsList className="w-full grid grid-cols-3 mb-2">
                <TabsTrigger value="overview" className="text-xs gap-1"><GraduationCap className="w-3 h-3" /> סקירה</TabsTrigger>
                <TabsTrigger value="report" className="text-xs gap-1"><TrendingUp className="w-3 h-3" /> דוח PDF</TabsTrigger>
                <TabsTrigger value="shared" className="text-xs gap-1"><Share2 className="w-3 h-3" /> סיכומים</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-0">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-2">
                  {(() => {
                    const avgGrade = sGrades.length ? Math.round(sGrades.reduce((s, g) => s + (g.score || 0), 0) / sGrades.length) : null;
                    const presentCount = sAttendance.filter(a => a.status === 'present').length;
                    const attendancePct = sAttendance.length ? Math.round((presentCount / sAttendance.length) * 100) : null;
                    const totalPoints = sRewards.reduce((s, r) => s + (r.points || 0), 0);
                    return [
                      { icon: GraduationCap, label: 'ממוצע', value: avgGrade !== null ? `${avgGrade}` : '—', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                      { icon: CalendarCheck, label: 'נוכחות', value: attendancePct !== null ? `${attendancePct}%` : '—', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                      { icon: Star, label: 'נקודות', value: totalPoints, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                    ].map((k, i) => (
                      <div key={i} className={`${k.bg} rounded-xl p-3 text-center`}>
                        <p className={`text-xl font-black ${k.color}`}>{k.value}</p>
                        <p className="text-xs text-muted-foreground">{k.label}</p>
                      </div>
                    ));
                  })()}
                </div>

                {/* Recent grades */}
                {sGrades.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-2xl p-4">
                    <p className="text-sm font-semibold mb-3 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-primary" /> ציונים אחרונים</p>
                    <div className="space-y-2">
                      {sGrades.slice(0, 5).map(g => (
                        <div key={g.id} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{g.test_name || g.subject}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{g.date}</span>
                            <span className={`font-bold w-10 text-center rounded-lg px-1 py-0.5 text-xs ${g.score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : g.score >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {g.score}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attendance */}
                {sAttendance.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-2xl p-4">
                    <p className="text-sm font-semibold mb-3 flex items-center gap-1.5"><CalendarCheck className="w-4 h-4 text-primary" /> נוכחות אחרונה</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sAttendance.slice(0, 14).map(a => (
                        <div key={a.id} className={`px-2 py-1 rounded-lg text-[10px] font-medium ${STATUS_COLOR[a.status] || 'bg-muted'}`}>
                          {a.date?.slice(5)} {STATUS_LABELS[a.status]}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Latest bulletin */}
                {bulletins[0] && (
                  <div className="bg-card border border-border/70 rounded-2xl p-4">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-primary" /> ניוזלטר אחרון</p>
                    <p className="text-xs text-muted-foreground mb-2">{bulletins[0].start_date} – {bulletins[0].end_date}</p>
                    {bulletins[0].digest_summary && <p className="text-sm leading-relaxed">{bulletins[0].digest_summary}</p>}
                  </div>
                )}

                {/* Rewards */}
                {sRewards.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-2xl p-4">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-500" /> פרסים ונקודות</p>
                    <div className="space-y-1.5">
                      {sRewards.slice(0, 5).map(r => (
                        <div key={r.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{r.reason}</span>
                          <span className={`font-bold ${r.points > 0 ? 'text-green-600' : 'text-red-600'}`}>{r.points > 0 ? '+' : ''}{r.points}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="report" className="mt-0">
                <StudentReportPDF
                  student={student}
                  grades={sGrades}
                  attendance={sAttendance}
                  rewards={sRewards}
                />
              </TabsContent>

              <TabsContent value="shared" className="mt-0">
                <SharedLessonsPanel studentId={selectedId} studentName={student.name} />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {!selectedId && (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">בחר תלמיד לצפייה במידע</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}