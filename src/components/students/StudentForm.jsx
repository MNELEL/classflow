import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import MobileSelect from './MobileSelect';
import { loadGroups, getGroupTypeColor, getGroupTypeLabel } from './GroupsManager';
import { X, MapPin } from 'lucide-react';

const HEIGHT_OPTIONS = [
  { value: 'short', label: 'נמוך' },
  { value: 'medium', label: 'בינוני' },
  { value: 'tall', label: 'גבוה' },
];
const ROW_PREF_OPTIONS = [
  { value: 'none', label: 'אין העדפה' },
  { value: 'front', label: 'קדמית' },
  { value: 'middle', label: 'אמצעית' },
  { value: 'back', label: 'אחורית' },
];
const SIDE_PREF_OPTIONS = [
  { value: 'none', label: 'אין העדפה' },
  { value: 'left', label: 'שמאל' },
  { value: 'center', label: 'מרכז' },
  { value: 'right', label: 'ימין' },
];
const PERM_ROW_OPTIONS = [
  { value: 'none', label: 'ללא' },
  { value: 'front', label: 'תמיד קדמי 🎯' },
  { value: 'middle', label: 'תמיד אמצעי' },
  { value: 'back', label: 'תמיד אחורי' },
];
const PERM_COL_OPTIONS = [
  { value: 'none', label: 'ללא' },
  { value: 'left', label: 'תמיד שמאל' },
  { value: 'center', label: 'תמיד מרכז' },
  { value: 'right', label: 'תמיד ימין' },
];

const SPECIAL_NEEDS_OPTIONS = [
  { value: 'vision', label: '👁️ ראייה' },
  { value: 'hearing', label: '👂 שמיעה' },
  { value: 'adhd', label: '⚡ קשב וריכוז' },
  { value: 'mobility', label: '♿ ניידות' },
  { value: 'other', label: '✨ אחר' },
];

export default function StudentForm({ student, students, onSave, onCancel }) {
  const existingGroups = loadGroups();

  const [form, setForm] = useState({
    name: student?.name || '',
    gender: student?.gender || 'male',
    height: student?.height || 'medium',
    row_preference: student?.row_preference || 'none',
    permanent_row: student?.permanent_row || 'none',
    permanent_col: student?.permanent_col || 'none',
    side_preference: student?.side_preference || 'none',
    avoid_edges: student?.avoid_edges || false,
    special_needs: student?.special_needs || [],
    friends: student?.friends || [],
    avoid: student?.avoid || [],
    separate: student?.separate || [],
    learning_group: student?.learning_group || '',
    group: student?.group || '',
    notes: student?.notes || '',
    is_active: student?.is_active !== false,
  });

  const others = students.filter(s => s.id !== student?.id);

  function toggleNeed(val) {
    setForm(f => ({
      ...f,
      special_needs: f.special_needs.includes(val)
        ? f.special_needs.filter(x => x !== val)
        : [...f.special_needs, val],
    }));
  }

  function toggleRelation(field, id) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(id) ? f[field].filter(x => x !== id) : [...f[field], id],
    }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    onSave({ ...student, ...form });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">שם התלמיד *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="שם מלא" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">קבוצה כללית</Label>
          <Input value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} placeholder="שם קבוצה" className="mt-1" />
        </div>
      </div>

      <div>
        <Label className="text-xs">🧩 קבוצה</Label>
        <Input
          value={form.learning_group}
          onChange={e => setForm(f => ({ ...f, learning_group: e.target.value }))}
          placeholder="הקלד שם קבוצה..."
          className="mt-1"
          list="groups-datalist"
        />
        {existingGroups.length > 0 && (
          <datalist id="groups-datalist">
            {existingGroups.map(g => <option key={g.id} value={g.name} />)}
          </datalist>
        )}
        {existingGroups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {existingGroups.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, learning_group: f.learning_group === g.name ? '' : g.name }))}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors ${
                  form.learning_group === g.name
                    ? 'bg-primary text-primary-foreground border-primary'
                    : `${getGroupTypeColor(g.type)} border-transparent`
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">תלמידים באותה קבוצה יושבו בצמוד/רחוק לפי הגדרת הקבוצה</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">גובה</Label>
          <MobileSelect value={form.height} onValueChange={v => setForm(f => ({ ...f, height: v }))} options={HEIGHT_OPTIONS} label="גובה" />
        </div>
        <div>
          <Label className="text-xs">העדפת שורה</Label>
          <MobileSelect value={form.row_preference} onValueChange={v => setForm(f => ({ ...f, row_preference: v }))} options={ROW_PREF_OPTIONS} label="העדפת שורה" />
        </div>
        <div>
          <Label className="text-xs">העדפת צד</Label>
          <MobileSelect value={form.side_preference} onValueChange={v => setForm(f => ({ ...f, side_preference: v }))} options={SIDE_PREF_OPTIONS} label="העדפת צד" />
        </div>
      </div>

      <div>
        <Label className="text-xs mb-1.5 block">📍 אילוצים פיזיים כפויים</Label>
        <div className="grid grid-cols-2 gap-3 bg-accent/30 rounded-xl p-3">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">שורה קבועה</Label>
            <MobileSelect value={form.permanent_row} onValueChange={v => setForm(f => ({ ...f, permanent_row: v }))} options={PERM_ROW_OPTIONS} label="שורה קבועה" triggerClassName="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">טור קבוע</Label>
            <MobileSelect value={form.permanent_col} onValueChange={v => setForm(f => ({ ...f, permanent_col: v }))} options={PERM_COL_OPTIONS} label="טור קבוע" triggerClassName="h-8 text-xs" />
          </div>
          <div className="col-span-2">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, avoid_edges: !f.avoid_edges }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors w-full justify-center ${
                form.avoid_edges ? 'bg-primary/10 border-primary text-primary' : 'border-border hover:border-primary/30'
              }`}
            >
              {form.avoid_edges ? '✅' : '⬜'} הימנע מקצוות הכיתה
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">⚠️ אילוצים כפויים יגרמו לחיווי סגול על המפה אם לא מתקיימים</p>
      </div>

      <div>
        <Label className="text-xs">צרכים מיוחדים</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {SPECIAL_NEEDS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleNeed(opt.value)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                form.special_needs.includes(opt.value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted border-border hover:border-primary/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {others.length > 0 && (
        <>
          <RelationPicker
            label="💚 חברים מועדפים"
            field="friends"
            value={form.friends}
            students={others}
            onToggle={toggleRelation}
            activeClass="bg-green-100 border-green-400 dark:bg-green-900/30"
          />
          <RelationPicker
            label="🚫 יש להרחיק (בצמוד)"
            field="avoid"
            value={form.avoid}
            students={others}
            onToggle={toggleRelation}
            activeClass="bg-red-100 border-red-400 dark:bg-red-900/30"
          />
          <RelationPicker
            label="↔️ יש לרחק (מרחק גדול)"
            field="separate"
            value={form.separate}
            students={others}
            onToggle={toggleRelation}
            activeClass="bg-orange-100 border-orange-400 dark:bg-orange-900/30"
          />
        </>
      )}

      <div>
        <Label className="text-xs">הערות</Label>
        <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות נוספות..." className="mt-1" />
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} className="flex-1">שמור</Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">ביטול</Button>
      </div>
    </div>
  );
}

function RelationPicker({ label, field, value, students, onToggle, activeClass }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mt-1 max-h-24 overflow-y-auto">
        {students.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => onToggle(field, s.id)}
            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
              value.includes(s.id) ? activeClass : 'bg-muted border-border hover:border-primary/50'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}