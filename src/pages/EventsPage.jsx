import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CalendarDays, Plus, MapPin, Clock, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';

const TYPE_META = {
  trip: { label: 'טיול', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', emoji: '🚌' },
  assembly: { label: 'אסיפה', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', emoji: '📢' },
  holiday: { label: 'חג/חופש', color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30', emoji: '🎉' },
  meeting: { label: 'פגישה', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', emoji: '👥' },
  exam: { label: 'מבחן', color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', emoji: '📝' },
  deadline: { label: 'דד-ליין', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', emoji: '⏰' },
  celebration: { label: 'חגיגה', color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30', emoji: '🎊' },
  other: { label: 'אחר', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-900/30', emoji: '📌' },
};

export default function EventsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'other', start_date: '', end_date: '', location: '', color: '#3b82f6' });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['school-events'],
    queryFn: () => base44.entities.SchoolEvent.list('start_date', 50),
  });

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.start_date) >= now);
  const past = events.filter(e => new Date(e.start_date) < now);

  async function createEvent() {
    if (!form.title || !form.start_date) {
      toast.error('מלא כותרת ותאריך');
      return;
    }
    await base44.entities.SchoolEvent.create(form);
    qc.invalidateQueries({ queryKey: ['school-events'] });
    toast.success('אירוע נוצר!');
    setShowForm(false);
    setForm({ title: '', description: '', type: 'other', start_date: '', end_date: '', location: '', color: '#3b82f6' });
  }

  async function deleteEvent(id) {
    await base44.entities.SchoolEvent.delete(id);
    qc.invalidateQueries({ queryKey: ['school-events'] });
    toast.success('נמחק');
  }

  function daysUntil(date) {
    const diff = new Date(date) - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">אירועים</h1>
            <p className="text-xs text-muted-foreground">{upcoming.length} קרובים • {past.length} עברו</p>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> אירוע
          </Button>
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">קרובים</p>
            <div className="space-y-2">
              {upcoming.map(event => {
                const meta = TYPE_META[event.type] || TYPE_META.other;
                const days = daysUntil(event.start_date);
                return (
                  <motion.div key={event.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-card border rounded-2xl p-3 flex gap-3">
                    <div className={`w-12 h-12 rounded-xl ${meta.bg} flex flex-col items-center justify-center shrink-0`}>
                      <span className="text-lg leading-none">{meta.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">{event.title}</p>
                        <button onClick={() => deleteEvent(event.id)} className="p-1 hover:bg-destructive/10 rounded-lg shrink-0">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${meta.bg} ${meta.color} border-0`}>{meta.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(event.start_date).toLocaleDateString('he-IL')}
                        </span>
                        {event.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>}
                      </div>
                      {event.description && <p className="text-xs text-muted-foreground mt-1.5">{event.description}</p>}
                      {days >= 0 && days <= 30 && (
                        <span className={`text-[10px] font-semibold mt-1.5 inline-block ${days <= 3 ? 'text-rose-500' : days <= 7 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {days === 0 ? 'היום!' : days === 1 ? 'מחר!' : `בעוד ${days} ימים`}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">עברו</p>
            <div className="space-y-1.5 opacity-60">
              {past.slice(0, 10).map(event => {
                const meta = TYPE_META[event.type] || TYPE_META.other;
                return (
                  <div key={event.id} className="bg-card border rounded-xl p-2.5 flex items-center gap-2">
                    <span>{meta.emoji}</span>
                    <span className="text-sm flex-1 truncate">{event.title}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(event.start_date).toLocaleDateString('he-IL')}</span>
                    <button onClick={() => deleteEvent(event.id)} className="p-1 hover:bg-destructive/10 rounded-lg">
                      <X className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {events.length === 0 && !isLoading && (
          <div className="py-16 text-center text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">אין אירועים עדיין</p>
            <p className="text-sm mt-1">הוסף אירוע ראשון</p>
          </div>
        )}

        {/* Form dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader><DialogTitle>אירוע חדש</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">כותרת</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="טיול שנתי, אסיפת הורים..." className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">סוג</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <button key={k} onClick={() => setForm(f => ({ ...f, type: k }))}
                      className={`py-2 rounded-xl text-[10px] font-semibold border-2 transition-all ${form.type === k ? `${v.bg} ${v.color} border-current` : 'border-border'}`}>
                      {v.emoji}<br />{v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">תאריך התחלה</label>
                  <Input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">תאריך סיום</label>
                  <Input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">מיקום</label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="אולם, כיתה, חוץ..." className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">תיאור</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="פרטים נוספים..." className="text-sm" />
              </div>
              <Button onClick={createEvent} className="w-full">צור אירוע</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}