import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import {
  BookOpen, HelpCircle, ChevronDown, ChevronUp, Trash2,
  Library, Printer, Loader2, FileAudio, Tag, Layers, Link2, CheckCircle2, FileText, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

function printWorksheet(item) {
  const questions = item.ai_review_questions || [];
  const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"/>
<title>דף עבודה – ${item.title}</title>
<style>
  body{font-family:'Arial',sans-serif;direction:rtl;margin:30px;font-size:14px;color:#111}
  h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:4px}
  .meta{font-size:12px;color:#555;margin-bottom:24px}
  .question{margin-bottom:20px}
  .question p{font-weight:bold;margin:0 0 8px}
  .options{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px}
  .option{border:1px solid #ccc;border-radius:6px;padding:4px 10px;font-size:13px}
  .answer{font-size:12px;color:#1a7a4a;margin-top:4px}
  .open-line{border-bottom:1px solid #999;height:28px;margin-top:8px}
  @media print{body{margin:15mm}}
</style></head><body>
<h1>דף עבודה – ${item.title}</h1>
<div class="meta">${item.subject ? `מקצוע: ${item.subject} &nbsp;|&nbsp;` : ''}תאריך: ${new Date(item.created_date).toLocaleDateString('he-IL')}</div>
${questions.map((q, i) => `
<div class="question">
  <p>שאלה ${i + 1}: ${q.question}</p>
  ${q.options?.length ? `<div class="options">${q.options.map((o, j) => `<div class="option">${['א','ב','ג','ד'][j]}. ${o}</div>`).join('')}</div>` : `<div class="open-line"></div><div class="open-line"></div>`}
  <div class="answer">✓ תשובה: ${q.answer}</div>
</div>`).join('')}
</body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

function AnalysisCard({ item, onDelete, onSaveToLibrary, savingId, categories, lessonPlans }) {
  const [openSection, setOpenSection] = useState(null);
  const [linking, setLinking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(item.category || '');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const queryClient = useQueryClient();

  const toggle = (s) => setOpenSection(prev => prev === s ? null : s);

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(item.transcript || '');
    toast.success('התמלול הועתק!');
  };

  async function handleSaveLink() {
    setSavingLink(true);
    try {
      const updates = {};
      if (selectedCategory) updates.category = selectedCategory;
      await base44.entities.LibraryItem.update(item.id, updates);

      if (selectedPlan) {
        const plan = lessonPlans.find(p => p.id === selectedPlan);
        if (plan) {
          const newBlock = {
            id: Date.now().toString(),
            title: item.title,
            description: item.ai_summary_sections?.[0]?.content || '',
            duration_minutes: 45,
            library_item_ids: [item.id],
          };
          await base44.entities.LessonPlan.update(selectedPlan, {
            blocks: [...(plan.blocks || []), newBlock],
          });
          toast.success(`השיעור שויך למערך "${plan.title}"`);
        }
      } else {
        toast.success('הסיווג נשמר');
      }

      queryClient.invalidateQueries({ queryKey: ['lesson_analyses'] });
      setLinking(false);
    } catch {
      toast.error('שגיאה בשמירה');
    } finally {
      setSavingLink(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center shrink-0">
                <FileAudio className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">{item.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(item.created_date).toLocaleDateString('he-IL')}
                  {item.subject && <> · {item.subject}</>}
                  {item.category && (
                    <Badge className="mr-1 text-[9px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-0 px-1.5">{item.category}</Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setLinking(v => !v)} title="שייך לקטגוריה / מערך שיעור"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 dark:hover:text-violet-400 rounded-xl transition-colors">
                <Link2 className="w-4 h-4" />
              </button>
              <button onClick={() => onSaveToLibrary(item)} disabled={savingId === item.id} title="שמור לדפי עבודה"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-40">
                {savingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Library className="w-4 h-4" />}
              </button>
              <button onClick={() => printWorksheet(item)} title="הדפס דף עבודה"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400 rounded-xl transition-colors">
                <Printer className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(item.id)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Full transcript + summary button */}
        {item.transcript && (
          <button
            onClick={() => setShowTranscript(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 dark:active:bg-amber-900/40 transition-colors text-right min-h-[48px] mt-3"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">תמלול מלא וסיכום</span>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] border-0">{item.transcript.length} תווים</Badge>
            </div>
            <ChevronDown className="w-4 h-4 text-amber-600" />
          </button>
        )}

        {/* Full transcript modal */}
        {showTranscript && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTranscript(false)}>
            <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-sm">תמלול מלא וסיכום — {item.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleCopyTranscript}>
                    <Copy className="w-3.5 h-3.5" /> העתק תמלול
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowTranscript(false)}>סגור</Button>
                </div>
              </div>
              <div className="overflow-y-auto p-4 space-y-4">
                {/* Summary section */}
                {item.ai_summary_sections?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> סיכום בראשי פרקים
                    </p>
                    <div className="space-y-2">
                      {item.ai_summary_sections.map((sec, i) => (
                        <div key={i} className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                          <p className="text-sm font-semibold text-blue-800">{sec.heading}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{sec.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Full transcript */}
                <div>
                  <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> תמלול מלא של השיעור
                  </p>
                  <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100 text-sm leading-relaxed whitespace-pre-wrap">
                    {item.transcript}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {linking && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mx-4 mb-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3 space-y-2">
                <p className="text-xs font-semibold text-violet-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> שיוך לקטגוריה ומערך שיעור
                </p>
                <MobileSelect value={selectedCategory} onValueChange={setSelectedCategory} placeholder="בחר קטגוריה לימודית..." className="h-9 text-xs w-full">
                  <SelectItem value={null}>ללא קטגוריה</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.icon && `${c.icon} `}{c.name}</SelectItem>)}
                </MobileSelect>
                <MobileSelect value={selectedPlan} onValueChange={setSelectedPlan} placeholder="הוסף למערך שיעור קיים..." className="h-9 text-xs w-full">
                  <SelectItem value={null}>לא לשייך למערך</SelectItem>
                  {lessonPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.title} — {p.subject}</SelectItem>)}
                </MobileSelect>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 h-9 gap-1.5 text-xs" onClick={handleSaveLink} disabled={savingLink}>
                    {savingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    שמור שיוך
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setLinking(false)}>ביטול</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 pb-4 space-y-2">
          <button onClick={() => toggle('summary')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 dark:active:bg-blue-900/40 transition-colors text-right min-h-[48px]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">סיכום בראשי פרקים</span>
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] border-0">{item.ai_summary_sections?.length || 0}</Badge>
            </div>
            {openSection === 'summary' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
          </button>
          <AnimatePresence>
            {openSection === 'summary' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-1 pb-2 px-1 space-y-2">
                  {item.ai_summary_sections?.map((sec, i) => (
                    <div key={i} className="flex gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold">{sec.heading}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{sec.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => toggle('questions')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 dark:active:bg-emerald-900/40 transition-colors text-right min-h-[48px]">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">שאלות חזרה</span>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] border-0">{item.ai_review_questions?.length || 0}</Badge>
            </div>
            {openSection === 'questions' ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4 text-emerald-600" />}
          </button>
          <AnimatePresence>
            {openSection === 'questions' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-1 pb-2 px-1 space-y-2">
                  {item.ai_review_questions?.map((q, i) => (
                    <div key={i} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                      <p className="text-xs font-bold text-emerald-700 mb-1">שאלה {i + 1}</p>
                      <p className="text-sm font-medium mb-1.5">{q.question}</p>
                      {q.options?.length > 0 && (
                        <div className="grid grid-cols-2 gap-1 mb-1.5">
                          {q.options.map((o, j) => (
                            <div key={j} className="text-xs bg-card rounded-lg px-2 py-1.5 border border-emerald-100 dark:border-emerald-900">{['א','ב','ג','ד'][j]}. {o}</div>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-emerald-700 font-semibold">✓ {q.answer}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function LessonSummaryHub({ onSaveToLibrary, savingId, onDelete }) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  const { data: analyses = [] } = useQuery({
    queryKey: ['lesson_analyses'],
    queryFn: () => base44.entities.LibraryItem.filter({ source_type: 'audio_file' }, '-created_date', 50),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['lesson_categories'],
    queryFn: () => base44.entities.LessonCategory.list(),
  });

  const { data: lessonPlans = [] } = useQuery({
    queryKey: ['lesson_plans'],
    queryFn: () => base44.entities.LessonPlan.list('-created_date', 30),
  });

  const withAnalysis = analyses.filter(i => i.ai_summary_sections?.length);
  const subjects = [...new Set(withAnalysis.map(i => i.subject).filter(Boolean))];
  const catNames = [...new Set(withAnalysis.map(i => i.category).filter(Boolean))];

  const filtered = withAnalysis.filter(i => {
    if (filterCategory !== 'all' && i.category !== filterCategory) return false;
    if (filterSubject !== 'all' && i.subject !== filterSubject) return false;
    return true;
  });

  if (withAnalysis.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
          <Layers className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h2 className="font-bold text-sm">מרכז סיכומי שיעורים</h2>
          <p className="text-[11px] text-muted-foreground">{withAnalysis.length} שיעורים מנותחים</p>
        </div>
      </div>

      {(subjects.length > 0 || catNames.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          {subjects.length > 0 && (
            <MobileSelect value={filterSubject} onValueChange={setFilterSubject} placeholder="כל המקצועות" className="h-9 text-xs flex-1 min-w-[120px]">
              <SelectItem value="all">כל המקצועות</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </MobileSelect>
          )}
          {catNames.length > 0 && (
            <MobileSelect value={filterCategory} onValueChange={setFilterCategory} placeholder="כל הקטגוריות" className="h-9 text-xs flex-1 min-w-[120px]">
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {catNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </MobileSelect>
          )}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(item => (
          <AnalysisCard
            key={item.id}
            item={item}
            onDelete={onDelete}
            onSaveToLibrary={onSaveToLibrary}
            savingId={savingId}
            categories={categories}
            lessonPlans={lessonPlans}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-6">אין תוצאות לסינון זה</p>
        )}
      </div>
    </div>
  );
}