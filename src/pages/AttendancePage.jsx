import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import AttendanceManager from '@/components/attendance/AttendanceManager';
import AttendanceChart from '@/components/attendance/AttendanceChart';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { motion } from 'framer-motion';
import { CalendarCheck } from 'lucide-react';

export default function AttendancePage() {
  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });
  const { data: attendance = [], refetch: refetchAttendance } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list() });
  const handleRefresh = useCallback(async () => { await Promise.all([refetch(), refetchAttendance()]); }, [refetch, refetchAttendance]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="relative p-5 max-w-2xl mx-auto space-y-5" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">ניהול נוכחות</h1>
            <p className="text-muted-foreground text-sm">{students.filter(s => s.is_active !== false).length} תלמידים פעילים</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <AttendanceManager students={students} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <AttendanceChart students={students} />
        </motion.div>
      </div>
    </AppLayout>
  );
}