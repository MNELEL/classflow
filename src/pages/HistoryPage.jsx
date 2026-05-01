import React, { useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';

export default function HistoryPage() {
  const { data: students = [], refetch: refetchStudents } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: history = [], isLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['history'],
    queryFn: () => base44.entities.SeatHistory.list('-sat_at', 100),
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchStudents(), refetchHistory()]);
  }, [refetchStudents, refetchHistory]);

  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  // Group by student
  const byStudent = {};
  for (const h of history) {
    if (!byStudent[h.student_id]) byStudent[h.student_id] = [];
    byStudent[h.student_id].push(h);
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="max-w-3xl mx-auto p-6 overflow-y-auto h-full relative" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
        <h1 className="text-2xl font-bold mb-6 mt-0">היסטוריית ישיבה</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg">אין היסטוריה עדיין</p>
            <p className="text-sm mt-1">היסטוריה תיווצר לאחר שמירת סידורי ישיבה</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byStudent).map(([studentId, records]) => {
              const student = studentMap[studentId];
              return (
                <div key={studentId} className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-semibold mb-2">{student?.name || studentId}</h3>
                  <div className="space-y-1">
                    {records.map(r => (
                      <div key={r.id} className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>שורה {(r.row || 0) + 1}, עמודה {(r.col || 0) + 1}</span>
                        <span>{r.sat_at ? format(new Date(r.sat_at), 'dd/MM/yyyy HH:mm', { locale: he }) : '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}