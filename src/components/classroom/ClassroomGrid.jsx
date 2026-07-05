import React, { useState, useEffect } from 'react';
import SeatCard from './SeatCard';
import BoardLabelEditor from './BoardLabelEditor';
import { detectConflicts, detectPhysicalViolation, getSeatAt } from '@/lib/seatingUtils';
import { motion } from 'framer-motion';

const BOARD_LABEL_KEY = 'classmanager_board_label';

export default function ClassroomGrid({ seats, students, rows, cols, showNumbers, onSeatClick, onMoveStu, teacherView = true }) {
  const [boardLabel, setBoardLabel] = useState(() => {
    try { return localStorage.getItem(BOARD_LABEL_KEY) || 'לוח המורה'; } catch { return 'לוח המורה'; }
  });
  const [gridZoom, setGridZoom] = useState(1);

  useEffect(() => {
    if (cols > 7 || rows > 6) {
      setGridZoom(Math.min(1, (window.innerWidth - 48) / (cols * 70)));
    } else {
      setGridZoom(1);
    }
  }, [cols, rows]);

  function handleBoardLabelSave(val) {
    setBoardLabel(val);
    try { localStorage.setItem(BOARD_LABEL_KEY, val); } catch {}
  }
  const [draggingOver, setDraggingOver] = useState(null);
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  let seatNum = 1;
  const seatNumbers = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seat = getSeatAt(seats, r, c);
      if (seat && !seat.is_hidden && !seat.is_gap) seatNumbers[seat.id] = seatNum++;
    }
  }

  function handleDrop(seatId, rawData) {
    setDraggingOver(null);
    try {
      const { studentId, fromSeatId } = JSON.parse(rawData);
      onMoveStu && onMoveStu(studentId, fromSeatId, seatId);
    } catch {}
  }

  return (
    <div className="w-full">
      {/* Teacher board */}
      <div className="flex justify-center mb-5">
        <BoardLabelEditor label={boardLabel} onSave={handleBoardLabelSave} />
      </div>

      {/* Row labels + grid */}
      <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex gap-2 items-start" style={{ zoom: gridZoom }}>
        {/* Row numbers */}
        <div className="flex flex-col gap-2 pt-0.5" style={{ minWidth: '18px' }}>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="h-[64px] flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground/40 font-mono">{r + 1}</span>
            </div>
          ))}
        </div>

        <div
          className="flex-1 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const seat = getSeatAt(seats, r, c);
              if (!seat) return <div key={`${r}-${c}`} />;
              const student = seat.student_id ? studentMap[seat.student_id] : null;
              const conflict = student ? detectConflicts(seat, seats, students) : { type: null };
              const physicalViolation = student ? detectPhysicalViolation(seat, seats, student) : false;
              // Check if this seat is the RIGHT member of a pair (left neighbour has pair_right)
              const leftNeighbour = getSeatAt(seats, r, c - 1);
              const isRightOfPair = leftNeighbour?.pair_right === true;
              // Check if this seat is the BOTTOM member of a pair
              const topNeighbour = getSeatAt(seats, r - 1, c);
              const isBottomOfPair = topNeighbour?.pair_down === true;

              // Column aisle: extra padding after this column
              const colGapStyle = seat.col_gap_after ? { paddingLeft: '14px', borderLeft: '2px dashed hsl(var(--border))' } : {};

              // Pair-right: group this seat + right neighbour in a shared desk wrapper
              // We render the wrapper only on the LEFT seat of the pair
              const pairRightWrapStyle = seat.pair_right ? {
                outline: '2px solid hsl(var(--primary)/0.35)',
                outlineOffset: '2px',
                borderRadius: '14px',
                background: 'hsl(var(--primary)/0.04)',
                paddingLeft: '3px',
              } : {};

              // For the right-of-pair seat: add left connector line
              const rightOfPairStyle = isRightOfPair ? {
                borderLeft: '3px solid hsl(var(--primary)/0.3)',
                paddingLeft: '3px',
              } : {};

              // Pair-down: highlight top of bottom seat
              const bottomOfPairStyle = isBottomOfPair ? {
                borderTop: '3px solid hsl(var(--primary)/0.3)',
                paddingTop: '3px',
              } : {};

              return (
                <div key={seat.id} style={{ ...colGapStyle, ...pairRightWrapStyle, ...rightOfPairStyle, ...bottomOfPairStyle }}>
                  <SeatCard
                    seat={seat}
                    student={student}
                    conflictType={conflict.type}
                    physicalViolation={physicalViolation}
                    showNumbers={showNumbers}
                    seatNumber={seatNumbers[seat.id]}
                    isDraggingOver={draggingOver === seat.id}
                    onDrop={handleDrop}
                    onDragStart={() => setDraggingOver(null)}
                    onClick={onSeatClick}
                    teacherView={teacherView}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>
    </div>
  );
}