import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, ClipboardCheck, CheckCircle2, Clock, XCircle, BookOpen } from 'lucide-react';
import { toHebrewFull } from '@/lib/hebrewDate';
import { formatDate } from '@/lib/formatDate';
import { useSelectedDate } from '@/lib/dateContext';
import HebrewDateNavigator from '@/components/ui/HebrewDateNavigator';

function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d) { return d.toISOString().slice(0, 10); }

export default function WeeklySummaryPage() {
  const { selectedDate } = useSelectedDate();
  const weekStart = useMemo(() => startOfWeek(new Date(selectedDate + 'T00:00:00')), [selectedDate]);
  const weekEnd = addDays(weekStart, 6);
  const start = ymd(weekStart), end = ymd(weekEnd);
  const inWeek = (d) => { const x = (d || '').slice(0, 10); return x >= start && x <= end; };

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 2000) });
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 500) });
  const { data: homework = [] } = useQuery({ queryKey: ['homework'], queryFn: () => base44.entities.HomeworkAssignment.list('-due_date', 100) });
  const { data: behavior = [] } = useQuery({ queryKey: ['behavior-events'], queryFn: () => base44.entities.BehaviorEvent.list('-date', 300) });

  const weekAttendance = useMemo(() => attendance.filter(a => inWeek(a.date)), [attendance, start, end]);
  const weekGrades = useMemo(() => grades.filter(g => inWeek(g.date)), [grades, start, end]);
  const weekHomework = useMemo(() => homework.filter(h => inWeek(h.due_date)), [homework, start, end]);
  const weekBehavior = useMemo(() => behavior.filter(b => inWeek(b.date)), [behavior, start, end]);

  let present = 0, late = 0, absent = 0;
  weekAttendance.forEach(a => { if (a.status === 'present') present++; else if (a.status === 'late') late++; else if (a.status === 'absent') absent++; });
  const totalAtt = weekAttendance.length;
  const attRate = totalAtt ? Math.round((present / totalAtt) * 100) : null;

  const studentName = (id) => students.find(s => s.id === id)?.name || '—';

  const issueByStudent = {};
  weekAttendance.forEach(a => { if (a.status === 'absent' || a.status === 'late') issueByStudent[a.student_id] = (issueByStudent[a.student_id] || 0) + 1; });
  const topIssues = Object.entries(issueByStudent).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const avgGrade = weekGrades.length ? Math.round(weekGrades.reduce((s, g) => s + (g.score || 0), 0) / weekGrades.length) : null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">סיכום שבועי</h1>
            <p className="text-xs text-muted-foreground">{toHebrewFull(weekStart)} – {toHebrewFull(weekEnd)}</p>
          </div>
        </div>

        <HebrewDateNavigator />

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card border rounded-2xl p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
            <p className="text-xl font-bold text-emerald-600 mt-1">{present}</p>
            <p className="text-[10px] text-muted-foreground">נוכח</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <Clock className="w-5 h-5 text-amber-500 mx-auto" />
            <p className="text-xl font-bold text-amber-600 mt-1">{late}</p>
            <p className="text-[10px] text-muted-foreground">איחור</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <XCircle className="w-5 h-5 text-red-500 mx-auto" />
            <p className="text-xl font-bold text-red-600 mt-1">{absent}</p>
            <p className="text-[10px] text-muted-foreground">חיסור</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <GraduationCap className="w-5 h-5 text-blue-500 mx-auto" />
            <p className="text-xl font-bold text-blue-600 mt-1">{avgGrade ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground">ממוצע</p>
          </div>
        </div>

        {attRate != null && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-center">
            אחוז נוכחות כיתתי השבוע: <span className="font-bold text-primary">{attRate}%</span> · {totalAtt} רשומות · {weekGrades.length} ציונים · {weekHomework.length} מטלות · {weekBehavior.length} אירועי התנהגות
          </div>
        )}

        {/* Top issues */}
        {topIssues.length > 0 && (
          <div className="bg-card border rounded-2xl p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">תלמידים עם הכי הרבה חיסורים/איחורים</p>
            <div className="space-y-1.5">
              {topIssues.map(([sid, n]) => (
                <div key={sid} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{studentName(sid)}</span>
                  <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">{n} רשומות</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grades this week */}
        <div className="bg-card border rounded-2xl p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-blue-500" /> ציונים השבוע ({weekGrades.length})</p>
          {weekGrades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">אין ציונים השבוע</p>
          ) : (
            <div className="space-y-1.5">
              {weekGrades.map(g => (
                <div key={g.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{studentName(g.student_id)} · {g.test_name || g.subject}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(g.date)}</p>
                  </div>
                  <span className={`font-bold ${g.score >= 80 ? 'text-emerald-600' : g.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{g.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Homework this week */}
        <div className="bg-card border rounded-2xl p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><ClipboardCheck className="w-4 h-4 text-blue-500" /> מטלות להגשה השבוע ({weekHomework.length})</p>
          {weekHomework.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">אין מטלות השבוע</p>
          ) : (
            <div className="space-y-1.5">
              {weekHomework.map(h => {
                const submitted = (h.submissions || []).filter(s => s.submitted).length;
                const total = (h.submissions || []).length;
                return (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{h.title}</p>
                      <p className="text-[10px] text-muted-foreground">הגשה: {formatDate(h.due_date)}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{submitted}/{total} הגישו</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}