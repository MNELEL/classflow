import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, UserCheck, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function StudentPanel({ students, seats, onDragStudent }) {
  const [search, setSearch] = useState('');

  const seatedIds = new Set(seats.filter(s => s.student_id).map(s => s.student_id));

  const unseated = students.filter(s =>
    s.is_active !== false &&
    !seatedIds.has(s.id) &&
    s.name.includes(search)
  );
  const seated = students.filter(s =>
    s.is_active !== false &&
    seatedIds.has(s.id) &&
    s.name.includes(search)
  );

  function handleDragStart(e, student) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ studentId: student.id, fromSeatId: null }));
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="relative">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          className="pr-9 text-sm"
          placeholder="חיפוש תלמיד..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pl-1">
        {unseated.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <UserX className="w-4 h-4 text-warning" />
              <span className="text-xs font-semibold text-warning">ממתינים לשיבוץ ({unseated.length})</span>
            </div>
            <div className="space-y-1.5">
              {unseated.map(s => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={e => handleDragStart(e, s)}
                  className="bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 text-sm font-medium cursor-grab hover:bg-warning/20 transition-colors"
                >
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {seated.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <UserCheck className="w-4 h-4 text-success" />
              <span className="text-xs font-semibold text-muted-foreground">משובצים ({seated.length})</span>
            </div>
            <div className="space-y-1.5">
              {seated.map(s => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={e => handleDragStart(e, s)}
                  className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm cursor-grab hover:bg-muted transition-colors text-muted-foreground"
                >
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {unseated.length === 0 && seated.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">לא נמצאו תלמידים</p>
        )}
      </div>
    </div>
  );
}