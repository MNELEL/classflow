import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HardDrive, Search, Loader2, FileText, Presentation, File, FolderOpen, ChevronRight, Plus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
                  <Button size="sm" variant="ghost" onClick={() => openFolder(file)} className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                    פתח <FolderOpen className="w-3.5 h-3.5" />
                  </Button>
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
    </div>
  );
}