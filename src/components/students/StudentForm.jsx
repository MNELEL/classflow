import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

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
    side_preference: student?.side_preference || 'none',
    special_needs: student?.special_needs || [],
    friends: student?.friends || [],
    avoid: student?.avoid || [],
    separate: student?.separate || [],
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
          <Label className="text-xs">קבוצה</Label>
          <Input value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} placeholder="שם קבוצה" className="mt-1" />
        </div>
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