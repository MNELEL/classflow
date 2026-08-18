// Shared exam/worksheet HTML builder — used by both WorksheetExportPanel and ExamBuilderPage
import { escapeHtml } from '@/lib/htmlEscape';

export const TEMPLATE_KEY = 'exam_template_v1';

export const TEMPLATES = [
  { id: 'exam', label: 'מבחן', emoji: '📝', desc: 'כותרת רשמית, שורות ניקוד, מפתח תשובות', accentColor: '#4f46e5', bgGradient: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)' },
  { id: 'worksheet', label: 'דף עבודה', emoji: '📋', desc: 'עיצוב ידידותי, מרווח לכתיבה', accentColor: '#0891b2', bgGradient: 'linear-gradient(135deg,#0891b2 0%,#0284c7 100%)' },
  { id: 'booklet', label: 'חוברת לימוד', emoji: '📖', desc: 'כיסוי מעוצב, מחולקת לפי נושא', accentColor: '#059669', bgGradient: 'linear-gradient(135deg,#059669 0%,#0d9488 100%)' },
  { id: 'quiz', label: 'חידון', emoji: '🎯', desc: 'עיצוב צבעוני, מתאים לתחרויות', accentColor: '#d97706', bgGradient: 'linear-gradient(135deg,#d97706 0%,#dc2626 100%)' },
];

export const DEFAULT_TEMPLATE = {
  title: '', subtitle: '', instructions: '', showAnswers: false,
  template: 'exam', className: '', date: '',
  schoolName: '', logoUrl: '', columns: 1,
};

export function loadSavedTemplate() {
  try { return { ...DEFAULT_TEMPLATE, ...JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '{}') }; }
  catch { return DEFAULT_TEMPLATE; }
}

