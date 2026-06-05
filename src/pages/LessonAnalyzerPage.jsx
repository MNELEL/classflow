import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Mic, Upload, FileAudio, Loader2, ChevronDown, ChevronUp, BookOpen, HelpCircle, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const STEPS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  TRANSCRIBING: 'transcribing',
  ANALYZING: 'analyzing',
  DONE: 'done',
};

const STEP_LABELS = {
  idle: '',
  uploading: 'מעלה קובץ...',
  transcribing: 'מתמלל אודיו... (עשוי לקחת כדקה)',
  analyzing: 'מנתח ומפיק סיכום ושאלות...',
  done: 'הושלם!',
};

function AnalysisCard({ item, onDelete }) {
  const [openSection, setOpenSection] = useState(null);

  const toggle = (s) => setOpenSection(prev => prev === s ? null : s);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/60">
        <CardHeader className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                <FileAudio className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold leading-tight">{item.title}</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(item.created_date).toLocaleDateString('he-IL')}
                  {item.subject && <> · {item.subject}</>}
                </p>
              </div>
            </div>
            <button onClick={() => onDelete(item.id)} className="text-muted-foreground hover:text-destructive p-1 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {/* Summary section */}
          <button
            onClick={() => toggle('summary')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-right"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">סיכום בראשי פרקים</span>
            </div>
            {openSection === 'summary' ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
          </button>
          <AnimatePresence>
            {openSection === 'summary' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-1 pb-2 px-1 space-y-2">
                  {item.ai_summary_sections?.map((sec, i) => (
                    <div key={i} className="flex gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
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

          {/* Questions section */}
          <button
            onClick={() => toggle('questions')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors text-right"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">שאלות חזרה לתלמידים</span>
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">{item.ai_review_questions?.length || 0}</Badge>
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
                            <div key={j} className="text-xs bg-white rounded-lg px-2 py-1 border border-emerald-100">
                              {['א', 'ב', 'ג', 'ד'][j]}. {o}
                            </div>
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
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LessonAnalyzerPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [step, setStep] = useState(STEPS.IDLE);
  const queryClient = useQueryClient();

  const { data: analyses = [] } = useQuery({
    queryKey: ['lesson_analyses'],
    queryFn: () => base44.entities.LibraryItem.filter({ source_type: 'audio_file' }, '-created_date', 30),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LibraryItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson_analyses'] }),
  });

  const handleAnalyze = async () => {
    if (!file) { toast.error('בחר קובץ אודיו תחילה'); return; }
    if (!title.trim()) { toast.error('הוסף כותרת לשיעור'); return; }

    try {
      // 1. Upload
      setStep(STEPS.UPLOADING);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Transcribe
      setStep(STEPS.TRANSCRIBING);
      const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });

      // 3. Analyze
      setStep(STEPS.ANALYZING);
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מומחה חינוכי. להלן תמליל שיעור בעברית:

"""
${transcript}
"""

נתח את השיעור והפק:
1. סיכום מובנה בראשי פרקים (4-7 פרקים) — כל פרק עם כותרת וסיכום קצר של 2-3 משפטים.
2. 6-10 שאלות חזרה לתלמידים מסוגים מגוונים (רב-ברירה, שאלה פתוחה, נכון/לא נכון). לכל שאלת רב-ברירה צרף 4 אפשרויות ותשובה נכונה.

ענה בעברית בלבד.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary_sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heading: { type: 'string' },
                  content: { type: 'string' },
                },
              },
            },
            review_questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  type: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  answer: { type: 'string' },
                },
              },
            },
          },
        },
      });

      // 4. Save to library
      await base44.entities.LibraryItem.create({
        title: title.trim(),
        subject: subject.trim() || undefined,
        source_type: 'audio_file',
        file_url,
        file_name: file.name,
        transcript,
        ai_status: 'ready',
        ai_summary: analysis.summary_sections?.map(s => `**${s.heading}**\n${s.content}`).join('\n\n'),
        ai_summary_sections: analysis.summary_sections,
        ai_review_questions: analysis.review_questions,
        ai_key_points: analysis.summary_sections?.map(s => s.heading),
      });

      queryClient.invalidateQueries({ queryKey: ['lesson_analyses'] });
      queryClient.invalidateQueries({ queryKey: ['library'] });
      setStep(STEPS.DONE);
      setFile(null);
      setTitle('');
      setSubject('');
      toast.success('הניתוח הושלם! הסיכום והשאלות מוכנים.');
      setTimeout(() => setStep(STEPS.IDLE), 2000);
    } catch (err) {
      toast.error('שגיאה בניתוח: ' + (err.message || 'נסה שוב'));
      setStep(STEPS.IDLE);
    }
  };

  const isProcessing = step !== STEPS.IDLE && step !== STEPS.DONE;

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto space-y-4" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="font-bold text-lg">ניתוח הקלטות שיעור</h1>
            <p className="text-xs text-muted-foreground">העלה קובץ קול → קבל סיכום ושאלות חזרה</p>
          </div>
        </div>

        {/* Upload card */}
        <Card className="border-border/60">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="כותרת השיעור (חובה)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={isProcessing}
              className="h-10"
            />
            <Input
              placeholder="מקצוע (אופציונלי)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              disabled={isProcessing}
              className="h-10"
            />

            {/* File drop area */}
            <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors
              ${file ? 'border-purple-400 bg-purple-50' : 'border-border hover:border-purple-300 hover:bg-purple-50/30'}
              ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}>
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.webm,.flac,.mpeg,.mp4"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
                disabled={isProcessing}
              />
              {file ? (
                <>
                  <FileAudio className="w-8 h-8 text-purple-500" />
                  <p className="text-sm font-semibold text-purple-700">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">לחץ לבחירת קובץ אודיו</p>
                  <p className="text-[11px] text-muted-foreground/70">MP3, WAV, M4A, OGG, WEBM, FLAC · עד 25MB</p>
                </>
              )}
            </label>

            {/* Status */}
            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 rounded-xl p-3">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{STEP_LABELS[step]}</span>
              </div>
            )}
            {step === STEPS.DONE && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>הניתוח הושלם בהצלחה!</span>
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={isProcessing || !file || !title.trim()}
              className="w-full gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isProcessing ? STEP_LABELS[step] : 'נתח את השיעור'}
            </Button>
          </CardContent>
        </Card>

        {/* Past analyses */}
        {analyses.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground">ניתוחים קודמים ({analyses.length})</h2>
            {analyses.filter(i => i.ai_summary_sections).map(item => (
              <AnalysisCard key={item.id} item={item} onDelete={(id) => deleteMutation.mutate(id)} />
            ))}
          </div>
        )}

        {analyses.length === 0 && step === STEPS.IDLE && (
          <div className="text-center py-10 text-muted-foreground">
            <Mic className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">העלה הקלטת שיעור ראשונה כדי להתחיל</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}