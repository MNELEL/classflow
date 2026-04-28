// Utility functions for seating logic

export function generateSeatId(row, col) {
  return `seat-${row}-${col}`;
}

export function buildInitialSeats(rows, cols) {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seats.push({
        id: generateSeatId(r, c),
        row: r,
        col: c,
        student_id: null,
        is_hidden: false,
        is_locked: false,
        is_gap: false,
      });
    }
  }
  return seats;
}

export function getSeatAt(seats, row, col) {
  return seats.find(s => s.row === row && s.col === col);
}

export function getStudentSeat(seats, studentId) {
  return seats.find(s => s.student_id === studentId);
}

export function getDistance(seat1, seat2) {
  return Math.abs(seat1.row - seat2.row) + Math.abs(seat1.col - seat2.col);
}

export function isAdjacent(seat1, seat2) {
  return getDistance(seat1, seat2) === 1;
}

// Calculate satisfaction score 0-100
export function calcSatisfactionScore(seats, students) {
  if (!students || students.length === 0) return 100;
  let total = 0, count = 0;

  const seatedStudents = students.filter(s => getStudentSeat(seats, s.id));

  for (const student of seatedStudents) {
    const mySeat = getStudentSeat(seats, student.id);
    if (!mySeat) continue;

    // Friends nearby
    if (student.friends && student.friends.length > 0) {
      const friendSeats = student.friends
        .map(fid => getStudentSeat(seats, fid))
        .filter(Boolean);
      const hasNearFriend = friendSeats.some(fs => isAdjacent(mySeat, fs));
      total += hasNearFriend ? 1 : 0;
      count++;
    }

    // Avoid conflicts
    if (student.avoid && student.avoid.length > 0) {
      const avoidSeats = student.avoid
        .map(aid => getStudentSeat(seats, aid))
        .filter(Boolean);
      const hasConflict = avoidSeats.some(as => isAdjacent(mySeat, as));
      total += hasConflict ? 0 : 1;
      count++;
    }

    // Separate (distance)
    if (student.separate && student.separate.length > 0) {
      const sepSeats = student.separate
        .map(sid => getStudentSeat(seats, sid))
        .filter(Boolean);
      const tooClose = sepSeats.some(ss => getDistance(mySeat, ss) < 3);
      total += tooClose ? 0 : 1;
      count++;
    }

    // Row preference
    if (student.row_preference && student.row_preference !== 'none') {
      const totalRows = Math.max(...seats.map(s => s.row)) + 1;
      const isGood =
        (student.row_preference === 'front' && mySeat.row === 0) ||
        (student.row_preference === 'middle' && Math.abs(mySeat.row - Math.floor(totalRows / 2)) <= 1) ||
        (student.row_preference === 'back' && mySeat.row === totalRows - 1);
      total += isGood ? 1 : 0;
      count++;
    }
  }

  if (count === 0) return 100;
  return Math.round((total / count) * 100);
}

// Detect conflicts for a seat
export function detectConflicts(seat, seats, students) {
  const student = students.find(s => s.id === seat.student_id);
  if (!student) return { type: null };

  const adjacentSeats = seats.filter(s => isAdjacent(seat, s) && s.student_id);

  // Avoid conflict
  if (student.avoid) {
    for (const adjSeat of adjacentSeats) {
      if (student.avoid.includes(adjSeat.student_id)) {
        return { type: 'conflict', studentId: adjSeat.student_id };
      }
    }
  }

  // Friend nearby - good
  if (student.friends) {
    for (const adjSeat of adjacentSeats) {
      if (student.friends.includes(adjSeat.student_id)) {
        return { type: 'good' };
      }
    }
  }

  return { type: null };
}

// Smart sort algorithm
export function smartSort(seats, students) {
  const activeSeat = seats.filter(s => !s.is_hidden && !s.is_gap);
  const unlockedSeats = activeSeat.filter(s => !s.is_locked);
  const lockedSeats = activeSeat.filter(s => s.is_locked);

  // Students not locked
  const lockedStudentIds = new Set(lockedSeats.map(s => s.student_id).filter(Boolean));
  const studentsToPlace = students.filter(s => s.is_active !== false && !lockedStudentIds.has(s.id));

  // Clear unlocked seats
  const newSeats = seats.map(s => ({
    ...s,
    student_id: s.is_locked ? s.student_id : null,
  }));

  const availableSeats = newSeats.filter(s => !s.is_hidden && !s.is_gap && !s.is_locked);
  const totalRows = Math.max(...availableSeats.map(s => s.row)) + 1;

  // Sort students by constraints priority
  const prioritized = [...studentsToPlace].sort((a, b) => {
    const aConstraints = (a.special_needs?.length || 0) + (a.avoid?.length || 0) + (a.separate?.length || 0);
    const bConstraints = (b.special_needs?.length || 0) + (b.avoid?.length || 0) + (b.separate?.length || 0);
    return bConstraints - aConstraints;
  });

  const placed = new Set();
  const usedSeats = new Set();

  // Helper: find best seat for student
  function findBestSeat(student, availSeats, currentNewSeats) {
    let bestSeat = null;
    let bestScore = -Infinity;

    for (const seat of availSeats) {
      if (usedSeats.has(seat.id)) continue;
      let score = 0;

      // Row preference
      if (student.row_preference === 'front') score += (totalRows - seat.row) * 2;
      else if (student.row_preference === 'back') score += seat.row * 2;
      else if (student.row_preference === 'middle') {
        score += (totalRows - Math.abs(seat.row - Math.floor(totalRows / 2))) * 2;
      }

      // Special needs: vision/hearing → front rows
      if (student.special_needs?.includes('vision') || student.special_needs?.includes('hearing')) {
        score += (totalRows - seat.row) * 3;
      }

      // Side preference
      const totalCols = Math.max(...availSeats.map(s => s.col)) + 1;
      if (student.side_preference === 'left') score += (totalCols - seat.col);
      else if (student.side_preference === 'right') score += seat.col;
      else if (student.side_preference === 'center') {
        score += (totalCols - Math.abs(seat.col - Math.floor(totalCols / 2)));
      }

      // Friends nearby
      if (student.friends) {
        for (const fid of student.friends) {
          const friendSeat = currentNewSeats.find(s => s.student_id === fid);
          if (friendSeat && isAdjacent(seat, friendSeat)) score += 10;
        }
      }

      // Avoid: penalty
      if (student.avoid) {
        for (const aid of student.avoid) {
          const avoidSeat = currentNewSeats.find(s => s.student_id === aid);
          if (avoidSeat && isAdjacent(seat, avoidSeat)) score -= 20;
        }
      }

      // Separate: penalty
      if (student.separate) {
        for (const sid of student.separate) {
          const sepSeat = currentNewSeats.find(s => s.student_id === sid);
          if (sepSeat && getDistance(seat, sepSeat) < 3) score -= 15;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestSeat = seat;
      }
    }
    return bestSeat;
  }

  for (const student of prioritized) {
    const seat = findBestSeat(student, availableSeats, newSeats);
    if (seat) {
      const idx = newSeats.findIndex(s => s.id === seat.id);
      if (idx !== -1) {
        newSeats[idx] = { ...newSeats[idx], student_id: student.id };
        usedSeats.add(seat.id);
        placed.add(student.id);
      }
    }
  }

  return newSeats;
}