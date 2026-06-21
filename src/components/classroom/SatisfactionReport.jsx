import React, { useMemo } from 'react';
import { getStudentSeat, isAdjacent, getDistance, calcSatisfactionDetailed } from '@/lib/seatingUtils';

function scoreStudent(student, mySeat, seats, students) {
  const details = [];
  let satisfied = 0, total = 0;

  if (!mySeat) return { satisfied: 0, total: 0, details: [{ label: 'לא שובץ', ok: false }] };

  const totalRows = Math.max(...seats.map(s => s.row)) + 1;
  const totalCols = Math.max(...seats.map(s => s.col)) + 1;
  const thirdC = Math.floor(totalCols / 3);

  // Row preference
  if (student.row_preference && student.row_preference !== 'none') {
    total++;
    const ok =
      (student.row_preference === 'front' && mySeat.row === 0) ||
      (student.row_preference === 'middle' && Math.abs(mySeat.row - Math.floor(totalRows / 2)) <= 1) ||
      (student.row_preference === 'back' && mySeat.row === totalRows - 1);
    const label = { front: 'שורה קדמית', middle: 'שורה אמצעית', back: 'שורה אחרונה' }[student.row_preference];
    if (ok) satisfied++;
    details.push({ label: `העדפת שורה: ${label}`, ok });
  }

  // Side preference
  if (student.side_preference && student.side_preference !== 'none') {
    total++;
    const ok =
      (student.side_preference === 'left' && mySeat.col <= thirdC) ||
      (student.side_preference === 'right' && mySeat.col >= totalCols - 1 - thirdC) ||
      (student.side_preference === 'center' && mySeat.col > thirdC && mySeat.col < totalCols - 1 - thirdC);
    const label = { left: 'שמאל', right: 'ימין', center: 'מרכז' }[student.side_preference];
    if (ok) satisfied++;
    details.push({ label: `העדפת צד: ${label}`, ok });
  }

  // Avoid edges
  if (student.avoid_edges) {
    total++;
    const ok = mySeat.col !== 0 && mySeat.col !== totalCols - 1;
    if (ok) satisfied++;
    details.push({ label: 'לא בקצה', ok });
  }

  // Friends nearby (adjacent=✅, dist≤3=⚡, else=❌)
  if (student.friends?.length > 0) {
    for (const fid of student.friends) {
      const friendSeat = getStudentSeat(seats, fid);
      const friendName = students.find(s => s.id === fid)?.name || fid;
      total++;
      if (!friendSeat) { details.push({ label: `ליד ${friendName}`, ok: false }); continue; }
      const d = getDistance(mySeat, friendSeat);
      const ok = d <= 1 ? true : d <= 3 ? null : false; // null = partial
      if (ok === true) satisfied++;
      details.push({ label: `ליד ${friendName}${ok === null ? ' (קרוב)' : ''}`, ok });
    }
  }

  // Avoid conflicts (dist>2=✅, dist=2=⚡, adj=❌)
  if (student.avoid?.length > 0) {
    for (const aid of student.avoid) {
      const avoidSeat = getStudentSeat(seats, aid);
      const avoidName = students.find(s => s.id === aid)?.name || aid;
      total++;
      if (!avoidSeat) { satisfied++; details.push({ label: `לא ליד ${avoidName}`, ok: true }); continue; }
      const d = getDistance(mySeat, avoidSeat);
      const ok = d > 2 ? true : d === 2 ? null : false;
      if (ok === true) satisfied++;
      details.push({ label: `לא ליד ${avoidName}${ok === null ? ' (קרוב)' : ''}`, ok });
    }
  }

  // Separate (far=✅, medium=⚡, close=❌)
  if (student.separate?.length > 0) {
    for (const sid of student.separate) {
      const sepSeat = getStudentSeat(seats, sid);
      const sepName = students.find(s => s.id === sid)?.name || sid;
      total++;
      if (!sepSeat) { satisfied++; details.push({ label: `מרוחק מ-${sepName}`, ok: true }); continue; }
      const d = getDistance(mySeat, sepSeat);
      const ok = d >= 4 ? true : d >= 3 ? null : false;
      if (ok === true) satisfied++;
      details.push({ label: `מרוחק מ-${sepName}${ok === null ? ' (בינוני)' : ''}`, ok });
    }
  }

  // Custom conditions note (can't auto-score, just display)
  if (student.custom_conditions) {
    details.push({ label: `📌 תנאי אישי: ${student.custom_conditions}`, ok: null });
  }

  return { satisfied, total, details };
}

export default function SatisfactionReport({ seats, students }) {
  const seatedStudents = useMemo(() =>
    students.filter(s => s.is_active !== false && getStudentSeat(seats, s.id)),
    [seats, students]
  );

  const reports = useMemo(() =>
    seatedStudents.map(student => {
      const mySeat = getStudentSeat(seats, student.id);
      const { satisfied, total, details } = scoreStudent(student, mySeat, seats, students);
      const pct = total === 0 ? 100 : Math.round((satisfied / total) * 100);
      return { student, satisfied, total, pct, details };
    }).sort((a, b) => a.pct - b.pct),
    [seatedStudents, seats, students]
  );

  const overallDetail = useMemo(() => calcSatisfactionDetailed(seats, students), [seats, students]);
  const overall = overallDetail.pct;

  const color = overall >= 80 ? 'text-green-600' : overall >= 50 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = overall >= 80 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : overall >= 50 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';

  return (
    <div className="space-y-4" dir="rtl">
      {/* Overall score */}
      <div className={`rounded-xl border p-4 text-center ${bgColor}`}>
        <p className="text-xs text-muted-foreground mb-1">ניקוד כולל לסידור</p>
        <p className={`text-4xl font-bold ${color}`}>{overall}<span className="text-lg">%</span></p>
        {overallDetail.total > 0 && (
          <div className="flex items-center justify-center gap-3 mt-2 text-xs">
            <span className="text-green-600 font-medium">✅ {overallDetail.satisfied} מלאים</span>
            <span className="text-amber-500 font-medium">⚡ {overallDetail.partial} חלקיים</span>
            <span className="text-red-500 font-medium">❌ {overallDetail.violated} מופרים</span>
          </div>
        )}
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden flex">
          {overallDetail.total > 0 && <>
            <div className="bg-green-500 h-full transition-all" style={{ width: `${(overallDetail.satisfied / overallDetail.total) * 100}%` }} />
            <div className="bg-amber-400 h-full transition-all" style={{ width: `${(overallDetail.partial / overallDetail.total) * 100}%` }} />
            <div className="bg-red-400 h-full transition-all" style={{ width: `${(overallDetail.violated / overallDetail.total) * 100}%` }} />
          </>}
        </div>
      </div>

      {reports.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-4">אין תלמידים משובצים עם תנאים</p>
      )}

      {/* Per-student breakdown */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {reports.map(({ student, satisfied, total, pct, details }) => (
          <details key={student.id} className="border border-border rounded-lg overflow-hidden">
            <summary className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent/30 select-none">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">{student.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{satisfied}/{total} תנאים</span>
                <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</span>
              </div>
            </summary>
            <div className="px-3 pb-3 pt-1 space-y-1 bg-muted/20">
              {details.length === 0 && <p className="text-xs text-muted-foreground">אין תנאים מוגדרים</p>}
              {details.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {d.ok === true  ? <span className="text-green-500">✅</span>
                  : d.ok === false ? <span className="text-red-500">❌</span>
                  : <span className="text-amber-500">⚡</span>}
                  <span className={d.ok === false ? 'text-red-700 dark:text-red-400' : d.ok === true ? 'text-green-700 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>{d.label}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}