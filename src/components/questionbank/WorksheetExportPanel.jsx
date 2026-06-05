import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Printer, BookOpen, FileText, ClipboardList, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const TEMPLATES = [
  {
    id: 'exam',
    label: 'מבחן',
    emoji: '📝',
    desc: 'כותרת רשמית, שורות ניקוד, מפתח תשובות',
    accentColor: '#4f46e5',
    bgGradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
  },
  {
    id: 'worksheet',
    label: 'דף עבודה',
    emoji: '📋',
    desc: 'עיצוב ידידותי, מרווח לכתיבה, שורות נקיות',
    accentColor: '#0891b2',
    bgGradient: 'linear-gradient(135deg, #0891b2 0%, #0284c7 100%)',
  },
  {
    id: 'booklet',
    label: 'חוברת לימוד',
    emoji: '📖',
    desc: 'כיסוי מעוצב, מחולקת לפי נושא, מספרי עמודים',
    accentColor: '#059669',
    bgGradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
  },
  {
    id: 'quiz',
    label: 'חידון',
    emoji: '🎯',
    desc: 'עיצוב צבעוני, מספור גדול, מתאים לתחרויות',
    accentColor: '#d97706',
    bgGradient: 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)',
  },
];

// ── HTML builders ─────────────────────────────────────────────────────────────
function buildExamHTML({ title, subtitle, instructions, questions, showAnswers, template, className, date }) {
  const t = TEMPLATES.find(t => t.id === template) || TEMPLATES[0];
  const totalPoints = questions.reduce((s, q) => s + (q.points || 10), 0);
  const isBooklet = template === 'booklet';
  const isQuiz = template === 'quiz';

  // Group by subject for booklet
  const grouped = isBooklet
    ? questions.reduce((acc, q) => {
        const key = q.ws_subject || 'כללי';
        if (!acc[key]) acc[key] = [];
        acc[key].push(q);
        return acc;
      }, {})
    : { all: questions };

  const questionsHTML = isBooklet
    ? Object.entries(grouped).map(([subj, qs]) => `
        <div class="subject-section">
          <div class="subject-header">${subj}</div>
          ${qs.map((q, i) => renderQuestion(q, i + 1, isQuiz)).join('')}
        </div>
      `).join('')
    : questions.map((q, i) => renderQuestion(q, i + 1, isQuiz)).join('');

  function renderQuestion(q, num, quiz) {
    return `
      <div class="question">
        <div class="question-header">
          <div style="display:flex;align-items:flex-start;flex:1;gap:10px">
            <span class="q-number" style="background:${t.accentColor}">${num}</span>
            <span class="q-text">${q.question}</span>
          </div>
          <span class="points-badge">${q.points || 10} נק'</span>
        </div>
        ${q.options?.length ? `
          <ul class="options">
            ${q.options.map((o, j) => `
              <li class="${quiz ? 'quiz-option' : ''}" style="${quiz ? `border-color:${t.accentColor}20` : ''}">
                <span class="option-letter" style="color:${t.accentColor}">${['א','ב','ג','ד'][j]}.</span>${o}
              </li>`).join('')}
          </ul>` : ''}
        ${q.type === 'שאלה פתוחה' ? `<div class="answer-lines"><div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div></div>` : ''}
        ${q.type === 'השלמת משפט' ? `<div class="answer-lines"><div class="answer-line"></div></div>` : ''}
        ${q.type === 'נכון/לא נכון' ? `<div class="truefalse">☐ נכון &nbsp;&nbsp;&nbsp; ☐ לא נכון</div>` : ''}
      </div>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Heebo',Arial,sans-serif;direction:rtl;color:#1a1a2e;background:white}
    .page{max-width:800px;margin:0 auto;padding:32px 40px}

    ${isBooklet ? `
    .cover-page{
      min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
      background:${t.bgGradient}; color:white; text-align:center; page-break-after:always;
      padding:60px 40px;
    }
    .cover-icon{font-size:72px;margin-bottom:24px}
    .cover-title{font-size:36px;font-weight:800;margin-bottom:12px;line-height:1.2}
    .cover-subtitle{font-size:18px;opacity:0.85;margin-bottom:32px}
    .cover-meta{display:flex;gap:32px;background:rgba(255,255,255,0.15);border-radius:16px;padding:20px 32px}
    .cover-meta-item{display:flex;flex-direction:column;gap:4px}
    .cover-meta-label{font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:1px}
    .cover-meta-value{font-size:18px;font-weight:700}
    .subject-section{margin-bottom:32px;page-break-before:auto}
    .subject-header{
      background:${t.bgGradient}; color:white; font-size:16px; font-weight:700;
      padding:10px 20px; border-radius:10px; margin-bottom:16px; page-break-after:avoid;
    }
    ` : ''}

    .header{
      display:flex;align-items:center;justify-content:space-between;
      padding-bottom:14px;margin-bottom:20px;
      border-bottom:4px solid ${t.accentColor};
    }
    .header-title h1{font-size:${isQuiz ? '26px' : '22px'};font-weight:800;color:#1e1b4b}
    .header-title .subtitle{font-size:13px;color:#6b7280;margin-top:3px}
    .header-logo{
      width:52px;height:52px;border-radius:14px;display:flex;align-items:center;
      justify-content:center;font-size:24px;flex-shrink:0;
      background:${t.bgGradient};
    }
    .student-bar{
      display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:18px;
      background:#f8f9fa;border-radius:12px;padding:14px;
    }
    .student-field label{font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px}
    .student-field .field-line{border-bottom:1.5px solid #d1d5db;height:22px}
    .instructions-box{
      background:${t.accentColor}0f;border-right:4px solid ${t.accentColor};
      border-radius:0 10px 10px 0;padding:10px 14px;margin-bottom:22px;
      font-size:13px;color:#1e40af;
    }
    .question{margin-bottom:${isQuiz ? '28px' : '22px'};page-break-inside:avoid}
    .question-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px}
    .q-number{
      display:inline-flex;align-items:center;justify-content:center;
      width:${isQuiz ? '32px' : '26px'};height:${isQuiz ? '32px' : '26px'};
      color:white;border-radius:50%;font-size:${isQuiz ? '14px' : '12px'};font-weight:700;flex-shrink:0;margin-left:10px;
    }
    .q-text{font-size:${isQuiz ? '16px' : '14px'};font-weight:500;flex:1;line-height:1.5}
    .points-badge{font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid #d1d5db;background:#f3f4f6;color:#374151;font-weight:500;flex-shrink:0;white-space:nowrap}
    .options{list-style:none;margin:10px 0 0 36px}
    .options li{
      padding:${isQuiz ? '10px 14px' : '6px 12px'};margin:4px 0;
      border:1px solid #e5e7eb;border-radius:8px;font-size:13px;
      display:flex;gap:8px;align-items:center;
    }
    .quiz-option{font-size:14px!important;font-weight:500}
    .option-letter{font-weight:700;width:18px;flex-shrink:0}
    .answer-lines{margin:10px 0 0 36px}
    .answer-line{border-bottom:1px solid #9ca3af;height:28px;margin-bottom:8px}
    .truefalse{margin:8px 0 0 36px;font-size:13px;font-weight:500}
    .total-bar{margin-top:20px;display:flex;justify-content:flex-start;border-top:1px solid #e5e7eb;padding-top:12px}
    .total-box{background:#1e1b4b;color:white;border-radius:10px;padding:8px 20px;font-size:14px;font-weight:700}
    .answer-key{margin-top:36px;padding-top:20px;border-top:2px dashed #d1d5db;page-break-before:always}
    .answer-key h2{font-size:16px;font-weight:700;color:#059669;margin-bottom:14px}
    .answer-key-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
    .answer-item{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;font-size:12px}
    .answer-item strong{color:#065f46}
    @media print{.page{padding:20px 28px}body{background:white}}
  </style>
</head>
<body>
  ${isBooklet ? `
  <div class="cover-page">
    <div class="cover-icon">📖</div>
    <div class="cover-title">${title}</div>
    ${subtitle ? `<div class="cover-subtitle">${subtitle}</div>` : ''}
    <div class="cover-meta">
      ${className ? `<div class="cover-meta-item"><div class="cover-meta-label">כיתה</div><div class="cover-meta-value">${className}</div></div>` : ''}
      ${date ? `<div class="cover-meta-item"><div class="cover-meta-label">תאריך</div><div class="cover-meta-value">${date}</div></div>` : ''}
      <div class="cover-meta-item"><div class="cover-meta-label">שאלות</div><div class="cover-meta-value">${questions.length}</div></div>
      <div class="cover-meta-item"><div class="cover-meta-label">ניקוד</div><div class="cover-meta-value">${totalPoints}</div></div>
    </div>
  </div>
  ` : ''}

  <div class="page">
    ${!isBooklet ? `
    <div class="header">
      <div class="header-title">
        <h1>${title}</h1>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      </div>
      <div class="header-logo">${t.emoji}</div>
    </div>
    <div class="student-bar">
      <div class="student-field"><label>שם תלמיד</label><div class="field-line"></div></div>
      <div class="student-field"><label>כיתה</label><div class="field-line"></div></div>
      <div class="student-field"><label>תאריך</label><div class="field-line"></div></div>
    </div>` : ''}
    ${instructions ? `<div class="instructions-box">📋 ${instructions}</div>` : ''}
    ${questionsHTML}
    ${!isBooklet ? `<div class="total-bar"><div class="total-box">סה"כ: ${totalPoints} נקודות</div></div>` : ''}
    ${showAnswers ? `
      <div class="answer-key">
        <h2>✅ מפתח תשובות</h2>
        <div class="answer-key-grid">
          ${questions.map((q, i) => `<div class="answer-item"><strong>שאלה ${i + 1}:</strong> ${q.answer || '—'}</div>`).join('')}
        </div>
      </div>` : ''}
  </div>
</body></html>`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorksheetExportPanel({ selectedQuestions, allQuestions, onSelectByFilter }) {
  const [expanded, setExpanded] = useState(true);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [showAnswers, setShowAnswers] = useState(false);
  const [template, setTemplate] = useState('exam');
  const [className, setClassName] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('he-IL'));

  // Quick-add by filter
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');

  const subjects = [...new Set(allQuestions.map(q => q.ws_subject).filter(Boolean))];
  const totalPoints = selectedQuestions.reduce((s, q) => s + (q.points || 10), 0);

  function handleQuickAdd() {
    onSelectByFilter({ subject: filterSubject, difficulty: filterDiff });
    toast.success('שאלות נוספו לפי סינון');
  }

  function handlePrint() {
    if (selectedQuestions.length === 0) { toast.error('בחר שאלות קודם'); return; }
    const html = buildExamHTML({
      title: title || 'דף עבודה',
      subtitle: subtitle || `${selectedQuestions[0]?.ws_subject || ''} | ${selectedQuestions[0]?.ws_grade || ''}`,
      instructions,
      questions: selectedQuestions,
      showAnswers,
      template,
      className,
      date,
    });
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors text-right"
      >
        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-lg shrink-0">
          <Printer className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">הפקת דף עבודה / חוברת</p>
          <p className="text-xs text-muted-foreground">
            {selectedQuestions.length > 0 ? `${selectedQuestions.length} שאלות נבחרו • ${totalPoints} נקודות` : 'בחר שאלות ועיצוב'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedQuestions.length > 0 && (
            <Badge className="bg-primary text-primary-foreground text-[10px]">{selectedQuestions.length}</Badge>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/50">

              {/* Quick filter add */}
              <div className="pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> הוסף שאלות לפי נושא ורמה
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterSubject} onValueChange={setFilterSubject}>
                    <SelectTrigger className="h-8 text-xs flex-1 min-w-[110px]"><SelectValue placeholder="כל המקצועות" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל המקצועות</SelectItem>
                      {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterDiff} onValueChange={setFilterDiff}>
                    <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="כל הרמות" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל הרמות</SelectItem>
                      <SelectItem value="קל">🟢 קל</SelectItem>
                      <SelectItem value="בינוני">🟡 בינוני</SelectItem>
                      <SelectItem value="קשה">🔴 קשה</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleQuickAdd}>
                    + הוסף
                  </Button>
                </div>
              </div>

              {/* Template selector */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">תבנית עיצוב</p>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setTemplate(t.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-right transition-all ${template === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}>
                      <span className="text-2xl">{t.emoji}</span>
                      <div>
                        <p className="text-xs font-bold">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">פרטי הדף</p>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="כותרת (לדוג': מבחן — שברים | כיתה ה')" className="h-8 text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={className} onChange={e => setClassName(e.target.value)}
                    placeholder="כיתה" className="h-8 text-xs" />
                  <Input value={date} onChange={e => setDate(e.target.value)}
                    placeholder="תאריך" className="h-8 text-xs" />
                </div>
                <Input value={instructions} onChange={e => setInstructions(e.target.value)}
                  placeholder="הוראות לתלמיד (אופציונלי)" className="h-8 text-xs" />
              </div>

              {/* Options */}
              <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5">
                <input type="checkbox" id="exp-answers" checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)}
                  className="accent-primary w-4 h-4" />
                <label htmlFor="exp-answers" className="text-xs cursor-pointer flex-1">
                  הוסף מפתח תשובות
                  {template === 'booklet' ? ' (דף נפרד בסוף)' : ' (בתחתית הדף)'}
                </label>
              </div>

              {/* Summary + Print */}
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                <div className="text-xs">
                  <span className="font-bold text-primary">{selectedQuestions.length}</span>
                  <span className="text-muted-foreground"> שאלות • </span>
                  <span className="font-bold text-primary">{totalPoints}</span>
                  <span className="text-muted-foreground"> נקודות</span>
                </div>
                <Button size="sm" onClick={handlePrint} disabled={selectedQuestions.length === 0} className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  {template === 'booklet' ? 'הפק חוברת' : 'הדפס / PDF'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}