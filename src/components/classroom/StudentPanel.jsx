import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, UserCheck, UserX, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import StudentPanelFilters from './StudentPanelFilters';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentPanel({ students, seats }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const seatedIds = new Set(seats.filter(s => s.student_id).map(s => s.student_id));

  function matchesFilter(s) {
    if (filter === 'all') return true;
    if (filter === 'front') return s.row_preference === 'front';
    if (filter === 'middle') return s.row_preference === 'middle';
    if (filter === 'back') return s.row_preference === 'back';
    if (filter === 'left') return s.side_preference === 'left';
    if (filter === 'right') return s.side_preference === 'right';
    return true;
  }

  const unseated = students.filter(s =>
    s.is_active !== false && !seatedIds.has(s.id) && s.name.includes(search) && matchesFilter(s)
  );
  const seated = students.filter(s =>
    s.is_active !== false && seatedIds.has(s.id) && s.name.includes(search) && matchesFilter(s)
  );

  function handleDragStart(e, student) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ studentId: student.id, fromSeatId: null }));
  }

  const allEmpty = unseated.length === 0 && seated.length === 0;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative">
        <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          className="pr-8 text-xs h-8"
          placeholder="חיפוש..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <StudentPanelFilters activeFilter={filter} onFilterChange={setFilter} />

      <div className="flex-1 overflow-y-auto space-y-3 pl-0.5 pr-0.5">
        {unseated.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              <span className="text-[10px] font-bold text-warning uppercase tracking-wider">ממתינים ({unseated.length})</span>
            </div>
            <div className="space-y-1">
              <AnimatePresence>
                {unseated.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.03 }}
                    draggable
                    onDragStart={e => handleDragStart(e, s)}
                    className="group bg-warning/10 border border-warning/30 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-grab active:cursor-grabbing hover:bg-warning/20 hover:border-warning/60 hover:shadow-sm transition-all duration-150 select-none"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-warning/70 shrink-0" />
                      {s.name}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {seated.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">משובצים ({seated.length})</span>
            </div>
            <div className="space-y-1">
              {seated.map(s => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={e => handleDragStart(e, s)}
                  className="bg-muted/40 border border-border/50 rounded-lg px-2.5 py-1.5 text-xs cursor-grab active:cursor-grabbing hover:bg-muted hover:border-border transition-all duration-150 text-muted-foreground select-none"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-500/60 shrink-0" />
                    {s.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {allEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-8 text-center gap-2"
          >
            <Users className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/50">לא נמצאו תלמידים</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}