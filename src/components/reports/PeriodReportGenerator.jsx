import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, FileDown, MessageCircle, Mail, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format, subWeeks, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { motion } from 'framer-motion';
import { createPeriodReportWordDoc } from '@/lib/exportWord';

const PERIOD_OPTIONS = [
  { label: 'שבועי', value: 'weekly' },
  { label: 'חודשי', value: 'monthly' },
  { label: 'חצי שנתי — מחצית א׳', value: 'half1' },
  { label: 'חצי שנתי — מחצית ב׳', value: 'half2' },
  { label: 'שנתי', value: 'yearly' },
  { label: 'טווח חופשי', value: 'custom' },
];

const AUDIENCE_OPTIONS = [
  { label: 'הורים', value: 'parents' },
  { label: 'הנהלת בית ספר', value: 'school' },
  { label: 'הורים ובית ספר', value: 'both' },
  { label: 'אחר', value: 'other' },
];

const LEVEL_LABELS = {
  weak: 'חלש', below_average: 'מתקשה', average: 'בינוני',
  above_average: 'מעל ממוצע', strong: 'חזק', excellent: 'מצטיין',
};
const TRAIT_LABELS = {
  attentive: 'מקשיב', cooperative: 'משתף פעולה', fast_learner: 'מבין מהר',
  leader: 'מנהיג', needs_encouragement: 'זקוק למחמאות', disruptive: 'מפריע',
  shy: 'ביישן', needs_teacher_attention: 'זקוק לתשומת לב',
};

