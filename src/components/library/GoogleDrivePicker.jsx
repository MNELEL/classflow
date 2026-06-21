import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  CloudIcon, Search, FolderOpen, ChevronRight, FileText,
  Image, Film, RefreshCw, X, Plus, ExternalLink, Loader2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const CONNECTOR_ID = '6a37ebf86b324d770927a6e6';

function getMimeLabel(mimeType) {
  if (!mimeType) return 'קובץ';
  if (mimeType.includes('document')) return 'מסמך';
  if (mimeType.includes('presentation')) return 'מצגת';
  if (mimeType.includes('spreadsheet')) return 'גיליון';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('image')) return 'תמונה';
  if (mimeType.includes('video')) return 'וידאו';
  return 'קובץ';
}

function getMimeColor(mimeType) {
  if (!mimeType) return 'bg-gray-100 text-gray-600';
  if (mimeType.includes('document')) return 'bg-blue-100 text-blue-700';
  if (mimeType.includes('presentation')) return 'bg-orange-100 text-orange-700';
  if (mimeType.includes('spreadsheet')) return 'bg-green-100 text-green-700';
  if (mimeType.includes('pdf')) return 'bg-red-100 text-red-700';
  if (mimeType.includes('image')) return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-600';
}

function FileRow({ file, onSelect }) {
  return (
    <button
      onClick={() => onSelect(file)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors text-right group"
    >
      {file.thumbnailLink ? (
        <img src={file.thumbnailLink} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border" />
      ) : (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getMimeColor(file.mimeType)}`}>
          <FileText className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1 min-w-0 text-right">
        <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getMimeLabel(file.mimeType)} · {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('he-IL') : ''}
        </p>
      </div>
      <Badge variant="outline" className={`text-[10px] shrink-0 ${getMimeColor(file.mimeType)}`}>
        {getMimeLabel(file.mimeType)}
      </Badge>
    </button>
  );
}

export default function GoogleDrivePicker({ open, onClose, onImport }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const fetchFiles = useCallback(async (q = '') => {
    setSearching(true);
    try {
      const res = await base44.functions.invoke('googleDriveFiles', { action: 'list', query: q || undefined });
      setFiles(res.data?.files || []);
      setConnected(true);
    } catch (err) {
      if (err?.response?.data?.error === 'not_connected' || err?.response?.status === 403) {
        setConnected(false);
      }
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchFiles();
    }
  }, [open, fetchFiles]);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        setLoading(true);
        fetchFiles();
      }
    }, 500);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFiles(query);
  };

  const handleSelectFile = async (file) => {
    try {
      // Get full file details including webViewLink
      const res = await base44.functions.invoke('googleDriveFiles', { action: 'getFile', fileId: file.id });
      const fullFile = res.data?.file || file;
      onImport({
        title: fullFile.name,
        source_type: fullFile.mimeType?.includes('pdf') ? 'pdf'
          : fullFile.mimeType?.includes('presentation') ? 'presentation'
          : fullFile.mimeType?.includes('image') ? 'image'
          : 'external_link',
        external_url: fullFile.webViewLink || fullFile.webContentLink,
        file_url: fullFile.webViewLink,
        description: `מ-Google Drive · ${getMimeLabel(fullFile.mimeType)}`,
      });
      toast.success(`"${fullFile.name}" נוסף לספרייה!`);
      onClose();
    } catch {
      toast.error('שגיאה בטעינת הקובץ');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudIcon className="w-5 h-5 text-blue-500" />
            ייבוא מ-Google Drive
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !connected ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <CloudIcon className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">חבר את Google Drive שלך</p>
              <p className="text-sm text-muted-foreground mt-1">כדי לגשת לקבצים ולמערכי שיעור</p>
            </div>
            <Button onClick={handleConnect} className="gap-2">
              <CloudIcon className="w-4 h-4" /> התחבר ל-Google Drive
            </Button>
          </div>
        ) : (
          <>
            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="חפש קבצים בדרייב..."
                  className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <Button type="submit" variant="outline" size="icon" disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => fetchFiles(query)} title="רענן">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </form>

            {/* File list */}
            <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1">
              {searching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <FolderOpen className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">לא נמצאו קבצים</p>
                </div>
              ) : (
                files.map(file => (
                  <FileRow key={file.id} file={file} onSelect={handleSelectFile} />
                ))
              )}
            </div>

            <p className="text-[11px] text-muted-foreground text-center border-t border-border pt-2">
              לחץ על קובץ כדי להוסיפו לספרייה הדיגיטלית
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}