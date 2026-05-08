import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileBarChart2, Printer, TrendingUp, TrendingDown, Minus, User, BookOpen, Loader2, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const PERIOD_LABELS = { weekly: 'שבועי', monthly: 'חודשי', exam: 'מבחן', quiz: 'חידון', homework: 'שיעורי בית' };

export default function GradeReportPanel({ students, grades }) {
  const [mode, setMode] = useState('student'); // 'student' | 'subject'
  const [selectedId, setSelectedId] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const activeStudents = students.filter(s => s.is_active !== false);
  const subjects = useMemo(() => [...new Set(grades.map(g => g.subject).filter(Boolean))].sort(), [grades]);

  const reportData = useMemo(() => {
    if (!selectedId) return null;

    if (mode === 'student') {
      const studentGrades = grades.filter(g => g.student_id === selectedId);
      const bySubject = {};
      studentGrades.forEach(g => {
        if (!bySubject[g.subject]) bySubject[g.subject] = [];
        bySubject[g.subject].push(g);
      });

      const subjectSummaries = Object.entries(bySubject).map(([subject, gs]) => {
        const pcts = gs.map(g => g.max_score ? (g.score / g.max_score) * 100 : g.score);
        const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
        return { subject, grades: gs, avg: Math.round(avg), count: gs.length };
      });

      const allPcts = studentGrades.map(g => g.max_score ? (g.score / g.max_score) * 100 : g.score);
      const overallAvg = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : null;

      return { type: 'student', student: activeStudents.find(s => s.id === selectedId), studentGrades, subjectSummaries, overallAvg };
    } else {
      const subjectGrades = grades.filter(g => g.subject === selectedId);
      const studentMap = Object.fromEntries(activeStudents.map(s => [s.id, s.name]));

      const byStudent = {};
      subjectGrades.forEach(g => {
        if (!byStudent[g.student_id]) byStudent[g.student_id] = [];
        byStudent[g.student_id].push(g);
      });

      const studentSummaries = Object.entries(byStudent).map(([sid, gs]) => {
        const pcts = gs.map(g => g.max_score ? (g.score / g.max_score) * 100 : g.score);
        const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
        return { student_id: sid, name: studentMap[sid] || 'לא ידוע', avg: Math.round(avg), count: gs.length, grades: gs };
      }).sort((a, b) => b.avg - a.avg);

      const allPcts = subjectGrades.map(g => g.max_score ? (g.score / g.max_score) * 100 : g.score);
      const classAvg = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : null;

      return { type: 'subject', subject: selectedId, subjectGrades, studentSummaries, classAvg };
    }
  }, [selectedId, mode, grades, activeStudents]);

  async function generateAISummary() {
    if (!reportData) return;
    setLoadingAI(true);
    setAiSummary('');
    try {
      const ctx = mode === 'student'
        ? `תלמיד: ${reportData.student?.name}, ממוצע כולל: ${reportData.overallAvg}%, נתוני מקצועות: ${JSON.stringify(reportData.subjectSummaries)}`
        : `מקצוע: ${reportData.subject}, ממוצע כיתה: ${reportData.classAvg}%, נתוני תלמידים: ${JSON.stringify(reportData.studentSummaries)}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה יועץ חינוכי מנוסה. כתב סיכום פדגוגי קצר (3-5 משפטים) בעברית על בסיס הנתונים הבאים:
${ctx}

כלול: חוזקות, נקודות לשיפור, והמלצה פרקטית אחת קצרה.`,
      });
      setAiSummary(result);
    } catch {
      toast.error('שגיאה בייצור הסיכום');
    }
    setLoadingAI(false);
  }

  function printReport() {
    window.print();
  }

  const avgColor = (avg) => avg >= 80 ? 'text-emerald-600' : avg >= 60 ? 'text-yellow-600' : 'text-red-500';
  const avgBg = (avg) => avg >= 80 ? 'bg-emerald-500' : avg >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-4" dir="rtl">
      {/* Controls */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileBarChart2 className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">הפקת דוח ציונים</h2>
        </div>
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant={mode === 'student' ? 'default' : 'outline'}
            onClick={() => { setMode('student'); setSelectedId(''); setAiSummary(''); }}
            className="flex-1 gap-1.5"
          >
            <User className="w-3.5 h-3.5" /> לפי תלמיד
          </Button>
          <Button
            size="sm"
            variant={mode === 'subject' ? 'default' : 'outline'}
            onClick={() => { setMode('subject'); setSelectedId(''); setAiSummary(''); }}
            className="flex-1 gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" /> לפי מקצוע
          </Button>
        </div>

        <Select value={selectedId} onValueChange={v => { setSelectedId(v); setAiSummary(''); }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={mode === 'student' ? 'בחר תלמיד...' : 'בחר מקצוע...'} />
          </SelectTrigger>
          <SelectContent>
            {mode === 'student'
              ? activeStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
              : subjects.map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)
            }
          </SelectContent>
        </Select>
      </div>

      {/* Report content */}
      {reportData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* Summary card */}
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-base">
                    {mode === 'student' ? reportData.student?.name : `מקצוע: ${reportData.subject}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {mode === 'student' ? `${reportData.studentGrades.length} ציונים` : `${reportData.subjectGrades.length} ציונים, ${reportData.studentSummaries.length} תלמידים`}
                  </p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${avgColor(mode === 'student' ? reportData.overallAvg : reportData.classAvg)}`}>
                    {mode === 'student' ? reportData.overallAvg : reportData.classAvg}
                    <span className="text-lg">%</span>
                  </p>
                  <p className="text-xs text-muted-foreground">ממוצע</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={generateAISummary} disabled={loadingAI} className="gap-1.5 flex-1">
                  {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  סיכום AI
                </Button>
                <Button size="sm" variant="outline" onClick={printReport} className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> הדפס
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Summary */}
          {aiSummary && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-foreground leading-relaxed">
              <div className="flex items-center gap-1.5 mb-2 text-primary font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5" /> סיכום פדגוגי AI
              </div>
              {aiSummary}
            </motion.div>
          )}

          {/* Chart */}
          {mode === 'student' && reportData.subjectSummaries.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground">ממוצע לפי מקצוע</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={reportData.subjectSummaries} margin={{ top: 0, right: 5, left: -20, bottom: 5 }}>
                    <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip formatter={v => [`${v}%`, 'ממוצע']} />
                    <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                      {reportData.subjectSummaries.map((d, i) => (
                        <Cell key={i} fill={d.avg >= 80 ? '#10b981' : d.avg >= 60 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {mode === 'subject' && reportData.studentSummaries.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs text-muted-foreground">ביצועי תלמידים — {reportData.subject}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ResponsiveContainer width="100%" height={Math.max(160, reportData.studentSummaries.length * 28)}>
                  <BarChart data={reportData.studentSummaries} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip formatter={v => [`${v}%`, 'ממוצע']} />
                    <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                      {reportData.studentSummaries.map((d, i) => (
                        <Cell key={i} fill={d.avg >= 80 ? '#10b981' : d.avg >= 60 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detailed list */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground">פירוט ציונים</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {(mode === 'student' ? reportData.subjectSummaries : reportData.studentSummaries).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{mode === 'student' ? item.subject : item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.count} ציונים</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-muted rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${avgBg(item.avg)}`} style={{ width: `${item.avg}%` }} />
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${avgColor(item.avg)}`}>{item.avg}%</span>
                  </div>
                </div>
              ))}
              {(mode === 'student' ? reportData.subjectSummaries : reportData.studentSummaries).length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">אין ציונים להצגה</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!selectedId && (
        <div className="text-center py-12 text-muted-foreground">
          <FileBarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">בחר {mode === 'student' ? 'תלמיד' : 'מקצוע'} כדי להציג דוח</p>
        </div>
      )}
    </div>
  );
}