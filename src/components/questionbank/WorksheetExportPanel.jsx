import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Printer, ChevronDown, ChevronRight, Sparkles, Image, Save, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { loadBranding } from '@/lib/branding';

const TEMPLATE_KEY = 'exam_template_v1';

const TEMPLATES = [
  { id: 'exam', label: 'מבחן', emoji: '📝', desc: 'כותרת רשמית, שורות ניקוד, מפתח תשובות', accentColor: '#4f46e5', bgGradient: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)' },
  { id: 'worksheet', label: 'דף עבודה', emoji: '📋', desc: 'עיצוב ידידותי, מרווח לכתיבה', accentColor: '#0891b2', bgGradient: 'linear-gradient(135deg,#0891b2 0%,#0284c7 100%)' },
  { id: 'booklet', label: 'חוברת לימוד', emoji: '📖', desc: 'כיסוי מעוצב, מחולקת לפי נושא', accentColor: '#059669', bgGradient: 'linear-gradient(135deg,#059669 0%,#0d9488 100%)' },
  { id: 'quiz', label: 'חידון', emoji: '🎯', desc: 'עיצוב צבעוני, מתאים לתחרויות', accentColor: '#d97706', bgGradient: 'linear-gradient(135deg,#d97706 0%,#dc2626 100%)' },
];

const DEFAULT_TEMPLATE = {
  title: '', subtitle: '', instructions: '', showAnswers: false,
  template: 'exam', className: '', date: '',
  schoolName: '', logoUrl: '', columns: 1,
};

function loadSavedTemplate() {
  try { return { ...DEFAULT_TEMPLATE, ...JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '{}') }; }
  catch { return DEFAULT_TEMPLATE; }
}

