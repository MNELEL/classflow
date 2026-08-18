import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BulletinList({ bulletins, selectedId, onSelect, generating, onGenerate }) {
  return (
    <div className="space-y-3">
      <Button onClick={onGenerate} disabled={generating} className="w-full gap-2">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {generating ? 'מפיק חוברת...' : 'צור חוברת לשבוע הנוכחי'}
      </Button>

      <div className="space-y-1.5">
        {bulletins.length === 0 && !generating && (
          <p className="text-xs text-muted-foreground text-center py-6">עדיין אין חוברות. צור את הראשונה למעלה.</p>
        )}
        {bulletins.map((b) => {
          const active = b.id === selectedId;
          const range = b.start_date && b.end_date
            ? `${new Date(b.start_date).toLocaleDateString('he-IL')} – ${new Date(b.end_date).toLocaleDateString('he-IL')}`
            : b.start_date || '';
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-right select-none',
                active
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-card hover:border-primary/20 active:scale-[0.98]'
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="font-semibold text-sm text-foreground truncate">{range}</p>
                <p className="text-xs text-muted-foreground truncate">{b.digest_summary?.slice(0, 60) || 'ללא סיכום'}</p>
              </div>
              <Badge variant={b.status === 'approved' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                {b.status === 'approved' ? 'מאושר' : 'טיוטה'}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}