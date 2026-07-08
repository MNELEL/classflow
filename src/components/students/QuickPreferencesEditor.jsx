import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Pencil, Check, X, Loader2, Heart, Brain, Star } from 'lucide-react';

const SPECIAL_NEEDS = [
  { value: 'vision', label: 'ראייה', emoji: '👁️' },
  { value: 'hearing', label: 'שמיעה', emoji: '👂' },
  { value: 'adhd', label: 'קשב וריכוז', emoji: '⚡' },
  { value: 'mobility', label: 'מוגבלות תנועה', emoji: '🦽' },
  { value: 'other', label: 'אחר', emoji: '➕' },
];

const TRAITS = [
  { value: 'attentive', label: 'קשוב' },
  { value: 'cooperative', label: 'משתף פעולה' },
  { value: 'struggling', label: 'מתקשה' },
  { value: 'fast_learner', label: 'לומד מהר' },
  { value: 'needs_extra_explanation', label: 'זקוק להסבר נוסף' },
  { value: 'needs_teacher_attention', label: 'זקוק לתשומת לב' },
  { value: 'needs_encouragement', label: 'זקוק לעידוד' },
  { value: 'disruptive', label: 'מפריע' },
  { value: 'leader', label: 'מוביל' },
  { value: 'shy', label: 'ביישן' },
];

const LEVELS = [
  { value: 'weak', label: 'חלש' },
  { value: 'below_average', label: 'מתקשה' },
  { value: 'average', label: 'בינוני' },
  { value: 'above_average', label: 'מעל ממוצע' },
  { value: 'strong', label: 'חזק' },
  { value: 'excellent', label: 'מצטיין' },
];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

export default function QuickPreferencesEditor({ student }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    special_needs: [],
    traits: [],
    academic_level: 'average',
    notes: '',
    custom_conditions: '',
  });
  const qc = useQueryClient();

  useEffect(() => {
    if (student) {
      setForm({
        special_needs: student.special_needs || [],
        traits: student.traits || [],
        academic_level: student.academic_level || 'average',
        notes: student.notes || '',
        custom_conditions: student.custom_conditions || '',
      });
    }
  }, [student?.id, student?.special_needs, student?.traits, student?.academic_level, student?.notes, student?.custom_conditions]);

  const toggle = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Student.update(student.id, form);
      await qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('ההעדפות עודכנו בהצלחה');
      setEditing(false);
    } catch (err) {
      toast.error('שגיאה בעדכון ההעדפות');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      special_needs: student.special_needs || [],
      traits: student.traits || [],
      academic_level: student.academic_level || 'average',
      notes: student.notes || '',
      custom_conditions: student.custom_conditions || '',
    });
    setEditing(false);
  };

  return (
    <Card className="border-primary/15">
      <CardHeader className="pb-2 pt-3 px-4 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-primary" />
          העדפות למידה ורגישויות
        </CardTitle>
        {!editing ? (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => setEditing(true)}>
            <Pencil className="w-3 h-3" /> עריכה מהירה
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleCancel} disabled={saving}>
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="h-7 px-2 text-xs gap-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              שמור
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1 space-y-3">
        {/* Academic level */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">רמה אקדמית</p>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map(lvl => (
              <Chip
                key={lvl.value}
                active={form.academic_level === lvl.value}
                onClick={() => !editing ? null : setForm(prev => ({ ...prev, academic_level: lvl.value }))}
              >
                {lvl.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Special needs */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <Heart className="w-3 h-3" /> צרכים מיוחדים
          </p>
          {!editing && form.special_needs.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">אין צרכים מיוחדים רשומים</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {SPECIAL_NEEDS.map(need => (
                <Chip
                  key={need.value}
                  active={form.special_needs.includes(need.value)}
                  onClick={() => editing && toggle('special_needs', need.value)}
                >
                  {need.emoji} {need.label}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {/* Traits */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
            <Star className="w-3 h-3" /> תכונות התנהגותיות
          </p>
          {!editing && form.traits.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">אין תכונות רשומות</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {TRAITS.map(trait => (
                <Chip
                  key={trait.value}
                  active={form.traits.includes(trait.value)}
                  onClick={() => editing && toggle('traits', trait.value)}
                >
                  {trait.label}
                </Chip>
              ))}
            </div>
          )}
        </div>

        {/* Notes & custom conditions — editable only in edit mode */}
        {editing && (
          <div className="space-y-2 pt-1">
            <div>
              <p className="text-xs text-muted-foreground mb-1">תנאים מיוחדים (טקסט חופשי)</p>
              <Textarea
                value={form.custom_conditions}
                onChange={e => setForm(prev => ({ ...prev, custom_conditions: e.target.value }))}
                placeholder="למשל: צריך לשבת קרוב ללוח, מומלץ לבדוק הבנה בסוף שיעור..."
                className="text-sm min-h-[60px] resize-none"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">הערות / התרשמות</p>
              <Textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="הערות חופשיות על התלמיד..."
                className="text-sm min-h-[60px] resize-none"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}