import React, { useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Upload, FileText, Image as ImageIcon, Mic, Users, BookOpen,
  CheckCircle2, AlertCircle, Loader2, X, FileCheck, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const FILE_TYPES = {
  students: {
    label: 'תלמידים',
    icon: Users,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    formats: 'PDF, JPG, PNG',
    accept: '.pdf,.jpg,.jpeg,.png',
    guidance: 'רשימת תלמידים עם שמות, טלפונים ופרטים. ודא שכל תלמיד מופיע בשורה נפרדת.',
    example: 'דוגמה: משה כהן, כיתה ו׳, 050-1234567',
  },
  material: {
    label: 'חומר לימוד',
    icon: BookOpen,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    formats: 'PDF, JPG, PNG',
    accept: '.pdf,.jpg,.jpeg,.png',
    guidance: 'דפי עבודה, מבחנים או חומרי לימוד. המערכת תחלץ טקסט ותנתח את התוכן.',
    example: 'דוגמה: דף עבודה במתמטיקה, מבחן בתנ"ך',
  },
  audio: {
    label: 'אודיו',
    icon: Mic,
    color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    formats: 'MP3, WAV, M4A, OGG',
    accept: '.mp3,.wav,.m4a,.ogg,.webm,.flac',
    guidance: 'הקלטת שיעור לתמלול וניתוח AI. וודא איכות שמע טובה וללא רעשי רקע.',
    example: 'הקלטה באורך עד 25 דקות לתוצאות מיטביות',
  },
};

export default function IngestPage() {
  const [fileType, setFileType] = useState('students');
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  const currentType = FILE_TYPES[fileType];

  const handleRefresh = useCallback(async () => {}, []);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const handleFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      return currentType.accept.split(',').includes(ext);
    });
    if (valid.length !== newFiles.length) {
      toast.error(`חלק מהקבצים לא תואמים. פורמטים נתמכים: ${currentType.formats}`);
    }
    setFiles(prev => [...prev, ...valid]);
  }, [currentType]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleProcess() {
    if (files.length === 0) {
      toast.error('העלה לפחות קובץ אחד');
      return;
    }

    setProcessing(true);
    setResults([]);
    const allResults = [];

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        if (fileType === 'audio') {
          const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
          allResults.push({
            name: file.name,
            status: 'success',
            file_url,
            extracted: transcript,
            type: 'audio',
            fields: { transcript: transcript.length, chars: transcript.length },
          });
        } else {
          const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
              type: 'object',
              properties: {
                full_text: { type: 'string', description: 'כל הטקסט שחולץ מהקובץ' },
                rows: {
                  type: 'array',
                  description: 'שורות נתונים שזוהו בקובץ',
                  items: {
                    type: 'object',
                    properties: {
                      data: { type: 'string', description: 'תוכן השורה' },
                      confidence: { type: 'number', description: 'רמת ביטחון 0-100' },
                    },
                  },
                },
              },
            },
          });

          const output = extracted?.output || {};
          allResults.push({
            name: file.name,
            status: 'success',
            file_url,
            extracted: output.full_text || '',
            rows: output.rows || [],
            type: fileType,
          });
        }

        toast.success(`${file.name} עובד בהצלחה`);
      } catch (err) {
        allResults.push({
          name: file.name,
          status: 'error',
          error: err.message || 'שגיאה בעיבוד',
        });
        toast.error(`שגיאה בעיבוד ${file.name}`);
      }
    }

    setResults(allResults);
    setProcessing(false);

    // Save to library
    const successResults = allResults.filter(r => r.status === 'success');
    if (successResults.length > 0 && title.trim()) {
      try {
        for (const r of successResults) {
          await base44.entities.LibraryItem.create({
            title: title.trim() || r.name,
            source_type: r.type === 'audio' ? 'audio_file' : (r.name.endsWith('.pdf') ? 'pdf' : 'word_doc'),
            file_url: r.file_url,
            file_name: r.name,
            transcript: r.type === 'audio' ? r.extracted : undefined,
            description: r.extracted?.slice(0, 500),
            ai_status: r.type === 'audio' ? 'ready' : 'pending',
            category: r.type === 'students' ? 'תלמידים' : r.type === 'material' ? 'חומר לימוד' : undefined,
          });
        }
        toast.success(`${successResults.length} קבצים נשמרו לספרייה`);
        setFiles([]);
        setTitle('');
      } catch {
        toast.error('שגיאה בשמירה לספרייה');
      }
    }
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="overflow-y-auto h-full relative">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
        <div className="p-4 max-w-2xl mx-auto space-y-5 pb-8" dir="rtl">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">העלאת קבצים</h1>
              <p className="text-xs text-muted-foreground">גרור קבצים או בחר מהמכשיר</p>
            </div>
          </div>

          {/* File type selector */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">סוג תוכן</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(FILE_TYPES).map(([key, config]) => {
                const active = fileType === key;
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => { setFileType(key); setFiles([]); setResults([]); }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/20'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format info */}
          <Card className="border-border/60 bg-muted/30">
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold">פורמטים נתמכים: {currentType.formats}</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{currentType.guidance}</p>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground/80">{currentType.example}</p>
              </div>
            </CardContent>
          </Card>

          {/* Title input */}
          <Input
            placeholder="כותרת / תיאור קבוצת הקבצים (אופציונלי)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={processing}
            className="h-11 text-base"
          />

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !processing && inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all min-h-[160px] ${
              dragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : files.length > 0
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border hover:border-primary/30 hover:bg-accent/30'
            } ${processing ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={currentType.accept}
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
              disabled={processing}
            />
            {files.length === 0 ? (
              <>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${currentType.color}`}>
                  {fileType === 'audio' ? <Mic className="w-7 h-7" /> : fileType === 'students' ? <Users className="w-7 h-7" /> : <BookOpen className="w-7 h-7" />}
                </div>
                <p className="text-sm font-semibold">גרור קבצים לכאן</p>
                <p className="text-xs text-muted-foreground">או לחץ לבחירה מהמכשיר</p>
                <Badge variant="secondary" className="text-[10px] mt-1">{currentType.formats}</Badge>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-8 h-8 text-primary" />
                <p className="text-sm font-semibold">{files.length} קבצים מוכנים</p>
                <p className="text-xs text-muted-foreground">לחץ להוספת עוד קבצים</p>
              </>
            )}
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 bg-card border border-border/60 rounded-xl p-3"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${currentType.color}`}>
                    {file.name.match(/\.(jpg|jpeg|png)$/i) ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  {!processing && (
                    <button onClick={() => removeFile(idx)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Processing indicator */}
          {processing && (
            <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 rounded-xl p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>מעבד קבצים... זה עשוי לקחת דקה</span>
            </div>
          )}

          {/* Process button */}
          {files.length > 0 && !processing && (
            <Button onClick={handleProcess} className="w-full gap-2 h-12 text-base">
              <Sparkles className="w-4 h-4" />
              עבד {files.length} קבצי {currentType.label}
            </Button>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">תוצאות עיבוד</p>
              {results.map((result, idx) => (
                <Card key={idx} className={result.status === 'error' ? 'border-destructive/30' : 'border-emerald-200 dark:border-emerald-900/40'}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      {result.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                      <p className="text-sm font-medium truncate flex-1">{result.name}</p>
                      {result.rows?.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{result.rows.length} שורות</Badge>
                      )}
                      {result.extracted && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] border-0">{result.extracted.length} תווים</Badge>
                      )}
                    </div>
                    {result.error && <p className="text-xs text-destructive">{result.error}</p>}
                    {result.extracted && (
                      <div className="bg-muted/30 rounded-lg p-2.5 text-xs leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {result.extracted.slice(0, 500)}{result.extracted.length > 500 && '...'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </div>
      </div>
    </AppLayout>
  );
}