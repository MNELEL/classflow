import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Phone, Users, MessageSquare, Mail, StickyNote, Loader2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  call:    { label: 'שיחת טלפון', icon: Phone,        color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  meeting: { label: 'פגישה',      icon: Users,        color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  message: { label: 'הודעה',      icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  email:   { label: 'אימייל',     icon: Mail,          color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  note:    { label: 'הערה',       icon: StickyNote,    color: 'text-gray-600',  bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

const INITIATED_LABELS = { teacher: 'מורה', parent: 'הורה', school: 'בית ספר' };

export default function ParentContactLog({ studentId, studentName }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'call',
    parent_name: '',
    summary: '',
    initiated_by: 'teacher',
    follow_up_needed: false,
    follow_up_date: '',
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['parent-contacts', studentId],
    queryFn: () => base44.entities.ParentContact.filter({ student_id: studentId }, '-date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ParentContact.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent-contacts', studentId] });
      toast.success('תיעוד נשמר');
      setShowForm(false);
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), type: 'call', parent_name: '', summary: '', initiated_by: 'teacher', follow_up_needed: false, follow_up_date: '' });
    },
    onError: () => toast.error('שגיאה בשמירה'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ParentContact.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parent-contacts', studentId] }); toast.success('תיעוד נמחק'); },
  });

  function handleSave() {
    if (!form.summary.trim()) { toast.error('נדרש סיכום'); return; }
    createMutation.mutate({ student_id: studentId, ...form });
  }

  const followUpPending = contacts.filter(c => c.follow_up_needed && c.follow_up_date && !isPast(parseISO(c.follow_up_date)));

  return (
    <div className="space-y-3" dir="rtl">
      {/* Follow-up alerts */}
      {followUpPending.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400 text-xs font-semibold mb-1.5">
            <Bell className="w-3.5 h-3.5" /> מעקבים ממתינים
          </div>
          {followUpPending.map(c => (
            <p key={c.id} className="text-xs text-yellow-700 dark:text-yellow-400">
              {c.follow_up_date} — {c.summary.slice(0, 60)}...
            </p>
          ))}
        </div>
      )}

      {/* Add button */}
      <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)} className="gap-1.5 text-xs w-full">
        <Plus className="w-3.5 h-3.5" /> תעד קשר חדש
      </Button>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-muted/40 border border-border/60 rounded-xl p-3 space-y-2 overflow-hidden">
            <div className="grid grid-cols-2 gap-2">
              <MobileSelect value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))} className="h-8 text-xs">
                {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </MobileSelect>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="שם ההורה" value={form.parent_name} onChange={e => setForm(p => ({ ...p, parent_name: e.target.value }))} className="h-8 text-xs" />
              <MobileSelect value={form.initiated_by} onValueChange={v => setForm(p => ({ ...p, initiated_by: v }))} className="h-8 text-xs">
                <SelectItem value="teacher">יוזם: מורה</SelectItem>
                <SelectItem value="parent">יוזם: הורה</SelectItem>
                <SelectItem value="school">יוזם: בית ספר</SelectItem>
              </MobileSelect>
            </div>
            <Textarea
              placeholder="סיכום השיחה/פגישה *"
              value={form.summary}
              onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
              className="text-sm min-h-[70px] resize-none"
              dir="rtl"
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={form.follow_up_needed} onChange={e => setForm(p => ({ ...p, follow_up_needed: e.target.checked }))} className="rounded" />
                נדרש מעקב
              </label>
              {form.follow_up_needed && (
                <Input type="date" value={form.follow_up_date} onChange={e => setForm(p => ({ ...p, follow_up_date: e.target.value }))} className="h-7 text-xs flex-1" />
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-7 text-xs">ביטול</Button>
              <Button size="sm" onClick={handleSave} disabled={createMutation.isPending} className="h-7 text-xs gap-1">
                {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />} שמור
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Phone className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">אין תיעוד קשר עדיין</p>
        </div>
      ) : (
        <div className="space-y-2 relative">
          <div className="absolute right-4 top-0 bottom-0 w-px bg-border/60" />
          {contacts.map((contact, idx) => {
            const cfg = TYPE_CONFIG[contact.type] || TYPE_CONFIG.note;
            const Icon = cfg.icon;
            return (
              <motion.div key={contact.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex gap-3 pr-8 relative">
                <div className={`absolute right-0 w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 border-2 border-background z-10`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 bg-card border border-border/60 rounded-xl px-3 py-2.5 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                      {contact.parent_name && <span className="text-xs text-muted-foreground">• {contact.parent_name}</span>}
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {INITIATED_LABELS[contact.initiated_by] || ''}
                      </span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
                      onClick={() => deleteMutation.mutate(contact.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed">{contact.summary}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                    <span className="text-[10px] text-muted-foreground">{contact.date}</span>
                    {contact.follow_up_needed && contact.follow_up_date && (
                      <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                        🔔 מעקב: {contact.follow_up_date}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}