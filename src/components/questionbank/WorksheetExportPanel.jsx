import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { Printer, ChevronDown, ChevronRight, Sparkles, Image, Save, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { loadBranding } from '@/lib/branding';
import { escapeHtml } from '@/lib/htmlEscape';
import { TEMPLATE_KEY, TEMPLATES, loadSavedTemplate, buildExamHTML } from '@/lib/examHtmlBuilder';

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
                  <MobileSelect value={filterSubject} onValueChange={setFilterSubject} placeholder="כל המקצועות" className="h-8 text-xs flex-1 min-w-[110px]">
                    <SelectItem value="all">כל המקצועות</SelectItem>
                    {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </MobileSelect>
                  <MobileSelect value={filterDiff} onValueChange={setFilterDiff} placeholder="כל הרמות" className="h-8 text-xs w-28">
                    <SelectItem value="all">כל הרמות</SelectItem>
                    <SelectItem value="קל">🟢 קל</SelectItem>
                    <SelectItem value="בינוני">🟡 בינוני</SelectItem>
                    <SelectItem value="קשה">🔴 קשה</SelectItem>
                  </MobileSelect>
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