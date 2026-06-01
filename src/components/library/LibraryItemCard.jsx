import React from 'react';
import { Button } from '@/components/ui/button';
import { Heart, HeartOff, Sparkles, Loader2, Clock, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const SOURCE_ICONS = {
  audio_recording: '🎙️', audio_file: '🎵', pdf: '📄', word_doc: '📝',
  presentation: '📊', video_file: '🎬', youtube_link: '▶️',
  external_link: '🔗', text_note: '✍️', image: '🖼️',
};

const DIFF_COLOR = {
  'קל': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'בינוני': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500',
  'קשה': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const AI_STATUS = {
  pending:    { icon: Clock,       color: 'text-muted-foreground', label: 'ממתין' },
  processing: { icon: Loader2,     color: 'text-blue-500',         label: 'מנתח...', spin: true },
  ready:      { icon: Sparkles,    color: 'text-purple-500',       label: 'נותח' },
  error:      { icon: AlertCircle, color: 'text-destructive',      label: 'שגיאה' },
};

export default function LibraryItemCard({ item, onClick }) {
  const qc = useQueryClient();

  const favMutation = useMutation({
    mutationFn: () => base44.entities.LibraryItem.update(item.id, { is_favorite: !item.is_favorite }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library'] }),
  });

  const aiInfo = AI_STATUS[item.ai_status] || AI_STATUS.pending;
  const AiIcon = aiInfo.icon;

  return (
    <div onClick={onClick}
      className="bg-card border border-border/70 rounded-2xl p-4 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group relative">
      
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{SOURCE_ICONS[item.source_type] || '📎'}</span>
          {item.category && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{item.category}</span>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); favMutation.mutate(); }}
          className="text-muted-foreground hover:text-pink-500 transition-colors">
          {item.is_favorite ? <Heart className="w-4 h-4 fill-pink-500 text-pink-500" /> : <Heart className="w-4 h-4" />}
        </button>
      </div>

      {/* Title */}
      <p className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
        {item.ai_suggested_title || item.title}
      </p>
      
      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        {item.subject && <span>{item.subject}</span>}
        {item.difficulty && (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${DIFF_COLOR[item.difficulty] || ''}`}>
            {item.difficulty}
          </span>
        )}
      </div>

      {/* AI Status */}
      <div className={cn("flex items-center gap-1.5 text-xs mb-3", aiInfo.color)}>
        <AiIcon className={cn("w-3.5 h-3.5", aiInfo.spin && "animate-spin")} />
        <span>{aiInfo.label}</span>
      </div>

      {/* Key points preview */}
      {item.ai_key_points?.length > 0 && (
        <div className="space-y-1 mb-3">
          {item.ai_key_points.slice(0, 2).map((pt, i) => (
            <p key={i} className="text-xs text-muted-foreground flex gap-1">
              <span className="text-primary">•</span>
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
          <span>📄</span>
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
    </div>
  );
}