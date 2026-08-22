import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HardDrive, Loader2, FolderOpen, ChevronRight, FolderDown } from 'lucide-react';

const CONNECTOR_ID = '6a37ebf86b324d770927a6e6';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

// Lightweight Drive folder browser — lets the teacher navigate folders and
// pick one to import. The actual import flow (scan/confirm/style-learn) runs
// in the shared DriveFolderImportDialog once a folder is chosen.
export default function DriveFolderPicker({ open, onClose, onPick }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [folderStack, setFolderStack] = useState([]); // [{id, name}]
  const [fetching, setFetching] = useState(false);

  const currentFolder = folderStack[folderStack.length - 1] || null;

  const fetchFiles = useCallback(async (folderId = null) => {
    setFetching(true);
    try {
      const res = await base44.functions.invoke('driveFiles', { action: 'list', query: '', folderId });
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
    if (!open) return;
    setLoading(true);
    fetchFiles(currentFolder?.id || null);
  }, [open, currentFolder, fetchFiles]);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, '_blank');
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        fetchFiles(currentFolder?.id || null);
      }
    }, 500);
  };

  const openFolder = (folder) => setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }]);
  const goBack = (idx) => setFolderStack(prev => prev.slice(0, idx));

  const folders = files.filter(f => f.mimeType === FOLDER_MIME);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderDown className="w-5 h-5 text-primary" /> בחירת תיקייה לייבוא
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !connected ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <HardDrive className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">חבר את Google Drive</p>
              <p className="text-sm text-muted-foreground mt-1">כדי לסרוק ולייבא תיקיות</p>
            </div>
            <Button onClick={handleConnect} className="gap-2">
              <HardDrive className="w-4 h-4" /> התחבר ל-Google Drive
            </Button>
          </div>
        ) : (
          <>
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

            {/* Folders list */}
            <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
              {fetching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">אין תיקיות במיקום זה</div>
              ) : (
                folders.map(folder => (
                  <div key={folder.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 transition-colors">
                    <FolderOpen className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="flex-1 min-w-0 text-sm font-medium truncate">{folder.name}</p>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openFolder(folder)} className="text-xs gap-1">
                        פתח <FolderOpen className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onPick(folder)} className="text-xs gap-1 shrink-0">
                        <FolderDown className="w-3.5 h-3.5" /> ייבא
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Import current (nested) folder */}
            {currentFolder && (
              <div className="border-t border-border pt-3">
                <Button className="w-full gap-2" onClick={() => onPick(currentFolder)}>
                  <FolderDown className="w-4 h-4" /> ייבא את התיקייה הנוכחית: {currentFolder.name}
                </Button>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center">
              בחר תיקייה לסריקה וייבוא כל תוכנה
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}