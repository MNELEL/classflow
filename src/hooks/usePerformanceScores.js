import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calculatePerformanceScore } from '@/lib/performanceScore';
import { useMemo } from 'react';

/**
 * Fetches grades, attendance, and behavior events for all students,
 * then computes a performance score map: { [studentId]: scoreData }.
 */
export function usePerformanceScores(students) {
  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: () => base44.entities.Grade.list('-date', 500),
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list('-date', 500),
  });
  const { data: behavior = [] } = useQuery({
    queryKey: ['behavior-events'],
    queryFn: () => base44.entities.BehaviorEvent.list('-date', 500),
  });

  const scores = useMemo(() => {
    const map = {};
    for (const student of students) {
      const studentGrades = grades.filter(g => g.student_id === student.id);
      const studentAttendance = attendance.filter(a => a.student_id === student.id);
      const studentBehavior = behavior.filter(b => b.student_id === student.id);
      map[student.id] = calculatePerformanceScore(student, studentGrades, studentAttendance, studentBehavior);
    }
    return map;
  }, [students, grades, attendance, behavior]);

  const needsAttentionList = useMemo(() =>
    students.filter(s => scores[s.id]?.needsAttention).map(s => s.id),
  [students, scores]);

  return { scores, needsAttentionList };
}