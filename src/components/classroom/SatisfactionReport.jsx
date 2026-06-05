import React, { useMemo } from 'react';
import { getStudentSeat, isAdjacent, getDistance } from '@/lib/seatingUtils';

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

  // Friends nearby
  if (student.friends?.length > 0) {
    for (const fid of student.friends) {
      const friendSeat = getStudentSeat(seats, fid);
      const friendName = students.find(s => s.id === fid)?.name || fid;
      total++;
      const ok = friendSeat && isAdjacent(mySeat, friendSeat);
      if (ok) satisfied++;
      details.push({ label: `ליד ${friendName}`, ok });
    }
  }

  // Avoid conflicts
  if (student.avoid?.length > 0) {
    for (const aid of student.avoid) {
      const avoidSeat = getStudentSeat(seats, aid);
      const avoidName = students.find(s => s.id === aid)?.name || aid;
      total++;
      const ok = !avoidSeat || !isAdjacent(mySeat, avoidSeat);
      if (ok) satisfied++;
      details.push({ label: `לא ליד ${avoidName}`, ok });
    }
  }

  // Separate
  if (student.separate?.length > 0) {
    for (const sid of student.separate) {
      const sepSeat = getStudentSeat(seats, sid);
      const sepName = students.find(s => s.id === sid)?.name || sid;
      total++;
      const ok = !sepSeat || getDistance(mySeat, sepSeat) >= 3;
      if (ok) satisfied++;
      details.push({ label: `מרוחק מ-${sepName}`, ok });
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

  const overall = useMemo(() => {
    const totalConst = reports.reduce((s, r) => s + r.total, 0);
    const totalSat = reports.reduce((s, r) => s + r.satisfied, 0);
    return totalConst === 0 ? 100 : Math.round((totalSat / totalConst) * 100);
  }, [reports]);

  const color = overall >= 80 ? 'text-green-600' : overall >= 50 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = overall >= 80 ? 'bg-green-50 border-green-200' : overall >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-4" dir="rtl">
      {/* Overall score */}
      <div className={`rounded-xl border p-4 text-center ${bgColor}`}>
        <p className="text-xs text-muted-foreground mb-1">ניקוד כולל לסידור</p>
        <p className={`text-4xl font-bold ${color}`}>{overall}<span className="text-lg">%</span></p>
        <p className="text-xs text-muted-foreground mt-1">
          {reports.reduce((s, r) => s + r.satisfied, 0)} מתוך {reports.reduce((s, r) => s + r.total, 0)} תנאים מתקיימים
        </p>
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
                  {d.ok === null ? (
                    <span className="text-amber-500">📌</span>
                  ) : d.ok ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-red-500">✗</span>
                  )}
                  <span className={d.ok === false ? 'text-red-700' : d.ok === true ? 'text-green-700' : 'text-amber-700'}>{d.label}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}