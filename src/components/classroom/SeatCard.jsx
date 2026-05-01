import React from 'react';
import { cn } from '@/lib/utils';
import { Lock, Eye, Volume2, Zap, Settings, Ban } from 'lucide-react';

const BLOCK_ICONS = {
  broken: '🪑',
  speaker: '🔊',
  ac: '❄️',
  door: '🚪',
  other: '⚠️',
};

const SPECIAL_ICONS = {
  vision: <Eye className="w-3 h-3" />,
  hearing: <Volume2 className="w-3 h-3" />,
  adhd: <Zap className="w-3 h-3" />,
};

export default function SeatCard({
  seat,
  student,
  conflictType,
  physicalViolation,
  showNumbers,
  seatNumber,
  onDrop,
  onDragStart,
  onClick,
  isDraggingOver,
}) {
  if (seat.is_hidden) return <div className="w-full h-16" />;
  if (seat.is_gap) return <div className="w-full h-4" />;

  if (seat.is_blocked) {
    return (
      <div
        className={cn(
          'seat-card relative rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-700 cursor-pointer select-none flex flex-col items-center justify-center p-1.5 min-h-[64px]',
          isDraggingOver && 'drag-over'
        )}
        onClick={() => onClick && onClick(seat)}
      >
        <Ban className="w-4 h-4 text-orange-500" />
        <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-0.5 text-center leading-tight">
          {BLOCK_ICONS[seat.block_reason] || '⚠️'} חסום
        </span>
      </div>
    );
  }

  const isEmpty = !student;
  const hasConstraints = student && (
    (student.friends?.length > 0) ||
    (student.avoid?.length > 0) ||
    (student.separate?.length > 0) ||
    (student.row_preference && student.row_preference !== 'none')
  );

  const bgColor = isEmpty
    ? 'bg-muted/60 border-dashed border-border'
    : physicalViolation
    ? 'bg-purple-50 border-purple-400 dark:bg-purple-950/30 dark:border-purple-600'
    : conflictType === 'conflict'
    ? 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-700'
    : conflictType === 'good'
    ? 'bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700'
    : 'bg-card border-border';

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(e) {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (data) onDrop(seat.id, data);
  }

  function handleDragStart(e) {
    if (student) {
      e.dataTransfer.setData('text/plain', JSON.stringify({ studentId: student.id, fromSeatId: seat.id }));
      onDragStart && onDragStart(student.id, seat.id);
    }
  }

  return (
    <div
      className={cn(
        'seat-card relative rounded-lg border-2 cursor-pointer select-none flex flex-col items-center justify-center p-1.5 min-h-[64px] group',
        bgColor,
        isDraggingOver && 'drag-over',
        seat.is_locked && 'ring-1 ring-yellow-400',
        'hover:border-primary/50'
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      draggable={!!student && !seat.is_locked}
      onDragStart={handleDragStart}
      onClick={() => onClick && onClick(seat)}
    >
      {showNumbers && (
        <span className="absolute top-0.5 right-1 text-[9px] text-muted-foreground">{seatNumber}</span>
      )}
      {seat.is_locked && (
        <span className="absolute top-0.5 left-1 text-yellow-500"><Lock className="w-3 h-3" /></span>
      )}

      {student ? (
        <>
          <span className="text-xs font-semibold text-center leading-tight line-clamp-2">{student.name}</span>
          <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
            {student.special_needs?.map(need => (
              <span key={need} className="text-muted-foreground">
                {SPECIAL_ICONS[need] || null}
              </span>
            ))}
            {hasConstraints && (
              <span className="text-muted-foreground"><Settings className="w-3 h-3" /></span>
            )}
          </div>
          {physicalViolation && (
            <span className="absolute -top-1.5 -right-1.5 bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold" title="הפרת אילוץ פיזי">📍</span>
          )}
          {conflictType === 'conflict' && (
            <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">!</span>
          )}
          {conflictType === 'good' && (
            <span className="absolute -top-1.5 -left-1.5 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]">✓</span>
          )}
        </>
      ) : (
        <span className="text-[11px] text-muted-foreground/50">ריק</span>
      )}
    </div>
  );
}