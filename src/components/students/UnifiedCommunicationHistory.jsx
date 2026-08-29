import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import HebrewDatePicker from '@/components/ui/HebrewDatePicker';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import {
  Plus, Trash2, Phone, Users, MessageSquare, Mail, StickyNote,
  Loader2, Bell, BookOpen, AlertCircle, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const TYPE_CONFIG = {
  call:    { label: 'שיחת טלפון', icon: Phone,        color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  meeting: { label: 'פגישה',      icon: Users,        color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  message: { label: 'הודעה',      icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  email:   { label: 'אימייל',     icon: Mail,          color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  note:    { label: 'הערה',       icon: StickyNote,    color: 'text-gray-600',  bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

const INITIATED_LABELS = { teacher: 'מורה', parent: 'הורה', school: 'בית ספר' };

// Journal (PendingUpdate) intent -> presentation
const JOURNAL_INTENT_CONFIG = {
  parent_contact: { label: 'קשר הורים', icon: Phone,       color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  daily_log:      { label: 'יומן יומי', icon: BookOpen,    color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  incident:       { label: 'אירוע',     icon: AlertCircle, color: 'text-red-600',     bg: 'bg-red-100 dark:bg-red-900/30' },
  add_behavior:   { label: 'התנהגות',   icon: Users,       color: 'text-amber-600',  bg: 'bg-amber-100 dark:bg-amber-900/30' },
  default:        { label: 'יומן',      icon: FileText,    color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
};

const SOURCE_BADGE = {
  parents: { label: 'דף הורים', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  journal: { label: 'יומן',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

export default function UnifiedCommunicationHistory({ studentId, studentName }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'call', parent_name: '', summary: '',
    initiated_by: 'teacher', follow_up_needed: false, follow_up_date: '',
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['parent-contacts', studentId],
    queryFn: () => base44.entities.ParentContact.filter({ student_id: studentId }, '-date'),
  });
  const { data: updates = [] } = useQuery({
    queryKey: ['pending-updates'],
    queryFn: () => base44.entities.PendingUpdate.list('-created_date', 300),
  });

  // Journal entries that reference this student
  const journalEntries = useMemo(() => updates.filter(u => {
    if (u.payload?.student_id === studentId) return true;
    if (u.student_name && studentName && u.student_name.trim() === studentName.trim()) return true;
    return false;
  }), [updates, studentId, studentName]);

  // Merged, date-desc timeline
  const timeline = useMemo(() => {
    const fromContacts = contacts.map(c => {
      const cfg = TYPE_CONFIG[c.type] || TYPE_CONFIG.note;
      const d = c.date ? new Date(c.date) : new Date(c.created_date || 0);
      return {
        id: `p-${c.id}`, source: 'parents', sortDate: d,
        label: cfg.label, icon: cfg.icon, color: cfg.color, bg: cfg.bg,
        content: c.summary,
        sub: [
          c.parent_name && `הורה: ${c.parent_name}`,
          INITIATED_LABELS[c.initiated_by] && `יוזם: ${INITIATED_LABELS[c.initiated_by]}`,
          c.follow_up_needed && c.follow_up_date && `מעקב: ${c.follow_up_date}`,
        ].filter(Boolean).join(' · '),
        dateText: c.date ? format(d, 'dd/MM/yyyy') : '',
        canDelete: true, rawId: c.id,
      };
    });
    const fromJournal = journalEntries.map(u => {
      const cfg = JOURNAL_INTENT_CONFIG[u.intent] || JOURNAL_INTENT_CONFIG.default;
      const d = u.created_date ? new Date(u.created_date) : new Date(0);
      return {
        id: `j-${u.id}`, source: 'journal', sortDate: d,
        label: cfg.label, icon: cfg.icon, color: cfg.color, bg: cfg.bg,
        content: u.summary || u.original_text || '',
        sub: [u.status && u.status !== 'approved' && `סטטוס: ${u.status}`].filter(Boolean).join(' · '),
        dateText: format(d, 'dd/MM/yyyy'),
        canDelete: false,
      };
    });
    return [...fromContacts, ...fromJournal].sort((a, b) => b.sortDate - a.sortDate);
  }, [contacts, journalEntries]);

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

  const pendingFollowUps = contacts.filter(c => c.follow_up_needed && c.follow_up_date);

  return (
    <div className="space-y-3" dir="rtl">
      {/* Summary line */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{timeline.length} רשומות תקשורת</span>
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />דף הורים</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />יומן</span>
        </span>
      </div>

      {/* Follow-up alerts */}
      {pendingFollowUps.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400 text-xs font-semibold mb-1.5">
            <Bell className="w-3.5 h-3.5" /> מעקבים ({pendingFollowUps.length})
          </div>
          {pendingFollowUps.map(c => (
            <p key={c.id} className="text-xs text-yellow-700 dark:text-yellow-400">
              {c.follow_up_date} — {(c.summary || '').slice(0, 60)}{c.summary?.length > 60 ? '…' : ''}
            </p>
          ))}
        </div>
      )}

      {/* Add button */}
      <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)} className="gap-1.5 text-xs w-full">
        <Plus className="w-3.5 h-3.5" /> תעד קשר חדש
      </Button>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-muted/40 border border-border/60 rounded-xl p-3 space-y-2 overflow-hidden">
            <div className="grid grid-cols-2 gap-2">
              <MobileSelect value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))} className="h-8 text-xs">
                {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </MobileSelect>
              <HebrewDatePicker value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} className="h-8 text-xs" />
              <Input placeholder="שם ההורה" value={form.parent_name} onChange={e => setForm(p => ({ ...p, parent_name: e.target.value }))} className="h-8 text-xs" />
              <MobileSelect value={form.initiated_by} onValueChange={v => setForm(p => ({ ...p, initiated_by: v }))} className="h-8 text-xs">
                <SelectItem value="teacher">יוזם: מורה</SelectItem>
                <SelectItem value="parent">יוזם: הורה</SelectItem>
                <SelectItem value="school">יוזם: בית ספר</SelectItem>
              </MobileSelect>
            </div>
            <Textarea placeholder="סיכום השיחה/פגישה *" value={form.summary}
              onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
              className="text-sm min-h-[70px] resize-none" dir="rtl" />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={form.follow_up_needed} onChange={e => setForm(p => ({ ...p, follow_up_needed: e.target.checked }))} className="rounded" />
                נדרש מעקב
              </label>
              {form.follow_up_needed && (
                <HebrewDatePicker value={form.follow_up_date} onChange={v => setForm(p => ({ ...p, follow_up_date: v }))} className="h-7 text-xs flex-1" />
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

      {/* Unified timeline */}
      {timeline.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">אין רשומות תקשורת עדיין</p>
          <p className="text-xs mt-1">רשומות מהיומן ומדף ההורים יופיעו כאן אוטומטית</p>
        </div>
      ) : (
        <div className="space-y-2 relative">
          <div className="absolute right-4 top-0 bottom-0 w-px bg-border/60" />
          {timeline.map(item => {
            const Icon = item.icon;
            const badge = SOURCE_BADGE[item.source];
            return (
              <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex gap-3 pr-8 relative">
                <div className={`absolute right-0 w-8 h-8 rounded-full ${item.bg} flex items-center justify-center shrink-0 border-2 border-background z-10`}>
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                </div>
                <div className="flex-1 bg-card border border-border/60 rounded-xl px-3 py-2.5 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`text-xs font-semibold ${item.color}`}>{item.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    {item.canDelete && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive shrink-0" aria-label="מחק רשומה"
                        onClick={() => deleteMutation.mutate(item.rawId)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{item.content}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap items-center">
                    {item.dateText && <span className="text-[10px] text-muted-foreground">{item.dateText}</span>}
                    {item.sub && <span className="text-[10px] text-muted-foreground">· {item.sub}</span>}
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