export function buildExamHTML({ title, subtitle, instructions, questions, showAnswers, template, className, date, schoolName, logoUrl, columns }) {
  const t = TEMPLATES.find(x => x.id === template) || TEMPLATES[0];
  const totalPoints = questions.reduce((s, q) => s + (q.points || 10), 0);
  const isBooklet = template === 'booklet';
  const twoCol = columns === 2;

  const grouped = isBooklet
    ? questions.reduce((acc, q) => { const k = q.ws_subject || 'כללי'; if (!acc[k]) acc[k] = []; acc[k].push(q); return acc; }, {})
    : { all: questions };

  function esc(v) { return escapeHtml(v); }

  function renderQuestion(q, num) {
    return `
      <div class="question">
        <div class="question-header">
          <div style="display:flex;align-items:flex-start;flex:1;gap:10px">
            <span class="q-number" style="background:${t.accentColor}">${num}</span>
            <span class="q-text">${esc(q.question)}</span>
          </div>
          <span class="points-badge">${q.points || 10} נק'</span>
        </div>
        ${q.options?.length ? `<ul class="options">${q.options.map((o, j) => `<li><span class="option-letter" style="color:${t.accentColor}">${['א','ב','ג','ד'][j]}.</span>${esc(o)}</li>`).join('')}</ul>` : ''}
        ${q.type === 'שאלה פתוחה' ? `<div class="answer-lines"><div class="al"></div><div class="al"></div><div class="al"></div></div>` : ''}
        ${q.type === 'השלמת משפט' ? `<div class="answer-lines"><div class="al"></div></div>` : ''}
        ${q.type === 'נכון/לא נכון' ? `<div class="truefalse">☐ נכון &nbsp;&nbsp;&nbsp; ☐ לא נכון</div>` : ''}
      </div>`;
  }

  const questionsHTML = isBooklet
    ? Object.entries(grouped).map(([subj, qs]) => `<div class="subject-section"><div class="subject-header">${esc(subj)}</div>${qs.map((q, i) => renderQuestion(q, i + 1)).join('')}</div>`).join('')
    : (twoCol
        ? `<div class="two-col">${questions.map((q, i) => renderQuestion(q, i + 1)).join('')}</div>`
        : questions.map((q, i) => renderQuestion(q, i + 1)).join(''));

  const logoHTML = logoUrl
    ? `<img src="${esc(logoUrl)}" style="width:60px;height:60px;object-fit:contain;border-radius:10px" />`
    : `<div class="header-logo" style="background:${t.bgGradient}">${t.emoji}</div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<title>${esc(title || 'מבחן')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Heebo',Arial,sans-serif;direction:rtl;color:#1a1a2e;background:white}
  .page{max-width:820px;margin:0 auto;padding:32px 40px}
  .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;margin-bottom:16px;border-bottom:4px solid ${t.accentColor}}
  .header-logo{width:60px;height:60px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
  .header-info{flex:1;padding:0 14px}
  .school-name{font-size:13px;color:#6b7280;font-weight:600;margin-bottom:2px}
  .header-title{font-size:22px;font-weight:800;color:#1e1b4b}
  .header-subtitle{font-size:13px;color:#6b7280;margin-top:2px}
  .student-bar{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin-bottom:16px;background:#f8f9fa;border-radius:12px;padding:12px 16px}
  .sf label{font-size:10px;color:#9ca3af;font-weight:600;display:block;margin-bottom:3px}
  .sf .fl{border-bottom:1.5px solid #d1d5db;height:22px}
  .instructions-box{background:${t.accentColor}10;border-right:4px solid ${t.accentColor};border-radius:0 10px 10px 0;padding:10px 14px;margin-bottom:20px;font-size:13px;color:#1e40af}
  .question{margin-bottom:20px;page-break-inside:avoid}
  .question-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
  .q-number{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;color:white;border-radius:50%;font-size:12px;font-weight:700;flex-shrink:0;margin-left:10px}
  .q-text{font-size:14px;font-weight:500;flex:1;line-height:1.5}
  .points-badge{font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid #d1d5db;background:#f3f4f6;color:#374151;font-weight:500;flex-shrink:0;white-space:nowrap}
  .options{list-style:none;margin:8px 0 0 36px}
  .options li{padding:6px 12px;margin:3px 0;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;display:flex;gap:8px;align-items:center}
  .option-letter{font-weight:700;width:18px;flex-shrink:0}
  .answer-lines{margin:8px 0 0 36px}
  .al{border-bottom:1px solid #9ca3af;height:26px;margin-bottom:7px}
  .truefalse{margin:8px 0 0 36px;font-size:13px;font-weight:500}
  .two-col{columns:2;column-gap:24px}
  .two-col .question{break-inside:avoid}
  .total-bar{margin-top:18px;border-top:1px solid #e5e7eb;padding-top:12px;display:flex;justify-content:flex-start}
  .total-box{background:#1e1b4b;color:white;border-radius:10px;padding:8px 20px;font-size:14px;font-weight:700}
  .answer-key{margin-top:32px;padding-top:18px;border-top:2px dashed #d1d5db;page-break-before:always}
  .answer-key h2{font-size:16px;font-weight:700;color:#059669;margin-bottom:12px}
  .ak-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  .ak-item{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;font-size:12px}
  .ak-item strong{color:#065f46}
  ${isBooklet ? `.subject-section{margin-bottom:28px}.subject-header{background:${t.bgGradient};color:white;font-size:15px;font-weight:700;padding:9px 18px;border-radius:10px;margin-bottom:14px;page-break-after:avoid}` : ''}
  @media print{.page{padding:18px 26px}body{background:white}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    ${logoHTML}
    <div class="header-info">
      ${schoolName ? `<div class="school-name">${esc(schoolName)}</div>` : ''}
      <div class="header-title">${esc(title || 'מבחן')}</div>
      ${subtitle ? `<div class="header-subtitle">${esc(subtitle)}</div>` : ''}
    </div>
    <div style="text-align:left;font-size:12px;color:#6b7280;min-width:80px">
      ${date ? `<div style="font-weight:600">${esc(date)}</div>` : ''}
      ${className ? `<div>כיתה ${esc(className)}</div>` : ''}
      <div style="margin-top:4px;font-weight:700;color:${t.accentColor}">${totalPoints} נק'</div>
    </div>
  </div>
  <div class="student-bar">
    <div class="sf"><label>שם התלמיד</label><div class="fl"></div></div>
    <div class="sf"><label>כיתה</label><div class="fl"></div></div>
    <div class="sf"><label>ציון</label><div class="fl"></div></div>
  </div>
  ${instructions ? `<div class="instructions-box">📋 ${esc(instructions)}</div>` : ''}
  ${questionsHTML}
  <div class="total-bar"><div class="total-box">סה"כ: ${totalPoints} נקודות</div></div>
  ${showAnswers ? `<div class="answer-key"><h2>✅ מפתח תשובות</h2><div class="ak-grid">${questions.map((q, i) => `<div class="ak-item"><strong>שאלה ${i + 1}:</strong> ${esc(q.answer || '—')}</div>`).join('')}</div></div>` : ''}
</div>
</body></html>`;
}