function getDateRange(period) {
  const now = new Date();
  switch (period) {
    case 'weekly': return { start: format(subWeeks(now, 1), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
    case 'monthly': return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'half1': return { start: `${now.getFullYear()}-09-01`, end: `${now.getFullYear()}-01-31` };
    case 'half2': return { start: `${now.getFullYear()}-02-01`, end: `${now.getFullYear()}-06-30` };
    case 'yearly': return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') };
    default: return { start: '', end: '' };
  }
}

function buildPeriodReportHTML(data, className, periodLabel, audienceLabel, teacherName, generatedAt) {
  const { summary, highlights, challenges, stats, classAchievements, subjectSummaries, recommendation } = data;
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;direction:rtl;background:#fff;color:#1e293b;font-size:13px}
  .page{width:794px;min-height:1123px;margin:0 auto;padding:48px 52px}
  .header{border-bottom:3px solid #6366f1;padding-bottom:20px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-start}
  .header-title{font-size:22px;font-weight:800;color:#4338ca}
  .header-sub{font-size:11px;color:#64748b;margin-top:4px}
  .logo-box{width:52px;height:52px;background:#ede9fe;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:26px}
  .meta-row{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
  .meta-chip{padding:4px 14px;background:#ede9fe;border-radius:999px;font-size:11px;color:#4338ca;font-weight:700}
  .section{margin-bottom:24px}
  .section-title{font-size:13px;font-weight:800;color:#4338ca;border-right:3px solid #6366f1;padding-right:8px;margin-bottom:12px}
  .summary-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;font-size:12px;line-height:1.8;color:#166534}
  .highlight-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px 18px}
  .challenge-box{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px}
  ul{padding-right:16px}
  ul li{margin-bottom:6px;font-size:12px;line-height:1.6}
  .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
  .stat-box{background:#f8f7ff;border:1px solid #e0e7ff;border-radius:10px;padding:12px 8px;text-align:center}
  .stat-num{font-size:22px;font-weight:800;color:#4338ca}
  .stat-label{font-size:10px;color:#64748b;margin-top:2px}
  .subject-table{width:100%;border-collapse:collapse}
  .subject-table th{background:#ede9fe;padding:7px 10px;text-align:right;font-size:11px;font-weight:700;color:#4338ca}
  .subject-table td{padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700}
  .badge-green{background:#d1fae5;color:#065f46}
  .badge-yellow{background:#fef3c7;color:#92400e}
  .badge-red{background:#fee2e2;color:#991b1b}
  .rec-box{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px 18px;font-size:12px;line-height:1.8;color:#4c1d95}
  .footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:14px;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
  .excellence-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .excellence-card{border:1px solid #e2e8f0;border-radius:10px;padding:12px}
  .excellence-card h4{font-size:11px;font-weight:700;margin-bottom:8px;color:#4338ca}
  .excellence-card ul{padding-right:14px}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="header-title">📊 דוח ${periodLabel}</div>
      <div class="header-sub">כיתה: ${className || 'כיתה'} · מיועד ל: ${audienceLabel}</div>
      <div class="header-sub">הופק: ${generatedAt}${teacherName ? ` · מורה: ${teacherName}` : ''}</div>
    </div>
    <div class="logo-box">🎓</div>
  </div>

  <div class="meta-row">
    <span class="meta-chip">📅 ${periodLabel}</span>
    <span class="meta-chip">👥 ${audienceLabel}</span>
    ${stats.totalStudents ? `<span class="meta-chip">${stats.totalStudents} תלמידים</span>` : ''}
  </div>

  <div class="stats-grid">
    ${[
      { n: stats.avgAttendance ? stats.avgAttendance + '%' : '—', l: 'נוכחות ממוצעת' },
      { n: stats.avgGrade ? stats.avgGrade + '%' : '—', l: 'ממוצע ציונים' },
      { n: stats.topStudentsCount || '—', l: 'מצטיינים' },
      { n: stats.improvingStudentsCount || '—', l: 'משקיעים' },
    ].map(s => `<div class="stat-box"><div class="stat-num">${s.n}</div><div class="stat-label">${s.l}</div></div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">📝 סיכום התקופה</div>
    <div class="summary-box">${summary}</div>
  </div>

  ${subjectSummaries?.length ? `
  <div class="section">
    <div class="section-title">📚 סיכום לפי מקצועות</div>
    <table class="subject-table">
      <thead><tr><th>מקצוע</th><th>נושאים שנלמדו</th><th>הישגים</th><th>הערות</th></tr></thead>
      <tbody>
        ${subjectSummaries.map(s => `<tr>
          <td><b>${s.subject}</b></td>
          <td>${s.topics || '—'}</td>
          <td><span class="badge ${s.score >= 80 ? 'badge-green' : s.score >= 60 ? 'badge-yellow' : 'badge-red'}">${s.score || '—'}%</span></td>
          <td>${s.note || ''}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <div class="excellence-grid">
    <div class="excellence-card">
      <h4>🏆 הישגים מיוחדים</h4>
      <ul>${(highlights || []).map(h => `<li>${h}</li>`).join('') || '<li>לא הוגדרו הישגים</li>'}</ul>
    </div>
    <div class="excellence-card">
      <h4>💪 נקודות לשיפור</h4>
      <ul>${(challenges || []).map(c => `<li>${c}</li>`).join('') || '<li>לא הוגדרו נקודות לשיפור</li>'}</ul>
    </div>
  </div>

  ${classAchievements?.length ? `
  <div class="section" style="margin-top:20px">
    <div class="section-title">🌟 מצטייני הכיתה</div>
    <div class="excellence-card">
      <ul>${classAchievements.map(a => `<li>${a}</li>`).join('')}</ul>
    </div>
  </div>` : ''}

  ${recommendation ? `
  <div class="section">
    <div class="section-title">💡 המלצות להמשך</div>
    <div class="rec-box">${recommendation}</div>
  </div>` : ''}

  <div class="footer">
    <span>ClassManager Pro — דוח אוטומטי</span>
    <span>הופק: ${generatedAt}</span>
  </div>
</div>
</body>
</html>`;
}

export default function PeriodReportGenerator() {
  const [period, setPeriod] = useState('monthly');
  const [audience, setAudience] = useState('parents');
  const [className, setClassName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportHTML, setReportHTML] = useState('');

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 300) });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 300) });
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => base44.entities.Reward.list('-date', 200) });
  const { data: libraryItems = [] } = useQuery({ queryKey: ['library'], queryFn: () => base44.entities.LibraryItem.list('-created_date', 100) });

  const activeStudents = students.filter(s => s.is_active !== false);

  function getRange() {
    if (period === 'custom') return { start: customStart, end: customEnd };
    return getDateRange(period);
  }

  async function generate() {
    const { start, end } = getRange();
    if (!start || !end) { toast.error('בחר טווח תאריכים'); return; }
    setGenerating(true);
    setReportData(null);

    const rangeGrades = grades.filter(g => g.date >= start && g.date <= end);
    const rangeAttendance = attendance.filter(a => a.date >= start && a.date <= end);
    const rangeRewards = rewards.filter(r => r.date >= start && r.date <= end);
    const rangeItems = libraryItems.filter(i => i.created_date?.slice(0, 10) >= start && i.created_date?.slice(0, 10) <= end);

    // Compute basic stats
    const avgGrade = rangeGrades.length
      ? Math.round(rangeGrades.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / rangeGrades.length)
      : null;

    const presentDays = rangeAttendance.filter(a => a.status === 'present').length;
    const totalAttDays = rangeAttendance.length;
    const avgAttendance = totalAttDays ? Math.round((presentDays / totalAttDays) * 100) : null;

    // Top students by reward points
    const rewardByStudent = {};
    rangeRewards.forEach(r => { rewardByStudent[r.student_name] = (rewardByStudent[r.student_name] || 0) + r.points; });
    const topStudents = Object.entries(rewardByStudent).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);

    // Top students by grades
    const gradeByStudent = {};
    rangeGrades.forEach(g => {
      if (!gradeByStudent[g.student_id]) gradeByStudent[g.student_id] = { sum: 0, count: 0 };
      gradeByStudent[g.student_id].sum += (g.score / (g.max_score || 100)) * 100;
      gradeByStudent[g.student_id].count++;
    });
    const topByGrades = Object.entries(gradeByStudent)
      .map(([id, d]) => ({ id, avg: d.sum / d.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
      .map(({ id }) => students.find(s => s.id === id)?.name)
      .filter(Boolean);

    const subjects = [...new Set(rangeGrades.map(g => g.subject))];
    const subjectData = subjects.map(sub => {
      const sg = rangeGrades.filter(g => g.subject === sub);
      const avg = sg.length ? Math.round(sg.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / sg.length) : null;
      return { subject: sub, topics: rangeItems.filter(i => i.category === sub || i.subject === sub).map(i => i.title).slice(0, 3).join(', ') || '—', score: avg };
    });

    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || period;
    const audienceLabel = AUDIENCE_OPTIONS.find(a => a.value === audience)?.label || audience;

    const context = [
      `כיתה: ${className || 'כיתה'}`,
      `תקופה: ${start} עד ${end} (${periodLabel})`,
      `מיועד ל: ${audienceLabel}`,
      `מספר תלמידים: ${activeStudents.length}`,
      avgGrade !== null ? `ממוצע ציונים: ${avgGrade}%` : '',
      avgAttendance !== null ? `נוכחות ממוצעת: ${avgAttendance}%` : '',
      subjects.length ? `מקצועות שנלמדו: ${subjects.join(', ')}` : '',
      rangeItems.length ? `חומרי לימוד: ${rangeItems.map(i => i.title).slice(0, 6).join(', ')}` : '',
      topStudents.length ? `תלמידים מצטיינים לפי נקודות: ${topStudents.join(', ')}` : '',
      topByGrades.length ? `מצטיינים לפי ציונים: ${topByGrades.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `צור דוח ${periodLabel} מקצועי לכיתה עבור: ${audienceLabel}.

נתונים:
${context}

צור דוח שכולל:
1. סיכום תקופה כולל (4-5 משפטים, מותאם ל${audienceLabel})
2. 5-6 הישגים מרכזיים של הכיתה
3. 3-4 נקודות לשיפור
4. מצטייני הכיתה (שמות + מה הצטיינו בהם)
5. המלצות להמשך
6. סיכום קצר לכל מקצוע אם רלוונטי

טון: מקצועי, חם, עדוד. מותאם ל${audienceLabel}.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          highlights: { type: "array", items: { type: "string" } },
          challenges: { type: "array", items: { type: "string" } },
          classAchievements: { type: "array", items: { type: "string" } },
          recommendation: { type: "string" },
          subjectSummaries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subject: { type: "string" },
                topics: { type: "string" },
                score: { type: "number" },
                note: { type: "string" }
              }
            }
          }
        }
      }
    });

    const stats = {
      totalStudents: activeStudents.length,
      avgGrade,
      avgAttendance,
      topStudentsCount: topStudents.length || topByGrades.length,
      improvingStudentsCount: activeStudents.filter(s =>
        s.traits?.includes('attentive') || s.traits?.includes('cooperative') || s.traits?.includes('fast_learner')
      ).length,
    };

    const full = { ...result, stats };
    setReportData({ full, periodLabel, audienceLabel, stats });

    const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm');
    const html = buildPeriodReportHTML(full, className, periodLabel, audienceLabel, teacherName, generatedAt);
    setReportHTML(html);
    toast.success('הדוח נוצר בהצלחה!');
    setGenerating(false);
  }

  function openPrint() {
    const win = window.open('', '_blank');
    win.document.write(reportHTML);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  }

  async function generateWord() {
    if (!reportData) { toast.error('צור דוח לפני ייצוא Word'); return; }
    try {
      await createPeriodReportWordDoc(reportData.full, className, reportData.periodLabel, reportData.audienceLabel, teacherName);
      toast.success('מסמך ה-Word ייוצר בהצלחה!');
    } catch {
      toast.error('שגיאה בייצוא Word');
    }
  }

  async function generateWord() {
    if (!reportData) { toast.error('צור דוח לפני ייצוא Word'); return; }
    try {
      await createPeriodReportWordDoc(reportData.full, className, reportData.periodLabel, reportData.audienceLabel, teacherName);
      toast.success('מסמך ה-Word ייוצר בהצלחה!');
    } catch {
      toast.error('שגיאה בייצוא Word');
    }
  }

  async function sendEmail() {
    if (!emailTo || !emailTo.includes('@')) { toast.error('הכנס כתובת מייל תקינה'); return; }
    setSendingEmail(true);
    const { full, periodLabel, audienceLabel, stats } = reportData;
    const body = `שלום,\n\nמצורף דוח ${periodLabel} לכיתה ${className || ''} עבור ${audienceLabel}.\n\n📊 נתונים עיקריים:\n• נוכחות ממוצעת: ${stats.avgAttendance ?? '—'}%\n• ממוצע ציונים: ${stats.avgGrade ?? '—'}%\n• מצטיינים: ${stats.topStudentsCount || '—'}\n\n📝 סיכום:\n${full.summary}\n\n💡 המלצות:\n${full.recommendation || '—'}\n\nנשלח מ-ClassManager Pro`;
    await base44.integrations.Core.SendEmail({ to: emailTo, subject: `דוח ${reportData.periodLabel} — ${className || 'כיתה'} (${reportData.audienceLabel})`, body });
    setSendingEmail(false);
    toast.success('המייל נשלח!');
    setEmailTo('');
  }

  function whatsApp() {
    if (!reportData) return;
    const { full, periodLabel, stats } = reportData;
    const text = encodeURIComponent(
      `📊 דוח ${periodLabel} — ${className || 'כיתה'}\n\n${full.summary}\n\n✅ נוכחות: ${stats.avgAttendance ?? '—'}%\n📈 ממוצע ציונים: ${stats.avgGrade ?? '—'}%\n\n💡 ${full.recommendation || ''}\n\nנשלח מ-ClassManager Pro`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Settings */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">הגדרות הדוח</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">סוג הדוח</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">מיועד ל</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">מתאריך</Label>
              <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">עד תאריך</Label>
              <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">שם הכיתה</Label>
            <Input placeholder="כיתה ד׳2..." value={className} onChange={e => setClassName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">שם המורה</Label>
            <Input placeholder="שם המורה..." value={teacherName} onChange={e => setTeacherName(e.target.value)} />
          </div>
        </div>

        <Button className="w-full gap-2" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'מייצר דוח...' : '✨ צור דוח'}
        </Button>
      </div>

      {/* Result */}
      {reportData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/70 rounded-2xl overflow-hidden">
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-border/50 bg-primary/5">
            <p className="text-sm font-bold text-primary">📊 {reportData.periodLabel} — {reportData.audienceLabel}</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={generateWord}>
                <FileDown className="w-3 h-3" /> Word
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={openPrint}>
                <Printer className="w-3 h-3" /> PDF
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { v: activeStudents.length, l: 'תלמידים' },
                { v: reportData.stats.avgAttendance ? reportData.stats.avgAttendance + '%' : '—', l: 'נוכחות' },
                { v: reportData.stats.avgGrade ? reportData.stats.avgGrade + '%' : '—', l: 'ממוצע' },
                { v: reportData.stats.topStudentsCount, l: 'מצטיינים' },
              ].map((s, i) => (
                <div key={i} className="bg-accent/30 rounded-lg p-2">
                  <p className="text-lg font-bold text-primary">{s.v}</p>
                  <p className="text-[10px] text-muted-foreground">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">📝 סיכום</p>
              <p className="text-sm leading-relaxed bg-green-50 dark:bg-green-900/10 rounded-xl p-3 text-green-900 dark:text-green-200">{reportData.full.summary}</p>
            </div>

            {/* Highlights */}
            {reportData.full.highlights?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1.5">🏆 הישגים מרכזיים</p>
                <ul className="space-y-1">
                  {reportData.full.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm"><span className="text-yellow-500">★</span>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Class achievements */}
            {reportData.full.classAchievements?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1.5">🌟 מצטייני הכיתה</p>
                <ul className="space-y-1">
                  {reportData.full.classAchievements.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm"><span className="text-primary">✦</span>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Challenges */}
            {reportData.full.challenges?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1.5">💪 נקודות לשיפור</p>
                <ul className="space-y-1">
                  {reportData.full.challenges.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm"><span className="text-orange-500">→</span>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendation */}
            {reportData.full.recommendation && (
              <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-3">
                <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">💡 המלצות להמשך</p>
                <p className="text-sm text-purple-900 dark:text-purple-200 leading-relaxed">{reportData.full.recommendation}</p>
              </div>
            )}

            {/* Share */}
            <div className="pt-2 border-t border-border space-y-2">
              <Button variant="outline"
                className="w-full gap-2 border-green-400 text-green-700 hover:bg-green-50 dark:text-green-400 dark:border-green-700"
                onClick={whatsApp}>
                <MessageCircle className="w-4 h-4" /> שלח בוואטסאפ
              </Button>
              <div className="flex gap-2">
                <Input placeholder="מייל..." value={emailTo} onChange={e => setEmailTo(e.target.value)} type="email" dir="ltr" className="flex-1" />
                <Button variant="outline" className="gap-1.5 shrink-0" onClick={sendEmail} disabled={!emailTo || sendingEmail}>
                  {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} שלח
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}