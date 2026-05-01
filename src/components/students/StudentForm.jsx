import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, MapPin } from 'lucide-react';

const SPECIAL_NEEDS_OPTIONS = [
  { value: 'vision', label: '👁️ ראייה' },
  { value: 'hearing', label: '👂 שמיעה' },
  { value: 'adhd', label: '⚡ קשב וריכוז' },
  { value: 'mobility', label: '♿ ניידות' },
  { value: 'other', label: '✨ אחר' },
];

export default function StudentForm({ student, students, onSave, onCancel }) {
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
        <Label className="text-xs">🧩 קבוצת למידה (לישיבה צמודה)</Label>
        <Input
          value={form.learning_group}
          onChange={e => setForm(f => ({ ...f, learning_group: e.target.value }))}
          placeholder="למשל: קבוצה א׳, מתקדמים, מדעים..."
          className="mt-1"
        />
        <p className="text-[10px] text-muted-foreground mt-1">תלמידים עם אותו שם קבוצה יושבו בצמוד אוטומטית</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">גובה</Label>
          <Select value={form.height} onValueChange={v => setForm(f => ({ ...f, height: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="short">נמוך</SelectItem>
              <SelectItem value="medium">בינוני</SelectItem>
              <SelectItem value="tall">גבוה</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">העדפת שורה</Label>
          <Select value={form.row_preference} onValueChange={v => setForm(f => ({ ...f, row_preference: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">אין העדפה</SelectItem>
              <SelectItem value="front">קדמית</SelectItem>
              <SelectItem value="middle">אמצעית</SelectItem>
              <SelectItem value="back">אחורית</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">העדפת צד</Label>
          <Select value={form.side_preference} onValueChange={v => setForm(f => ({ ...f, side_preference: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">אין העדפה</SelectItem>
              <SelectItem value="left">שמאל</SelectItem>
              <SelectItem value="center">מרכז</SelectItem>
              <SelectItem value="right">ימין</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs mb-1.5 block">📍 אילוצים פיזיים כפויים</Label>
        <div className="grid grid-cols-2 gap-3 bg-accent/30 rounded-xl p-3">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">שורה קבועה</Label>
            <Select value={form.permanent_row} onValueChange={v => setForm(f => ({ ...f, permanent_row: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                <SelectItem value="front">תמיד קדמי 🎯</SelectItem>
                <SelectItem value="middle">תמיד אמצעי</SelectItem>
                <SelectItem value="back">תמיד אחורי</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">טור קבוע</Label>
            <Select value={form.permanent_col} onValueChange={v => setForm(f => ({ ...f, permanent_col: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא</SelectItem>
                <SelectItem value="left">תמיד שמאל</SelectItem>
                <SelectItem value="center">תמיד מרכז</SelectItem>
                <SelectItem value="right">תמיד ימין</SelectItem>
              </SelectContent>
            </Select>
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