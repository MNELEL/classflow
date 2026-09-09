import React from 'react';
import { Copy, FileText } from 'lucide-react';
import { toast } from 'sonner';

// Right-hand side of the analysis page: the audio recording with its
// full transcript, scrollable independently of the analysis panel.
export default function TranscriptPanel({ item }) {
  const hasMedia = item.file_url && ['audio_recording', 'audio_file', 'video_file'].includes(item.source_type);

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-primary" /> תמלול ההקלטה
        </p>
        {item.transcript && (
          <button
            onClick={() => { navigator.clipboard.writeText(item.transcript); toast.success('התמלול הועתק'); }}
            className="text-xs text-primary hover:underline flex items-center gap-1"
            aria-label="העתק תמלול"
          >
            <Copy className="w-3.5 h-3.5" /> העתק
          </button>
        )}
      </div>

      {hasMedia && (
        <div className="px-4 pt-3 shrink-0">
          {item.source_type === 'video_file'
            ? <video controls className="w-full rounded-xl" src={item.file_url} />
            : <audio controls className="w-full rounded-xl" src={item.file_url} />}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {item.transcript ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.transcript}</p>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">אין תמלול זמין עדיין</p>
            <p className="text-xs mt-1">התמלול האוטומטי יופיע כאן ברגע שיסתיים</p>
          </div>
        )}
      </div>
    </div>
  );
}