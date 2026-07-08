import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  CalendarCheck, TrendingUp, FileText, MessageSquare,
  ChevronLeft, ExternalLink, AlertCircle, Loader2,
  CheckCircle2, XCircle, Clock, Star, FolderOpen, BookOpen, ListTodo
} from 'lucide-react';
import StudentTaskList from '@/components/students/StudentTaskList';
import { format, parseISO, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

const LEVEL_CONFIG = {
  weak:          { label: 'חלש',         color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'        },
  below_average: { label: 'מתקשה',       color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'  },
  average:       { label: 'בינוני',      color: 'bg-muted text-muted-foreground'      },
  above_average: { label: 'מעל ממוצע',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'      },
  strong:        { label: 'חזק',         color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'},
  excellent:     { label: 'מצטיין',      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'  },
};

const ATTENDANCE_CONFIG = {
  present: { label: 'נוכח', icon: CheckCircle2, color: 'text-emerald-500' },
  absent:  { label: 'נעדר', icon: XCircle,      color: 'text-red-500'     },
  late:    { label: 'איחר', icon: Clock,        color: 'text-amber-500'   },
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary' }) {
  return (
    <div className="flex-1 min-w-0 bg-card border border-border rounded-2xl p-3.5 flex flex-col gap-1">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-muted/50`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs font-medium text-foreground leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });
  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: () => base44.entities.Grade.list('-date', 200),
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list('-date', 200),
  });
  const { data: portfolioItems = [] } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => base44.entities.StudentPortfolioItem.list('-date', 100),
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ['parent-contacts'],
    queryFn: () => base44.entities.ParentContact.list('-date', 100),
  });
  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 100),
  });

  const student = students.find(s => s.id === id);

  const myGrades = useMemo(() =>
    grades.filter(g => g.student_id === id).sort((a, b) => new Date(a.date) - new Date(b.date)),
    [grades, id]);

  const myAttendance = useMemo(() =>
    attendance.filter(a => a.student_id === id).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [attendance, id]);

  const myPortfolio = useMemo(() =>
    portfolioItems.filter(p => p.student_id === id),
    [portfolioItems, id]);

  const myContacts = useMemo(() =>
    contacts.filter(c => c.student_id === id).sort((a, b) => new Date(b.date) - new Date(a.date)),
    [contacts, id]);

  // Library items connected to student via lesson_log
  const relatedLibrary = useMemo(() =>
    libraryItems.filter(item =>
      item.lesson_log?.some(log => log.student_ids?.includes(id))
    ),
    [libraryItems, id]);

  // Grade chart data — last 6 months average per month
  const gradeChartData = useMemo(() => {
    if (!myGrades.length) return [];
    const byMonth = {};
    myGrades.forEach(g => {
      if (!g.date) return;
      const key = g.date.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(g.score);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, scores]) => ({
        month: format(parseISO(key + '-01'), 'MMM', { locale: he }),
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }));
  }, [myGrades]);

  // Stats
  const avgGrade = myGrades.length
    ? Math.round(myGrades.reduce((a, g) => a + (g.score || 0), 0) / myGrades.length)
    : null;
  const presentCount = myAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = myAttendance.length
    ? Math.round((presentCount / myAttendance.length) * 100)
    : null;

  if (loadingStudents) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!student) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground">תלמיד לא נמצא</p>
          <Button variant="outline" onClick={() => navigate('/students')}>חזור לרשימה</Button>
        </div>
      </AppLayout>
    );
  }

  const lvl = LEVEL_CONFIG[student.academic_level];

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto p-4 pb-8 space-y-4" dir="rtl">

        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15 rounded-2xl p-4 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
            {student.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xl text-foreground">{student.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {lvl && <Badge className={`text-xs border-0 ${lvl.color}`}>{lvl.label}</Badge>}
              {student.group && <Badge variant="outline" className="text-xs">{student.group}</Badge>}
              {student.learning_group && <Badge className="text-xs bg-primary/10 text-primary border-0">🧩 {student.learning_group}</Badge>}
            </div>
            {student.notes && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{student.notes}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-2">
          <StatCard
            icon={TrendingUp}
            label="ממוצע ציונים"
            value={avgGrade ?? '—'}
            sub={`${myGrades.length} רשומות`}
            color="text-blue-600"
          />
          <StatCard
            icon={CalendarCheck}
            label="אחוז נוכחות"
            value={attendanceRate != null ? `${attendanceRate}%` : '—'}
            sub={`${myAttendance.length} שיעורים`}
            color={attendanceRate >= 80 ? 'text-emerald-600' : 'text-red-500'}
          />
          <StatCard
            icon={FolderOpen}
            label="קבצים"
            value={myPortfolio.length}
            sub="בתיק האישי"
            color="text-violet-600"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="grades" dir="rtl">
          <TabsList className="w-full grid grid-cols-5 h-9">
            <TabsTrigger value="grades" className="text-xs">ציונים</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs">נוכחות</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">משימות</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">הערות</TabsTrigger>
            <TabsTrigger value="files" className="text-xs">קבצים</TabsTrigger>
          </TabsList>

          {/* ── Grades ── */}
          <TabsContent value="grades" className="mt-3 space-y-3">
            {gradeChartData.length > 1 && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-sm">התקדמות לאורך זמן</CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3">
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={gradeChartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                        formatter={(v) => [`${v}`, 'ממוצע']}
                      />
                      <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {myGrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">אין ציונים רשומים</div>
            ) : (
              <div className="space-y-2">
                {myGrades.slice().reverse().map(g => (
                  <div key={g.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-3.5 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{g.test_name || g.subject}</p>
                      <p className="text-xs text-muted-foreground">{g.subject} · {g.date && format(parseISO(g.date), 'd MMM yyyy', { locale: he })}</p>
                    </div>
                    <div className={`text-lg font-bold ${g.score >= 80 ? 'text-emerald-600' : g.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {g.score}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Attendance ── */}
          <TabsContent value="attendance" className="mt-3">
            {myAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">אין רשומות נוכחות</div>
            ) : (
              <div className="space-y-2">
                {myAttendance.slice(0, 30).map(a => {
                  const cfg = ATTENDANCE_CONFIG[a.status];
                  const Icon = cfg?.icon || CheckCircle2;
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 shrink-0 ${cfg?.color}`} />
                        <div>
                          <p className="text-sm font-medium">{cfg?.label}</p>
                          {a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.date && format(parseISO(a.date), 'd MMM yyyy', { locale: he })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Tasks ── */}
          <TabsContent value="tasks" className="mt-3">
            <StudentTaskList studentId={id} />
          </TabsContent>

          {/* ── Notes / contacts ── */}
          <TabsContent value="notes" className="mt-3 space-y-2">
            {student.notes && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-3.5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">הערות חופשיות / התרשמות</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{student.notes}</p>
              </div>
            )}
            {student.achievements && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3.5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">הישגים</span>
                </div>
                <p className="text-sm text-foreground">{student.achievements}</p>
              </div>
            )}
            {student.custom_conditions && (
              <div className="bg-muted/40 border border-border rounded-xl px-3.5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">תנאים מיוחדים</span>
                </div>
                <p className="text-sm text-foreground">{student.custom_conditions}</p>
              </div>
            )}

            {myContacts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">תקשורת עם הורים</p>
                {myContacts.map(c => (
                  <div key={c.id} className="bg-card border border-border rounded-xl px-3.5 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">{c.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {c.date && format(parseISO(c.date), 'd MMM yyyy', { locale: he })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{c.summary}</p>
                    {c.parent_name && <p className="text-xs text-muted-foreground mt-0.5">הורה: {c.parent_name}</p>}
                  </div>
                ))}
              </div>
            )}

            {!student.notes && !student.achievements && !student.custom_conditions && myContacts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">אין הערות או תקשורת רשומה</div>
            )}
          </TabsContent>

          {/* ── Files ── */}
          <TabsContent value="files" className="mt-3 space-y-4">
            {/* Portfolio items */}
            {myPortfolio.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">תיק אישי</p>
                {myPortfolio.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.type} · {item.date && format(parseISO(item.date), 'd MMM yyyy', { locale: he })}</p>
                    </div>
                    {item.file_url && (
                      <a href={item.file_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Related library items */}
            {relatedLibrary.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">חומרי לימוד קשורים</p>
                {relatedLibrary.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subject || item.category}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => navigate('/library')}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {myPortfolio.length === 0 && relatedLibrary.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">אין קבצים מקושרים</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}