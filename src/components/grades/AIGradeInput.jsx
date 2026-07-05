import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Sparkles, Mic, MicOff, Check, X, Loader2, Edit2, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PERIOD_LABELS = { weekly: 'שבועי', monthly: 'חודשי', exam: 'מבחן', quiz: 'חידון', homework: 'שיעורי בית' };

export default function AIGradeInput({ students, grades, onGradesSaved }) {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftCards, setDraftCards] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const recognitionRef = useRef(null);
  const qc = useQueryClient();

  const activeStudents = students.filter(s => s.is_active !== false);

  // Voice input
  function toggleRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('הדפדפן שלך אינו תומך בזיהוי קול'); return; }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'he-IL';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setText(prev => prev ? prev + ' ' + transcript : transcript);
    };
    rec.onerror = () => { setIsRecording(false); toast.error('שגיאה בהקלטה'); };
    rec.onend = () => setIsRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setIsRecording(true);
    toast.success('מקליט... דבר בעברית');
  }

  async function analyzeText() {
    if (!text.trim()) { toast.error('הכנס טקסט לניתוח'); return; }
    setIsAnalyzing(true);
    try {
      const studentNames = activeStudents.map(s => s.name).join(', ');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מערכת ניהול ציונים. נתח את הטקסט הבא וחלץ ממנו ציוני תלמידים.
        
רשימת תלמידים בכיתה: ${studentNames}

טקסט לניתוח:
"${text}"

הנחיות:
- התאם כל שם מהטקסט לתלמיד הקרוב ביותר מהרשימה (לפי דמיון שמות)
- חלץ מקצוע, ציון, ושם מבחן אם קיים
- אם הציון מקסימלי לא צוין, ברירת מחדל הוא 100
- קבע סוג הערכה (exam/quiz/homework/weekly/monthly) לפי ההקשר
- אם לא ברור - השתמש ב"exam"
- תאריך ברירת מחדל הוא היום: ${format(new Date(), 'yyyy-MM-dd')}`,
        response_json_schema: {
          type: 'object',
          properties: {
            grades: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  student_name: { type: 'string' },
                  matched_student_name: { type: 'string' },
                  subject: { type: 'string' },
                  test_name: { type: 'string' },
                  score: { type: 'number' },
                  max_score: { type: 'number' },
                  period: { type: 'string', enum: ['weekly', 'monthly', 'exam', 'quiz', 'homework'] },
                  date: { type: 'string' },
                  notes: { type: 'string' }
                }
              }
            },
            summary: { type: 'string' }
          }
        }
      });

      if (!result?.grades?.length) {
        toast.error('לא זוהו ציונים בטקסט. נסה לנסח מחדש.');
        setIsAnalyzing(false);
        return;
      }

      // Match student names to IDs
      const cards = result.grades.map((g, i) => {
        const matchName = g.matched_student_name || g.student_name;
        const student = activeStudents.find(s =>
          s.name === matchName ||
          s.name.includes(matchName) ||
          matchName?.includes(s.name.split(' ')[0])
        );
        return {
          id: i,
          student_id: student?.id || null,
          student_name: student?.name || g.student_name,
          subject: g.subject || '',
          test_name: g.test_name || '',
          score: g.score ?? 0,
          max_score: g.max_score ?? 100,
          period: g.period || 'exam',
          date: g.date || format(new Date(), 'yyyy-MM-dd'),
          notes: g.notes || '',
          confirmed: false,
          unmatched: !student,
        };
      });

      setDraftCards(cards);
      if (result.summary) toast.success(result.summary);
    } catch (err) {
      toast.error('שגיאה בניתוח — נסה שוב');
    }
    setIsAnalyzing(false);
  }

  function updateCard(idx, field, value) {
    setDraftCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }

  function removeCard(idx) {
    setDraftCards(prev => prev.filter((_, i) => i !== idx));
  }

  const [savingIds, setSavingIds] = useState([]);

  async function saveAll() {
    const toSave = draftCards.filter(c => c.student_id);
    if (!toSave.length) { toast.error('אין ציונים מאושרים עם תלמיד תואם לשמירה'); return; }
    setSavingIds(toSave.map(c => c.id));
    try {
      await Promise.all(toSave.map(c =>
        base44.entities.Grade.create({
          student_id: c.student_id,
          subject: c.subject,
          test_name: c.test_name,
          score: Number(c.score),
          max_score: Number(c.max_score),
          period: c.period,
          date: c.date,
          notes: c.notes,
        })
      ));
      toast.success(`נשמרו ${toSave.length} ציונים בהצלחה!`);
      setDraftCards([]);
      setText('');
      onGradesSaved?.();
      qc.invalidateQueries({ queryKey: ['grades'] });
    } catch (err) {
      toast.error('שגיאה בשמירה');
    }
    setSavingIds([]);
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Input area */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">הזנת ציונים בטקסט חופשי</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          לדוגמה: <span className="text-foreground font-medium">"יוסי קיבל 90 במתמטיקה, תמר 85 בחידון אנגלית, אהרון 70 בהיסטוריה"</span>
        </p>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="הקלד או הכתב ציונים בשפה טבעית..."
          className="min-h-[100px] text-sm resize-none mb-3"
          dir="rtl"
        />
        <div className="flex gap-2">
          <Button
            onClick={toggleRecording}
            variant={isRecording ? 'destructive' : 'outline'}
            size="sm"
            className="gap-1.5"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording ? 'עצור הקלטה' : 'הקלטה קולית'}
          </Button>
          <Button
            onClick={analyzeText}
            disabled={isAnalyzing || !text.trim()}
            size="sm"
            className="gap-1.5 flex-1"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isAnalyzing ? 'מנתח...' : 'נתח עם AI'}
          </Button>
        </div>
      </div>

      {/* Draft cards */}
      <AnimatePresence>
        {draftCards.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">כרטיסי טיוטה ({draftCards.length})</p>
              <Button size="sm" onClick={saveAll} disabled={savingIds.length > 0} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                {savingIds.length > 0 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} שמור הכל
              </Button>
            </div>

            <div className="space-y-3">
              {draftCards.map((card, idx) => (
                <DraftCard
                  key={card.id}
                  card={card}
                  students={activeStudents}
                  isEditing={editingIdx === idx}
                  isSaving={savingIds.includes(card.id)}
                  onEdit={() => setEditingIdx(editingIdx === idx ? null : idx)}
                  onUpdate={(field, val) => updateCard(idx, field, val)}
                  onRemove={() => removeCard(idx)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DraftCard({ card, students, isEditing, isSaving, onEdit, onUpdate, onRemove }) {
  const pct = card.max_score > 0 ? Math.round((card.score / card.max_score) * 100) : 0;
  const scoreColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500';
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-card border rounded-xl p-4 shadow-sm",
        card.unmatched ? "border-yellow-300 dark:border-yellow-700" : "border-border/70"
      )}
    >
      {card.unmatched && (
        <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 text-xs mb-2">
          <AlertCircle className="w-3.5 h-3.5" /> תלמיד לא זוהה — בחר ידנית
        </div>
      )}

      {isEditing ? (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">תלמיד</label>
              <MobileSelect
                value={card.student_id || ''}
                onValueChange={(val) => {
                  const s = students.find(st => st.id === val);
                  onUpdate('student_id', val);
                  onUpdate('student_name', s?.name || '');
                  onUpdate('unmatched', !s);
                }}
                placeholder="בחר תלמיד..."
                className="text-sm"
              >
                <SelectItem value={null}>בחר תלמיד...</SelectItem>
                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </MobileSelect>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">מקצוע</label>
              <Input value={card.subject} onChange={e => onUpdate('subject', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">שם מבחן</label>
              <Input value={card.test_name} onChange={e => onUpdate('test_name', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">תאריך</label>
              <Input type="date" value={card.date} onChange={e => onUpdate('date', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ציון</label>
              <Input type="number" inputMode="numeric" value={card.score} onChange={e => onUpdate('score', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">מתוך</label>
              <Input type="number" inputMode="numeric" value={card.max_score} onChange={e => onUpdate('max_score', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">הערות</label>
            <Input value={card.notes} onChange={e => onUpdate('notes', e.target.value)} className="h-8 text-sm" placeholder="הערות (אופציונלי)" />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-sm">{card.student_name}</p>
              <p className="text-xs text-muted-foreground">{card.subject} {card.test_name ? `• ${card.test_name}` : ''}</p>
            </div>
            <div className="text-left">
              <span className={`text-2xl font-bold ${scoreColor}`}>{card.score}</span>
              <span className="text-xs text-muted-foreground">/{card.max_score}</span>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mb-2">
            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">{PERIOD_LABELS[card.period] || card.period}</Badge>
            <Badge variant="outline" className="text-[10px]">{card.date}</Badge>
            {card.notes && <Badge variant="outline" className="text-[10px] max-w-[150px] truncate">{card.notes}</Badge>}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mt-3 justify-end">
        <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 text-xs gap-1" disabled={isSaving}>
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit2 className="w-3 h-3" />} {isEditing ? 'סגור' : 'ערוך'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemove} className="h-7 text-xs gap-1 text-destructive hover:text-destructive" disabled={isSaving}>
          <X className="w-3 h-3" /> הסר
        </Button>
      </div>
    </motion.div>
  );
}