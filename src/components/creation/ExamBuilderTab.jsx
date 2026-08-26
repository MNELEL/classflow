import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { buildExamHTML, TEMPLATES, loadSavedTemplate } from '@/lib/examHtmlBuilder';
import { loadBranding } from '@/lib/branding';
import { toast } from 'sonner';
import {
  FileText, Sparkles, ArrowLeft, ArrowRight, Shuffle,
  RefreshCw, Printer, X, Check, Wand2, BookOpen
} from 'lucide-react';

const TYPE_BADGE = {
  'רב-ברירה': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  'שאלה פתוחה': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  'נכון/לא נכון': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-blue-800',
  'השלמת משפט': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
};

const DIFF_BADGE = {
  'קל': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'בינוני': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'קשה': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function flattenBank(worksheets) {
  const bank = [];
  worksheets.forEach(ws => {
    (ws.questions || []).forEach((q, i) => {
      bank.push({
        uid: `${ws.id}-${i}`,
        ...q,
        ws_title: ws.title,
        ws_subject: ws.subject,
        ws_difficulty: ws.difficulty,
      });
    });
  });
  return bank;
}

function SetupStep({ subjects, config, setConfig, questionCount, onCompose }) {
  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Wand2 className="w-7 h-7 text-indigo-600" />
        </div>
        <h2 className="font-bold text-base mb-1">בחירת פרמטרים</h2>
        <p className="text-xs text-muted-foreground">בחר מקצוע ורמת קושי — והמערכת תרכיב מבחן מותאם מבנק השאלות</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> מקצוע
          </label>
          <MobileSelect value={config.subject} onValueChange={v => setConfig(c => ({ ...c, subject: v }))} placeholder="בחר מקצוע" className="h-11">
            <SelectItem value="all">כל המקצועות</SelectItem>
            {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </MobileSelect>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">רמת קושי</label>
          <div className="grid grid-cols-3 gap-2">
            {['קל', 'בינוני', 'קשה'].map(d => (
              <button key={d} onClick={() => setConfig(c => ({ ...c, difficulty: d }))}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                  config.difficulty === d
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/40'
                }`}>
                <span className="text-lg">{d === 'קל' ? '🟢' : d === 'בינוני' ? '🟡' : '🔴'}</span>
                <span className="text-xs font-medium">{d}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">מספר שאלות: {config.numQuestions}</label>
          <input type="range" min="3" max={Math.max(3, Math.min(30, questionCount))} value={config.numQuestions}
            onChange={e => setConfig(c => ({ ...c, numQuestions: parseInt(e.target.value) }))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>3</span><span>{Math.max(3, Math.min(30, questionCount))} זמינות</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-400 leading-snug">
          {questionCount > 0
            ? `נמצאו ${questionCount} שאלות תואמות. לאחר ההרכבה תוכל להחליף שאלות, לערוך ולייצא למסמך.`
            : 'אין שאלות תואמות לפרמטרים שנבחרו. נסה להרחיב את הסינון.'}
        </p>
      </div>

      <Button onClick={onCompose} disabled={questionCount === 0} className="w-full h-11 gap-2" size="lg">
        <Sparkles className="w-4 h-4" /> הרכב מבחן ({Math.min(config.numQuestions, questionCount)} שאלות)
      </Button>
    </div>
  );
}

function ComposeStep({ selected, pool, onSwap, onRemove, onShuffle }) {
  const totalPoints = selected.reduce((s, q) => s + (q.points || 10), 0);
  const [swapFor, setSwapFor] = useState(null);

  const availableSwaps = useMemo(() => {
    if (!swapFor) return [];
    const usedUids = new Set(selected.map(q => q.uid));
    return pool.filter(q => !usedUids.has(q.uid) || q.uid === swapFor.uid).slice(0, 12);
  }, [swapFor, pool, selected]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary text-primary-foreground">{selected.length} שאלות</Badge>
          <span className="text-xs text-muted-foreground">{totalPoints} נקודות</span>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={onShuffle}>
          <Shuffle className="w-3.5 h-3.5" /> ערבב מחדש
        </Button>
      </div>

      {selected.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">לא נבחרו שאלות</p>
        </div>
      ) : (
        <div className="space-y-2">
          {selected.map((q, idx) => (
            <div key={q.uid} className={`rounded-xl border p-3 ${swapFor?.uid === q.uid ? 'border-primary ring-2 ring-primary/30' : 'border-border bg-card'}`}>
              <div className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TYPE_BADGE[q.type] || 'bg-muted text-muted-foreground border-border'}`}>{q.type}</span>
                    {q.ws_difficulty && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFF_BADGE[q.ws_difficulty] || ''}`}>{q.ws_difficulty}</span>}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{q.points || 10} נק'</span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{q.question}</p>
                  {q.options?.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 mt-1.5">
                      {q.options.map((o, j) => (
                        <div key={j} className="text-[11px] bg-muted/40 rounded-lg px-2 py-1">{['א','ב','ג','ד'][j]}. {o}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => setSwapFor(swapFor?.uid === q.uid ? null : q)} aria-label="החלף שאלה"
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${swapFor?.uid === q.uid ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'}`}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onRemove(q.uid)} aria-label="הסר שאלה"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {swapFor && availableSwaps.length > 0 && (
        <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> החלף את שאלה {selected.findIndex(q => q.uid === swapFor.uid) + 1} ב:
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {availableSwaps.map(q => (
              <button key={q.uid} onClick={() => { onSwap(swapFor.uid, q); setSwapFor(null); }}
                className="w-full text-right rounded-lg border border-border bg-card p-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <div className="flex flex-wrap gap-1 mb-0.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${TYPE_BADGE[q.type] || 'bg-muted'}`}>{q.type}</span>
                  {q.ws_difficulty && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${DIFF_BADGE[q.ws_difficulty] || ''}`}>{q.ws_difficulty}</span>}
                </div>
                <p className="text-xs font-medium leading-snug line-clamp-2">{q.question}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewStep({ selected, meta, setMeta, onPrint }) {
  const totalPoints = selected.reduce((s, q) => s + (q.points || 10), 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge className="bg-primary text-primary-foreground">{selected.length} שאלות</Badge>
        <span className="text-xs text-muted-foreground">{totalPoints} נקודות</span>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">תבנית עיצוב</p>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setMeta(m => ({ ...m, template: t.id }))}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all ${meta.template === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'}`}>
              <span className="text-xl">{t.emoji}</span>
              <div>
                <p className="text-[11px] font-bold">{t.label}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Input value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} placeholder="כותרת (לדוג': מבחן — שברים)" className="h-9 text-sm" />
        <Input value={meta.subtitle} onChange={e => setMeta(m => ({ ...m, subtitle: e.target.value }))} placeholder="כותרת משנה / נושא" className="h-9 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <Input value={meta.className} onChange={e => setMeta(m => ({ ...m, className: e.target.value }))} placeholder="כיתה" className="h-9 text-sm" />
          <Input value={meta.date} onChange={e => setMeta(m => ({ ...m, date: e.target.value }))} placeholder="תאריך" className="h-9 text-sm" />
        </div>
        <Input value={meta.schoolName} onChange={e => setMeta(m => ({ ...m, schoolName: e.target.value }))} placeholder="שם המוסד" className="h-9 text-sm" />
        <Input value={meta.instructions} onChange={e => setMeta(m => ({ ...m, instructions: e.target.value }))} placeholder="הוראות (אופציונלי)" className="h-9 text-sm" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5 flex-1 cursor-pointer">
          <input type="checkbox" checked={meta.showAnswers} onChange={e => setMeta(m => ({ ...m, showAnswers: e.target.checked }))} className="accent-primary w-4 h-4" />
          <span className="text-xs">מפתח תשובות</span>
        </label>
        <label className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5 flex-1 cursor-pointer">
          <input type="checkbox" checked={meta.columns === 2} onChange={e => setMeta(m => ({ ...m, columns: e.target.checked ? 2 : 1 }))} className="accent-primary w-4 h-4" />
          <span className="text-xs">שני טורים</span>
        </label>
      </div>

      <Button onClick={onPrint} disabled={selected.length === 0} className="w-full h-11 gap-2" size="lg">
        <Printer className="w-4 h-4" /> הדפס / ייצוא PDF
      </Button>
    </div>
  );
}

export default function ExamBuilderTab({ onGoToBank }) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({ subject: 'all', difficulty: 'בינוני', numQuestions: 8 });
  const [selected, setSelected] = useState([]);
  const [meta, setMeta] = useState(() => {
    const saved = loadSavedTemplate();
    const branding = loadBranding();
    return {
      ...saved,
      title: saved.title || 'מבחן',
      className: saved.className || branding.class_name || '',
      schoolName: saved.schoolName || branding.school_name || '',
      date: saved.date || new Date().toLocaleDateString('he-IL'),
    };
  });

  const { data: worksheets = [], isLoading } = useQuery({
    queryKey: ['worksheets'],
    queryFn: () => base44.entities.Worksheet.list('-created_date', 100),
  });

  const allQuestions = useMemo(() => flattenBank(worksheets), [worksheets]);
  const subjects = useMemo(() => [...new Set(allQuestions.map(q => q.ws_subject).filter(Boolean))], [allQuestions]);

  const pool = useMemo(() => {
    return allQuestions.filter(q => {
      if (config.subject !== 'all' && q.ws_subject !== config.subject) return false;
      if (config.difficulty && q.ws_difficulty !== config.difficulty) return false;
      return true;
    });
  }, [allQuestions, config.subject, config.difficulty]);

  const handleCompose = () => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, config.numQuestions);
    if (picked.length === 0) { toast.error('אין שאלות תואמות לפרמטרים שנבחרו'); return; }
    setSelected(picked);
    setStep(2);
    toast.success(`המבחן הורכב: ${picked.length} שאלות`);
  };

  const handleShuffle = () => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, selected.length);
    if (picked.length > 0) { setSelected(picked); toast.success('השאלות עורבבו מחדש'); }
  };

  const handleSwap = (oldUid, newQ) => {
    setSelected(prev => prev.map(q => q.uid === oldUid ? newQ : q));
    toast.success('השאלה הוחלפה');
  };

  const handleRemove = (uid) => setSelected(prev => prev.filter(q => q.uid !== uid));

  const handlePrint = () => {
    if (selected.length === 0) { toast.error('אין שאלות להדפסה'); return; }
    const html = buildExamHTML({ ...meta, questions: selected });
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const stepLabels = ['בחירה', 'הרכבה', 'תצוגה וייצוא'];
  const goBack = () => { if (step === 1) onGoToBank(); else setStep(s => s - 1); };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="px-4 pt-4 pb-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={goBack}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors" aria-label="חזור">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-base flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> הרכבת מבחן
              </h1>
              <p className="text-xs text-muted-foreground">הרכבת מבחן מבנק השאלות</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onGoToBank}>
            לבנק השאלות <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <React.Fragment key={n}>
                <button onClick={() => { if (n <= step || selected.length > 0) setStep(n); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${active ? 'bg-primary text-primary-foreground' : done ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-primary-foreground text-primary' : done ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {done ? <Check className="w-3 h-3" /> : n}
                  </span>
                  {label}
                </button>
                {n < 3 && <div className={`h-0.5 flex-1 rounded-full ${step > n ? 'bg-primary/40' : 'bg-border'}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : allQuestions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">בנק השאלות ריק</p>
            <p className="text-sm mt-1 mb-3">צור דפי עבודה תחילה כדי לאפשר הרכבת מבחן</p>
            <Button size="sm" onClick={onGoToBank}>לבנק השאלות</Button>
          </div>
        ) : step === 1 ? (
          <SetupStep subjects={subjects} config={config} setConfig={setConfig} questionCount={pool.length} onCompose={handleCompose} />
        ) : step === 2 ? (
          <ComposeStep selected={selected} pool={pool} onSwap={handleSwap} onRemove={handleRemove} onShuffle={handleShuffle} />
        ) : (
          <PreviewStep selected={selected} meta={meta} setMeta={setMeta} onPrint={handlePrint} />
        )}
      </div>

      {step === 2 && selected.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-card">
          <Button onClick={() => setStep(3)} className="w-full h-11 gap-2" size="lg">
            המשך לתצוגה וייצוא <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}