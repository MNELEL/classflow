import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import MobileSelect from './MobileSelect';
import { loadGroups, getGroupTypeColor } from './GroupsManager';
import { X } from 'lucide-react';

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
const ACADEMIC_LEVEL_OPTIONS = [
  { value: 'weak', label: '🔴 חלש' },
  { value: 'below_average', label: '🟠 מתקשה' },
  { value: 'average', label: '🟡 בינוני' },
  { value: 'above_average', label: '🔵 מעל ממוצע' },
  { value: 'strong', label: '🟢 חזק' },
  { value: 'excellent', label: '⭐ מצטיין' },
];
const TRAIT_OPTIONS = [
  { value: 'attentive', label: '👂 מקשיב' },
  { value: 'cooperative', label: '🤝 משתף פעולה' },
  { value: 'struggling', label: '😟 מתקשה' },
  { value: 'fast_learner', label: '⚡ מבין מהר' },
  { value: 'needs_extra_explanation', label: '📖 צריך הסבר נוסף' },
  { value: 'needs_teacher_attention', label: '🎯 זקוק לתשומת לב' },
  { value: 'needs_encouragement', label: '💛 זקוק למחמאות' },
  { value: 'disruptive', label: '⚠️ מפריע' },
  { value: 'leader', label: '👑 מנהיג' },
  { value: 'shy', label: '🌸 ביישן' },
];

