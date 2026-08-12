import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Pencil, Check } from 'lucide-react';
import { format } from 'date-fns';

const CONF_LABEL = { high: 'גבוה', medium: 'בינוני', low: 'נמוך' };
const CONF_COLOR = {
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const MT_LABEL = { study: 'חומרי לימוד', exam: 'מבחנים', prep: 'הכנה' };

export default function IngestAuditViewer() {
  const [materialFilter, setMaterialFilter] = useState('all');
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['ingest-audit-logs'],
    queryFn: () => base44.entities.IngestAuditLog.list('-created_date', 100),
  });

  const filtered = useMemo(() => {
    if (materialFilter === 'all') return logs;
    return logs.filter(l => l.material_type === materialFilter);
  }, [logs, materialFilter]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          יומן AI Ingest — הצעות ושינויים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1 flex-wrap">
          {[{ k: 'all', l: 'הכל' }, { k: 'study', l: 'חומרי לימוד' }, { k: 'exam', l: 'מבחנים' }, { k: 'prep', l: 'הכנה' }].map(f => (
            <button
              key={f.k}
              onClick={() => setMaterialFilter(f.k)}
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${materialFilter === f.k ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'}`}
            >
              {f.l}
            </button>
          ))}
        </div>
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">טוען…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">אין רשומות</p>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-2 pr-1">
              {filtered.map(log => (
                <div key={log.id} className="border border-border/60 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium truncate">{log.file_name || 'ללא שם'}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{format(new Date(log.created_date), 'dd/MM HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {log.confidence && (
                      <Badge variant="outline" className={`text-[10px] border-0 ${CONF_COLOR[log.confidence] || ''}`}>
                        ביטחון: {CONF_LABEL[log.confidence] || log.confidence}
                      </Badge>
                    )}
                    {log.material_type && <Badge variant="secondary" className="text-[10px]">{MT_LABEL[log.material_type] || log.material_type}</Badge>}
                    {log.was_changed ? (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
                        <Pencil className="w-3 h-3" /> שונה ידנית
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
                        <Check className="w-3 h-3" /> אושר כמוצע
                      </Badge>
                    )}
                  </div>
                  {(log.suggested_category || log.final_category) && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      הוצע: {log.suggested_category || '—'} ← נשמר: {log.final_category || '—'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}