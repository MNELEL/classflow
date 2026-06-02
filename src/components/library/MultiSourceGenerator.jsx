import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles, Search, X, Check, BookOpen, FileText, Layers,
  Printer, Save, Download, ChevronDown, ChevronUp, Loader2, Eye,
  RefreshCw, Settings2
} from 'lucide-react';
import ExportModal from './ExportModal';
import AIProviderSettings from './AIProviderSettings';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── Output types ─────────────────────────────────────────────────────────────
const OUTPUT_TYPES = [
  {
    id: 'worksheet',
    icon: '📄',
    label: 'דף עבודה',
    desc: 'דף שאלות ותרגילים מותאמים',
    color: 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200',
  },
  {
    id: 'workbook',
    icon: '📚',
    label: 'חוברת עבודה',
    desc: 'חוברת מקיפה עם פרקים וסיכומים',
    color: 'border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-200',
  },
  {
    id: 'craft',
    icon: '✂️',
    label: 'מלאכה / פעילות',
    desc: 'פעילות יצירתית או מלאכת יד',
    color: 'border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-200',
  },
  {
    id: 'quiz',
    icon: '🏆',
    label: 'חידון',
    desc: 'שאלות עם תשובות מרובות בחירה',
    color: 'border-green-300 bg-green-50 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200',
  },
  {
    id: 'lesson_plan',
    icon: '📐',
    label: 'מערך שיעור',
    desc: 'מערך שיעור מלא עם שלבים',
    color: 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-200',
  },
  {
    id: 'summary',
    icon: '📋',
    label: 'סיכום משולב',
    desc: 'סיכום המשלב את כל החומרים',
    color: 'border-teal-300 bg-teal-50 text-teal-800 dark:bg-teal-900/20 dark:border-teal-700 dark:text-teal-200',
  },
  {
    id: 'flashcards',
    icon: '🃏',
    label: 'כרטיסיות',
    desc: 'כרטיסיות שאלה-תשובה לחזרה',
    color: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200',
  },
  {
    id: 'differentiated',
    icon: '🎯',
    label: 'רב-רמות',
    desc: 'גרסאות לרמות שונות (קל/בינוני/קשה)',
    color: 'border-pink-300 bg-pink-50 text-pink-800 dark:bg-pink-900/20 dark:border-pink-700 dark:text-pink-200',
  },
];

const GRADE_LEVELS = ['א-ב', 'ג-ד', 'ה-ו', 'ז-ח', 'ט-י', 'י"א-י"ב'];
const DIFFICULTIES = ['קל', 'בינוני', 'קשה', 'מעורב'];

const SOURCE_ICON = {
  pdf: '📄', youtube_link: '▶️', audio_recording: '🎙️', audio_file: '🎵',
  video_file: '🎬', text_note: '✍️', image: '🖼️', presentation: '📊',
  word_doc: '📝', external_link: '🔗',
};

