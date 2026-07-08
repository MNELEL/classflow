import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, UserX, ChevronDown, ChevronUp, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

const ABSENCE_THRESHOLD = 3;

const ABSENCE_REASONS = [
  'מחלה',
  'אירוע משפחתי',
  'קשיים חברתיים',
  'חוסר מוטיבציה',
  'בעיות בית',
  'ליווי הורי',
  'סיבה לא ידועה',
  'אחר',
];

export default function AbsenceAlert({ students }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => base44.entities.Attendance.list(),
  });

  const [expandedStudent, setExpandedStudent] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [saved, setSaved] = useState({});

  const since = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const recentAbsences = attendance.filter(a => a.status === 'absent' && a.date >= since);

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  const absenceCounts = {};
  recentAbsences.forEach(a => {
    if (studentMap[a.student_id]) {
      absenceCounts[a.student_id] = (absenceCounts[a.student_id] || 0) + 1;
    }
  });

  const atRisk = Object.entries(absenceCounts)
    .filter(([, count]) => count >= ABSENCE_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .map(([id, count]) => ({ student: studentMap[id], count }))
    .filter(x => x.student);

  if (atRisk.length === 0) return null;

  const handleExpand = (studentId) => {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
    } else {
      setExpandedStudent(studentId);
      setNoteText('');
      setSelectedReason('');
    }
  };

  const handleSaveNote = (studentId) => {
    // Save note to localStorage keyed by student
    const key = `cm_absence_note_${studentId}`;
    const note = { reason: selectedReason, text: noteText, date: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(note));
    setSaved(prev => ({ ...prev, [studentId]: true }));
    setTimeout(() => {
      setExpandedStudent(null);
      setSaved(prev => ({ ...prev, [studentId]: false }));
    }, 1200);
  };

  return (
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-sm text-red-800 dark:text-red-300">התראת חיסורים</p>
          <p className="text-xs text-red-600 dark:text-red-400">{atRisk.length} תלמידים עם {ABSENCE_THRESHOLD}+ חיסורים ב-30 הימים האחרונים</p>
        </div>
      </div>

      <div className="space-y-2">
        {atRisk.slice(0, 6).map(({ student, count }) => {
          const isExpanded = expandedStudent === student.id;
          const isSaved = saved[student.id];
          const savedNote = (() => { try { return JSON.parse(localStorage.getItem(`cm_absence_note_${student.id}`) || 'null'); } catch { return null; } })();

          return (
            <div key={student.id} className="rounded-lg overflow-hidden border border-red-100 dark:border-red-800/50">
              {/* Row */}
              <button
                className="w-full flex items-center justify-between bg-red-100/50 dark:bg-red-900/20 px-3 py-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-right"
                onClick={() => handleExpand(student.id)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center text-red-700 dark:text-red-300 text-xs font-bold">
                    {student.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-red-800 dark:text-red-300">{student.name}</span>
                  {savedNote && (
                    <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">יש הערה</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-red-700 dark:text-red-400 bg-red-200 dark:bg-red-800/50 px-2 py-0.5 rounded-full">
                    {count} חיסורים
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-red-600" /> : <ChevronDown className="w-3.5 h-3.5 text-red-600" />}
                </div>
              </button>

              {/* Expanded panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white dark:bg-card px-3 py-3 space-y-3">
                      {/* Reason chips */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">סיבת החיסורים:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ABSENCE_REASONS.map(r => (
                            <button
                              key={r}
                              onClick={() => setSelectedReason(r)}
                              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${selectedReason === r ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Note textarea */}
                      <textarea
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                        rows={2}
                        placeholder="הוסף הערה על מצב התלמיד, מה גורם לחיסורים ואיך לסייע..."
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                      />

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => handleSaveNote(student.id)}
                          disabled={!noteText.trim() && !selectedReason}
                        >
                          {isSaved ? <><CheckCircle className="w-3.5 h-3.5 ml-1" /> נשמר!</> : 'שמור הערה'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => navigate(`/students?id=${student.id}`)}
                        >
                          דף תלמיד
                        </Button>
                      </div>

                      {savedNote && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-2">
                          <span className="font-medium">הערה קיימת: </span>
                          {savedNote.reason && <span className="text-primary">{savedNote.reason} — </span>}
                          {savedNote.text}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {atRisk.length > 6 && (
          <p className="text-xs text-red-500 text-center">ועוד {atRisk.length - 6} תלמידים...</p>
        )}
      </div>
    </div>
  );
}