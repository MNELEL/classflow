import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, X, Clock, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  present: { label: 'נוכח', icon: Check, color: 'bg-emerald-500 hover:bg-emerald-600 text-white', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  absent:  { label: 'נעדר', icon: X,     color: 'bg-red-500 hover:bg-red-600 text-white',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  late:    { label: 'איחור', icon: Clock, color: 'bg-yellow-400 hover:bg-yellow-500 text-white', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600' },
};

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function AttendanceManager({ students }) {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [search, setSearch] = useState('');

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ studentId, status }) => {
      const existing = attendance.find(a => a.student_id === studentId && a.date === selectedDate);
      if (existing) {
        return base44.entities.Attendance.update(existing.id, { status });
      } else {
        return base44.entities.Attendance.create({ student_id: studentId, date: selectedDate, status });
      }
    },
    onMutate: async ({ studentId, status }) => {
      await qc.cancelQueries({ queryKey: ['attendance'] });
      const previous = qc.getQueryData(['attendance']);
      qc.setQueryData(['attendance'], (old = []) => {
        const existing = old.find(a => a.student_id === studentId && a.date === selectedDate);
        if (existing) {
          return old.map(a => a.student_id === studentId && a.date === selectedDate ? { ...a, status } : a);
        }
        return [...old, { id: `optimistic-${studentId}`, student_id: studentId, date: selectedDate, status }];
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['attendance'], ctx.previous);
      toast.error('שגיאה בשמירת נוכחות');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });

  const activeStudents = students.filter(s => s.is_active !== false);
  const filtered = activeStudents.filter(s => s.name.includes(search));

  const dayRecords = attendance.filter(a => a.date === selectedDate);
  const getStatus = (studentId) => dayRecords.find(a => a.student_id === studentId)?.status;

  // Count for the selected day
  const presentCount = dayRecords.filter(a => a.status === 'present').length;
  const absentCount = dayRecords.filter(a => a.status === 'absent').length;
  const lateCount = dayRecords.filter(a => a.status === 'late').length;

  function markAll(status) {
    activeStudents.forEach(s => {
      upsertMutation.mutate({ studentId: s.id, status });
    });
    toast.success(`כל התלמידים סומנו כ"${STATUS_CONFIG[status].label}"`);
  }

  function prevDay() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  }
  function nextDay() {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
  }

  return (
    <div className="space-y-4">
      {/* Date navigator */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
        <button onClick={prevDay} className="p-1 hover:bg-accent rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-bold text-base">
            {format(parseISO(selectedDate), 'EEEE, d בMMMM yyyy', { locale: he })}
          </p>
          {selectedDate === todayStr() && <Badge className="text-[10px] mt-0.5 bg-primary/10 text-primary border-0">היום</Badge>}
        </div>
        <button onClick={nextDay} className="p-1 hover:bg-accent rounded-lg transition-colors" disabled={selectedDate >= todayStr()}>
          <ChevronLeft className={cn("w-5 h-5", selectedDate >= todayStr() && "opacity-30")} />
        </button>
      </div>

      {/* Day summary */}
      {dayRecords.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'נוכחים', count: presentCount, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
            { label: 'נעדרים', count: absentCount, cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
            { label: 'איחורים', count: lateCount, cls: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-600' },
          ].map(item => (
            <div key={item.label} className={`rounded-xl py-2 ${item.cls}`}>
              <p className="text-xl font-bold">{item.count}</p>
              <p className="text-xs font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick mark all */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" onClick={() => markAll('present')}>
          <Check className="w-3.5 h-3.5" /> כולם נוכחים
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => markAll('absent')}>
          <X className="w-3.5 h-3.5" /> כולם נעדרים
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש תלמיד..." className="pr-9" />
      </div>

      {/* Student list */}
      <div className="space-y-1.5">
        {filtered.map(student => {
          const status = getStatus(student.id);
          return (
            <div key={student.id} className="flex items-center justify-between bg-card border border-border/70 rounded-xl px-4 py-2.5 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {student.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{student.name}</p>
                  {status && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[status].badge}`}>
                      {STATUS_CONFIG[status].label}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => upsertMutation.mutate({ studentId: student.id, status: key })}
                      aria-label={cfg.label}
                      title={cfg.label}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors border-2',
                        status === key
                          ? cfg.color + ' border-transparent shadow-sm'
                          : 'bg-muted border-transparent hover:border-border text-muted-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">לא נמצאו תלמידים</p>
        )}
      </div>
    </div>
  );
}