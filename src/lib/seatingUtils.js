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

// Detect physical constraint violations (permanent_row / permanent_col)
export function detectPhysicalViolation(seat, seats, student) {
  if (!student) return false;
  const totalRows = Math.max(...seats.map(s => s.row)) + 1;
  const totalCols = Math.max(...seats.map(s => s.col)) + 1;
  const thirdRow = Math.floor(totalRows / 3);
  const thirdCol = Math.floor(totalCols / 3);

  if (student.permanent_row && student.permanent_row !== 'none') {
    if (student.permanent_row === 'front' && seat.row !== 0) return true;
    if (student.permanent_row === 'back' && seat.row !== totalRows - 1) return true;
    if (student.permanent_row === 'middle' && Math.abs(seat.row - Math.floor(totalRows / 2)) > 1) return true;
  }

  if (student.permanent_col && student.permanent_col !== 'none') {
    if (student.permanent_col === 'left' && seat.col > thirdCol) return true;
    if (student.permanent_col === 'right' && seat.col < totalCols - 1 - thirdCol) return true;
    if (student.permanent_col === 'center' && (seat.col < thirdCol || seat.col > totalCols - 1 - thirdCol)) return true;
  }

  return false;
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

// Smart sort algorithm — greedy with multi-pass improvement
export function smartSort(seats, students) {
  const lockedSeats = seats.filter(s => s.is_locked && !s.is_hidden && !s.is_gap && !s.is_blocked);
  const lockedStudentIds = new Set(lockedSeats.map(s => s.student_id).filter(Boolean));
  const studentsToPlace = students.filter(s => s.is_active !== false && !lockedStudentIds.has(s.id));

  const availableSeats = seats.filter(s => !s.is_hidden && !s.is_gap && !s.is_locked && !s.is_blocked);

  if (availableSeats.length === 0 || studentsToPlace.length === 0) return seats;

  const totalRows = Math.max(...availableSeats.map(s => s.row)) + 1;
  const totalCols = Math.max(...availableSeats.map(s => s.col)) + 1;
  const thirdC = Math.floor(totalCols / 3);

  // Priority: students with more hard constraints go first
  const prioritized = [...studentsToPlace].sort((a, b) => {
    const score = (s) =>
      (s.special_needs?.length || 0) * 4 +
      (s.permanent_row && s.permanent_row !== 'none' ? 3 : 0) +
      (s.permanent_col && s.permanent_col !== 'none' ? 3 : 0) +
      (s.avoid?.length || 0) * 2 +
      (s.separate?.length || 0) * 2 +
      (s.friends?.length || 0);
    return score(b) - score(a);
  });

  // Score a seat for a student given the current placement state
  function scoreSeat(student, seat, currentSeats) {
    let s = 0;

    // ── Hard constraints (permanent placement) ──
    if (student.permanent_row && student.permanent_row !== 'none') {
      const mid = Math.floor(totalRows / 2);
      if (student.permanent_row === 'front') s += seat.row === 0 ? 40 : -60;
      else if (student.permanent_row === 'back') s += seat.row === totalRows - 1 ? 40 : -60;
      else if (student.permanent_row === 'middle') s += Math.abs(seat.row - mid) <= 1 ? 40 : -60;
    }
    if (student.permanent_col && student.permanent_col !== 'none') {
      if (student.permanent_col === 'left') s += seat.col <= thirdC ? 40 : -60;
      else if (student.permanent_col === 'right') s += seat.col >= totalCols - 1 - thirdC ? 40 : -60;
      else if (student.permanent_col === 'center') s += (seat.col > thirdC && seat.col < totalCols - 1 - thirdC) ? 40 : -60;
    }

    // ── Special needs → front ──
    if (student.special_needs?.includes('vision') || student.special_needs?.includes('hearing')) {
      s += (totalRows - seat.row) * 5;
    }
    if (student.special_needs?.includes('mobility')) {
      // Aisle preference — edges
      if (seat.col === 0 || seat.col === totalCols - 1) s += 15;
    }

    // ── Height ──
    if (student.height === 'tall') s += seat.row * 4;
    else if (student.height === 'short') s += (totalRows - seat.row) * 3;

    // ── Row preference ──
    if (student.row_preference === 'front') s += (totalRows - seat.row) * 3;
    else if (student.row_preference === 'back') s += seat.row * 3;
    else if (student.row_preference === 'middle') s += (totalRows - Math.abs(seat.row - Math.floor(totalRows / 2))) * 3;

    // ── Side preference ──
    if (student.side_preference === 'left') s += (totalCols - seat.col) * 2;
    else if (student.side_preference === 'right') s += seat.col * 2;
    else if (student.side_preference === 'center') s += (totalCols - Math.abs(seat.col - Math.floor(totalCols / 2))) * 2;

    // ── Avoid edges ──
    if (student.avoid_edges && (seat.col === 0 || seat.col === totalCols - 1)) s -= 20;

    // ── Social constraints (based on already-placed students) ──
    for (const other of currentSeats) {
      if (!other.student_id) continue;
      const dist = getDistance(seat, other);
      const adj = dist === 1;

      if (student.friends?.includes(other.student_id)) {
        if (adj) s += 20;
        else if (dist === 2) s += 8;
      }
      if (student.avoid?.includes(other.student_id)) {
        if (adj) s -= 35;
        else if (dist === 2) s -= 10;
      }
      if (student.separate?.includes(other.student_id)) {
        if (dist < 3) s -= 25;
        else if (dist < 5) s -= 8;
      }
    }

    // ── Learning group ──
    if (student.learning_group) {
      for (const other of currentSeats) {
        if (!other.student_id) continue;
        const member = studentsToPlace.find(st => st.id === other.student_id && st.learning_group === student.learning_group);
        if (member) {
          const dist = getDistance(seat, other);
          if (dist === 1) s += 30;
          else if (dist === 2) s += 12;
        }
      }
    }

    return s;
  }

  // ── Pass 1: greedy placement ──
  const baseSeats = seats.map(s => ({ ...s, student_id: s.is_locked ? s.student_id : null }));
  const usedSeatIds = new Set(lockedSeats.map(s => s.id));

  for (const student of prioritized) {
    let bestSeat = null;
    let bestScore = -Infinity;

    for (const seat of availableSeats) {
      if (usedSeatIds.has(seat.id)) continue;
      const sc = scoreSeat(student, seat, baseSeats);
      if (sc > bestScore) { bestScore = sc; bestSeat = seat; }
    }

    if (bestSeat) {
      const idx = baseSeats.findIndex(s => s.id === bestSeat.id);
      if (idx !== -1) {
        baseSeats[idx] = { ...baseSeats[idx], student_id: student.id };
        usedSeatIds.add(bestSeat.id);
      }
    }
  }

  // ── Pass 2: swap improvement (try swapping pairs to improve total score) ──
  const SWAP_PASSES = 3;
  for (let pass = 0; pass < SWAP_PASSES; pass++) {
    let improved = false;
    const placed = baseSeats.filter(s => s.student_id && !s.is_locked);

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const seatA = placed[i];
        const seatB = placed[j];
        const studentA = students.find(s => s.id === seatA.student_id);
        const studentB = students.find(s => s.id === seatB.student_id);
        if (!studentA || !studentB) continue;

        const before = scoreSeat(studentA, seatA, baseSeats) + scoreSeat(studentB, seatB, baseSeats);
        const after = scoreSeat(studentA, seatB, baseSeats) + scoreSeat(studentB, seatA, baseSeats);

        if (after > before + 2) {
          const idxA = baseSeats.findIndex(s => s.id === seatA.id);
          const idxB = baseSeats.findIndex(s => s.id === seatB.id);
          baseSeats[idxA] = { ...baseSeats[idxA], student_id: studentB.id };
          baseSeats[idxB] = { ...baseSeats[idxB], student_id: studentA.id };
          placed[i] = baseSeats[idxA];
          placed[j] = baseSeats[idxB];
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  // ── Pass 3: ensure ALL active students are placed (fill remaining) ──
  const placedIds = new Set(baseSeats.filter(s => s.student_id).map(s => s.student_id));
  const unplaced = studentsToPlace.filter(s => !placedIds.has(s.id));
  const emptySeats = baseSeats.filter(s => !s.student_id && !s.is_hidden && !s.is_gap && !s.is_locked && !s.is_blocked);

  for (let i = 0; i < unplaced.length && i < emptySeats.length; i++) {
    const idx = baseSeats.findIndex(s => s.id === emptySeats[i].id);
    if (idx !== -1) baseSeats[idx] = { ...baseSeats[idx], student_id: unplaced[i].id };
  }

  return baseSeats;
}