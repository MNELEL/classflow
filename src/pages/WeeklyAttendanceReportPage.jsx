import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CalendarCheck, ChevronRight, ChevronLeft, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { toHebrewDate, toHebrewFull, isRoshChodesh } from '@/lib/hebrewDate';

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sunday
  x.setDate(x.getDate() - day);
  return x;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d) { return d.toISOString().slice(0, 10); }

export default function WeeklyAttendanceReportPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 1000) });
  const { data: rules = [] } = useQuery({ queryKey: ['school-calendar-rules'], queryFn: () => base44.entities.SchoolCalendarRule.list() });

  const weekEnd = addDays(weekStart, 6);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // No-school days in this week (recurring day-of-week rule, specific date, or Rosh Chodesh)
  const noSchoolDays = useMemo(() => {
    const set = new Set();
    rules.forEach(r => {
      if (r.is_active === false) return;
      if (r.rule_type !== 'no_school') return;
      if (r.day_of_week != null) days.forEach(d => { if (d.getDay() === r.day_of_week) set.add(ymd(d)); });
      if (r.specific_date) set.add(String(r.specific_date).slice(0, 10));
      if (r.hebrew_event === 'rosh_chodesh') days.forEach(d => { if (isRoshChodesh(d)) set.add(ymd(d)); });
    });
    return set;
  }, [rules, days]);

  const weekAttendance = useMemo(() => {
    const start = ymd(weekStart), end = ymd(weekEnd);
    return attendance.filter(a => { const d = (a.date || '').slice(0, 10); return d >= start && d <= end; });
  }, [attendance, weekStart, weekEnd]);

  const perStudent = useMemo(() => {
    const active = students.filter(s => s.is_active !== false);
    return active.map(s => {
      const recs = weekAttendance.filter(a => a.student_id === s.id);
      let present = 0, late = 0, absent = 0;
      recs.forEach(a => {
        if (a.status === 'present') present++;
        else if (a.status === 'late') late++;
        else if (a.status === 'absent') absent++;
      });
      const total = recs.length;
      const rate = total ? Math.round((present / total) * 100) : null;
      return { s, present, late, absent, total, rate };
    }).sort((a, b) => (b.absent + b.late) - (a.absent + a.late) || a.s.name.localeCompare(b.s.name, 'he'));
  }, [students, weekAttendance]);

  const totals = useMemo(() => {
    let late = 0, absent = 0, present = 0;
    perStudent.forEach(r => { late += r.late; absent += r.absent; present += r.present; });
    const total = late + absent + present;
    return { late, absent, present, total, rate: total ? Math.round(present / total * 100) : null };
  }, [perStudent]);

  const schoolDays = days.filter(d => !noSchoolDays.has(ymd(d)));

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">דוח נוכחות שבועי</h1>
            <p className="text-xs text-muted-foreground">{toHebrewFull(weekStart)} – {toHebrewFull(weekEnd)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>השבוע</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronLeft className="w-4 h-4" /></Button>
        </div>

        {noSchoolDays.size > 0 && (
          <div className="text-xs bg-amber-50/60 dark:bg-amber-900/15 text-amber-700 dark:text-amber-400 rounded-lg p-2.5">
            ימים ללא לימודים השבוע: {[...noSchoolDays].sort().map(d => toHebrewDate(d)).join(', ')}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border rounded-2xl p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totals.present}</p>
            <p className="text-[10px] text-muted-foreground">נוכחויות</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <Clock className="w-5 h-5 text-amber-500 mx-auto" />
            <p className="text-2xl font-bold text-amber-600 mt-1">{totals.late}</p>
            <p className="text-[10px] text-muted-foreground">איחורים</p>
          </div>
          <div className="bg-card border rounded-2xl p-3 text-center">
            <XCircle className="w-5 h-5 text-red-500 mx-auto" />
            <p className="text-2xl font-bold text-red-600 mt-1">{totals.absent}</p>
            <p className="text-[10px] text-muted-foreground">חיסורים</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_2.5rem_2.5rem_3rem] gap-1 px-3 py-2 bg-muted/50 text-[11px] font-semibold text-muted-foreground">
            <span>תלמיד</span>
            <span className="text-center">איחור</span>
            <span className="text-center">חיסור</span>
            <span className="text-center">נוכחות</span>
          </div>
          {perStudent.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">אין תלמידים</p>
          ) : perStudent.map(({ s, late, absent, rate }) => (
            <div key={s.id} className="grid grid-cols-[1fr_2.5rem_2.5rem_3rem] gap-1 px-3 py-2 border-t items-center text-sm">
              <span className="font-medium truncate">{s.name}</span>
              <span className={`text-center ${late > 0 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>{late || '–'}</span>
              <span className={`text-center ${absent > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>{absent || '–'}</span>
              <span className={`text-center text-xs font-semibold ${rate == null ? 'text-muted-foreground' : rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {rate != null ? `${rate}%` : '—'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center">סה"כ {schoolDays.length} ימי לימוד השבוע · {totals.total} רשומות נוכחות</p>
      </div>
    </AppLayout>
  );
}