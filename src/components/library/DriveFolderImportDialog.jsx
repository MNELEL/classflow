import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Search, Loader2, CheckCircle2, FolderDown, Brain, X } from 'lucide-react';
import { toast } from 'sonner';
import { extractStyleFromLibrary } from '@/lib/teacherStyle';

// Shared whole-folder import flow: scan → confirm → import → optional
// style re-learning. Reused by both the in-library Drive browser
// (GoogleDrivePanel) and the upload modal's Drive tab so the two entry
// points stay in sync and never drift.
//
// Two-step flow, deliberately not one click: scan first (shows the exact
// file count so the teacher isn't surprised by importing 200 files by
// accident), then a separate confirm imports them. Style re-learning is
// offered as a third, also-explicit step after import — never automatic,
// since it makes an LLM call and touches TeacherStyleProfile.
export default function DriveFolderImportDialog({ open, onClose, folder, onImported }) {
  const [scanning, setScanning] = useState(false);
  const [files, setFiles] = useState(null); // null until scanned
  const [truncated, setTruncated] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [learningStyle, setLearningStyle] = useState(false);
  const [styleProgress, setStyleProgress] = useState({ label: '', pct: 0 });

  // Reset whenever a fresh folder import is opened
  useEffect(() => {
    if (open && folder) {
      setFiles(null);
      setTruncated(false);
      setImporting(false);
      setLearningStyle(false);
      setProgress({ done: 0, total: 0, failed: 0 });
    }
  }, [open, folder]);

  if (!open || !folder) return null;

  const scanFolder = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke('driveFiles', {
        action: 'list_folder_recursive',
        folderId: folder.id,
      });
      const found = res.data?.files || [];
      setFiles(found);
      setTruncated(!!res.data?.truncated);
      if (found.length === 0) toast.error('לא נמצאו קבצים מתאימים בתיקייה זו');
    } catch {
      toast.error('שגיאה בסריקת התיקייה');
      setFiles([]);
    } finally {
      setScanning(false);
    }
  };

  const confirmImport = async () => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: files.length, failed: 0 });
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await base44.functions.invoke('driveFiles', { action: 'import', fileId: file.id });
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: files.length, failed });
    }
    setImporting(false);
    const succeeded = files.length - failed;
    if (succeeded > 0) {
      toast.success(failed > 0
        ? `יובאו ${succeeded} קבצים, ${failed} נכשלו`
        : `יובאו ${succeeded} קבצים בהצלחה!`);
      onImported?.();
    } else {
      toast.error('ייבוא הקבצים נכשל');
    }
  };

  const learnStyle = async () => {
    setLearningStyle(true);
    setStyleProgress({ label: 'טוען חומרים...', pct: 0 });
    try {
      const items = await base44.entities.LibraryItem.list('-created_date', 300);
      const result = await extractStyleFromLibrary(items, (label, pct) => {
        setStyleProgress({ label, pct });
      });
      if (result) {
        toast.success(`פרופיל הסגנון עודכן — נלמד מ-${result.items_count} חומרים!`);
      } else {
        toast.error('לא נמצא מספיק תוכן ללמידת סגנון עדיין');
      }
    } catch {
      toast.error('שגיאה בלמידת הסגנון');
    } finally {
      setLearningStyle(false);
      onClose();
    }
  };

  const close = () => {
    if (importing || scanning || learningStyle) return; // don't close mid-operation
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={close}>
      <div dir="rtl" onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-4 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderDown className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">ייבוא תיקייה: {folder.name}</h3>
          </div>
          {!importing && !scanning && !learningStyle && (
            <button onClick={close} className="text-muted-foreground hover:text-foreground" aria-label="סגור">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {files === null ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              יסרוק את התיקייה ואת כל תתי-התיקיות שבתוכה (עד 6 רמות עומק, עד 500 קבצים), ויציג כמה קבצים נמצאו לפני ייבוא בפועל.
            </p>
            <Button onClick={scanFolder} disabled={scanning} className="w-full gap-2">
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {scanning ? 'סורק...' : 'סרוק תיקייה'}
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            לא נמצאו קבצים מתאימים בתיקייה זו
          </div>
        ) : !importing && progress.done === 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm">
                נמצאו <strong>{files.length}</strong> קבצים לייבוא
                {truncated && <span className="text-amber-600"> (נמצאו עוד קבצים מעבר למגבלה — ניתן לייבא שוב אחר כך להשלמה)</span>}
              </p>
            </div>
            <Button onClick={confirmImport} className="w-full gap-2">
              <FolderDown className="w-4 h-4" /> ייבא {files.length} קבצים
            </Button>
          </div>
        ) : importing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>מייבא {progress.done} מתוך {progress.total}...</span>
              {progress.failed > 0 && <span className="text-destructive">{progress.failed} נכשלו</span>}
            </div>
            <Progress value={(progress.done / progress.total) * 100} />
          </div>
        ) : learningStyle ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Brain className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>{styleProgress.label || 'לומד את הסגנון...'}</span>
            </div>
            <Progress value={styleProgress.pct} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                {progress.done - progress.failed} קבצים נוספו לספרייה
                {progress.failed > 0 && ` (${progress.failed} נכשלו)`}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              אפשר עכשיו לעדכן את פרופיל הסגנון האישי כדי שהמערכת תלמד את סגנון ההוראה שלך מהחומרים החדשים, וכל תוכן חדש שתיצור ייצור בהתאם.
            </p>
            <div className="flex gap-2">
              <Button onClick={learnStyle} className="flex-1 gap-2">
                <Brain className="w-4 h-4" /> עדכן פרופיל סגנון
              </Button>
              <Button variant="outline" onClick={close}>סיימתי</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}