import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDown, MessageCircle, Mail, Loader2, User, TrendingUp, CheckSquare, Star, Sparkles, CalendarCheck, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { createStudentReportWordDoc } from '@/lib/exportWord';

const LEVEL_LABELS = {
  weak: 'חלש', below_average: 'מתקשה', average: 'בינוני',
  above_average: 'מעל ממוצע', strong: 'חזק', excellent: 'מצטיין',
};
const TRAIT_LABELS = {
  attentive: 'מקשיב', cooperative: 'משתף פעולה', struggling: 'מתקשה',
  fast_learner: 'מבין מהר', needs_extra_explanation: 'צריך הסבר נוסף',
  needs_teacher_attention: 'זקוק לתשומת לב', needs_encouragement: 'זקוק למחמאות',
  disruptive: 'מפריע', leader: 'מנהיג', shy: 'ביישן',
};
const STATUS_LABELS = { pending: 'ממתין', in_progress: 'בביצוע', done: 'הושלם' };
const PERIOD_LABELS = { weekly: 'שבועי', monthly: 'חודשי', exam: 'מבחן', quiz: 'בוחן', homework: 'שיעורי בית' };

function buildReportHTML(student, grades, tasks, teacherName, period) {
  const avgBySubject = {};
  grades.forEach(g => {
    if (!avgBySubject[g.subject]) avgBySubject[g.subject] = { sum: 0, count: 0 };
    avgBySubject[g.subject].sum += (g.score / (g.max_score || 100)) * 100;
    avgBySubject[g.subject].count++;
  });

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;

  const levelColor = {
    excellent: '#7c3aed', strong: '#059669', above_average: '#2563eb',
    average: '#d97706', below_average: '#dc2626', weak: '#dc2626',
  }[student.academic_level] || '#6b7280';

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Arial', sans-serif; direction: rtl; background: #fff; color: #1e293b; font-size: 13px; }
  .page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 48px 52px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 28px; }
  .header-title { font-size: 22px; font-weight: 800; color: #4338ca; }
  .header-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
  .logo-box { width: 52px; height: 52px; background: #ede9fe; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
  .student-card { background: #f8f7ff; border: 1px solid #e0e7ff; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; gap: 20px; align-items: flex-start; }
  .student-avatar { width: 52px; height: 52px; background: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: 800; flex-shrink: 0; }
  .student-name { font-size: 18px; font-weight: 800; }
  .student-meta { font-size: 11px; color: #64748b; margin-top: 3px; }
  .level-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; color: white; margin-top: 6px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 800; color: #4338ca; border-right: 3px solid #6366f1; padding-right: 8px; margin-bottom: 12px; }
  .grades-table { width: 100%; border-collapse: collapse; }
  .grades-table th { background: #ede9fe; padding: 7px 10px; text-align: right; font-size: 11px; font-weight: 700; color: #4338ca; }
  .grades-table td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  .grades-table tr:last-child td { border-bottom: none; }
  .score-badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-weight: 700; font-size: 11px; }
  .score-high { background: #d1fae5; color: #065f46; }
  .score-mid { background: #fef3c7; color: #92400e; }
  .score-low { background: #fee2e2; color: #991b1b; }
  .avg-row { background: #f1f5f9; }
  .avg-row td { font-weight: 700; }
  .traits-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
  .trait-chip { padding: 3px 10px; background: #ede9fe; border-radius: 999px; font-size: 11px; color: #4338ca; font-weight: 600; }
  .tasks-list { list-style: none; }
  .tasks-list li { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  .tasks-list li:last-child { border-bottom: none; }
  .status-done { color: #059669; font-weight: 700; font-size: 11px; }
  .status-pending { color: #d97706; font-weight: 700; font-size: 11px; }
  .status-ip { color: #2563eb; font-weight: 700; font-size: 11px; }
  .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; }
  .summary-text { font-size: 12px; line-height: 1.7; color: #166534; }
  .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 14px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
  .no-data { text-align: center; padding: 16px; color: #94a3b8; font-size: 12px; }
  .stat-row { display: flex; gap: 16px; margin-bottom: 16px; }
  .stat-box { flex: 1; background: #f8f7ff; border: 1px solid #e0e7ff; border-radius: 10px; padding: 10px 14px; text-align: center; }
  .stat-num { font-size: 22px; font-weight: 800; color: #4338ca; }
  .stat-label { font-size: 10px; color: #64748b; margin-top: 2px; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="header-title">📋 דוח סיכום תקופתי</div>
      <div class="header-sub">תקופה: ${period} | הופק: ${format(new Date(), 'dd/MM/yyyy', { locale: he })}</div>
      ${teacherName ? `<div class="header-sub">מורה: ${teacherName}</div>` : ''}
    </div>
    <div class="logo-box">🎓</div>
  </div>

  <!-- Student card -->
  <div class="student-card">
    <div class="student-avatar">${student.name.charAt(0)}</div>
    <div style="flex:1">
      <div class="student-name">${student.name}</div>
      <div class="student-meta">
        ${student.group ? `קבוצה: ${student.group} · ` : ''}
        ${student.learning_group ? `קבוצת לימוד: ${student.learning_group}` : ''}
      </div>
      <span class="level-badge" style="background:${levelColor}">${LEVEL_LABELS[student.academic_level] || 'בינוני'}</span>
      ${student.achievements ? `<div style="margin-top:8px;font-size:11px;color:#4338ca;">🏆 ${student.achievements}</div>` : ''}
    </div>
  </div>

  <!-- Stats row -->
  <div class="stat-row">
    <div class="stat-box">
      <div class="stat-num">${grades.length}</div>
      <div class="stat-label">ציונים שנרשמו</div>
    </div>
    <div class="stat-box">
      <div class="stat-num">${grades.length ? Math.round(grades.reduce((s,g)=>(s+(g.score/(g.max_score||100))*100),0)/grades.length) : '—'}${grades.length ? '%' : ''}</div>
      <div class="stat-label">ממוצע כללי</div>
    </div>
    <div class="stat-box">
      <div class="stat-num">${doneTasks}/${totalTasks}</div>
      <div class="stat-label">משימות הושלמו</div>
    </div>
    <div class="stat-box">
      <div class="stat-num">${student.traits?.length || 0}</div>
      <div class="stat-label">תכונות שתועדו</div>
    </div>
  </div>

  <!-- Grades -->
  <div class="section">
    <div class="section-title">📊 ציונים ומבחנים</div>
    ${grades.length === 0 ? '<div class="no-data">לא נרשמו ציונים בתקופה זו</div>' : `
    <table class="grades-table">
      <thead><tr>
        <th>מקצוע</th><th>שם המבחן</th><th>סוג</th><th>תאריך</th><th>ציון</th>
      </tr></thead>
      <tbody>
        ${grades.map(g => {
          const pct = Math.round((g.score / (g.max_score || 100)) * 100);
          const cls = pct >= 80 ? 'score-high' : pct >= 60 ? 'score-mid' : 'score-low';
          return `<tr>
            <td>${g.subject}</td>
            <td>${g.test_name || '—'}</td>
            <td>${PERIOD_LABELS[g.period] || g.period || '—'}</td>
            <td>${g.date ? format(parseISO(g.date), 'dd/MM/yy') : '—'}</td>
            <td><span class="score-badge ${cls}">${g.score}/${g.max_score || 100}</span></td>
          </tr>`;
        }).join('')}
        ${Object.entries(avgBySubject).map(([sub, d]) => {
          const avg = Math.round(d.sum / d.count);
          const cls = avg >= 80 ? 'score-high' : avg >= 60 ? 'score-mid' : 'score-low';
          return `<tr class="avg-row">
            <td colspan="4">ממוצע — ${sub}</td>
            <td><span class="score-badge ${cls}">${avg}%</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`}
  </div>

  <!-- Traits -->
  <div class="section">
    <div class="section-title">🧠 הערכה התנהגותית</div>
    ${(student.traits?.length || 0) === 0
      ? '<div class="no-data">לא תועדו תכונות</div>'
      : `<div class="traits-wrap">${student.traits.map(t => `<span class="trait-chip">${TRAIT_LABELS[t] || t}</span>`).join('')}</div>`
    }
    ${student.notes ? `<div style="margin-top:10px;font-size:12px;color:#475569;border-right:2px solid #c7d2fe;padding-right:8px;">${student.notes}</div>` : ''}
  </div>

  <!-- Tasks -->
  <div class="section">
    <div class="section-title">✅ משימות</div>
    ${tasks.length === 0 ? '<div class="no-data">לא הוקצו משימות</div>' : `
    <ul class="tasks-list">
      ${tasks.slice(0, 12).map(t => `
        <li>
          <span>${t.title}${t.subject ? ` <span style="color:#94a3b8;font-size:10px;">(${t.subject})</span>` : ''}</span>
          <span class="${t.status === 'done' ? 'status-done' : t.status === 'in_progress' ? 'status-ip' : 'status-pending'}">${STATUS_LABELS[t.status] || t.status}</span>
        </li>`).join('')}
    </ul>
    ${tasks.length > 12 ? `<div style="font-size:10px;color:#94a3b8;margin-top:6px;">ועוד ${tasks.length - 12} משימות נוספות...</div>` : ''}`}
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>ClassManager Pro — דוח אוטומטי</span>
    <span>הופק: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
  </div>
</div>
</body>
</html>`;
}

export default function StudentReportGenerator({ students }) {
  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [period, setPeriod] = useState('מחצית א׳');
  const [emailTo, setEmailTo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const student = students.find(s => s.id === selectedStudentId);

  const { data: grades = [] } = useQuery({
    queryKey: ['grades', selectedStudentId],
    queryFn: () => base44.entities.Grade.filter({ student_id: selectedStudentId }),
    enabled: !!selectedStudentId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', selectedStudentId],
    queryFn: () => base44.entities.Task.filter({ student_id: selectedStudentId }),
    enabled: !!selectedStudentId,
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedStudentId],
    queryFn: () => base44.entities.Attendance.filter({ student_id: selectedStudentId }),
    enabled: !!selectedStudentId,
  });
  const [aiSummary, setAiSummary] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  async function handleGenerateAISummary() {
    if (!student) return;
    setGeneratingAI(true);
    try {
      const avgScore = grades.length
        ? Math.round(grades.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / grades.length)
        : null;
      const presentCount = attendance.filter(a => a.status === 'present').length;
      const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;
      const doneTasks = tasks.filter(t => t.status === 'done').length;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מחנך מומחה. כתוב סיכום פדגוגי אישי לדוח התקדמות של תלמיד.

נתוני התלמיד:
שם: ${student.name}
רמה אקדמית: ${LEVEL_LABELS[student.academic_level] || 'בינוני'}
תכונות: ${(student.traits || []).map(t => TRAIT_LABELS[t] || t).join(', ') || 'לא תועדו'}
הישגים: ${student.achievements || '—'}
הערות מורה: ${student.notes || '—'}

נתונים מספריים:
- ציונים: ${grades.length} רשומות${avgScore !== null ? `, ממוצע ${avgScore}%` : ''}
- נוכחות: ${attendanceRate !== null ? `${attendanceRate}% (${presentCount}/${attendance.length})` : 'לא תועדה'}
- משימות: ${doneTasks}/${tasks.length} הושלמו

כתוב סיכום אישי בעברית בלבד (3-4 משפטים) הכולל:
1. התרשמות כללית מהתקדמות התלמיד
2. נקודות חוזק
3. תחומים לשיפור
4. המלצה פדגוגית אחת`,
      });
      setAiSummary(res);
      toast.success('סיכום AI הופק!');
    } catch {
      toast.error('שגיאה ביצירת סיכום AI');
    } finally {
      setGeneratingAI(false);
    }
  }

  function openPrintWindow() {
    if (!student) return;
    const html = buildReportHTML(student, grades, tasks, teacherName, period);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    return win;
  }

  async function handleDownloadPDF() {
    if (!student) { toast.error('בחר תלמיד'); return; }
    setIsGenerating(true);
    const win = openPrintWindow();
    setTimeout(() => {
      win.focus();
      win.print();
      setIsGenerating(false);
      toast.success('הדוח נפתח להדפסה / שמירה כ-PDF');
    }, 600);
  }

  async function handleDownloadWord() {
    if (!student) { toast.error('בחר תלמיד'); return; }
    setIsGenerating(true);
    try {
      await createStudentReportWordDoc(student, grades, tasks, teacherName, period);
      toast.success('מסמך ה-Word ייוצר בהצלחה!');
    } catch {
      toast.error('שגיאה בייצוא Word');
    }
    setIsGenerating(false);
  }

  function handleWhatsApp() {
    if (!student) { toast.error('בחר תלמיד'); return; }
    const text = encodeURIComponent(
      `שלום 👋\n\nמצורף דוח סיכום תקופתי עבור ${student.name} לתקופת ${period}.\n\n📊 ציונים: ${grades.length} רשומות\n✅ משימות: ${tasks.filter(t => t.status === 'done').length}/${tasks.length} הושלמו\n🎓 רמה: ${LEVEL_LABELS[student.academic_level] || '—'}\n\nנשלח מ-ClassManager Pro`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  async function handleSendEmail() {
    if (!student) { toast.error('בחר תלמיד'); return; }
    if (!emailTo || !emailTo.includes('@')) { toast.error('הכנס כתובת מייל תקינה'); return; }
    setIsSendingEmail(true);
    const avgScore = grades.length
      ? Math.round(grades.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / grades.length)
      : null;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const body = `שלום,\n\nלהלן דוח סיכום תקופתי עבור ${student.name} לתקופת ${period}:\n\n📊 ציונים: ${grades.length} רשומות${avgScore !== null ? `, ממוצע ${avgScore}%` : ''}\n✅ משימות: ${doneTasks}/${tasks.length} הושלמו\n🎓 רמה אקדמית: ${LEVEL_LABELS[student.academic_level] || '—'}\n${student.traits?.length ? `🏷️ תכונות: ${student.traits.map(t => TRAIT_LABELS[t] || t).join(', ')}\n` : ''}${student.notes ? `📝 הערות: ${student.notes}\n` : ''}\nלפרטים מלאים, ניתן לפנות ל${teacherName || 'המורה'}.\n\nבברכה,\nClassManager Pro`;

    await base44.integrations.Core.SendEmail({
      to: emailTo,
      subject: `דוח תקופתי — ${student.name} (${period})`,
      body,
    });
    setIsSendingEmail(false);
    toast.success('המייל נשלח בהצלחה!');
    setEmailTo('');
  }

  const PERIODS = ['מחצית א׳', 'מחצית ב׳', 'רבעון 1', 'רבעון 2', 'רבעון 3', 'רבעון 4', 'שנתי'];

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 shadow-sm">
        <FileDown className="w-4 h-4" /> הפק דוח תלמיד
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-primary" /> הפקת דוח סיכום תקופתי
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Student selector */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">בחר תלמיד</Label>
              <MobileSelect value={selectedStudentId} onValueChange={setSelectedStudentId} placeholder="בחר תלמיד...">
                {students.filter(s => s.is_active !== false).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </MobileSelect>
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">תקופה</Label>
                <MobileSelect value={period} onValueChange={setPeriod}>
                  {PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </MobileSelect>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">שם המורה (אופציונלי)</Label>
                <Input value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="שם המורה..." />
              </div>
            </div>

            {/* Preview summary */}
            {student && (
              <div className="bg-accent/30 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 font-semibold">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {student.name.charAt(0)}
                  </div>
                  {student.name}
                  <Badge variant="outline" className="text-xs mr-auto">{LEVEL_LABELS[student.academic_level] || '—'}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-card rounded-lg p-2 border border-border/60">
                    <TrendingUp className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                    <p className="text-lg font-bold">{grades.length}</p>
                    <p className="text-[10px] text-muted-foreground">ציונים</p>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/60">
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
                    <p className="text-lg font-bold">{attendance.length ? `${Math.round(attendance.filter(a=>a.status==='present').length/attendance.length*100)}%` : '—'}</p>
                    <p className="text-[10px] text-muted-foreground">נוכחות</p>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/60">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-0.5" />
                    <p className="text-lg font-bold">{tasks.filter(t=>t.status==='done').length}/{tasks.length}</p>
                    <p className="text-[10px] text-muted-foreground">משימות</p>
                  </div>
                  <div className="bg-card rounded-lg p-2 border border-border/60">
                    <Star className="w-3.5 h-3.5 text-yellow-500 mx-auto mb-0.5" />
                    <p className="text-lg font-bold">{student.traits?.length || 0}</p>
                    <p className="text-[10px] text-muted-foreground">תכונות</p>
                  </div>
                </div>

                {/* Teacher notes */}
                {student.notes && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary">הערות מורה</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{student.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* AI Summary generator */}
            {student && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400"
                  onClick={handleGenerateAISummary}
                  disabled={generatingAI}
                >
                  {generatingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generatingAI ? 'מייצר סיכום AI...' : 'צור סיכום פדגוגי עם AI'}
                </Button>
                {aiSummary && (
                  <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-xs font-bold text-violet-700 dark:text-violet-300">סיכום פדגוגי</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                  </div>
                )}
              </div>
            )}

            {/* Word Download */}
            <Button
              className="w-full gap-2"
              onClick={handleDownloadWord}
              disabled={!student || isGenerating}
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              הפק Word מעוצב
            </Button>

            {/* PDF Download */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDownloadPDF}
              disabled={!student || isGenerating}
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              הפק PDF מעוצב
            </Button>

            {/* WhatsApp */}
            <Button
              variant="outline"
              className="w-full gap-2 border-green-400 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 dark:text-green-400 dark:border-green-700"
              onClick={handleWhatsApp}
              disabled={!student}
            >
              <MessageCircle className="w-4 h-4" />
              שלח סיכום בוואטסאפ
            </Button>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold block">שלח במייל</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="כתובת מייל..."
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  type="email"
                  className="flex-1"
                  dir="ltr"
                />
                <Button
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  onClick={handleSendEmail}
                  disabled={!student || isSendingEmail || !emailTo}
                >
                  {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  שלח
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}