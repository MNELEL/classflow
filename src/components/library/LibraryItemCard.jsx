import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles, Loader2, Clock, AlertCircle, Share2, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ShareModal from './ShareModal';

const SOURCE_ICONS = {
  audio_recording: '🎙️', audio_file: '🎵', pdf: '📄', word_doc: '📝',
  presentation: '📊', video_file: '🎬', youtube_link: '▶️',
  external_link: '🔗', text_note: '✍️', image: '🖼️',
};

const SOURCE_LABELS = {
  audio_recording: 'הקלטת שמע', audio_file: 'קובץ שמע', pdf: 'קובץ PDF', word_doc: 'מסמך Word',
  presentation: 'מצגת', video_file: 'קובץ וידאו', youtube_link: 'סרטון יוטיוב',
  external_link: 'קישור חיצוני', text_note: 'פתק טקסט', image: 'תמונה',
};

const DIFF_COLOR = {
  'קל': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'בינוני': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
  'קשה': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const AI_STATUS = {
  pending:    { icon: Clock,       color: 'text-muted-foreground', border: 'border-r-muted-foreground/40',  label: 'ממתין' },
  processing: { icon: Loader2,     color: 'text-blue-500',         border: 'border-r-blue-500',             label: 'מנתח...', spin: true },
  ready:      { icon: Sparkles,    color: 'text-purple-500',       border: 'border-r-purple-500',           label: 'נותח' },
  error:      { icon: AlertCircle, color: 'text-destructive',      border: 'border-r-destructive',          label: 'שגיאה בניתוח' },
};

export default function LibraryItemCard({ item, onClick }) {
  const qc = useQueryClient();
  const [showShare, setShowShare] = useState(false);

  const favMutation = useMutation({
    mutationFn: () => base44.entities.LibraryItem.update(item.id, { is_favorite: !item.is_favorite }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['library'] });
      const previous = qc.getQueryData(['library']);
      qc.setQueryData(['library'], old => (old || []).map(i => i.id === item.id ? { ...i, is_favorite: !i.is_favorite } : i));
      return { previous };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.previous) qc.setQueryData(['library'], ctx.previous); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['library'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.LibraryItem.delete(item.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['library'] });
      const previous = qc.getQueryData(['library']);
      qc.setQueryData(['library'], old => (old || []).filter(i => i.id !== item.id));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['library'], ctx.previous);
      toast.error('שגיאה במחיקת החומר');
    },
    onSuccess: () => toast.success('החומר נמחק מהספרייה'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['library'] }),
  });

  const aiInfo = AI_STATUS[item.ai_status] || AI_STATUS.pending;
  const AiIcon = aiInfo.icon;
  const title = item.ai_suggested_title || item.title;

  const cardLabel = [
    title,
    item.difficulty ? `רמת קושי ${item.difficulty}` : null,
    item.is_favorite ? 'במועדפים' : null,
    `סטטוס ניתוח AI: ${aiInfo.label}`,
  ].filter(Boolean).join(', ');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={cardLabel}
      className={cn(
        "bg-card border border-border/70 border-r-4 rounded-2xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        aiInfo.border
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label={SOURCE_LABELS[item.source_type] || 'קובץ'}>
            {SOURCE_ICONS[item.source_type] || '📎'}
          </span>
          {item.category && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{item.category}</span>
          )}
        </div>
        <div className="flex items-center gap-1 touch-show">
          <button onClick={e => { e.stopPropagation(); setShowShare(true); }} aria-label="שתף חומר לימוד"
            className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); favMutation.mutate(); }} aria-label={item.is_favorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
            aria-pressed={!!item.is_favorite}
            className="text-muted-foreground hover:text-pink-500 transition-colors p-1.5">
            {item.is_favorite ? <Heart className="w-4 h-4 fill-pink-500 text-pink-500" /> : <Heart className="w-4 h-4" />}
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button onClick={e => e.stopPropagation()} aria-label="מחק חומר"
                className="text-muted-foreground hover:text-destructive transition-colors p-1.5">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={e => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>מחיקת חומר מהספרייה</AlertDialogTitle>
                <AlertDialogDescription>
                  האם למחוק את "{title}"? פעולה זו אינה הפיכה.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ביטול</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleteMutation.isPending ? 'מוחק...' : 'מחק'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Title */}
      <p className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
        {title}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        {item.subject && <span>{item.subject}</span>}
        {item.difficulty && (
          <span
            aria-label={`רמת קושי: ${item.difficulty}`}
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${DIFF_COLOR[item.difficulty] || ''}`}
          >
            {item.difficulty}
          </span>
        )}
      </div>

      {/* AI Status */}
      <div
        className={cn("flex items-center gap-1.5 text-xs mb-3", aiInfo.color)}
        role="status"
        aria-live="polite"
      >
        <AiIcon className={cn("w-3.5 h-3.5", aiInfo.spin && "animate-spin")} aria-hidden="true" />
        <span>{aiInfo.label}</span>
      </div>

      {/* Key points preview */}
      {item.ai_key_points?.length > 0 && (
        <div className="space-y-1 mb-3">
          {item.ai_key_points.slice(0, 2).map((pt, i) => (
            <p key={i} className="text-xs text-muted-foreground flex gap-1">
              <span className="text-primary" aria-hidden="true">•</span>
              <span className="line-clamp-1">{pt}</span>
            </p>
          ))}
        </div>
      )}

      {/* Summary preview */}
      {item.ai_summary && !item.ai_key_points?.length && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.ai_summary}</p>
      )}

      {/* Artifacts count */}
      {item.generated_artifacts?.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground border-t border-border/50 pt-2 mt-2">
          <span aria-hidden="true">📄</span>
          <span>{item.generated_artifacts.length} חומרים שנוצרו</span>
        </div>
      )}

      {/* Tags */}
      {(item.ai_suggested_tags || item.tags)?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {(item.ai_suggested_tags || item.tags || []).slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {showShare && (
        <ShareModal item={item} type="library" onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}