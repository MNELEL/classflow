import React, { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, Sparkles, X, CheckCircle2, Layers, FileStack, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import IngestResultCard from './IngestResultCard';
import { CLASSIFICATION_PROMPT, CLASSIFICATION_SCHEMA, matchStudent, detectGrouping, saveResult, getCategoryConfig } from '@/lib/smartIngest';

export default function SmartIngestPanel() {
  const qc = useQueryClient();
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [results, setResults] = useState([]);
  const [groupingSuggestion, setGroupingSuggestion] = useState(null);
  const [savingIds, setSavingIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const inputRef = useRef(null);

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const handleFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    if (valid.length !== newFiles.length) {
      toast.error('יש להעלות קבצי תמונה בלבד');
    }
    setFiles(prev => [...prev, ...valid]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setDragOver(false); }, []);

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function updateResult(id, updates) {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  async function handleAnalyze() {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
    setSavedIds(new Set());
    const newResults = [];
    const studentNames = students.map(s => s.name).join(', ');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length, fileName: file.name });
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const aiResult = await base44.integrations.Core.InvokeLLM({
          prompt: CLASSIFICATION_PROMPT(studentNames),
          response_json_schema: CLASSIFICATION_SCHEMA,
          file_urls: [file_url],
          model: 'claude_sonnet_4_6',
        });

        const matchedStudent = matchStudent(aiResult.student_name, students);
        newResults.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          fileUrl: file_url,
          previewUrl: URL.createObjectURL(file),
          fileLastModified: file.lastModified,
          ...aiResult,
          matchedStudent,
          selectedStudentId: matchedStudent?.id || '',
          selectedCategory: aiResult.category,
          status: 'ready',
        });
      } catch (err) {
        newResults.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          status: 'error',
          error: err.message || 'שגיאה בעיבוד',
        });
      }
    }

    setResults(newResults);
    setProcessing(false);

    const suggestion = detectGrouping(newResults);
    if (suggestion) setGroupingSuggestion(suggestion);
  }

  async function handleSave(result) {
    const student = students.find(s => s.id === result.selectedStudentId);
    setSavingIds(prev => new Set([...prev, result.id]));
    try {
      await saveResult(result, student);
      qc.invalidateQueries({ queryKey: ['grades'] });
      qc.invalidateQueries({ queryKey: ['library'] });
      qc.invalidateQueries({ queryKey: ['behavior'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      setSavedIds(prev => new Set([...prev, result.id]));
      toast.success(`${result.fileName} נשמר בהצלחה`);
    } catch (err) {
      toast.error('שגיאה בשמירה: ' + err.message);
    }
    setSavingIds(prev => { const s = new Set(prev); s.delete(result.id); return s; });
  }

  function handleGroupingApprove() {
    const groupedIds = new Set(groupingSuggestion.resultIds);
    const grouped = results.filter(r => groupedIds.has(r.id));
    const primaryId = grouped[0].id;
    const mergedSummary = grouped.map(r => r.summary).filter(Boolean).join('\n\n');
    const allFileNames = grouped.map(r => r.fileName);

    setResults(prev => prev.map(r => {
      if (r.id === primaryId) {
        return { ...r, summary: mergedSummary, groupedFiles: allFileNames };
      }
      if (groupedIds.has(r.id)) {
        return { ...r, merged: true, mergedInto: primaryId };
      }
      return r;
    }));
    setGroupingSuggestion(null);
    toast.success('הקבצים אוחדו. ודא את הפרטים ושמור.');
  }

  function handleGroupingReject() {
    setGroupingSuggestion(null);
  }

  function handleReset() {
    setResults([]);
    setFiles([]);
    setSavedIds(new Set());
    setGroupingSuggestion(null);
  }

  const visibleResults = results.filter(r => !r.merged);
  const allSaved = visibleResults.length > 0 && visibleResults.every(r => savedIds.has(r.id));

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !processing && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all min-h-[160px] ${
          dragOver ? 'border-primary bg-primary/5 scale-[1.01]'
            : files.length > 0 ? 'border-primary/40 bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-accent/30'
        } ${processing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} disabled={processing} />
        {files.length === 0 ? (
          <>
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-semibold">גרור תמונות לכאן</p>
            <p className="text-xs text-muted-foreground">או לחץ לבחירה מהמכשיר</p>
            <Badge variant="secondary" className="text-[10px] mt-1 gap-1">
              <Sparkles className="w-3 h-3" /> AI יזהה אוטומטית את סוג המסמך
            </Badge>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-8 h-8 text-primary" />
            <p className="text-sm font-semibold">{files.length} קבצים מוכנים</p>
            <p className="text-xs text-muted-foreground">לחץ להוספת עוד תמונות</p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && !processing && results.length === 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-card border border-border/60 rounded-xl p-3"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => removeFile(idx)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Analyze button */}
      {files.length > 0 && !processing && results.length === 0 && (
        <Button onClick={handleAnalyze} className="w-full gap-2 h-12 text-base">
          <Sparkles className="w-4 h-4" />
          נתח {files.length} קבצים
        </Button>
      )}

      {/* Progress */}
      {processing && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">מנתח קובץ {progress.current} מתוך {progress.total}</p>
              <p className="text-xs text-muted-foreground truncate">{progress.fileName}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouping suggestion */}
      <AnimatePresence>
        {groupingSuggestion && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-violet-200 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-900/40">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-500 shrink-0" />
                  <p className="text-sm font-medium">המלצת קיבוץ</p>
                </div>
                <p className="text-xs text-muted-foreground">{groupingSuggestion.reason}</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleGroupingApprove}>אשר קיבוץ</Button>
                  <Button size="sm" variant="outline" onClick={handleGroupingReject}>השאר נפרד</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">תוצאות ניתוח</p>
            <Badge variant="secondary" className="text-[10px]">{visibleResults.length} קבצים לשמירה</Badge>
          </div>
          <AnimatePresence>
            {results.map(result => (
              result.merged ? (
                <motion.div key={result.id} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}>
                  <Card className="border-muted bg-muted/30">
                    <CardContent className="p-3 flex items-center gap-2">
                      <FileStack className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{result.fileName} — אוחד עם קובץ נוסף</span>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <IngestResultCard
                  key={result.id}
                  result={result}
                  students={students}
                  onSave={handleSave}
                  onUpdate={updateResult}
                  isSaving={savingIds.has(result.id)}
                  isSaved={savedIds.has(result.id)}
                />
              )
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Reset after all saved */}
      {allSaved && !processing && (
        <Button variant="outline" className="w-full gap-2" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" /> העלה קבצים נוספים
        </Button>
      )}
    </div>
  );
}