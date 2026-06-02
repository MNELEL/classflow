import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Search, CheckSquare, Square, GripVertical, Printer, X,
  ChevronDown, ChevronUp, Layers, FileText, Filter
} from 'lucide-react';
import { toast } from 'sonner';

const TYPE_BADGE = {
  'רב-ברירה': 'bg-blue-100 text-blue-800 border-blue-200',
  'שאלה פתוחה': 'bg-purple-100 text-purple-800 border-purple-200',
  'נכון/לא נכון': 'bg-green-100 text-green-800 border-green-200',
  'השלמת משפט': 'bg-orange-100 text-orange-800 border-orange-200',
};

const DIFF_BADGE = {
  'קל': 'bg-emerald-100 text-emerald-700',
  'בינוני': 'bg-yellow-100 text-yellow-700',
  'קשה': 'bg-red-100 text-red-700',
};

// Flatten all questions from all worksheets into one bank
function flattenBank(worksheets) {
  const bank = [];
  worksheets.forEach(ws => {
    (ws.questions || []).forEach((q, i) => {
      bank.push({
        uid: `${ws.id}-${i}`,
        ...q,
        ws_title: ws.title,
        ws_subject: ws.subject,
        ws_grade: ws.grade_level,
        ws_difficulty: ws.difficulty,
      });
    });
  });
  return bank;
}

