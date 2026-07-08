import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, Sparkles, AlertCircle, CheckCircle2, User, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExamScannerPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [scannedImage, setScannedImage] = useState(null); // base64 or url
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // AI analysis result
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [savingIds, setSavingIds] = useState(new Set());

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('יש לבחור תמונה');
      return;
    }
    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onload = (e) => setScannedImage(e.target.result);
    reader.readAsDataURL(file);

    setScanning(true);
    setResult(null);
    try {
      // Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Build student name list for context
      const studentNames = students.map(s => s.name).join(', ');

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה מורה המנתח תמונה של מבחן כתוב ביד. נתח את המבחן הסרוק ועקוב אחר הכללים הבאים:

1. זהה את שם התלמיד מהכותרת / מהכיתוב בראש הדף (אם קיים)
2. נתח כל שאלה בנפרד — ציין אם התשובה נכונה, שגויה, או חלקית
3. לכל שאלה שגויה/חלקית — הסבר בקצרה מה הטעות
4. חשב את הציון הסופי (0-100)
5. כתוב משוב קצר כולל

רשימת התלמידים בכיתה (לעזרה בזיהוי השם): ${studentNames || 'לא זמין'}

ענה בעברית. אם אינך יכול לקרוא חלק מהמבחן, ציין זאת.`,
        response_json_schema: {
          type: 'object',
          properties: {
            student_name: { type: 'string', description: 'שם התלמיד כפי שמופיע במבחן' },
            subject: { type: 'string', description: 'נושא המבחן' },
            score: { type: 'number', description: 'ציון סופי 0-100' },
            max_score: { type: 'number', description: 'ציון מקסימלי (ברירת מחדל 100)' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  number: { type: 'string' },
                  text: { type: 'string', description: 'תוכן השאלה (בקצרה)' },
                  status: { type: 'string', enum: ['correct', 'wrong', 'partial', 'unreadable'] },
                  student_answer: { type: 'string' },
                  error_explanation: { type: 'string', description: 'הסבר הטעות אם יש' },
                  points_awarded: { type: 'number' },
                  points_possible: { type: 'number' }
                }
              }
            },
            overall_feedback: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'רמת הביטחון בניתוח' }
          }
        },
        file_urls: [file_url],
        model: 'claude_sonnet_4_6',
      });

      setResult(aiResult);
    } catch (err) {
      toast.error('שגיאה בניתוח המבחן — ' + (err?.message || 'נסה שוב'));
    }
    setScanning(false);
  }

  async function saveGrade(res) {
    if (!res?.score) return;
    // Match student
    const matched = students.find(s =>
      res.student_name && (
        s.name === res.student_name ||
        s.name.includes(res.student_name.split(' ')[0]) ||
        (res.student_name.includes(s.name.split(' ')[0]))
      )
    );
    if (!matched) {
      toast.error('לא נמצא תלמיד תואם — נא לשמור ידנית');
      return;
    }
    setSavingIds(prev => new Set([...prev, matched.id]));
    await base44.entities.Grade.create({
      student_id: matched.id,
      subject: res.subject || 'כללי',
      test_name: `מבחן סרוק ${new Date().toLocaleDateString('he-IL')}`,
      score: res.score,
      max_score: res.max_score || 100,
      date: new Date().toISOString().split('T')[0],
      period: 'exam',
      notes: res.overall_feedback || '',
    });
    qc.invalidateQueries({ queryKey: ['grades'] });
    toast.success(`ציון נשמר עבור ${matched.name}: ${res.score}`);
    setSavingIds(prev => { const s = new Set(prev); s.delete(matched.id); return s; });
  }

  const statusConfig = {
    correct: { label: 'נכון', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✓' },
    wrong: { label: 'שגוי', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: '✗' },
    partial: { label: 'חלקי', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '~' },
    unreadable: { label: 'לא קריא', color: 'bg-muted text-muted-foreground', icon: '?' },
  };

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto space-y-4" dir="rtl">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-xl">📷</div>
          <div>
            <h1 className="font-bold text-base">סריקת מבחנים</h1>
            <p className="text-xs text-muted-foreground">צלם / סרוק מבחן — AI יבדוק ויעדכן ציונים אוטומטית</p>
          </div>
        </div>

        {/* Upload / Camera buttons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2 justify-center flex-wrap">
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e => handleFile(e.target.files?.[0])} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files?.[0])} className="hidden" />
              <Button onClick={() => cameraInputRef.current?.click()} disabled={scanning} className="gap-2">
                <Camera className="w-4 h-4" /> צלם מבחן
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={scanning} className="gap-2">
                <Upload className="w-4 h-4" /> העלה תמונה
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {scannedImage && (
          <div className="relative rounded-xl overflow-hidden border border-border max-h-64">
            <img src={scannedImage} alt="מבחן סרוק" className="w-full object-contain max-h-64" />
            {scanning && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-white text-sm font-medium">AI מנתח את המבחן...</p>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Header */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-primary" />
                        <span className="font-bold text-base">{result.student_name || 'שם לא זוהה'}</span>
                        {result.confidence === 'low' && (
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-[10px]">⚠ ביטחון נמוך</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{result.subject || 'לא צוין נושא'}</p>
                    </div>
                    <div className="text-center">
                      <div className={`text-3xl font-black ${result.score >= 80 ? 'text-green-600' : result.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {result.score ?? '—'}
                      </div>
                      <p className="text-[10px] text-muted-foreground">מתוך {result.max_score || 100}</p>
                    </div>
                  </div>

                  {result.overall_feedback && (
                    <p className="text-xs text-muted-foreground mt-2 border-t border-border/40 pt-2">{result.overall_feedback}</p>
                  )}

                  <Button size="sm" className="mt-3 gap-1.5 w-full" onClick={() => saveGrade(result)}>
                    <Save className="w-3.5 h-3.5" /> שמור ציון במערכת
                  </Button>
                </CardContent>
              </Card>

              {/* Strengths / Weaknesses */}
              {(result.strengths?.length > 0 || result.weaknesses?.length > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  {result.strengths?.length > 0 && (
                    <Card className="border-green-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-bold text-green-700 mb-1.5">✓ חוזקות</p>
                        {result.strengths.map((s, i) => <p key={i} className="text-[11px] text-muted-foreground">• {s}</p>)}
                      </CardContent>
                    </Card>
                  )}
                  {result.weaknesses?.length > 0 && (
                    <Card className="border-red-200">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-bold text-red-700 mb-1.5">✗ חולשות</p>
                        {result.weaknesses.map((s, i) => <p key={i} className="text-[11px] text-muted-foreground">• {s}</p>)}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Per-question breakdown */}
              {result.questions?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-sm">פירוט שאלות</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-2">
                    {result.questions.map((q, i) => {
                      const cfg = statusConfig[q.status] || statusConfig.unreadable;
                      const isOpen = expandedStudent === i;
                      return (
                        <div key={i} className="border border-border/50 rounded-lg overflow-hidden">
                          <button
                            className="w-full flex items-center gap-2 p-2.5 text-right hover:bg-muted/30"
                            onClick={() => setExpandedStudent(isOpen ? null : i)}
                          >
                            <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                            <span className="text-xs flex-1 font-medium">שאלה {q.number}: {q.text?.slice(0, 50)}{q.text?.length > 50 ? '...' : ''}</span>
                            {q.points_awarded !== undefined && q.points_possible && (
                              <span className="text-[10px] text-muted-foreground shrink-0">{q.points_awarded}/{q.points_possible}</span>
                            )}
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                          </button>
                          {isOpen && (
                            <div className="px-3 pb-2.5 space-y-1.5 border-t border-border/40 bg-muted/20">
                              {q.student_answer && (
                                <p className="text-[11px]"><span className="text-muted-foreground">תשובת התלמיד:</span> {q.student_answer}</p>
                              )}
                              {q.error_explanation && (
                                <p className="text-[11px] text-red-600">⚠ {q.error_explanation}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}