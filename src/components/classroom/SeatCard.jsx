import React, { useState, memo } from 'react';
import { cn } from '@/lib/utils';
import { Lock, Eye, Volume2, Zap, Heart, Ban, AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BLOCK_ICONS = { broken: '🪑', speaker: '🔊', ac: '❄️', door: '🚪', other: '⚠️' };

const SPECIAL_ICONS = {
  vision: <Eye className="w-2.5 h-2.5" />,
  hearing: <Volume2 className="w-2.5 h-2.5" />,
  adhd: <Zap className="w-2.5 h-2.5" />,
};

const SeatCard = memo(function SeatCard({
  seat, student, conflictType, physicalViolation,
  showNumbers, seatNumber, onDrop, onDragStart, onClick, isDraggingOver, teacherView = true,
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (seat.is_hidden) return <div className="w-full h-16" />;
  if (seat.is_gap) return <div className="w-full h-3" />;

  if (seat.is_blocked) {
    return (
      <motion.div
        whileTap={{ scale: 0.95 }}
        className={cn(
          'relative rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/80 dark:bg-orange-950/20 dark:border-orange-700 cursor-pointer select-none flex flex-col items-center justify-center p-1.5 min-h-[64px] backdrop-blur-sm',
          isDraggingOver && 'drag-over'
        )}
        onClick={() => onClick && onClick(seat)}
      >
        <Ban className="w-4 h-4 text-orange-400" />
        <span className="text-[9px] text-orange-500 font-medium mt-0.5 text-center">{BLOCK_ICONS[seat.block_reason] || '⚠️'}</span>
      </motion.div>
    );
  }

  const isEmpty = !student;

  const bgColor = isEmpty
    ? isDraggingOver
      ? 'bg-primary/10 border-primary border-solid shadow-inner'
      : 'bg-muted/40 border-dashed border-border/60 hover:bg-primary/5 hover:border-primary/40'
    : physicalViolation
    ? 'bg-purple-50 border-purple-400 shadow-purple-100 dark:bg-purple-950/30 dark:border-purple-500'
    : conflictType === 'conflict'
    ? 'bg-red-50 border-red-300 shadow-red-100 dark:bg-red-950/30 dark:border-red-600'
    : conflictType === 'good'
    ? 'bg-emerald-50 border-emerald-300 shadow-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-600'
    : 'bg-card border-border hover:border-primary/50 hover:shadow-md';

  function handleDragOver(e) { e.preventDefault(); }
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
    <motion.div
      layout
      whileHover={{ y: isEmpty ? 0 : -2, scale: isEmpty ? 1 : 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'relative rounded-xl border-2 cursor-pointer select-none flex flex-col items-center justify-center p-1.5 min-h-[64px] group transition-shadow duration-200',
        bgColor,
        isDraggingOver && !isEmpty && 'ring-2 ring-primary ring-offset-1',
        seat.is_locked && teacherView && 'ring-1 ring-yellow-400/60',
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      draggable={!!student && !seat.is_locked}
      onDragStart={handleDragStart}
      onClick={() => onClick && onClick(seat)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showNumbers && (
        <span className="absolute top-0.5 right-1 text-[8px] text-muted-foreground/60 font-mono">{seatNumber}</span>
      )}
      {seat.is_locked && teacherView && (
        <span className="absolute top-0.5 left-1 text-yellow-500/80">
          <Lock className="w-2.5 h-2.5" />
        </span>
      )}
      {seat.fixed_seat_number && teacherView && (
        <span className="absolute bottom-0.5 left-1 text-[8px] text-blue-500/80 font-bold">#{seat.fixed_seat_number}</span>
      )}

      <AnimatePresence mode="wait">
        {student ? (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="flex flex-col items-center w-full"
          >
            <span className="text-xs font-semibold text-center leading-tight line-clamp-2 px-0.5">{student.name}</span>
            <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
              {student.special_needs?.slice(0, 2).map(need => (
                <span key={need} className={cn(
                  'rounded-full p-0.5',
                  need === 'vision' ? 'text-blue-500' :
                  need === 'hearing' ? 'text-purple-500' :
                  need === 'adhd' ? 'text-yellow-500' : 'text-muted-foreground'
                )}>
                  {SPECIAL_ICONS[need] || null}
                </span>
              ))}
              {(student.friends?.length > 0) && (
                <span className="text-pink-400"><Heart className="w-2.5 h-2.5" /></span>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.span
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'text-[10px] transition-opacity duration-200',
              isDraggingOver ? 'text-primary font-semibold' : 'text-muted-foreground/30'
            )}
          >
            {isDraggingOver ? '+ שבץ' : ''}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Status badges */}
      {physicalViolation && (
        <motion.span
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
          title="הפרת אילוץ פיזי"
        >
          <MapPin className="w-2 h-2" />
        </motion.span>
      )}
      {conflictType === 'conflict' && (
        <motion.span
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute -top-1.5 -left-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
        >
          <AlertTriangle className="w-2 h-2" />
        </motion.span>
      )}
      {conflictType === 'good' && (
        <motion.span
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute -top-1.5 -left-1.5 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm"
        >
          <CheckCircle2 className="w-2 h-2" />
        </motion.span>
      )}
    </motion.div>
  );
});

export default SeatCard;