function buildPrompt(outputType, selectedItems, opts) {
  const titles = selectedItems.map(i => `- ${i.title} (${i.subject || ''})`).join('\n');
  const content = selectedItems.map(i =>
    [i.transcript, i.ai_summary, ...(i.ai_key_points || [])].filter(Boolean).join('\n')
  ).join('\n\n---\n\n').slice(0, 6000);

  const base = `אתה מורה מנוסה. צור חומר לימוד בעברית איכותי ומותאם תלמיד.

חומרי מקור (${selectedItems.length} פריטים):
${titles}

תוכן מהחומרים:
${content || '(סכם את הנושאים לפי הכותרות)'}

פרטים:
- שכבת גיל: ${opts.grade}
- רמת קושי: ${opts.difficulty}
- מספר שאלות/פריטים: ${opts.count}
${opts.extraInstructions ? `- הוראות נוספות: ${opts.extraInstructions}` : ''}

`;

  const specific = {
    worksheet: `צור דף עבודה מובנה הכולל:
1. כותרת וכותרת-משנה
2. הוראות לתלמיד
3. שם תלמיד / כיתה / תאריך
4. ${opts.count} שאלות מגוונות (השלמה, התאמה, פתוחות, רב-ברירה)
5. ציוד / ציות נקודות לכל שאלה
השתמש ב-Markdown ועצב יפה להדפסה.`,

    workbook: `צור חוברת עבודה מקיפה הכוללת:
1. עמוד שער עם כותרת, שם תלמיד, שכבה
2. מבוא ורקע
3. פרקי תוכן (2-3 פרקים, כל אחד עם הסבר + תרגילים)
4. פרק חזרה ושאלות סיכום
5. מילון מונחים
6. דפי תרגול נוספים
השתמש ב-Markdown עם כותרות ברורות.`,

    craft: `צור תכנית פעילות / מלאכה הכוללת:
1. שם הפעילות ומטרתה
2. ציוד נדרש
3. שלבים מפורטים (מספריים)
4. שאלות לדיון לפני/אחרי
5. קשר לחומר הלימודי
6. טיפים למורה
7. הרחבות אפשריות
כתוב בשפה ידידותית ומעוררת השראה.`,

    quiz: `צור חידון ${opts.count} שאלות עם:
1. כותרת חידון
2. כל שאלה: טקסט + 4 אפשרויות (א/ב/ג/ד) + תשובה נכונה (מסומנת בכוכבית בסוף)
3. שאלות מדורגות בקושי
4. נקודות לכל שאלה
5. ציון עובר מוצע`,

    lesson_plan: `צור מערך שיעור מלא הכולל:
1. פרטי השיעור (מקצוע, נושא, שכבה, משך)
2. מטרות השיעור (3-5 מטרות ברות הערכה)
3. חומרים וציוד
4. שלבי ההוראה:
   א. פתיחה ועוררות מוטיבציה (5-7 דקות)
   ב. הוראה ישירה (15-20 דקות)
   ג. תרגול מודרך (10-15 דקות)
   ד. סיכום והערכה (5 דקות)
5. שאלות הנחיה לדיון
6. הערכה והמשך`,

    summary: `צור סיכום משולב מקיף הכולל:
1. כותרת ונושא מרכזי
2. רקע ומסגרת
3. נקודות עיקריות מכל מקור (ממוספרות)
4. קשרים בין הנושאים
5. מסקנות ולקחים
6. שאלות למחשבה
7. מקורות ומשאבים להעמקה`,

    flashcards: `צור ${opts.count} כרטיסיות חזרה בפורמט מובנה:
כל כרטיסייה:
**🔵 צד א׳ (שאלה/מושג):** [כתוב כאן]
**🟢 צד ב׳ (תשובה/הגדרה):** [כתוב כאן]
---
כלול מושגים מרכזיים, תאריכים, נוסחאות, הגדרות.`,

    differentiated: `צור חומר לימוד ב-3 רמות לאותו הנושא:

## 🟢 רמה קלה
[${Math.round(opts.count * 0.4)} שאלות פשוטות, שפה בסיסית]

## 🟡 רמה בינונית  
[${Math.round(opts.count * 0.4)} שאלות מאתגרות, מחשבה ביקורתית]

## 🔴 רמה מתקדמת
[${Math.round(opts.count * 0.2)} שאלות עמוקות, העמקה והרחבה]

כל רמה: תרגילים מותאמים + הוראות ברורות.`,
  };

  return base + (specific[outputType] || specific.worksheet);
}

