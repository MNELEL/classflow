import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HardDrive, Search, Loader2, FileText, Presentation, File, FolderOpen, ChevronRight, Plus, CheckCircle2, AlertCircle, RefreshCw, FolderDown, Brain, X } from 'lucide-react';
import { toast } from 'sonner';
import { extractStyleFromLibrary } from '@/lib/teacherStyle';

const CONNECTOR_ID = '6a37ebf86b324d770927a6e6';

const MIME_ICONS = {
  'application/pdf': { icon: FileText, color: 'text-red-500', label: 'PDF' },
  'application/vnd.google-apps.document': { icon: FileText, color: 'text-blue-500', label: 'Doc' },
  'application/vnd.google-apps.presentation': { icon: Presentation, color: 'text-orange-500', label: 'Slides' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: Presentation, color: 'text-orange-500', label: 'PPTX' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-500', label: 'DOCX' },
  'application/vnd.google-apps.folder': { icon: FolderOpen, color: 'text-yellow-500', label: 'תיקייה' },
};

function FileIcon({ mimeType }) {
  const cfg = MIME_ICONS[mimeType] || { icon: File, color: 'text-muted-foreground', label: '?' };
  const Icon = cfg.icon;
  return <Icon className={`w-5 h-5 shrink-0 ${cfg.color}`} />;
}

export default function GoogleDrivePanel({ onImported }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [folderStack, setFolderStack] = useState([]); // [{id, name}]
  const [importing, setImporting] = useState({});
  const [imported, setImported] = useState({});
  const [fetching, setFetching] = useState(false);

  // Bulk folder import state
  const [bulkTarget, setBulkTarget] = useState(null); // {id, name} folder chosen for bulk import
  const [bulkScanning, setBulkScanning] = useState(false);
  const [bulkFiles, setBulkFiles] = useState(null); // scanned file list, null until scanned
  const [bulkTruncated, setBulkTruncated] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [learningStyle, setLearningStyle] = useState(false);
  const [styleProgress, setStyleProgress] = useState({ label: '', pct: 0 });

  const currentFolder = folderStack[folderStack.length - 1] || null;

  const fetchFiles = useCallback(async (q = '', folderId = null) => {
    setFetching(true);
    try {
      const res = await base44.functions.invoke('driveFiles', { action: 'list', query: q, folderId });
      setFiles(res.data?.files || []);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setFetching(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles('', currentFolder?.id || null);
  }, [currentFolder]);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        fetchFiles('', null);
      }
    }, 500);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFiles(query, currentFolder?.id || null);
  };

  const openFolder = (file) => {
    setFolderStack(prev => [...prev, { id: file.id, name: file.name }]);
    setQuery('');
  };

  const goBack = (idx) => {
    setFolderStack(prev => prev.slice(0, idx));
  };

  const handleImport = async (file) => {
    setImporting(prev => ({ ...prev, [file.id]: true }));
    try {
      await base44.functions.invoke('driveFiles', { action: 'import', fileId: file.id });
      setImported(prev => ({ ...prev, [file.id]: true }));
      toast.success(`"${file.name}" נוסף לספרייה!`);
      onImported?.();
    } catch {
      toast.error('שגיאה בייבוא הקובץ');
    } finally {
      setImporting(prev => ({ ...prev, [file.id]: false }));
    }
  };

  // ── Bulk folder import ──────────────────────────────────────────────────
  // Two-step flow, deliberately not one click: scan first (shows the exact
  // file count so the teacher isn't surprised by importing 200 files by
  // accident), then a separate confirm imports them. Style re-learning is
  // offered as a third, also-explicit step after import — never automatic,
  // since it makes an LLM call and touches TeacherStyleProfile.
  const openBulkDialog = (folder) => {
    setBulkTarget(folder);
    setBulkFiles(null);
    setBulkTruncated(false);
    setBulkProgress({ done: 0, total: 0, failed: 0 });
  };

  const closeBulkDialog = () => {
    if (bulkImporting || bulkScanning) return; // don't let it close mid-operation
    setBulkTarget(null);
    setBulkFiles(null);
  };

  const scanFolder = async () => {
    if (!bulkTarget) return;
    setBulkScanning(true);
    try {
      const res = await base44.functions.invoke('driveFiles', {
        action: 'list_folder_recursive',
        folderId: bulkTarget.id,
      });
      const found = res.data?.files || [];
      setBulkFiles(found);
      setBulkTruncated(!!res.data?.truncated);
      if (found.length === 0) {
        toast.error('לא נמצאו קבצים מתאימים בתיקייה זו');
      }
    } catch {
      toast.error('שגיאה בסריקת התיקייה');
      setBulkFiles([]);
    } finally {
      setBulkScanning(false);
    }
  };

  const confirmBulkImport = async () => {
    if (!bulkFiles || bulkFiles.length === 0) return;
    setBulkImporting(true);
    setBulkProgress({ done: 0, total: bulkFiles.length, failed: 0 });
    let failed = 0;
    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];
      try {
        await base44.functions.invoke('driveFiles', { action: 'import', fileId: file.id });
      } catch {
        failed++;
      }
      setBulkProgress({ done: i + 1, total: bulkFiles.length, failed });
    }
    setBulkImporting(false);
    const succeeded = bulkFiles.length - failed;
    if (succeeded > 0) {
      toast.success(failed > 0
        ? `יובאו ${succeeded} קבצים, ${failed} נכשלו`
        : `יובאו ${succeeded} קבצים בהצלחה!`);
      onImported?.();
    } else {
      toast.error('ייבוא הקבצים נכשל');
    }
  };

  const learnStyleFromImport = async () => {
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
      closeBulkDialog();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!connected) return (
    <div className="text-center py-12 space-y-4">
      <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto">
        <HardDrive className="w-8 h-8 text-blue-500" />
      </div>
      <div>
        <h3 className="font-bold text-base">חבר את Google Drive</h3>
        <p className="text-sm text-muted-foreground mt-1">גש לקבצים שלך ישירות מהספרייה</p>
      </div>
      <Button onClick={handleConnect} className="gap-2">
        <HardDrive className="w-4 h-4" /> התחבר ל-Google Drive
      </Button>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h2 className="font-bold text-sm">Google Drive</h2>
            <p className="text-xs text-muted-foreground">{files.length} קבצים</p>
          </div>
        </div>
        <button onClick={() => fetchFiles(query, currentFolder?.id || null)} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="חפש קבצים ב-Drive..." className="pr-9 h-9" />
        </div>
        <Button type="submit" size="sm" variant="outline">חפש</Button>
      </form>

      {/* Breadcrumb */}
      {folderStack.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          <button onClick={() => setFolderStack([])} className="hover:text-foreground transition-colors">Drive</button>
          {folderStack.map((f, i) => (
            <React.Fragment key={f.id}>
              <ChevronRight className="w-3 h-3" />
              <button onClick={() => goBack(i + 1)} className="hover:text-foreground transition-colors">{f.name}</button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Files list */}
      {fetching ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">לא נמצאו קבצים</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map(file => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            const isImported = imported[file.id];
            const isImporting = importing[file.id];

            return (
              <div key={file.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 transition-colors group">
                <FileIcon mimeType={file.mimeType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {MIME_ICONS[file.mimeType]?.label || 'קובץ'}
                    {file.modifiedTime && ` · ${new Date(file.modifiedTime).toLocaleDateString('he-IL')}`}
                  </p>
                </div>
                {isFolder ? (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" onClick={() => openBulkDialog(file)} className="gap-1 text-xs" title="ייבא את כל התיקייה">
                      <FolderDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openFolder(file)} className="gap-1 text-xs">
                      פתח <FolderOpen className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : isImported ? (
                  <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-green-500" /> נוסף
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => handleImport(file)}
                    disabled={isImporting}
                    className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0">
                    {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    ייבא
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk folder import dialog */}
      {bulkTarget && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={closeBulkDialog}>
          <div dir="rtl" onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-4 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderDown className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">ייבוא תיקייה: {bulkTarget.name}</h3>
              </div>
              {!bulkImporting && !bulkScanning && !learningStyle && (
                <button onClick={closeBulkDialog} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {bulkFiles === null ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  יסרוק את התיקייה ואת כל תתי-התיקיות שבתוכה (עד 6 רמות עומק, עד 500 קבצים), ויציג כמה קבצים נמצאו לפני ייבוא בפועל.
                </p>
                <Button onClick={scanFolder} disabled={bulkScanning} className="w-full gap-2">
                  {bulkScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {bulkScanning ? 'סורק...' : 'סרוק תיקייה'}
                </Button>
              </div>
            ) : bulkFiles.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                לא נמצאו קבצים מתאימים בתיקייה זו
              </div>
            ) : !bulkImporting && bulkProgress.done === 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm">
                    נמצאו <strong>{bulkFiles.length}</strong> קבצים לייבוא
                    {bulkTruncated && <span className="text-amber-600"> (נמצאו עוד קבצים מעבר למגבלה — ניתן לייבא שוב אחר כך להשלמה)</span>}
                  </p>
                </div>
                <Button onClick={confirmBulkImport} className="w-full gap-2">
                  <FolderDown className="w-4 h-4" /> ייבא {bulkFiles.length} קבצים
                </Button>
              </div>
            ) : bulkImporting ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>מייבא {bulkProgress.done} מתוך {bulkProgress.total}...</span>
                  {bulkProgress.failed > 0 && <span className="text-destructive">{bulkProgress.failed} נכשלו</span>}
                </div>
                <Progress value={(bulkProgress.done / bulkProgress.total) * 100} />
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
                    {bulkProgress.done - bulkProgress.failed} קבצים נוספו לספרייה
                    {bulkProgress.failed > 0 && ` (${bulkProgress.failed} נכשלו)`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  אפשר עכשיו לעדכן את פרופיל הסגנון האישי כדי שהמערכת תלמד את סגנון ההוראה שלך מהחומרים החדשים, וכל תוכן חדש שתיצור ייצור בהתאם.
                </p>
                <div className="flex gap-2">
                  <Button onClick={learnStyleFromImport} className="flex-1 gap-2">
                    <Brain className="w-4 h-4" /> עדכן פרופיל סגנון
                  </Button>
                  <Button variant="outline" onClick={closeBulkDialog}>סיימתי</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
