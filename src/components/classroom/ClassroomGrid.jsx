import React, { useState } from 'react';
import SeatCard from './SeatCard';
import { detectConflicts, getSeatAt } from '@/lib/seatingUtils';

export default function ClassroomGrid({
  seats,
  students,
  rows,
  cols,
  showNumbers,
  onSeatClick,
  onMoveStu,
}) {
  const [draggingOver, setDraggingOver] = useState(null);

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  let seatNum = 1;
  const seatNumbers = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seat = getSeatAt(seats, r, c);
      if (seat && !seat.is_hidden && !seat.is_gap) {
        seatNumbers[seat.id] = seatNum++;
      }
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
      <div className="flex justify-center mb-4">
        <div className="bg-primary/10 border-2 border-primary/30 rounded-xl px-8 py-2 text-primary font-semibold text-sm">
          לוח המורה
        </div>
      </div>

      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, auto)`,
        }}
      >
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const seat = getSeatAt(seats, r, c);
            if (!seat) return <div key={`${r}-${c}`} />;
            const student = seat.student_id ? studentMap[seat.student_id] : null;
            const conflict = student ? detectConflicts(seat, seats, students) : { type: null };
            return (
              <SeatCard
                key={seat.id}
                seat={seat}
                student={student}
                conflictType={conflict.type}
                showNumbers={showNumbers}
                seatNumber={seatNumbers[seat.id]}
                isDraggingOver={draggingOver === seat.id}
                onDrop={handleDrop}
                onDragStart={() => {}}
                onClick={onSeatClick}
              />
            );
          })
        )}
      </div>
    </div>
  );
}