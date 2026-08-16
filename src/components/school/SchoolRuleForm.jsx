import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

const DAYS = [
  { v: 0, label: 'ראשון' }, { v: 1, label: 'שני' }, { v: 2, label: 'שלישי' },
  { v: 3, label: 'רביעי' }, { v: 4, label: 'חמישי' }, { v: 5, label: 'שישי' }, { v: 6, label: 'שבת' },
];
const EVENTS = [
  { v: '', label: '— ללא —' },
  { v: 'rosh_chodesh', label: 'ראש חודש' },
  { v: 'erev_chag', label: 'ערב חג' },
  { v: 'chag', label: 'חג' },
  { v: 'vacation', label: 'חופשה' },
];
const TYPES = [
  { v: 'daily_hours', label: 'שעות יום לימוד' },
  { v: 'early_dismissal', label: 'סיום מוקדם קבוע' },
  { v: 'no_school', label: 'יום ללא לימודים' },
];

export default function SchoolRuleForm({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', rule_type: 'daily_hours', day_of_week: '', hebrew_event: '', specific_date: '', start_time: '', end_time: '', dismissal_time: '', notes: '', is_active: true });

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        name: initial.name || '', rule_type: initial.rule_type || 'daily_hours',
        day_of_week: initial.day_of_week ?? '', hebrew_event: initial.hebrew_event || '',
        specific_date: initial.specific_date || '', start_time: initial.start_time || '',
        end_time: initial.end_time || '', dismissal_time: initial.dismissal_time || '',
        notes: initial.notes || '', is_active: initial.is_active !== false,
      } : { name: '', rule_type: 'daily_hours', day_of_week: '', hebrew_event: '', specific_date: '', start_time: '', end_time: '', dismissal_time: '', notes: '', is_active: true });
    }
  }, [open, initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function submit() {
    if (!form.name.trim()) return;
    const payload = { ...form };
    if (payload.day_of_week === '') delete payload.day_of_week; else payload.day_of_week = Number(payload.day_of_week);
    if (!payload.hebrew_event) delete payload.hebrew_event;
    if (!payload.specific_date) delete payload.specific_date;
    onSave(payload);
  }

  const t = form.rule_type;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {initial ? 'עריכת כלל' : 'כלל חדש'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>שם הכלל *</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="לדוגמה: כל שישי מסיימים מוקדם" />
          </div>

          <div>
            <Label>סוג כלל</Label>
            <select value={form.rule_type} onChange={e => set('rule_type', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </div>

          {t === 'daily_hours' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>תחילת לימודים</Label>
                <Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
              </div>
              <div>
                <Label>סיום לימודים</Label>
                <Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>
          )}

          {t === 'early_dismissal' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>חוזר ביום</Label>
                  <select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="">— ללא —</option>
                    {DAYS.map(d => <option key={d.v} value={d.v}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>או באירוע עברי</Label>
                  <select value={form.hebrew_event} onChange={e => set('hebrew_event', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    {EVENTS.map(ev => <option key={ev.v} value={ev.v}>{ev.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>שעת סיום מוקדם</Label>
                <Input type="time" value={form.dismissal_time} onChange={e => set('dismissal_time', e.target.value)} placeholder="12:00" />
              </div>
            </>
          )}

          {t === 'no_school' && (
            <>
              <div>
                <Label>תאריך ספציפי</Label>
                <Input type="date" value={form.specific_date} onChange={e => set('specific_date', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>או חוזר ביום</Label>
                  <select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="">— ללא —</option>
                    {DAYS.map(d => <option key={d.v} value={d.v}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>או באירוע עברי</Label>
                  <select value={form.hebrew_event} onChange={e => set('hebrew_event', e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    {EVENTS.map(ev => <option key={ev.v} value={ev.v}>{ev.label}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <Label>הערות</Label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="הערה אופציונלית" />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button onClick={submit} disabled={!form.name.trim()}>שמור</Button>
          <Button variant="outline" onClick={onClose}><X className="w-4 h-4 ml-1" /> ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}