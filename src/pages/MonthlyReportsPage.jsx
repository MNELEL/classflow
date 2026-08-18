import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, FileText, Printer, AlertCircle } from 'lucide-react';
import SubjectSelect from '@/components/ui/SubjectSelect';

const MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

export default function MonthlyReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [classId, setClassId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [subjectFilter, setSubjectFilter] = useState('all');

  const { data: classrooms = [], isLoading } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.entities.Classroom.list(),
    enabled: isAdmin,
  });
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students-report'],
    queryFn: () => base44.entities.Student.list(),
    enabled: isAdmin && !!classId,
  });
  const { data: allGrades = [] } = useQuery({
    queryKey: ['grades-report'],
    queryFn: () => base44.entities.Grade.list('-date', 500),
    enabled: isAdmin && !!classId,
  });
  const { data: allFeedback = [] } = useQuery({
    queryKey: ['feedback-report'],
    queryFn: () => base44.entities.FastFeedback.list('-date', 500),
    enabled: isAdmin && !!classId,
  });
  const subjects = useMemo(() => [...new Set(allGrades.map(g => g.subject).filter(Boolean))].sort(), [allGrades]);

  const activeClassrooms = classrooms.filter(c => c.is_active !== false);
  const selectedClass = classrooms.find(c => c.id === classId);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    const ids = selectedClass.student_ids || [];
    return allStudents.filter(s => ids.includes(s.id));
  }, [selectedClass, allStudents]);

  const reportRows = useMemo(() => {
    if (!selectedClass) return [];
    return classStudents.map(student => {
      const grades = allGrades.filter(g => g.student_id === student.id && (g.date || '').startsWith(month) && (subjectFilter === 'all' || g.subject === subjectFilter));
      const avg = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length) : null;
      const notes = allFeedback.filter(f => f.student_id === student.id && (f.date || '').startsWith(month));
      return { student, grades, avg, notes };
    });
  }, [selectedClass, classStudents, allGrades, allFeedback, month, subjectFilter]);

  const monthLabel = useMemo(() => {
    if (!month) return '';
    const [y, m] = month.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }, [month]);

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-5 max-w-4xl mx-auto" dir="rtl">
          <div className="flex flex-col items-center py-20 gap-4">
            <p className="text-xl font-bold">אין הרשאה</p>
            <Button onClick={() => navigate('/')}>חזור לדף הבית</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const canPreview = classId && month;

  return (
    <AppLayout>
      <div className="p-4 max-w-5xl mx-auto pb-8" dir="rtl">
        <div className="print:hidden mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin-overview')} className="mb-2 gap-1">
            <ArrowRight className="w-4 h-4" /> חזרה לדשבורד
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> הפקת תעודות חודשיות
          </h1>
          <p className="text-muted-foreground text-sm">ריכוז ציונים והערות לכיתה, עם מסך אישור לפני הפקה</p>
        </div>

        <Card className="print:hidden border-border/60 mb-4">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">כיתה</label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="">בחר כיתה…</option>
                {activeClassrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.grade_level ? ` — שכבה ${c.grade_level}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">חודש</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">מקצוע</label>
              <SubjectSelect value={subjectFilter} onChange={setSubjectFilter} subjects={subjects} className="w-full" />
            </div>
          </CardContent>
        </Card>

        {!canPreview && (
          <p className="print:hidden text-sm text-muted-foreground text-center py-10">בחר כיתה וחודש כדי להציג את הריכוז</p>
        )}

        {canPreview && isLoading && (
          <div className="print:hidden flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {canPreview && !isLoading && (
          <>
            <div className="print:hidden">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-lg font-bold">{selectedClass?.name} — {monthLabel}</h2>
                <Badge variant="outline">{reportRows.length} תלמידים</Badge>
              </div>
              {reportRows.length > 0 && (() => {
                const totalGrades = reportRows.reduce((s, r) => s + r.grades.length, 0);
                const totalNotes = reportRows.reduce((s, r) => s + r.notes.length, 0);
                const withGrades = reportRows.filter(r => r.avg !== null).length;
                const avgs = reportRows.map(r => r.avg).filter(a => a !== null);
                const classAvg = avgs.length ? Math.round(avgs.reduce((s, a) => s + a, 0) / avgs.length) : null;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold">{totalGrades}</p>
                      <p className="text-[10px] text-muted-foreground">ציונים בחודש</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold">{totalNotes}</p>
                      <p className="text-[10px] text-muted-foreground">הערות מורים</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold">{withGrades}</p>
                      <p className="text-[10px] text-muted-foreground">תלמידים עם ציונים</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold">{classAvg ?? '—'}</p>
                      <p className="text-[10px] text-muted-foreground">ממוצע כיתתי</p>
                    </div>
                  </div>
                );
              })()}

              {reportRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">אין תלמידים בכיתה זו</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {reportRows.map((row, i) => (
                    <Card key={row.student.id} className="border-border/60">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{i + 1}. {row.student.name}</p>
                          {row.avg !== null ? (
                            <Badge variant="default">ממוצע: {row.avg}</Badge>
                          ) : (
                            <Badge variant="secondary">אין ציונים</Badge>
                          )}
                        </div>
                        {row.grades.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {row.grades.map((g, idx) => (
                              <span key={idx} className="text-xs px-2 py-0.5 rounded bg-muted/40">
                                {g.subject}: {g.score}{g.test_name ? ` (${g.test_name})` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        {row.notes.length > 0 && (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {row.notes.map((n, idx) => (
                              <p key={idx}>{n.emoji} {n.message}{n.subject ? ` — ${n.subject}` : ''}</p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">מסך אישור</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    לפני הפקה סופית, ודא שהציונים וההערות נכונים. לחיצה על "אישור והפקה" תפתח את חלון ההדפסה — משם ניתן לשמור כ-PDF.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => setTimeout(() => window.print(), 150)}
                      disabled={reportRows.length === 0}
                      className="gap-1"
                    >
                      <Printer className="w-4 h-4" /> אישור והפקת דוח
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/admin-overview')}>ביטול</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Printable A4 report */}
            <div className="hidden print:block print-a4" dir="rtl">
              <div className="text-center mb-4">
                <h1 className="text-xl font-bold">תעודה חודשית — {monthLabel}</h1>
                <p className="text-sm">{selectedClass?.school || ''} {selectedClass?.school ? '|' : ''} כיתה {selectedClass?.name}</p>
                <p className="text-xs text-muted-foreground">תאריך הפקה: {new Date().toLocaleDateString('he-IL')}</p>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-right p-1">#</th>
                    <th className="text-right p-1">תלמיד</th>
                    <th className="text-right p-1">ציונים</th>
                    <th className="text-center p-1">ממוצע</th>
                    <th className="text-right p-1">הערות מורים</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, i) => (
                    <tr key={row.student.id} className="border-b border-gray-400 align-top">
                      <td className="p-1">{i + 1}</td>
                      <td className="p-1 font-semibold">{row.student.name}</td>
                      <td className="p-1">
                        {row.grades.length === 0
                          ? '—'
                          : row.grades.map((g, idx) => (
                              <span key={idx}>{g.subject}: {g.score}{idx < row.grades.length - 1 ? ', ' : ''}</span>
                            ))}
                      </td>
                      <td className="p-1 text-center">{row.avg ?? '—'}</td>
                      <td className="p-1">
                        {row.notes.length === 0
                          ? '—'
                          : row.notes.map((n, idx) => (
                              <span key={idx}>{n.message}{n.subject ? ` (${n.subject})` : ''}{idx < row.notes.length - 1 ? '; ' : ''}</span>
                            ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-muted-foreground mt-4 text-center">הופק על ידי מערכת Class-Flow</p>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}