// ─── Print / download helpers ────────────────────────────────────────────────
function printContent(title, content) {
  const w = window.open('', '_blank');
  w.document.write(`
    <html dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: 'Arial', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; direction: rtl; line-height: 1.6; }
      h1 { font-size: 24px; border-bottom: 3px solid #6366f1; padding-bottom: 10px; color: #312e81; }
      h2 { font-size: 18px; color: #4338ca; margin-top: 24px; border-bottom: 1px solid #e0e7ff; padding-bottom: 4px; }
      h3 { font-size: 15px; color: #5b21b6; }
      p { margin: 8px 0; }
      ul, ol { padding-right: 20px; }
      li { margin: 4px 0; }
      strong { color: #1e1b4b; }
      hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
      blockquote { border-right: 4px solid #6366f1; padding: 8px 14px; background: #f5f3ff; margin: 12px 0; }
      @media print { @page { margin: 20mm; } }
    </style></head><body>
    <div id="content"></div>
    <script>
      const md = ${JSON.stringify(content)};
      document.getElementById('content').innerHTML = md
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
        .replace(/^---$/gm, '<hr>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\\/li>)/gs, '<ul>$1</ul>')
        .replace(/\\n\\n/g, '</p><p>')
        .replace(/\\n/g, '<br>');
    </script>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MultiSourceGenerator() {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [outputType, setOutputType] = useState(null);
  const [grade, setGrade] = useState('ה-ו');
  const [difficulty, setDifficulty] = useState('בינוני');
  const [count, setCount] = useState(10);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [expandedSaved, setExpandedSaved] = useState(null);
  const [exportItem, setExportItem] = useState(null);
  const [showAISettings, setShowAISettings] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const qc = useQueryClient();

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 150),
  });

  const displayItems = useMemo(() => {
    const base = libraryItems.filter(i => !i.is_archived);
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.subject || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q)
    );
  }, [libraryItems, search]);

  const selectedItems = useMemo(
    () => selectedIds.map(id => libraryItems.find(i => i.id === id)).filter(Boolean),
    [selectedIds, libraryItems]
  );

  const toggleItem = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleGenerate = async () => {
    if (!reviewMode && !outputType) { toast.error('בחר סוג חומר'); return; }
    if (selectedIds.length === 0) { toast.error('בחר לפחות חומר אחד מהספרייה'); return; }
    setGenerating(true);
    setResult(null);
    try {
      let prompt;
      if (reviewMode) {
        const titles = selectedItems.map(i => `- ${i.title}`).join('\n');
        const content = selectedItems.map(i =>
          [i.transcript, i.ai_summary, ...(i.ai_key_points || [])].filter(Boolean).join('\n')
        ).join('\n\n---\n\n').slice(0, 6000);
        prompt = `אתה מורה מנוסה. בצע ניתוח עמוק של החומרים הלימודיים הבאים וצור חומר חזרה מקיף.

חומרים שנלמדו:
${titles}

תוכן החומרים:
${content || '(ניתח לפי הכותרות)'}

צור את הדברים הבאים בעברית:
## 🔄 שאלות חזרה (${count} שאלות)
שאלות מגוונות המכסות את כל הנושאים — השלמה, רב-ברירה, פתוח, התאמה

## 🃏 כרטיסיות מושגים מרכזיים
מושג ← הגדרה/תשובה

## 📋 נקודות עיקריות לזכור
רשימה ממוקדת של הדברים החשובים ביותר

## ❓ שאלות העמקה
שאלות מחשבה ודיון

שכבת גיל: ${grade} | רמת קושי: ${difficulty}
${extraInstructions ? `הוראות נוספות: ${extraInstructions}` : ''}`;
      } else {
        prompt = buildPrompt(outputType, selectedItems, { grade, difficulty, count, extraInstructions });
      }

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: { type: 'object', properties: { content: { type: 'string' } } }
      });
      const outDef = reviewMode ? { label: 'שאלות חזרה', icon: '🔄' } : OUTPUT_TYPES.find(o => o.id === outputType);
      const newResult = {
        id: Date.now().toString(),
        type: reviewMode ? 'review' : outputType,
        typeLabel: outDef?.label || outputType,
        typeIcon: outDef?.icon || '📄',
        content: res.content,
        sources: selectedItems.map(i => i.title),
        grade,
        difficulty,
        createdAt: format(new Date(), 'dd/MM/yyyy HH:mm'),
      };
      setResult(newResult);
      setPreviewOpen(true);
    } catch {
      toast.error('שגיאה ביצירת החומר — נסה שוב');
    }
    setGenerating(false);
  };

  const handleSave = () => {
    if (!result) return;
    setSavedList(prev => [result, ...prev]);
    toast.success('נשמר ✓');
  };

  const outType = OUTPUT_TYPES.find(o => o.id === outputType);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-xl flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-base">מחולל מרובה-מקורות</h2>
          <p className="text-xs text-muted-foreground">בחר חומרים וצור דפי עבודה, חוברות, שאלות חזרה ועוד</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAISettings(true)} className="gap-1 text-xs">
          <Settings2 className="w-3.5 h-3.5" /> AI
        </Button>
      </div>

      {/* Review mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => setReviewMode(false)}
          className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${!reviewMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}>
          ✨ יצירה חופשית
        </button>
        <button onClick={() => setReviewMode(true)}
          className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${reviewMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}>
          🔄 שאלות חזרה מחומרים
        </button>
      </div>

      {/* Review mode description */}
      {reviewMode && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
          <span>בחר דפי עבודה, מערכי שיעור או חומרים שנלמדו — ה-AI ייצור שאלות חזרה, כרטיסיות ותרגול עמוק</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Left: source picker ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">📚 בחר חומרים ({selectedIds.length} נבחרו)</Label>
            {selectedIds.length > 0 && (
              <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground hover:text-destructive">
                נקה הכל
              </button>
            )}
          </div>

          {/* Selected pills */}
          {selectedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 bg-primary/5 border border-primary/20 rounded-xl">
              {selectedItems.map(item => (
                <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
                  {SOURCE_ICON[item.source_type] || '📁'} {item.title.slice(0, 20)}{item.title.length > 20 ? '…' : ''}
                  <button onClick={() => toggleItem(item.id)} className="hover:text-destructive ml-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="חפש חומר..." value={search} onChange={e => setSearch(e.target.value)} className="pr-8 h-8 text-sm" />
          </div>

          {/* Library list */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto border border-border rounded-xl p-2">
            {displayItems.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">אין חומרים בספרייה</p>
            )}
            {displayItems.map(item => {
              const selected = selectedIds.includes(item.id);
              return (
                <button key={item.id} onClick={() => toggleItem(item.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg border text-xs text-right transition-all
                    ${selected
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-transparent hover:border-border hover:bg-muted/40'}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                    ${selected ? 'bg-primary border-primary' : 'border-border'}`}>
                    {selected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className="text-sm">{SOURCE_ICON[item.source_type] || '📁'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                    {item.subject && <div className="text-[10px] text-muted-foreground">{item.subject}</div>}
                  </div>
                  {item.ai_status === 'ready' && <span className="text-[10px] text-emerald-500 shrink-0">✓ AI</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: output config ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">🎯 מה לייצר?</Label>

          <div className="grid grid-cols-2 gap-1.5">
            {OUTPUT_TYPES.map(t => (
              <button key={t.id} onClick={() => setOutputType(t.id)}
                className={`flex flex-col items-start gap-0.5 p-2.5 rounded-xl border text-xs text-right transition-all
                  ${outputType === t.id ? `${t.color} border-2` : 'border-border hover:border-primary/30 bg-card'}`}>
                <div className="flex items-center gap-1.5 font-semibold">
                  <span className="text-base">{t.icon}</span> {t.label}
                </div>
                <div className="text-[10px] opacity-70">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs mb-1 block">שכבה</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{GRADE_LEVELS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">רמה</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">כמות ({count})</Label>
              <input type="range" min={3} max={30} value={count} onChange={e => setCount(+e.target.value)}
                className="w-full accent-primary mt-2" />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">הוראות נוספות (אופציונלי)</Label>
            <Textarea value={extraInstructions} onChange={e => setExtraInstructions(e.target.value)}
              placeholder="למשל: התמקד בפרק ג', הוסף איורים, כלול הערכה עצמית..." className="text-xs min-h-[60px] resize-none" />
          </div>

          <Button className="w-full gap-2" onClick={handleGenerate}
            disabled={generating || selectedIds.length === 0 || (!outputType && !reviewMode)}>
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> מייצר עם AI...</>
              : reviewMode
                ? <><RefreshCw className="w-4 h-4" /> צור שאלות חזרה מ-{selectedIds.length} חומרים</>
                : <><Sparkles className="w-4 h-4" /> צור {outType?.label || 'חומר'} מ-{selectedIds.length} מקורות</>
            }
          </Button>
        </div>
      </div>

      {/* ── Result preview ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-primary/30 shadow-md">
              <CardContent className="p-4 space-y-3">
                {/* Result header */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{result.typeIcon}</span>
                      <h3 className="font-bold text-base">{result.typeLabel}</h3>
                      <Badge variant="secondary" className="text-xs">{result.grade}</Badge>
                      <Badge variant="outline" className="text-xs">{result.difficulty}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      מקורות: {result.sources.join(', ').slice(0, 80)}{result.sources.join(', ').length > 80 ? '…' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="outline" onClick={handleSave}>
                      <Save className="w-3.5 h-3.5 ml-1" /> שמור
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPreviewOpen(v => !v)}>
                      <Eye className="w-3.5 h-3.5 ml-1" /> {previewOpen ? 'הסתר' : 'הצג'}
                    </Button>
                    <Button size="sm" onClick={() => setExportItem(result)}>
                      <Download className="w-3.5 h-3.5 ml-1" /> ייצוא
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                {previewOpen && (
                  <div className="bg-muted/30 rounded-xl p-4 max-h-96 overflow-y-auto border border-border">
                    <ReactMarkdown
                      className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed"
                      components={{
                        h1: ({ children }) => <h1 className="text-lg font-bold text-primary border-b pb-1 mb-3">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold text-foreground mt-4 mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold text-muted-foreground mt-3 mb-1">{children}</h3>,
                        strong: ({ children }) => <strong className="text-foreground font-bold">{children}</strong>,
                        hr: () => <hr className="border-border my-3" />,
                        li: ({ children }) => <li className="my-0.5">{children}</li>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-r-4 border-primary pr-3 bg-primary/5 rounded-l py-1">{children}</blockquote>
                        ),
                      }}
                    >
                      {result.content}
                    </ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Saved results ─────────────────────────────────────────────────── */}
      {savedList.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">💾 חומרים שנשמרו בסשן זה</h3>
          {savedList.map(item => (
            <Card key={item.id} className="border-border/60">
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setExpandedSaved(expandedSaved === item.id ? null : item.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.typeIcon}</span>
                  <div>
                    <p className="text-sm font-medium">{item.typeLabel}</p>
                    <p className="text-xs text-muted-foreground">{item.grade} • {item.difficulty} • {item.createdAt}</p>
                  </div>
                </div>
                <div className="flex gap-1 items-center">
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setExportItem(item); }}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                  {expandedSaved === item.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
              {expandedSaved === item.id && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="bg-muted/30 rounded-xl p-3 max-h-64 overflow-y-auto text-xs">
                    <ReactMarkdown>{item.content}</ReactMarkdown>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
      {/* Export modal */}
      {exportItem && (
        <ExportModal
          open={!!exportItem}
          onClose={() => setExportItem(null)}
          title={exportItem.typeLabel}
          content={exportItem.content}
          grade={exportItem.grade}
          subtitle={exportItem.sources?.join(', ')}
        />
      )}

      {/* AI Provider settings */}
      <AIProviderSettings open={showAISettings} onClose={() => setShowAISettings(false)} />
    </div>
  );
}