// ── HTML builder ───────────────────────────────────────────────────────────────
function buildExamHTML({ title, subtitle, instructions, questions, showAnswers, template, className, date, schoolName, logoUrl, columns }) {
  const t = TEMPLATES.find(x => x.id === template) || TEMPLATES[0];
  const totalPoints = questions.reduce((s, q) => s + (q.points || 10), 0);
  const isBooklet = template === 'booklet';
  const isQuiz = template === 'quiz';
  const twoCol = columns === 2;

  const grouped = isBooklet
    ? questions.reduce((acc, q) => { const k = q.ws_subject || 'כללי'; if (!acc[k]) acc[k] = []; acc[k].push(q); return acc; }, {})
    : { all: questions };

  function renderQuestion(q, num) {
    return `
      <div class="question">
        <div class="question-header">
          <div style="display:flex;align-items:flex-start;flex:1;gap:10px">
            <span class="q-number" style="background:${t.accentColor}">${num}</span>
            <span class="q-text">${q.question}</span>
          </div>
          <span class="points-badge">${q.points || 10} נק'</span>
        </div>
        ${q.options?.length ? `<ul class="options">${q.options.map((o, j) => `<li><span class="option-letter" style="color:${t.accentColor}">${['א','ב','ג','ד'][j]}.</span>${o}</li>`).join('')}</ul>` : ''}
        ${q.type === 'שאלה פתוחה' ? `<div class="answer-lines"><div class="al"></div><div class="al"></div><div class="al"></div></div>` : ''}
        ${q.type === 'השלמת משפט' ? `<div class="answer-lines"><div class="al"></div></div>` : ''}
        ${q.type === 'נכון/לא נכון' ? `<div class="truefalse">☐ נכון &nbsp;&nbsp;&nbsp; ☐ לא נכון</div>` : ''}
      </div>`;
  }

  const questionsHTML = isBooklet
    ? Object.entries(grouped).map(([subj, qs]) => `<div class="subject-section"><div class="subject-header">${subj}</div>${qs.map((q, i) => renderQuestion(q, i + 1)).join('')}</div>`).join('')
    : (twoCol
        ? `<div class="two-col">${questions.map((q, i) => renderQuestion(q, i + 1)).join('')}</div>`
        : questions.map((q, i) => renderQuestion(q, i + 1)).join(''));

  const logoHTML = logoUrl
    ? `<img src="${logoUrl}" style="width:60px;height:60px;object-fit:contain;border-radius:10px" />`
    : `<div class="header-logo" style="background:${t.bgGradient}">${t.emoji}</div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<title>${title || 'מבחן'}</title>
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
      ${schoolName ? `<div class="school-name">${schoolName}</div>` : ''}
      <div class="header-title">${title || 'מבחן'}</div>
      ${subtitle ? `<div class="header-subtitle">${subtitle}</div>` : ''}
    </div>
    <div style="text-align:left;font-size:12px;color:#6b7280;min-width:80px">
      ${date ? `<div style="font-weight:600">${date}</div>` : ''}
      ${className ? `<div>כיתה ${className}</div>` : ''}
      <div style="margin-top:4px;font-weight:700;color:${t.accentColor}">${totalPoints} נק'</div>
    </div>
  </div>
  <div class="student-bar">
    <div class="sf"><label>שם התלמיד</label><div class="fl"></div></div>
    <div class="sf"><label>כיתה</label><div class="fl"></div></div>
    <div class="sf"><label>ציון</label><div class="fl"></div></div>
  </div>
  ${instructions ? `<div class="instructions-box">📋 ${instructions}</div>` : ''}
  ${questionsHTML}
  <div class="total-bar"><div class="total-box">סה"כ: ${totalPoints} נקודות</div></div>
  ${showAnswers ? `<div class="answer-key"><h2>✅ מפתח תשובות</h2><div class="ak-grid">${questions.map((q, i) => `<div class="ak-item"><strong>שאלה ${i + 1}:</strong> ${q.answer || '—'}</div>`).join('')}</div></div>` : ''}
</div>
</body></html>`;
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function WorksheetExportPanel({ selectedQuestions, allQuestions, onSelectByFilter }) {
  const [expanded, setExpanded] = useState(true);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const branding = loadBranding();
  const saved = loadSavedTemplate();

  const [title, setTitle] = useState(saved.title);
  const [subtitle, setSubtitle] = useState(saved.subtitle);
  const [instructions, setInstructions] = useState(saved.instructions);
  const [showAnswers, setShowAnswers] = useState(saved.showAnswers);
  const [template, setTemplate] = useState(saved.template);
  const [className, setClassName] = useState(saved.className || branding.class_name || '');
  const [date, setDate] = useState(saved.date || new Date().toLocaleDateString('he-IL'));
  const [schoolName, setSchoolName] = useState(saved.schoolName || branding.school_name || '');
  const [logoUrl, setLogoUrl] = useState(saved.logoUrl || branding.logo_url || '');
  const [columns, setColumns] = useState(saved.columns || 1);

  const subjects = [...new Set(allQuestions.map(q => q.ws_subject).filter(Boolean))];
  const totalPoints = selectedQuestions.reduce((s, q) => s + (q.points || 10), 0);

  function saveTemplate() {
    const data = { title, subtitle, instructions, showAnswers, template, className, date, schoolName, logoUrl, columns };
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(data));
    toast.success('התבנית נשמרה! תשמש בפעם הבאה אוטומטית');
  }

  function resetTemplate() {
    localStorage.removeItem(TEMPLATE_KEY);
    setTitle(''); setSubtitle(''); setInstructions(''); setShowAnswers(false);
    setTemplate('exam'); setColumns(1);
    setClassName(branding.class_name || ''); setDate(new Date().toLocaleDateString('he-IL'));
    setSchoolName(branding.school_name || ''); setLogoUrl(branding.logo_url || '');
    toast.success('התבנית אופסה');
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLogoUrl(file_url);
      toast.success('הלוגו הועלה בהצלחה');
    } catch { toast.error('שגיאה בהעלאת הלוגו'); }
    finally { setUploadingLogo(false); }
  }

  async function handleExamImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `זהו תמונה של מבחן. חלץ ממנה: כותרת, שם כיתה, הוראות, ועיצוב כללי (צבעים, כמות טורים). ענה בעברית.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            class_name: { type: 'string' },
            instructions: { type: 'string' },
            columns: { type: 'number' },
          }
        },
        image_url: file_url,
      });
      if (result.title) setTitle(result.title);
      if (result.class_name) setClassName(result.class_name);
      if (result.instructions) setInstructions(result.instructions);
      if (result.columns === 2) setColumns(2);
      toast.success('התבנית חולצה מהתמונה! ניתן לערוך לפני הדפסה.');
    } catch { toast.error('שגיאה בניתוח התמונה'); }
    finally { setAnalyzingImage(false); }
  }

  function handlePrint() {
    if (selectedQuestions.length === 0) { toast.error('בחר שאלות קודם'); return; }
    const html = buildExamHTML({ title, subtitle, instructions, questions: selectedQuestions, showAnswers, template, className, date, schoolName, logoUrl, columns });
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
        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
          <Printer className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">הפקת מבחן / דף עבודה</p>
          <p className="text-xs text-muted-foreground">
            {selectedQuestions.length > 0 ? `${selectedQuestions.length} שאלות נבחרו • ${totalPoints} נקודות` : 'בחר שאלות ועיצוב'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedQuestions.length > 0 && <Badge className="bg-primary text-primary-foreground text-[10px]">{selectedQuestions.length}</Badge>}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4 border-t border-border/50">

              {/* Quick-add filter */}
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
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => { onSelectByFilter({ subject: filterSubject, difficulty: filterDiff }); toast.success('שאלות נוספו'); }}>
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

              {/* School branding */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Image className="w-3 h-3" /> כותרת מוסד ולוגו
                </p>
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    {logoUrl
                      ? <img src={logoUrl} alt="לוגו" className="w-10 h-10 rounded-xl object-contain border border-border shrink-0" />
                      : <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 text-lg">🏫</div>
                    }
                    <label className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl border border-dashed border-border text-xs text-muted-foreground cursor-pointer hover:bg-accent/30 transition-colors ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      {uploadingLogo ? '⏳ מעלה...' : <><Upload className="w-3 h-3" /> העלה לוגו</>}
                    </label>
                  </div>
                  <Input value={schoolName} onChange={e => setSchoolName(e.target.value)}
                    placeholder="שם המוסד (לדוג': תלמוד תורה...)" className="h-8 text-xs" />
                </div>
              </div>

              {/* Import from exam image */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> יצור תבנית מתמונת מבחן קיים
                </p>
                <label className={`flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-primary/40 text-xs text-primary cursor-pointer hover:bg-primary/5 transition-colors ${analyzingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleExamImageUpload} />
                  {analyzingImage ? '⏳ מנתח תמונה...' : <><Image className="w-3.5 h-3.5" /> העלה תמונת מבחן → חלץ תבנית אוטומטית</>}
                </label>
              </div>

              {/* Metadata fields */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">פרטי המבחן</p>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת (לדוג': מבחן — שברים)" className="h-8 text-xs" />
                <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="כותרת משנה (נושא / יחידה)" className="h-8 text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={className} onChange={e => setClassName(e.target.value)} placeholder="כיתה" className="h-8 text-xs" />
                  <Input value={date} onChange={e => setDate(e.target.value)} placeholder="תאריך" className="h-8 text-xs" />
                </div>
                <Input value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="הוראות לתלמיד (אופציונלי)" className="h-8 text-xs" />
              </div>

              {/* Layout options */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5 flex-1">
                  <input type="checkbox" id="exp-answers" checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)} className="accent-primary w-4 h-4" />
                  <label htmlFor="exp-answers" className="text-xs cursor-pointer">הוסף מפתח תשובות</label>
                </div>
                <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5 flex-1">
                  <input type="checkbox" id="two-col" checked={columns === 2} onChange={e => setColumns(e.target.checked ? 2 : 1)} className="accent-primary w-4 h-4" />
                  <label htmlFor="two-col" className="text-xs cursor-pointer">חלוקה לשני טורים</label>
                </div>
              </div>

              {/* Save template + Print */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-9 gap-1.5 text-xs" onClick={saveTemplate}>
                    <Save className="w-3.5 h-3.5" /> שמור תבנית קבועה
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 gap-1 text-xs text-muted-foreground" onClick={resetTemplate}>
                    <RotateCcw className="w-3 h-3" /> אפס
                  </Button>
                </div>
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
                  <div className="text-xs">
                    <span className="font-bold text-primary">{selectedQuestions.length}</span>
                    <span className="text-muted-foreground"> שאלות • </span>
                    <span className="font-bold text-primary">{totalPoints}</span>
                    <span className="text-muted-foreground"> נקודות</span>
                  </div>
                  <Button size="sm" onClick={handlePrint} disabled={selectedQuestions.length === 0} className="gap-1.5">
                    <Printer className="w-3.5 h-3.5" />
                    הדפס / PDF
                  </Button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}