import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Megaphone, Trash2, Pin, PinOff, AlertCircle, Info, Bell, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

const TYPE_LABELS = {
  announcement: 'הודעה',
  event: 'אירוע',
  reminder: 'תזכורת',
  policy: 'נהלים',
  general: 'כללי',
};
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

export default function SchoolUpdatesManager() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', content: '', type: 'announcement', priority: 'normal', target_audience: 'teachers', expires_at: '',
  });

  const { data: updates = [] } = useQuery({
    queryKey: ['school-updates'],
    queryFn: () => base44.entities.SchoolUpdate.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SchoolUpdate.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school-updates'] });
      setShowForm(false);
      setForm({ title: '', content: '', type: 'announcement', priority: 'normal', target_audience: 'teachers', expires_at: '' });
      toast.success('העדכון פורסם!');
    },
    onError: () => toast.error('שגיאה בפרסום'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SchoolUpdate.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['school-updates'] }); toast.success('נמחק'); },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, current }) => base44.entities.SchoolUpdate.update(id, { is_active: !current }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school-updates'] }),
  });

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">עדכונים כלליים למורים</h3>
              <p className="text-[11px] text-muted-foreground">פרסם הודעות שכל המורים יראו</p>
            </div>
          </div>
          <Button size="sm" className="text-xs gap-1 h-8" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" /> עדכון חדש
          </Button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-muted/30 rounded-xl p-3 space-y-2.5 border border-border/60">
                <Input
                  placeholder="כותרת העדכון..."
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="h-9 text-sm"
                />
                <Textarea
                  placeholder="תוכן העדכון..."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="min-h-[80px] text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <MobileSelect value={form.type} onValueChange={v => setForm({ ...form, type: v })} className="h-8 text-xs">
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </MobileSelect>
                  <MobileSelect value={form.priority} onValueChange={v => setForm({ ...form, priority: v })} className="h-8 text-xs">
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </MobileSelect>
                  <MobileSelect value={form.target_audience} onValueChange={v => setForm({ ...form, target_audience: v })} className="h-8 text-xs">
                    <SelectItem value="all">כולם</SelectItem>
                    <SelectItem value="teachers">מורים</SelectItem>
                    <SelectItem value="parents">הורים</SelectItem>
                  </MobileSelect>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={form.expires_at}
                    onChange={e => setForm({ ...form, expires_at: e.target.value })}
                    className="h-8 text-xs flex-1"
                    dir="ltr"
                    placeholder="תפוגה (אופציונלי)"
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => createMutation.mutate(form)}
                    disabled={createMutation.isPending || !form.title || !form.content}
                  >
                    {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'פרסם'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Updates list */}
        {updates.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">אין עדכונים פעילים</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {updates.map(u => {
              const TypeIcon = TYPE_ICONS[u.type] || Info;
              return (
                <div key={u.id} className={`bg-card border rounded-xl p-3 ${u.is_active === false ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${PRIORITY_COLORS[u.priority] || PRIORITY_COLORS.normal}`}>
                      <TypeIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold">{u.title}</p>
                        <Badge className={`${PRIORITY_COLORS[u.priority] || ''} border-0 text-[10px]`}>{PRIORITY_LABELS[u.priority]}</Badge>
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[u.type]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">{u.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {u.created_date ? format(parseISO(u.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : ''}
                        {u.author_name ? ` · ${u.author_name}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => togglePinMutation.mutate({ id: u.id, current: u.is_active !== false })}
                        className="p-1 hover:bg-accent rounded"
                        title={u.is_active !== false ? 'השבת' : 'הפעל'}
                      >
                        {u.is_active !== false ? <PinOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Pin className="w-3.5 h-3.5 text-primary" />}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(u.id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}