export default function StudentForm({ student, students, onSave, onCancel }) {
  const isMobile = useIsMobile();
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
    academic_level: student?.academic_level || 'average',
    traits: student?.traits || [],
    achievements: student?.achievements || '',
    custom_conditions: student?.custom_conditions || '',
  });

  const others = students.filter(s => s.id !== student?.id);

  function toggleNeed(val) {
    setForm(f => ({ ...f, special_needs: f.special_needs.includes(val) ? f.special_needs.filter(x => x !== val) : [...f.special_needs, val] }));
  }
  function toggleTrait(val) {
    setForm(f => ({ ...f, traits: f.traits.includes(val) ? f.traits.filter(x => x !== val) : [...f.traits, val] }));
  }
  function toggleRelation(field, id) {
    setForm(f => ({ ...f, [field]: f[field].includes(id) ? f[field].filter(x => x !== id) : [...f[field], id] }));
  }

  function handleSave() {
    if (!form.name.trim()) return;
    onSave({ ...student, ...form });
  }

  return (
    <div className={isMobile ? "space-y-4 max-h-[70vh] overflow-y-auto pr-1" : "space-y-4"}>
      {/* Name & group */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm">שם התלמיד *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="שם מלא" className="mt-1 h-11 text-base" />
        </div>
        <div>
          <Label className="text-sm">קבוצה כללית</Label>
          <Input value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} placeholder="שם קבוצה" className="mt-1 h-11 text-base" />
        </div>
      </div>

      {/* Learning group */}
      <div>
        <Label className="text-sm">🧩 קבוצת לימוד</Label>
        <Input value={form.learning_group} onChange={e => setForm(f => ({ ...f, learning_group: e.target.value }))} placeholder="הקלד שם קבוצה..." className="mt-1 h-11 text-base" list="groups-datalist" />
        {existingGroups.length > 0 && (
          <datalist id="groups-datalist">
            {existingGroups.map(g => <option key={g.id} value={g.name} />)}
          </datalist>
        )}
        {existingGroups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {existingGroups.map(g => (
              <button key={g.id} type="button"
                onClick={() => setForm(f => ({ ...f, learning_group: f.learning_group === g.name ? '' : g.name }))}
                className={`text-xs px-3 py-1.5 min-h-[36px] rounded-full font-medium border transition-colors ${form.learning_group === g.name ? 'bg-primary text-primary-foreground border-primary' : `${getGroupTypeColor(g.type)} border-transparent`}`}>
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Academic level */}
      <div>
        <Label className="text-sm mb-2 block">📊 רמה אקדמית</Label>
        <div className="flex flex-wrap gap-2">
          {ACADEMIC_LEVEL_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, academic_level: opt.value }))}
              className={`px-3 py-2 min-h-[36px] rounded-full text-sm border transition-colors ${form.academic_level === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:border-primary/50'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Traits */}
      <div>
        <Label className="text-sm mb-2 block">🏷️ תכונות התנהגותיות</Label>
        <div className="flex flex-wrap gap-2">
          {TRAIT_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => toggleTrait(opt.value)}
              className={`px-3 py-2 min-h-[36px] rounded-full text-sm border transition-colors ${form.traits.includes(opt.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:border-primary/50'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <Label className="text-sm">🌟 הצלחות וקישורים</Label>
        <Input value={form.achievements} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))} placeholder="הישגים, קישורים לעבודות, הצלחות בולטות..." className="mt-1 h-11 text-base" />
      </div>

      {/* Physical preferences */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-sm">גובה</Label>
          <MobileSelect value={form.height} onValueChange={v => setForm(f => ({ ...f, height: v }))} options={HEIGHT_OPTIONS} label="גובה" />
        </div>
        <div>
          <Label className="text-sm">העדפת שורה</Label>
          <MobileSelect value={form.row_preference} onValueChange={v => setForm(f => ({ ...f, row_preference: v }))} options={ROW_PREF_OPTIONS} label="העדפת שורה" />
        </div>
        <div>
          <Label className="text-sm">העדפת צד</Label>
          <MobileSelect value={form.side_preference} onValueChange={v => setForm(f => ({ ...f, side_preference: v }))} options={SIDE_PREF_OPTIONS} label="העדפת צד" />
        </div>
      </div>

      {/* Physical constraints */}
      <div>
        <Label className="text-sm mb-2 block">📍 אילוצים פיזיים כפויים</Label>
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
            <button type="button" onClick={() => setForm(f => ({ ...f, avoid_edges: !f.avoid_edges }))}
              className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg border text-sm transition-colors w-full justify-center ${form.avoid_edges ? 'bg-primary/10 border-primary text-primary' : 'border-border hover:border-primary/30'}`}>
              {form.avoid_edges ? '✅' : '⬜'} הימנע מקצוות הכיתה
            </button>
          </div>
        </div>
      </div>

      {/* Special needs */}
      <div>
        <Label className="text-sm">צרכים מיוחדים</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {SPECIAL_NEEDS_OPTIONS.map(opt => (
            <button key={opt.value} type="button" onClick={() => toggleNeed(opt.value)}
              className={`px-3 py-2 min-h-[36px] rounded-full text-sm border transition-colors ${form.special_needs.includes(opt.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border hover:border-primary/50'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Relations */}
      {others.length > 0 && (
        <>
          <RelationPicker label="💚 חברים מועדפים" field="friends" value={form.friends} students={others} onToggle={toggleRelation} activeClass="bg-green-100 border-green-400 dark:bg-green-900/30" />
          <RelationPicker label="🚫 יש להרחיק (בצמוד)" field="avoid" value={form.avoid} students={others} onToggle={toggleRelation} activeClass="bg-red-100 border-red-400 dark:bg-red-900/30" />
          <RelationPicker label="↔️ יש לרחק (מרחק גדול)" field="separate" value={form.separate} students={others} onToggle={toggleRelation} activeClass="bg-orange-100 border-orange-400 dark:bg-orange-900/30" />
        </>
      )}

      {/* Custom seating conditions */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
        <Label className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1 block">📌 תנאים אישיים לסידור מקומות</Label>
        <textarea
          value={form.custom_conditions}
          onChange={e => setForm(f => ({ ...f, custom_conditions: e.target.value }))}
          placeholder={`לדוגמה:\n• לשבת ליד דוד כהן\n• לא לשבת ליד החלון\n• חייב לשבת בשורה הקדמית בגלל ראייה חלשה\n• לא יכול לשבת ליד הדלת`}
          className="w-full mt-1 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-background min-h-[70px] resize-none placeholder:text-muted-foreground/60"
        />
        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">תנאים אלה יישלחו ל-AI בסידור החכם ויילקחו בחשבון</p>
      </div>

      <div>
        <Label className="text-sm">📝 הערות חופשיות / התרשמות</Label>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="דגשים אישיים, התרשמות מהתקדמות התלמיד, נקודות למעקב, הערות פדגוגיות..."
          className="w-full mt-1 border border-input bg-transparent rounded-md px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[100px] resize-y"
        />
        <p className="text-[10px] text-muted-foreground mt-1">הערות אלה נשמרות לאורך זמן ומוצגות בפרופיל התלמיד</p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} className="flex-1 h-11 text-base">שמור</Button>
        <Button variant="outline" onClick={onCancel} className="flex-1 h-11 text-base">ביטול</Button>
      </div>
    </div>
  );
}

function RelationPicker({ label, field, value, students, onToggle, activeClass }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="flex flex-wrap gap-2 mt-1.5 max-h-32 overflow-y-auto">
        {students.map(s => (
          <button key={s.id} type="button" onClick={() => onToggle(field, s.id)}
            className={`px-3 py-1.5 min-h-[36px] rounded-full text-sm border transition-colors ${value.includes(s.id) ? activeClass : 'bg-muted border-border hover:border-primary/50'}`}>
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}