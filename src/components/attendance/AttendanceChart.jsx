import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function AttendanceChart({ students }) {
  const [selectedStudentId, setSelectedStudentId] = useState('__all__');
  const [monthOffset, setMonthOffset] = useState(0);

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const targetMonth = subMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  const monthLabel = format(targetMonth, 'MMMM yyyy', { locale: he });

  // Per-day data for single student
  const studentDailyData = useMemo(() => {
    if (selectedStudentId === '__all__') return [];
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = attendance.find(a => a.student_id === selectedStudentId && a.date === dateStr);
      return {
        date: format(day, 'd/M'),
        נוכח: record?.status === 'present' ? 1 : 0,
        נעדר: record?.status === 'absent' ? 1 : 0,
        איחור: record?.status === 'late' ? 1 : 0,
        status: record?.status || null,
      };
    }).filter(d => d.status !== null || eachDayOfInterval({ start: monthStart, end: monthEnd }).length < 32);
  }, [selectedStudentId, attendance, monthStart, monthEnd]);

  // Class overview: attendance % per student for the month
  const classOverviewData = useMemo(() => {
    if (selectedStudentId !== '__all__') return [];
    return students
      .filter(s => s.is_active !== false)
      .map(s => {
        const records = attendance.filter(a =>
          a.student_id === s.id &&
          a.date >= format(monthStart, 'yyyy-MM-dd') &&
          a.date <= format(monthEnd, 'yyyy-MM-dd')
        );
        const total = records.length;
        const present = records.filter(a => a.status === 'present').length;
        const pct = total > 0 ? Math.round((present / total) * 100) : null;
        return { name: s.name.split(' ')[0], pct, total };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100));
  }, [selectedStudentId, students, attendance, monthStart, monthEnd]);

  // Single student summary stats
  const studentStats = useMemo(() => {
    if (selectedStudentId === '__all__') return null;
    const records = attendance.filter(a =>
      a.student_id === selectedStudentId &&
      a.date >= format(monthStart, 'yyyy-MM-dd') &&
      a.date <= format(monthEnd, 'yyyy-MM-dd')
    );
    const present = records.filter(a => a.status === 'present').length;
    const absent = records.filter(a => a.status === 'absent').length;
    const late = records.filter(a => a.status === 'late').length;
    const total = records.length;
    return { present, absent, late, total, pct: total > 0 ? Math.round((present / total) * 100) : null };
  }, [selectedStudentId, attendance, monthStart, monthEnd]);

  const MONTHS = Array.from({ length: 6 }, (_, i) => ({
    offset: i,
    label: format(subMonths(new Date(), i), 'MMMM yyyy', { locale: he }),
  }));

  const activeStudents = students.filter(s => s.is_active !== false);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" /> גרף נוכחות חודשי
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <MobileSelect value={selectedStudentId} onValueChange={setSelectedStudentId} placeholder="בחר תלמיד..." className="flex-1 min-w-[140px] h-8 text-xs">
            <SelectItem value="__all__">כל הכיתה</SelectItem>
            {activeStudents.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </MobileSelect>
          <MobileSelect value={String(monthOffset)} onValueChange={v => setMonthOffset(Number(v))} className="flex-1 min-w-[130px] h-8 text-xs">
            {MONTHS.map(m => (
              <SelectItem key={m.offset} value={String(m.offset)}>{m.label}</SelectItem>
            ))}
          </MobileSelect>
        </div>

        {/* Single student stats */}
        {studentStats && (
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'נוכחות', val: studentStats.pct !== null ? `${studentStats.pct}%` : '—', cls: 'text-emerald-600' },
              { label: 'נוכח', val: studentStats.present, cls: 'text-emerald-600' },
              { label: 'נעדר', val: studentStats.absent, cls: 'text-red-500' },
              { label: 'איחור', val: studentStats.late, cls: 'text-yellow-500' },
            ].map(item => (
              <div key={item.label} className="bg-muted/40 rounded-lg py-2">
                <p className={`text-lg font-bold ${item.cls}`}>{item.val}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {selectedStudentId === '__all__' ? (
          classOverviewData.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">אין נתוני נוכחות לחודש זה</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classOverviewData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, 'נוכחות']} />
                <Bar dataKey="pct" name="% נוכחות" radius={[4, 4, 0, 0]}>
                  {classOverviewData.map((d, i) => (
                    <Cell key={i} fill={d.pct >= 80 ? '#10b981' : d.pct >= 60 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          studentDailyData.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">אין נתוני נוכחות לחודש זה</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={studentDailyData} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="נוכח" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="איחור" stackId="a" fill="#f59e0b" />
                <Bar dataKey="נעדר" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        )}
      </CardContent>
    </Card>
  );
}