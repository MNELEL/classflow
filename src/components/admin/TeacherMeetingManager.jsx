import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Calendar, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';

const TYPE_LABELS = {
  one_on_one: 'פגישה אישית',
  staff_meeting: 'ישיבת סגל',
  evaluation: 'הערכה',
  feedback: 'משוב',
};
const TYPE_COLORS = {
  one_on_one: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  staff_meeting: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  evaluation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  feedback: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export default function TeacherMeetingManager({ teacher }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({
    meeting_date: new Date().toISOString().slice(0, 16),
    type: 'one_on_one',
    topics: '',
    summary: '',
    action_items: '',
    follow_up_date: '',
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['teacher-meetings', teacher.id],
    queryFn: () => base44.entities.TeacherMeeting.filter({ teacher_id: teacher.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeacherMeeting.create({
      ...data,
      teacher_id: teacher.id,
      teacher_name: teacher.full_name,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-meetings', teacher.id] });
      setShowForm(false);
      setForm({ meeting_date: new Date().toISOString().slice(0, 16), type: 'one_on_one', topics: '', summary: '', action_items: '', follow_up_date: '' });
      toast.success('הפגישה נרשמה!');
    },
    onError: () => toast.error('שגיאה בשמירת הפגישה'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TeacherMeeting.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-meetings', teacher.id] });
      toast.success('נמחק');
    },
  });

  const sortedMeetings = [...meetings].sort((a, b) =>
    new Date(b.meeting_date || 0) - new Date(a.meeting_date || 0)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">פגישות ומשוב ({meetings.length})</p>
        <Button size="sm" className="text-xs gap-1 h-7" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3 h-3" /> פגישה חדשה
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] mb-1 block">תאריך ושעה</Label>
                  <Input
                    type="datetime-local"
                    value={form.meeting_date}
                    onChange={e => setForm({ ...form, meeting_date: e.target.value })}
                    className="h-8 text-xs"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="text-[10px] mb-1 block">סוג פגישה</Label>
                  <MobileSelect value={form.type} onValueChange={v => setForm({ ...form, type: v })} className="h-8 text-xs">
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </MobileSelect>
                </div>
              </div>
              <div>
                <Label className="text-[10px] mb-1 block">נושאים שנדונו</Label>
                <Input value={form.topics} onChange={e => setForm({ ...form, topics: e.target.value })} className="h-8 text-xs" placeholder="נושאים מרכזיים..." />
              </div>
              <div>
                <Label className="text-[10px] mb-1 block">סיכום</Label>
                <Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} className="min-h-[60px] text-xs" placeholder="סיכום הפגישה..." />
              </div>
              <div>
                <Label className="text-[10px] mb-1 block">משימות לביצוע</Label>
                <Textarea value={form.action_items} onChange={e => setForm({ ...form, action_items: e.target.value })} className="min-h-[40px] text-xs" placeholder="פעולות שעלו..." />
              </div>
              <div>
                <Label className="text-[10px] mb-1 block">תאריך מעקב</Label>
                <Input type="date" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} className="h-8 text-xs" dir="ltr" />
              </div>
              <Button size="sm" className="w-full h-8" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'שמור פגישה'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meetings list */}
      {sortedMeetings.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">אין פגישות רשומות</p>
      ) : (
        <div className="space-y-2">
          {sortedMeetings.map(m => {
            const isExpanded = expanded === m.id;
            return (
              <div key={m.id} className="bg-card border border-border/60 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : m.id)}
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-accent/30 text-right"
                >
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {m.meeting_date ? format(parseISO(m.meeting_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '—'}
                    </p>
                    {m.topics && <p className="text-[10px] text-muted-foreground truncate">{m.topics}</p>}
                  </div>
                  <Badge className={`${TYPE_COLORS[m.type] || ''} border-0 text-[10px]`}>{TYPE_LABELS[m.type] || m.type}</Badge>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/60 pt-2">
                        {m.summary && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground">סיכום</p>
                            <p className="text-xs leading-relaxed">{m.summary}</p>
                          </div>
                        )}
                        {m.action_items && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground">משימות</p>
                            <p className="text-xs leading-relaxed">{m.action_items}</p>
                          </div>
                        )}
                        {m.follow_up_date && (
                          <Badge variant="outline" className="text-[10px]">מעקב: {format(parseISO(m.follow_up_date), 'dd/MM/yyyy', { locale: he })}</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 text-xs h-7 gap-1"
                          onClick={() => deleteMutation.mutate(m.id)}
                        >
                          <Trash2 className="w-3 h-3" /> מחק
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}