import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Clock, CalendarOff, CalendarClock, CalendarDays, ArrowLeft } from 'lucide-react';
import SchoolRuleForm from '@/components/school/SchoolRuleForm';
import { toHebrewFull } from '@/lib/hebrewDate';
import { toast } from 'sonner';

const DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const EVENTS = { rosh_chodesh: 'ראש חודש', erev_chag: 'ערב חג', chag: 'חג', vacation: 'חופשה' };
const TYPE_META = {
  daily_hours: { icon: Clock, label: 'שעות יום לימוד', color: 'text-emerald-600' },
  early_dismissal: { icon: CalendarClock, label: 'סיום מוקדם קבוע', color: 'text-amber-600' },
  no_school: { icon: CalendarOff, label: 'ימים ללא לימודים', color: 'text-rose-600' },
};

function describe(r) {
  if (r.rule_type === 'daily_hours') return `${r.start_time || '—'} עד ${r.end_time || '—'}`;
  if (r.rule_type === 'early_dismissal') {
    const when = r.day_of_week != null ? `כל ${DAYS[r.day_of_week]}` : r.hebrew_event ? `כל ${EVENTS[r.hebrew_event]}` : '—';
    return `${when} • סיום ב-${r.dismissal_time || '—'}`;
  }
  if (r.rule_type === 'no_school') {
    if (r.specific_date) return `${r.specific_date} (${toHebrewFull(r.specific_date)})`;
    if (r.day_of_week != null) return `כל ${DAYS[r.day_of_week]}`;
    if (r.hebrew_event) return `כל ${EVENTS[r.hebrew_event]}`;
  }
  return r.notes || '—';
}

function RuleCard({ r, onEdit, onDelete }) {
  const meta = TYPE_META[r.rule_type] || TYPE_META.daily_hours;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 bg-card border border-border/60 rounded-xl p-3">
      <div className={`w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center ${meta.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{r.name}</div>
        <div className="text-xs text-muted-foreground truncate">{describe(r)}</div>
      </div>
      <button onClick={onEdit} className="w-9 h-9 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground"><Pencil className="w-4 h-4" /></button>
      <button onClick={onDelete} className="w-9 h-9 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

export default function SchoolCalendarPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['schoolCalendarRules'],
    queryFn: () => base44.entities.SchoolCalendarRule.list(),
  });

  const saveMut = useMutation({
    mutationFn: (payload) => editing
      ? base44.entities.SchoolCalendarRule.update(editing.id, payload)
      : base44.entities.SchoolCalendarRule.create(payload),
    onSuccess: () => { qc.invalidateQueries(['schoolCalendarRules']); setFormOpen(false); setEditing(null); toast.success('נשמר'); },
    onError: (e) => toast.error('שגיאה בשמירה — ' + (e?.message || '')),
  });

  const delMut = useMutation({
    mutationFn: (id) => base44.entities.SchoolCalendarRule.delete(id),
    onSuccess: () => { qc.invalidateQueries(['schoolCalendarRules']); toast.success('נמחק'); },
  });

  const grouped = {
    daily_hours: rules.filter(r => r.rule_type === 'daily_hours'),
    early_dismissal: rules.filter(r => r.rule_type === 'early_dismissal'),
    no_school: rules.filter(r => r.rule_type === 'no_school'),
  };

  const SECTIONS = [
    { key: 'daily_hours', title: 'שעות יום לימוד', desc: 'תחילת וסיום הלימודים ביום רגיל' },
    { key: 'early_dismissal', title: 'סיום מוקדם קבוע', desc: 'לדוגמה: כל שישי ב-12:00, כל ראש חודש ב-13:00' },
    { key: 'no_school', title: 'ימים ללא לימודים', desc: 'חגים, חופשות ותאריכים קבועים' },
  ];

  return (
    <div className="p-4 space-y-5 pb-24" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="w-4 h-4" />
        לוח שנה עברי — הגדרת ימים קבועים ללא לימודים, סיום מוקדם ושעות יום. תאריכים מוצגים בלוח העברי.
      </div>

      {SECTIONS.map(sec => (
        <div key={sec.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">{sec.title}</h2>
              <p className="text-[11px] text-muted-foreground">{sec.desc}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4 ml-1" /> הוסף
            </Button>
          </div>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">טוען...</p>
          ) : grouped[sec.key].length === 0 ? (
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 text-center">אין כללים — לחץ "הוסף" ליצירה</p>
          ) : (
            <div className="space-y-2">
              {grouped[sec.key].map(r => (
                <RuleCard key={r.id} r={r} onEdit={() => { setEditing(r); setFormOpen(true); }} onDelete={() => { if (confirm('למחוק את הכלל?')) delMut.mutate(r.id); }} />
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="bg-accent/30 rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2">
        <ArrowLeft className="w-4 h-4 mt-0.5 shrink-0" />
        המערכת הקבועה (מערכת שעות שבועית) מוגדרת בעמוד "מערכת שבועית". ימים ללא לימודים וסיום מוקדם יופיעו שם בהתאם לכללים שמוגדרים כאן.
      </div>

      <SchoolRuleForm open={formOpen} initial={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={(payload) => saveMut.mutate(payload)} />
    </div>
  );
}