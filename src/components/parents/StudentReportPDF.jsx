import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, GraduationCap, CalendarCheck, Star, TrendingUp } from 'lucide-react';

function generatePDFHtml(student, grades, attendance, rewards) {
  const totalPoints = rewards.reduce((s, r) => s + (r.points || 0), 0);
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;
  const avgGrade = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length) : null;

  const gradeRows = grades.slice(0, 15).map(g => `
    <tr>
      <td>${g.test_name || '—'}</td>
      <td>${g.subject || '—'}</td>
      <td>${g.date || '—'}</td>
      <td style="font-weight:bold;color:${g.score >= 80 ? '#166534' : g.score >= 60 ? '#92400e' : '#991b1b'}">${g.score}</td>
    </tr>`).join('');

  const rewardRows = rewards.slice(0, 10).map(r => `
    <tr>
      <td>${r.reason}</td>
      <td>${r.date || '—'}</td>
      <td style="font-weight:bold;color:${r.points > 0 ? '#166534' : '#991b1b'}">${r.points > 0 ? '+' : ''}${r.points}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"/>
<title>דוח תלמיד – ${student.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700&display=swap');
  body{font-family:'Heebo',Arial,sans-serif;direction:rtl;margin:0;padding:30px;font-size:13px;color:#1e293b;background:#fff}
  .header{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border-radius:12px;padding:24px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
  .header h1{font-size:24px;margin:0;font-weight:700}
  .header p{margin:4px 0;opacity:.85;font-size:13px}
  .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
  .kpi{border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center}
  .kpi .val{font-size:28px;font-weight:800}
  .kpi .lbl{font-size:11px;color:#64748b;margin-top:4px}
  .kpi.blue .val{color:#2563eb} .kpi.green .val{color:#16a34a} .kpi.yellow .val{color:#ca8a04}
  h2{font-size:15px;font-weight:700;border-right:4px solid #6366f1;padding-right:10px;margin:20px 0 10px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#f8fafc;text-align:right;padding:8px 10px;border-bottom:2px solid #e2e8f0;font-weight:600;color:#475569}
  td{padding:7px 10px;border-bottom:1px solid #f1f5f9}
  tr:hover td{background:#fafafa}
  .footer{margin-top:32px;text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:12px}
  @media print{body{padding:15mm 20mm}}
</style></head><body>
<div class="header">
  <div>
    <h1>${student.name}</h1>
    <p>${student.learning_group ? `קבוצה: ${student.learning_group}` : ''}</p>
    <p>הופק: ${new Date().toLocaleDateString('he-IL')}</p>
  </div>
  <div style="font-size:40px">📊</div>
</div>

<div class="kpis">
  <div class="kpi blue"><div class="val">${avgGrade ?? '—'}</div><div class="lbl">ממוצע ציונים</div></div>
  <div class="kpi green"><div class="val">${attendancePct !== null ? attendancePct + '%' : '—'}</div><div class="lbl">נוכחות</div></div>
  <div class="kpi yellow"><div class="val">${totalPoints}</div><div class="lbl">נקודות גיימיפיקציה</div></div>
</div>

${grades.length > 0 ? `
<h2>ציונים</h2>
<table><thead><tr><th>שם מבחן</th><th>מקצוע</th><th>תאריך</th><th>ציון</th></tr></thead>
<tbody>${gradeRows}</tbody></table>` : ''}

${rewards.length > 0 ? `
<h2>פרסים ונקודות</h2>
<table><thead><tr><th>סיבה</th><th>תאריך</th><th>נקודות</th></tr></thead>
<tbody>${rewardRows}</tbody></table>` : ''}

<div class="footer">דוח זה הופק מתוך ClassManager Pro • ${new Date().toLocaleDateString('he-IL')}</div>
</body></html>`;
}

export default function StudentReportPDF({ student, grades, attendance, rewards }) {
  function handleExport() {
    const html = generatePDFHtml(student, grades, attendance, rewards);
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  const totalPoints = rewards.reduce((s, r) => s + (r.points || 0), 0);
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : null;
  const avgGrade = grades.length ? Math.round(grades.reduce((s, g) => s + (g.score || 0), 0) / grades.length) : null;

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-primary" />
          דוח אישי
        </p>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs h-8">
          <FileDown className="w-3.5 h-3.5" />
          ייצא PDF
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { icon: GraduationCap, label: 'ממוצע', value: avgGrade ?? '—', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { icon: CalendarCheck, label: 'נוכחות', value: attendancePct !== null ? `${attendancePct}%` : '—', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { icon: Star, label: 'נקודות', value: totalPoints, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-xl p-3`}>
            <k.icon className={`w-4 h-4 mx-auto mb-1 ${k.color}`} />
            <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        מבוסס על {grades.length} ציונים · {attendance.length} ימי נוכחות · {rewards.length} פרסים
      </p>
    </div>
  );
}