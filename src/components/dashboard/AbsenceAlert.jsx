import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';

const ABSENCE_THRESHOLD = 3; // חיסורים ב-30 הימים האחרונים

export default function AbsenceAlert({ students }) {
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const since = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const recentAbsences = attendance.filter(a => a.status === 'absent' && a.date >= since);

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  // Count absences per student
  const absenceCounts = {};
  recentAbsences.forEach(a => {
    if (studentMap[a.student_id]) {
      absenceCounts[a.student_id] = (absenceCounts[a.student_id] || 0) + 1;
    }
  });

  const atRisk = Object.entries(absenceCounts)
    .filter(([, count]) => count >= ABSENCE_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .map(([id, count]) => ({ student: studentMap[id], count }))
    .filter(x => x.student);

  if (atRisk.length === 0) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-sm text-red-800 dark:text-red-300">התראת חיסורים</p>
          <p className="text-xs text-red-600 dark:text-red-400">{atRisk.length} תלמידים עם {ABSENCE_THRESHOLD}+ חיסורים ב-30 הימים האחרונים</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {atRisk.slice(0, 5).map(({ student, count }) => (
          <div key={student.id} className="flex items-center justify-between bg-red-100/50 dark:bg-red-900/20 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center text-red-700 dark:text-red-300 text-xs font-bold">
                {student.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-red-800 dark:text-red-300">{student.name}</span>
            </div>
            <span className="text-xs font-bold text-red-700 dark:text-red-400 bg-red-200 dark:bg-red-800/50 px-2 py-0.5 rounded-full">
              {count} חיסורים
            </span>
          </div>
        ))}
        {atRisk.length > 5 && (
          <p className="text-xs text-red-500 text-center">ועוד {atRisk.length - 5} תלמידים...</p>
        )}
      </div>
      <Link to="/attendance" className="mt-3 block text-center text-xs text-red-600 dark:text-red-400 hover:underline font-medium">
        מעבר לניהול נוכחות ←
      </Link>
    </div>
  );
}