// ─── Print HTML builder ───────────────────────────────────────────────────────
function buildPrintHTML({ title, subtitle, studentInfo, instructions, questions, showAnswers }) {
  const totalPoints = questions.reduce((s, q) => s + (q.points || 10), 0);
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Heebo', Arial, sans-serif;
      direction: rtl;
      color: #1a1a2e;
      background: white;
      padding: 0;
    }
    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 40px;
    }
    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #4f46e5;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .header-title { }
    .header-title h1 { font-size: 22px; font-weight: 700; color: #1e1b4b; }
    .header-title .subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }
    .header-logo {
      width: 52px; height: 52px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 22px;
    }
    /* Student info bar */
    .student-bar {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .student-field {
      display: flex; flex-direction: column; gap: 4px;
    }
    .student-field label { font-size: 10px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .student-field .field-line { border-bottom: 1.5px solid #d1d5db; height: 24px; }
    /* Instructions */
    .instructions-box {
      background: #eff6ff;
      border-right: 4px solid #4f46e5;
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #1e40af;
    }
    /* Questions */
    .question {
      margin-bottom: 22px;
      page-break-inside: avoid;
    }
    .question-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .q-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px; height: 26px;
      background: #4f46e5;
      color: white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
      margin-left: 10px;
    }
    .q-text {
      font-size: 14px;
      font-weight: 500;
      flex: 1;
      line-height: 1.5;
    }
    .q-meta {
      display: flex; gap: 6px; align-items: center; flex-shrink: 0;
    }
    .badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid;
      font-weight: 500;
    }
    .points-badge { background: #f3f4f6; border-color: #d1d5db; color: #374151; }
    /* Options */
    .options { list-style: none; margin: 10px 0 0 36px; }
    .options li {
      padding: 6px 12px;
      margin: 4px 0;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 13px;
      display: flex; gap: 8px; align-items: center;
    }
    .option-letter { font-weight: 700; color: #4f46e5; width: 16px; }
    /* Answer lines */
    .answer-lines { margin: 10px 0 0 36px; }
    .answer-line {
      border-bottom: 1px solid #9ca3af;
      height: 28px;
      margin-bottom: 8px;
    }
    /* Answer key */
    .answer-key {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 2px dashed #d1d5db;
    }
    .answer-key h2 { font-size: 15px; font-weight: 700; color: #059669; margin-bottom: 14px; }
    .answer-key-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .answer-item {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
    }
    .answer-item strong { color: #065f46; }
    /* Total */
    .total-bar {
      margin-top: 20px;
      display: flex; justify-content: flex-start;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
    }
    .total-box {
      background: #1e1b4b;
      color: white;
      border-radius: 10px;
      padding: 8px 20px;
      font-size: 14px;
      font-weight: 700;
    }
    @media print {
      .page { padding: 20px 30px; }
      body { background: white; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-title">
        <h1>${title}</h1>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      </div>
      <div class="header-logo">📋</div>
    </div>

    <!-- Student info -->
    <div class="student-bar">
      <div class="student-field"><label>שם תלמיד</label><div class="field-line"></div></div>
      <div class="student-field"><label>כיתה</label><div class="field-line"></div></div>
      <div class="student-field"><label>תאריך</label><div class="field-line"></div></div>
    </div>

    ${instructions ? `<div class="instructions-box">📋 ${instructions}</div>` : ''}

    <!-- Questions -->
    ${questions.map((q, i) => `
      <div class="question">
        <div class="question-header">
          <div style="display:flex; align-items:flex-start; flex:1">
            <span class="q-number">${i + 1}</span>
            <span class="q-text">${q.question}</span>
          </div>
          <div class="q-meta">
            <span class="badge points-badge">${q.points || 10} נק'</span>
          </div>
        </div>
        ${q.options?.length ? `
          <ul class="options">
            ${q.options.map((o, j) => `<li><span class="option-letter">${['א','ב','ג','ד'][j]}.</span>${o}</li>`).join('')}
          </ul>
        ` : ''}
        ${q.type === 'שאלה פתוחה' ? `<div class="answer-lines"><div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div></div>` : ''}
        ${q.type === 'השלמת משפט' ? `<div class="answer-lines"><div class="answer-line"></div></div>` : ''}
        ${q.type === 'נכון/לא נכון' ? `<div style="margin: 8px 0 0 36px; font-size:13px">☐ נכון &nbsp;&nbsp;&nbsp; ☐ לא נכון</div>` : ''}
      </div>
    `).join('')}

    <!-- Total -->
    <div class="total-bar">
      <div class="total-box">סה"כ: ${totalPoints} נקודות</div>
    </div>

    ${showAnswers ? `
      <div class="answer-key">
        <h2>✅ מפתח תשובות</h2>
        <div class="answer-key-grid">
          ${questions.map((q, i) => `
            <div class="answer-item">
              <strong>שאלה ${i + 1}:</strong> ${q.answer || '—'}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  </div>
</body>
</html>`;
}

// ─── Question row in bank ─────────────────────────────────────────────────────
function QuestionRow({ q, selected, onToggle, showSource }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`rounded-xl border p-3 transition-all cursor-pointer ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card hover:border-primary/40'}`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5">
          {selected
            ? <CheckSquare className="w-4 h-4 text-primary" />
            : <Square className="w-4 h-4 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TYPE_BADGE[q.type] || 'bg-muted text-muted-foreground border-border'}`}>{q.type}</span>
            {q.ws_difficulty && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DIFF_BADGE[q.ws_difficulty] || ''}`}>{q.ws_difficulty}</span>}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{q.points || 10} נק'</span>
          </div>
          <p className="text-sm font-medium leading-snug">{q.question}</p>
          {showSource && <p className="text-[10px] text-muted-foreground mt-0.5">מתוך: {q.ws_title} • {q.ws_subject}</p>}
          {q.options?.length > 0 && (
            <div>
              <button
                onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                className="text-[10px] text-primary mt-1 flex items-center gap-0.5"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? 'הסתר אפשרויות' : 'הצג אפשרויות'}
              </button>
              {expanded && (
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {q.options.map((o, j) => (
                    <div key={j} className="text-xs bg-muted/40 rounded-lg px-2 py-1">{['א','ב','ג','ד'][j]}. {o}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Selected question chip (in builder) ─────────────────────────────────────
function SelectedChip({ q, idx, onRemove }) {
  return (
    <Draggable draggableId={q.uid} index={idx}>
      {(p, snap) => (
        <div ref={p.innerRef} {...p.draggableProps}
          className={`flex items-center gap-2 rounded-xl border bg-card p-2.5 text-xs group select-none
            ${snap.isDragging ? 'shadow-xl ring-2 ring-primary/40' : 'hover:shadow-sm'}`}>
          <span {...p.dragHandleProps} className="cursor-grab text-muted-foreground opacity-40 group-hover:opacity-80">
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] shrink-0">{idx + 1}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${TYPE_BADGE[q.type] || 'bg-muted'}`}>{q.type}</span>
          <span className="flex-1 truncate font-medium text-foreground">{q.question}</span>
          <span className="text-muted-foreground shrink-0">{q.points || 10} נק'</span>
          <button onClick={() => onRemove(q.uid)} className="text-muted-foreground hover:text-destructive shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </Draggable>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QuestionBankPage() {
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterDiff, setFilterDiff] = useState('all');
  const [selected, setSelected] = useState([]); // array of question uids
  const [worksheetTitle, setWorksheetTitle] = useState('');
  const [worksheetInstructions, setWorksheetInstructions] = useState('');
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [activeTab, setActiveTab] = useState('bank'); // 'bank' | 'builder'

  const { data: worksheets = [] } = useQuery({
    queryKey: ['worksheets'],
    queryFn: () => base44.entities.Worksheet.list('-created_date', 50),
  });

  const allQuestions = useMemo(() => flattenBank(worksheets), [worksheets]);

  const subjects = useMemo(() => [...new Set(allQuestions.map(q => q.ws_subject).filter(Boolean))], [allQuestions]);
  const types = useMemo(() => [...new Set(allQuestions.map(q => q.type).filter(Boolean))], [allQuestions]);

  const filtered = useMemo(() => {
    return allQuestions.filter(q => {
      if (filterSubject !== 'all' && q.ws_subject !== filterSubject) return false;
      if (filterType !== 'all' && q.type !== filterType) return false;
      if (filterDiff !== 'all' && q.ws_difficulty !== filterDiff) return false;
      if (search) {
        const s = search.toLowerCase();
        return (q.question || '').toLowerCase().includes(s) || (q.ws_subject || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [allQuestions, filterSubject, filterType, filterDiff, search]);

  const selectedQuestions = useMemo(() =>
    selected.map(uid => allQuestions.find(q => q.uid === uid)).filter(Boolean),
    [selected, allQuestions]
  );

  const totalPoints = selectedQuestions.reduce((s, q) => s + (q.points || 10), 0);

  const toggleSelect = (uid) => {
    setSelected(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  };

  const handleDragEnd = ({ source, destination, draggableId }) => {
    if (!destination || source.index === destination.index) return;
    setSelected(prev => {
      const arr = [...prev];
      const [m] = arr.splice(source.index, 1);
      arr.splice(destination.index, 0, m);
      return arr;
    });
  };

  const printPDF = () => {
    if (selectedQuestions.length === 0) { toast.error('בחר שאלות קודם'); return; }
    const title = worksheetTitle || 'דף עבודה';
    const html = buildPrintHTML({
      title,
      subtitle: `${selectedQuestions[0]?.ws_subject || ''} | ${selectedQuestions[0]?.ws_grade || ''}`,
      instructions: worksheetInstructions,
      questions: selectedQuestions,
      showAnswers: includeAnswers,
    });
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full" dir="rtl">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="font-bold text-base">מרכז עזרים</h1>
                <p className="text-xs text-muted-foreground">בנק שאלות → דף עבודה להדפסה</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.length > 0 && (
                <Badge className="bg-primary text-primary-foreground">{selected.length} נבחרות</Badge>
              )}
              <Button size="sm" onClick={printPDF} disabled={selectedQuestions.length === 0} className="gap-1">
                <Printer className="w-3.5 h-3.5" /> הדפס PDF
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            <button onClick={() => setActiveTab('bank')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === 'bank' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              📚 בנק שאלות ({allQuestions.length})
            </button>
            <button onClick={() => setActiveTab('builder')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === 'builder' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              📄 דף נבחר ({selected.length})
            </button>
          </div>
        </div>

        {/* ── Bank tab ── */}
        {activeTab === 'bank' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="חפש שאלה..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs pr-8" />
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="מקצוע" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המקצועות</SelectItem>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="סוג" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDiff} onValueChange={setFilterDiff}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="קושי" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הרמות</SelectItem>
                  <SelectItem value="קל">קל</SelectItem>
                  <SelectItem value="בינוני">בינוני</SelectItem>
                  <SelectItem value="קשה">קשה</SelectItem>
                </SelectContent>
              </Select>
              {(search || filterSubject !== 'all' || filterType !== 'all' || filterDiff !== 'all') && (
                <button onClick={() => { setSearch(''); setFilterSubject('all'); setFilterType('all'); setFilterDiff('all'); }}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
                  <X className="w-3 h-3" /> נקה
                </button>
              )}
            </div>

            {allQuestions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold">בנק השאלות ריק</p>
                <p className="text-sm mt-1">צור דפי עבודה תחילה בלשונית "דפ"ע"</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">אין תוצאות לסינון זה</div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{filtered.length} שאלות</span>
                  {filtered.length > 0 && (
                    <button onClick={() => setSelected(prev => {
                      const newIds = filtered.map(q => q.uid).filter(uid => !prev.includes(uid));
                      return [...prev, ...newIds];
                    })} className="text-primary hover:underline">בחר הכל</button>
                  )}
                </div>
                {filtered.map(q => (
                  <QuestionRow
                    key={q.uid}
                    q={q}
                    selected={selected.includes(q.uid)}
                    onToggle={() => toggleSelect(q.uid)}
                    showSource
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Builder tab ── */}
        {activeTab === 'builder' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Worksheet settings */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> פרטי דף העבודה
              </h3>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">כותרת הדף</label>
                <Input value={worksheetTitle} onChange={e => setWorksheetTitle(e.target.value)}
                  placeholder="לדוגמה: בחינה — שברים | כיתה ה'" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">הוראות לתלמיד (אופציונלי)</label>
                <Input value={worksheetInstructions} onChange={e => setWorksheetInstructions(e.target.value)}
                  placeholder="ענה על כל השאלות. כל שאלה מנוקדת..." className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="answers" checked={includeAnswers} onChange={e => setIncludeAnswers(e.target.checked)}
                  className="accent-primary w-4 h-4 rounded" />
                <label htmlFor="answers" className="text-xs cursor-pointer">כלול מפתח תשובות בסוף הדף</label>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">סה"כ: <strong>{totalPoints}</strong> נקודות | <strong>{selectedQuestions.length}</strong> שאלות</span>
                <Button size="sm" onClick={printPDF} disabled={selectedQuestions.length === 0} className="gap-1">
                  <Printer className="w-3.5 h-3.5" /> הדפסה / PDF
                </Button>
              </div>
            </div>

            {/* Sorted question list */}
            {selectedQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">לא נבחרו שאלות עדיין</p>
                <button onClick={() => setActiveTab('bank')} className="text-xs text-primary mt-2 hover:underline">
                  עבור לבנק השאלות
                </button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="builder">
                  {(p) => (
                    <div ref={p.innerRef} {...p.droppableProps} className="space-y-2">
                      <p className="text-xs text-muted-foreground">גרור לשינוי סדר</p>
                      {selectedQuestions.map((q, idx) => (
                        <SelectedChip key={q.uid} q={q} idx={idx} onRemove={uid => setSelected(prev => prev.filter(x => x !== uid))} />
                      ))}
                      {p.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}