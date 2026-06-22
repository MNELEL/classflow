import React, { useState } from 'react';
import { Search, Users, ChevronLeft, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function TeacherInsightsList({ teachers, classrooms, allStudents, allTasks, allGrades, allBehavior, selectedId, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = teachers.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase())
  );

  function getStats(teacherId) {
    const teacherClassrooms = classrooms.filter(c => c.teacher_id === teacherId);
    const studentIds = teacherClassrooms.flatMap(c => c.student_ids || []);
    const students = allStudents.filter(s => studentIds.includes(s.id));
    const tasks = allTasks.filter(t => studentIds.includes(t.student_id));
    const grades = allGrades.filter(g => studentIds.includes(g.student_id));
    const behavior = allBehavior.filter(e => studentIds.includes(e.student_id));
    return { classrooms: teacherClassrooms.length, students: students.length, tasks: tasks.length, grades: grades.length, behavior: behavior.length };
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/60">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש מורה..."
            className="pr-9 h-9 text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <Users className="w-10 h-10 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">לא נמצאו מורים</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map(teacher => {
              const stats = getStats(teacher.id);
              const active = selectedId === teacher.id;
              const hasSummary = !!teacher.style_summary;
              return (
                <button
                  key={teacher.id}
                  onClick={() => onSelect(teacher.id)}
                  className={cn(
                    'w-full text-right p-3 hover:bg-accent/30 transition-colors flex items-center gap-3',
                    active && 'bg-primary/5 border-r-2 border-primary'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    teacher.is_active !== false ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Users className={cn('w-5 h-5', teacher.is_active !== false ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{teacher.full_name}</p>
                      {hasSummary && <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {teacher.subject || '—'} · {stats.classrooms} כיתות · {stats.students} תלמידים
                    </p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}