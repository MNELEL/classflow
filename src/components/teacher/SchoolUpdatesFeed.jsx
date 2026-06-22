import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, AlertCircle, Bell, FileText, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const TYPE_ICONS = {
  announcement: Megaphone,
  event: Bell,
  reminder: AlertCircle,
  policy: FileText,
  general: Info,
};
const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};
const PRIORITY_LABELS = { low: 'נמוכה', normal: 'רגילה', high: 'גבוהה', urgent: 'דחוף' };

export default function SchoolUpdatesFeed() {
  const { data: updates = [] } = useQuery({
    queryKey: ['school-updates'],
    queryFn: () => base44.entities.SchoolUpdate.list('-created_date', 20),
  });

  const activeUpdates = updates.filter(u => u.is_active !== false);

  if (activeUpdates.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-4 text-center">
          <Megaphone className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">אין עדכונים כרגע</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone className="w-4 h-4 text-teal-600" />
        <h2 className="text-sm font-bold">עדכונים מבית הספר</h2>
        <Badge variant="outline" className="text-[10px]">{activeUpdates.length}</Badge>
      </div>
      {activeUpdates.slice(0, 5).map(u => {
        const TypeIcon = TYPE_ICONS[u.type] || Info;
        return (
          <Card key={u.id} className="border-border/60">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${PRIORITY_COLORS[u.priority] || PRIORITY_COLORS.normal}`}>
                  <TypeIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold">{u.title}</p>
                    {u.priority === 'urgent' && <Badge className={`${PRIORITY_COLORS.urgent} border-0 text-[10px]`}>דחוף</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">{u.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {u.created_date ? format(parseISO(u.created_date), 'dd/MM/yyyy', { locale: he }) : ''}
                    {u.author_name ? ` · ${u.author_name}` : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}