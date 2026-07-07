import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, LayoutGrid, AlertTriangle, CheckCircle2, TrendingUp, FileDown, FileSpreadsheet, Printer, Sparkles, Map, BarChart2 } from 'lucide-react';
import GlobalSyncButton from '@/components/common/GlobalSyncButton';
import TasksAlert from '@/components/dashboard/TasksAlert';
import AbsenceAlert from '@/components/dashboard/AbsenceAlert';
import AcademicCalendar from '@/components/dashboard/AcademicCalendar';
import SmartGuide from '@/components/dashboard/SmartGuide';
import DailyBriefing from '@/components/dashboard/DailyBriefing';
import StudyProgressTracker from '@/components/dashboard/StudyProgressTracker';
import WeeklyActivitySummary from '@/components/dashboard/WeeklyActivitySummary';
import StudentDataHub from '@/components/dashboard/StudentDataHub';
import StudentEngagementPanel from '@/components/dashboard/StudentEngagementPanel';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { calcSatisfactionScore } from '@/lib/seatingUtils';
import { exportToPDF, exportToExcel, printSeating } from '@/lib/exportUtils';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
  const [showGuide, setShowGuide] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCalendar(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const [secondaryEnabled, setSecondaryEnabled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSecondaryEnabled(true), 800);
    return () => clearTimeout(t);
  }, []);

  const { data: students = [], isLoading: loadingStudents, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 100), enabled: secondaryEnabled, staleTime: 60000 });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 100), enabled: secondaryEnabled, staleTime: 60000 });
  const { data: libraryItems = [] } = useQuery({ queryKey: ['library'], queryFn: () => base44.entities.LibraryItem.list('-created_date', 50), enabled: secondaryEnabled, staleTime: 60000 });
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => base44.entities.Reward.list('-date', 200), enabled: secondaryEnabled, staleTime: 60000 });
  const { data: homework = [] } = useQuery({ queryKey: ['homework'], queryFn: () => base44.entities.HomeworkAssignment.list('-due_date', 50), enabled: secondaryEnabled, staleTime: 60000 });
  const { data: behaviorEvents = [] } = useQuery({ queryKey: ['behavior'], queryFn: () => base44.entities.BehaviorEvent.list('-date', 200), enabled: secondaryEnabled, staleTime: 60000 });

  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);


  const activeStudents = students.filter(s => s.is_active !== false);
  const studentsWithNeeds = students.filter(s => s.special_needs?.length > 0);
  const studentsWithConstraints = students.filter(
    s => s.friends?.length > 0 || s.avoid?.length > 0 || s.separate?.length > 0
  );

  const savedSeats = (() => {
    try { return JSON.parse(localStorage.getItem('classmanager_seats') || 'null'); } catch { return null; }
  })();
  const savedArrangement = (() => {
    try { return JSON.parse(localStorage.getItem('classmanager_arrangement') || 'null'); } catch { return null; }
  })();

  const satisfactionScore = savedSeats ? calcSatisfactionScore(savedSeats, students) : null;
  const seatedCount = savedSeats ? new Set(savedSeats.filter(s => s.student_id).map(s => s.student_id)).size : 0;
  const unseatedCount = activeStudents.length - seatedCount;

  const avgGrade = useMemo(() => {
    if (!grades.length) return null;
    return Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length);
  }, [grades]);

  const avgAttendance = useMemo(() => {
    if (!attendance.length) return null;
    const present = attendance.filter(a => a.status === 'present').length;
    return Math.round((present / attendance.length) * 100);
  }, [attendance]);

  const totalPoints = useMemo(() => rewards.reduce((s, r) => s + (r.points || 0), 0), [rewards]);
  const pendingLibrary = libraryItems.filter(i => i.ai_status === 'pending' || i.ai_status === 'processing').length;

  const scoreColor = satisfactionScore === null ? 'text-muted-foreground'
    : satisfactionScore >= 75 ? 'text-green-600'
    : satisfactionScore >= 50 ? 'text-yellow-600'
    : 'text-red-600';

  const scoreBg = satisfactionScore === null ? 'bg-muted'
    : satisfactionScore >= 75 ? 'bg-green-500'
    : satisfactionScore >= 50 ? 'bg-yellow-500'
    : 'bg-red-500';

  const statCards = [
    {
      icon: <Users className="w-4 h-4" />,
      label: 'סה"כ תלמידים',
      value: activeStudents.length,
      sub: 'תלמידים פעילים',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: 'משובצים',
      value: seatedCount,
      sub: `מתוך ${activeStudents.length}`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: 'ממתינים',
      value: unseatedCount,
      sub: 'לא משובצים',
      color: unseatedCount > 0 ? 'text-yellow-600' : 'text-muted-foreground',
      bg: unseatedCount > 0 ? 'bg-yellow-500/10' : 'bg-muted/50',
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'שביעות רצון',
      value: satisfactionScore !== null ? `${satisfactionScore}%` : '—',
      sub: satisfactionScore !== null ? (satisfactionScore >= 75 ? '🌟 מצוין!' : satisfactionScore >= 50 ? '👍 טוב' : '⚠️ טעון שיפור') : 'אין סידור',
      color: scoreColor,
      bg: satisfactionScore === null ? 'bg-muted/50' : satisfactionScore >= 75 ? 'bg-emerald-500/10' : satisfactionScore >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10',
      progress: satisfactionScore,
      progressBg: scoreBg,
      ring: satisfactionScore,
    },
  ];

  return (
    <AppLayout>
      <div ref={containerRef} className="p-5 max-w-5xl mx-auto relative overflow-y-auto h-full" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold">סקירה כללית</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <GlobalSyncButton size="sm" className="gap-1.5 text-xs" />
              <Button size="sm" variant="outline" onClick={() => setShowGuide(true)} className="gap-1.5 text-xs">
                <Map className="w-3.5 h-3.5" />
                מדריך חכם
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">מצב הכיתה במבט אחד</p>
        </motion.div>

        {/* Daily Briefing */}
        <DailyBriefing students={students} />

        {/* Student Data Hub - Centralized student data with weekly progress */}
        <StudentDataHub 
          students={students} 
          grades={grades} 
          attendance={attendance} 
          homework={homework}
          behaviorEvents={behaviorEvents}
        />

        {/* Student Engagement Panel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="mb-6">
          <StudentEngagementPanel students={students} grades={grades} homework={homework} />
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {loadingStudents
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-muted rounded w-2/3 mb-3" />
                  <div className="h-8 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-2 bg-muted rounded w-3/4" />
                </div>
              ))
            : statCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Card className="overflow-hidden border-border/60 hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
                        <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center ${card.color}`}>
                          {card.icon}
                        </div>
                      </div>
                      <div className={`text-3xl font-bold ${card.color} mb-0.5`}>{card.value}</div>
                      <p className="text-xs text-muted-foreground">{card.sub}</p>
                      {card.ring !== undefined && card.ring !== null ? (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="relative w-8 h-8 shrink-0">
                            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                              <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted opacity-20" />
                              <motion.circle
                                cx="16" cy="16" r="13"
                                fill="none"
                                stroke={card.ring >= 75 ? '#22c55e' : card.ring >= 50 ? '#eab308' : '#ef4444'}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 13}`}
                                initial={{ strokeDashoffset: 2 * Math.PI * 13 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 13 * (1 - card.ring / 100) }}
                                transition={{ duration: 1, delay: 0.4 + i * 0.07 }}
                              />
                            </svg>
                          </div>
                          <div className="flex-1 w-full bg-muted rounded-full h-1.5">
                            <motion.div
                              className={`h-1.5 rounded-full ${card.progressBg}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${card.ring}%` }}
                              transition={{ duration: 0.8, delay: 0.3 + i * 0.07 }}
                            />
                          </div>
                        </div>
                      ) : card.progress !== undefined && card.progress !== null && (
                        <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                          <motion.div
                            className={`h-1.5 rounded-full ${card.progressBg}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${card.progress}%` }}
                            transition={{ duration: 0.8, delay: 0.3 + i * 0.07 }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
        </div>

        {/* Second KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { emoji: '📊', label: 'ממוצע ציונים', value: avgGrade !== null ? avgGrade : '—', sub: avgGrade !== null ? (avgGrade >= 80 ? 'מצוין' : avgGrade >= 65 ? 'טוב' : 'טעון שיפור') : 'אין נתונים', color: 'text-blue-600', bg: 'bg-blue-500/10' },
            { emoji: '📅', label: 'נוכחות ממוצעת', value: avgAttendance !== null ? `${avgAttendance}%` : '—', sub: avgAttendance !== null ? `${attendance.length} רשומות` : 'אין נתונים', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { emoji: '📚', label: 'ספריית חומרים', value: libraryItems.length, sub: pendingLibrary > 0 ? `${pendingLibrary} ממתינים לAI` : 'הכל נותח', color: 'text-purple-600', bg: 'bg-purple-500/10' },
            { emoji: '🏆', label: 'נקודות הוענקו', value: totalPoints, sub: `${rewards.length} פרסים`, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 + i * 0.06 }}>
              <div className="bg-card border border-border/60 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
                  <span className="text-lg">{card.emoji}</span>
                </div>
                <div className={`text-3xl font-bold ${card.color} mb-0.5`}>{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Details row */}
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-primary" /> פרטי הסידור הנוכחי
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {savedArrangement ? (
                  <>
                    {[
                      { label: 'שורות', value: savedArrangement.rows },
                      { label: 'טורים', value: savedArrangement.cols },
                      { label: 'סה"כ מושבים', value: savedArrangement.rows * savedArrangement.cols },
                      {
                        label: 'תפוסה',
                        value: savedArrangement.rows * savedArrangement.cols > 0
                          ? `${Math.round((seatedCount / (savedArrangement.rows * savedArrangement.cols)) * 100)}%`
                          : '0%',
                      },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-semibold tabular-nums">{row.value}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col items-center py-4 gap-2 text-center">
                    <LayoutGrid className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">אין סידור שמור עדיין</p>
                    <Button size="sm" asChild variant="outline">
                      <Link to="/seating">צור סידור ראשון</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" /> פרופיל הכיתה
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {activeStudents.length === 0 ? (
                  <div className="flex flex-col items-center py-4 gap-2 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">עדיין אין תלמידים</p>
                    <Button size="sm" asChild variant="outline">
                      <Link to="/students">הוסף תלמידים</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    {[
                      { label: 'עם צרכים מיוחדים', count: studentsWithNeeds.length, variant: studentsWithNeeds.length > 0 ? 'default' : 'secondary' },
                      { label: 'עם אילוצים חברתיים', count: studentsWithConstraints.length, variant: 'secondary' },
                      {
                        label: 'ללא העדפות', count: students.filter(s =>
                          !s.friends?.length && !s.avoid?.length && !s.special_needs?.length &&
                          s.row_preference === 'none' && s.side_preference === 'none'
                        ).length, variant: 'outline'
                      },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                        <Badge variant={row.variant} className="text-xs">{row.count}</Badge>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Weekly Activity Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <WeeklyActivitySummary />
        </motion.div>

        {/* Academic Calendar (Hebrew) — includes BK + trackers tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }} className="mb-3">
          {showCalendar ? <AcademicCalendar /> : <div className="h-48 bg-muted/40 rounded-xl animate-pulse" />}
        </motion.div>

        {/* Study Progress Tracker */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="mb-3">
          {showCalendar ? <StudyProgressTracker /> : <div className="h-48 bg-muted/40 rounded-xl animate-pulse" />}
        </motion.div>

        {/* Absence Alert */}
        {students.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="mb-3">
            <AbsenceAlert students={students} />
          </motion.div>
        )}

        {/* Tasks Alert */}
        {students.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-4">
            <TasksAlert students={students} />
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex gap-2 flex-wrap"
        >
          <Button asChild className="shadow-sm">
            <Link to="/seating">
              <LayoutGrid className="w-4 h-4 ml-1" /> פתח לוח כיתה
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/students">
              <Users className="w-4 h-4 ml-1" /> נהל תלמידים
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/analytics">
              <BarChart2 className="w-4 h-4 ml-1" /> ניתוח ציונים
            </Link>
          </Button>
          {savedSeats && savedArrangement && (
            <>
              <Button variant="outline" onClick={() => exportToPDF(savedSeats, students, savedArrangement.rows, savedArrangement.cols)}>
                <FileDown className="w-4 h-4 ml-1" /> PDF
              </Button>
              <Button variant="outline" onClick={() => exportToExcel(savedSeats, students, savedArrangement.rows, savedArrangement.cols)}>
                <FileSpreadsheet className="w-4 h-4 ml-1" /> Excel
              </Button>
              <Button variant="outline" onClick={() => printSeating(savedSeats, students, savedArrangement.rows, savedArrangement.cols)}>
                <Printer className="w-4 h-4 ml-1" /> הדפסה
              </Button>
            </>
          )}
        </motion.div>
      </div>
      <AnimatePresence>
        {showGuide && <SmartGuide onClose={() => setShowGuide(false)} />}
      </AnimatePresence>
    </AppLayout>
  );
}