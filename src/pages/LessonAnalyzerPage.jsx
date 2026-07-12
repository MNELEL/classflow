import React, { useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Upload, FileAudio, Loader2, Plus, CheckCircle2, Layers, AlignRight } from 'lucide-react';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { toast } from 'sonner';
import LessonSummaryHub from '@/components/lessonanalyzer/LessonSummaryHub.jsx';
import SummaryTaskBoard from '@/components/lessonanalyzer/SummaryTaskBoard.jsx';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';

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

const DETAIL_LEVELS = {
  brief: {
    label: 'תמציתי',
    desc: '3-4 נקודות עיקריות, 4-5 שאלות',
    sections: '3-4',
    questions: '4-5',
    detail: 'קצר ותמציתי',
  },
  standard: {
    label: 'רגיל',
    desc: '5-7 פרקים, 6-8 שאלות',
    sections: '5-7',
    questions: '6-8',
    detail: 'מפורט עם דוגמאות',
  },
  detailed: {
    label: 'מפורט',
    desc: '8-10 פרקים מלאים, 8-12 שאלות',
    sections: '8-10',
    questions: '8-12',
    detail: 'מקיף עם ציטוטים והסברים מפורטים',
  },
};

export default function LessonAnalyzerPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [step, setStep] = useState(STEPS.IDLE);
  const [savingId, setSavingId] = useState(null);
  const [detailLevel, setDetailLevel] = useState('standard');
  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => { await queryClient.invalidateQueries({ queryKey: ['lesson_analyses'] }); await queryClient.invalidateQueries({ queryKey: ['library'] }); }, [queryClient]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LibraryItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson_analyses'] }),
  });

  const handleSaveToLibrary = async (item) => {
    setSavingId(item.id);
    try {
      await base44.entities.Worksheet.create({
        title: `חזרה: ${item.title}`,
        subject: item.subject || '',
        topic: item.title,
        questions: (item.ai_review_questions || []).map((q, i) => ({
          id: String(i + 1),
          type: q.options?.length ? 'multiple_choice' : 'open',
          question: q.question,
          options: q.options || [],
          answer: q.answer,
          points: 10,
        })),
        num_questions: item.ai_review_questions?.length || 0,
        instructions: item.ai_summary_sections?.map(s => `${s.heading}: ${s.content}`).join('\n') || '',
      });
      toast.success('דף העבודה נשמר לספריית דפי עבודה!');
    } catch {
      toast.error('שגיאה בשמירה');
    } finally {
      setSavingId(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) { toast.error('בחר קובץ אודיו תחילה'); return; }
    if (!title.trim()) { toast.error('הוסף כותרת לשיעור'); return; }

    try {
      setStep(STEPS.UPLOADING);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setStep(STEPS.TRANSCRIBING);
      const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });

      setStep(STEPS.ANALYZING);
      const cfg = DETAIL_LEVELS[detailLevel];
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מומחה חינוכי. להלן תמליל שיעור בעברית:\n\n"""\n${transcript}\n"""\n\nנתח את השיעור והפק:\n1. סיכום מובנה בראשי פרקים (${cfg.sections} פרקים) — כל פרק עם כותרת וסיכום ${cfg.detail}.\n2. ${cfg.questions} שאלות חזרה לתלמידים מסוגים מגוונים (רב-ברירה, שאלה פתוחה, נכון/לא נכון). לכל שאלת רב-ברירה צרף 4 אפשרויות ותשובה נכונה. לכל שאלה צרף ציון confidence (0-100) המשקף עד כמה השאלה מדויקת ורלוונטית לתוכן השיעור.\n3. נקודות מפתח חשובות שעלו בשיעור.\n\nרמת פירוט: ${cfg.label} — ${cfg.detail}.\n\nענה בעברית בלבד.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary_sections: {
              type: 'array',
              items: { type: 'object', properties: { heading: { type: 'string' }, content: { type: 'string' } } },
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
                  confidence: { type: 'number', description: 'רמת ביטחון 0-100' },
                },
              },
            },
            key_points: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      });

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
        ai_key_points: analysis.key_points || analysis.summary_sections?.map(s => s.heading),
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
      <div ref={containerRef} className="min-h-full">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
        <div className="p-4 max-w-2xl mx-auto space-y-5 pb-8" dir="rtl">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
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
                className="h-11 text-base"
              />
              <Input
                placeholder="מקצוע (אופציונלי)"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={isProcessing}
                className="h-11 text-base"
              />

              {/* Detail level selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <AlignRight className="w-3.5 h-3.5" /> רמת פירוט לסיכום
                </label>
                <MobileSelect value={detailLevel} onValueChange={setDetailLevel} disabled={isProcessing} className="h-11 text-base">
                    {Object.entries(DETAIL_LEVELS).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span className="font-medium">{cfg.label}</span>
                          <span className="text-[10px] text-muted-foreground">{cfg.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                </MobileSelect>
              </div>

              {/* File drop */}
              <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors min-h-[100px]
                ${file ? 'border-purple-400 bg-purple-50 dark:border-purple-600 dark:bg-purple-950/30' : 'border-border hover:border-purple-300 hover:bg-purple-50/30 dark:hover:bg-purple-950/20'}
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
                <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30 rounded-xl p-3 min-h-[48px]">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{STEP_LABELS[step]}</span>
                </div>
              )}
              {step === STEPS.DONE && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30 rounded-xl p-3 min-h-[48px]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>הניתוח הושלם בהצלחה!</span>
                </div>
              )}

              <Button
                onClick={handleAnalyze}
                disabled={isProcessing || !file || !title.trim()}
                className="w-full gap-2 h-12 text-base"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isProcessing ? STEP_LABELS[step] : 'נתח את השיעור'}
              </Button>
            </CardContent>
          </Card>

          {/* Tabs: summaries + task board */}
          <Tabs defaultValue="hub" dir="rtl">
            <TabsList className="w-full grid grid-cols-2 mb-2">
              <TabsTrigger value="hub" className="text-xs gap-1"><Mic className="w-3 h-3" /> סיכומי שיעורים</TabsTrigger>
              <TabsTrigger value="board" className="text-xs gap-1"><Layers className="w-3 h-3" /> לוח משימות</TabsTrigger>
            </TabsList>
            <TabsContent value="hub">
              <LessonSummaryHub
                onSaveToLibrary={handleSaveToLibrary}
                savingId={savingId}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            </TabsContent>
            <TabsContent value="board">
              <SummaryTaskBoard />
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </AppLayout>
  );
}