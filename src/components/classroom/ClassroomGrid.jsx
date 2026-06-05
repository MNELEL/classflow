import React, { useState } from 'react';
import SeatCard from './SeatCard';
import BoardLabelEditor from './BoardLabelEditor';
import { detectConflicts, detectPhysicalViolation, getSeatAt } from '@/lib/seatingUtils';
import { motion } from 'framer-motion';

const BOARD_LABEL_KEY = 'classmanager_board_label';

export default function ClassroomGrid({ seats, students, rows, cols, showNumbers, onSeatClick, onMoveStu, teacherView = true }) {
  const [boardLabel, setBoardLabel] = useState(() => {
    try { return localStorage.getItem(BOARD_LABEL_KEY) || 'לוח המורה'; } catch { return 'לוח המורה'; }
  });

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
      <div className="flex gap-2 items-start">
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
              // Pair spacing: add visual gap to the right or bottom of this cell
              const pairRightStyle = seat.pair_right ? { marginLeft: '12px', borderLeft: '3px solid hsl(var(--primary)/0.3)' } : {};
              const pairDownStyle = seat.pair_down ? { marginTop: '10px', borderTop: '3px solid hsl(var(--primary)/0.3)' } : {};
              return (
                <div key={seat.id} style={{ ...pairRightStyle, ...pairDownStyle }}>
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
  );
}