import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollText } from 'lucide-react';

const ACTION_VARIANT = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
};

const ACTION_LABEL = {
  create: 'יצירה',
  update: 'עדכון',
  delete: 'מחיקה',
};

export default function AuditLogViewer() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 200),
  });

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (dateFrom) result = result.filter(l => (l.created_date || '') >= dateFrom);
    if (dateTo) result = result.filter(l => (l.created_date || '') <= dateTo + 'T23:59:59');
    if (actionFilter !== 'all') result = result.filter(l => l.action === actionFilter);
    return result;
  }, [logs, dateFrom, dateTo, actionFilter]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="w-4 h-4 text-primary" />
          יומן פעולות ({filteredLogs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-auto text-xs" aria-label="מתאריך" />
          <span className="text-xs text-muted-foreground">עד</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-auto text-xs" aria-label="עד תאריך" />
          <div className="flex gap-1">
            {['all', 'create', 'update', 'delete'].map(a => (
              <Button key={a} size="sm" variant={actionFilter === a ? 'default' : 'outline'} onClick={() => setActionFilter(a)} className="h-8 text-xs">
                {a === 'all' ? 'הכל' : ACTION_LABEL[a]}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">טוען...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין פעולות להצגה</p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filteredLogs.map(log => (
              <div key={log.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg text-xs">
                <Badge variant={ACTION_VARIANT[log.action] || 'secondary'} className="text-[10px] shrink-0">
                  {ACTION_LABEL[log.action] || log.action}
                </Badge>
                <span className="font-medium shrink-0">{log.entity_type}</span>
                {log.entity_name && <span className="text-muted-foreground truncate flex-1">{log.entity_name}</span>}
                <span className="text-muted-foreground shrink-0 mr-auto whitespace-nowrap">
                  {log.created_date ? new Date(log.created_date).toLocaleDateString('he-IL') : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}