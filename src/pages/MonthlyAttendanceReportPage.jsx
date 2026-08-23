import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { CalendarCheck, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { toHebrewMonthYear } from '@/lib/hebrewDate';
import { useSelectedDate } from '@/lib/dateContext';
import HebrewDateNavigator from '@/components/ui/HebrewDateNavigator';
import PrintButton from '@/components/common/PrintButton';

function startOfMonth(d) { const x = new Date(d); x.setDate(1); x.setHours(0, 0, 0, 0); return x; }
function ymd(d) { return d.toISOString().slice(0, 10); }

export default function MonthlyAttendanceReportPage() {
  const { selectedDate } = useSelectedDate();
  const monthStart = useMemo(() => startOfMonth(new Date(selectedDate + 'T00:00:00')), [selectedDate]);

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 2000) });

  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const start = ymd(monthStart), end = ymd(monthEnd);

  const monthAttendance = useMemo(() => attendance.filter(a => {
    const d = (a.date || '').slice(0, 10); return d >= start && d <= end;
  }), [attendance, start, end]);

  const perStudent = useMemo(() => {
    const active = students.filter(s => s.is_active !== false);
    return active.map(s => {
      const recs = monthAttendance.filter(a => a.student_id === s.id);
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
  }, [students, monthAttendance]);

  const totals = useMemo(() => {
    let late = 0, absent = 0, present = 0;
    perStudent.forEach(r => { late += r.late; absent += r.absent; present += r.present; });
    const total = late + absent + present;
    return { late, absent, present, total, rate: total ? Math.round(present / total * 100) : null };
  }, [perStudent]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">דוח נוכחות חודשי</h1>
            <p className="text-xs text-muted-foreground">{toHebrewMonthYear(monthStart)}</p>
          </div>
          <PrintButton />
        </div>

        <HebrewDateNavigator />

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
          <div className="grid grid-cols-[1fr_3rem_3rem_3.5rem] gap-1 px-3 py-2 bg-muted/50 text-[11px] font-semibold text-muted-foreground">
            <span>תלמיד</span>
            <span className="text-center">חיסור</span>
            <span className="text-center">איחור</span>
            <span className="text-center">נוכחות</span>
          </div>
          {perStudent.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">אין תלמידים</p>
          ) : perStudent.map(({ s, late, absent, rate }) => (
            <div key={s.id} className="grid grid-cols-[1fr_3rem_3rem_3.5rem] gap-1 px-3 py-2 border-t items-center text-sm">
              <span className="font-medium truncate">{s.name}</span>
              <span className={`text-center ${absent > 0 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>{absent || '–'}</span>
              <span className={`text-center ${late > 0 ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>{late || '–'}</span>
              <span className={`text-center text-xs font-semibold ${rate == null ? 'text-muted-foreground' : rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {rate != null ? `${rate}%` : '—'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center">סה"כ {totals.total} רשומות נוכחות החודש · ממוצע כיתתי {totals.rate != null ? `${totals.rate}%` : '—'}</p>
      </div>
    </AppLayout>
  );
}