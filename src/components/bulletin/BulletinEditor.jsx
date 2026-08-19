import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, FileDown, CheckCircle2, Loader2, ImageIcon } from 'lucide-react';

// Editable string list (study_points / activities)
function StringList({ items, onChange, placeholder }) {
  const update = (i, v) => onChange(items.map((it, idx) => (idx === i ? v : it)));
  const add = () => onChange([...items, '']);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input value={it} onChange={(e) => update(i, e.target.value)} placeholder={placeholder} className="flex-1" />
          <Button size="icon" variant="ghost" onClick={() => remove(i)} className="shrink-0 text-destructive" aria-label="הסר פריט">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add} className="gap-1">
        <Plus className="w-3.5 h-3.5" /> הוסף שורה
      </Button>
    </div>
  );
}

// Editable {question, answer} list
function QuestionList({ items, onChange }) {
  const update = (i, field, v) => onChange(items.map((it, idx) => (idx === i ? { ...it, [field]: v } : it)));
  const add = () => onChange([...items, { question: '', answer: '' }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-border p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">שאלה {i + 1}</span>
            <Button size="icon" variant="ghost" onClick={() => remove(i)} className="h-7 w-7 text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Input value={it.question || ''} onChange={(e) => update(i, 'question', e.target.value)} placeholder="שאלה להורה" />
          <Textarea value={it.answer || ''} onChange={(e) => update(i, 'answer', e.target.value)} placeholder="תשובה קצרה" className="min-h-[60px]" />
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add} className="gap-1">
        <Plus className="w-3.5 h-3.5" /> הוסף שאלה
      </Button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function BulletinEditor({
  bulletin,
  onChange,
  template,
  templates,
  onTemplateChange,
  templateImageUrl,
  onSave,
  onExport,
  onApprove,
  saving,
  exporting,
  dirty,
}) {
  if (!bulletin) {
    return <p className="text-sm text-muted-foreground text-center py-10">בחר חוברת מהרשימה או צור חדשה.</p>;
  }

  const set = (partial) => onChange(partial);

  return (
    <div className="space-y-4">
      {/* Status + dates */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-bold text-sm text-foreground">
            {bulletin.start_date && new Date(bulletin.start_date).toLocaleDateString('he-IL')}
            {bulletin.end_date && ` – ${new Date(bulletin.end_date).toLocaleDateString('he-IL')}`}
          </p>
        </div>
        <Badge variant={bulletin.status === 'approved' ? 'default' : 'secondary'}>
          {bulletin.status === 'approved' ? 'מאושר' : 'טיוטה'}
        </Badge>
      </div>

      {/* Template picker + preview */}
      <Field label="תבנית סגנון (אופציונלי)">
        <select
          value={template?.id || ''}
          onChange={(e) => onTemplateChange(templates.find((t) => t.id === e.target.value) || null)}
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">ברירת מחדל (ללא תבנית)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name || 'תבנית ללא שם'}</option>
          ))}
        </select>
      </Field>

      {template && (
        <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
          {templateImageUrl && (
            <div className="flex items-center justify-center rounded-md overflow-hidden border border-border bg-white max-h-40">
              <img src={templateImageUrl} alt="תצוגה מקדימה" className="max-h-40 object-contain" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border border-border" style={{ background: template.accent_color || '#2563eb' }} />
            <span className="text-sm font-semibold">{template.detected_title || 'ללא כותרת מזוהה'}</span>
          </div>
          {template.detected_body_text && <p className="text-xs text-muted-foreground">{template.detected_body_text}</p>}
          {template.analyzed_layout?.layout_description && (
            <p className="text-xs text-muted-foreground flex gap-1 items-start">
              <ImageIcon className="w-3 h-3 mt-0.5 shrink-0" />
              {template.analyzed_layout.layout_description}
            </p>
          )}
        </div>
      )}

      <Field label="סיכום שבועי">
        <Textarea value={bulletin.digest_summary || ''} onChange={(e) => set({ digest_summary: e.target.value })} className="min-h-[90px]" />
      </Field>

      <Field label="נקודות שנלמדו">
        <StringList items={bulletin.study_points || []} onChange={(v) => set({ study_points: v })} placeholder="נקודה" />
      </Field>

      <Field label="שאלות חזרה להורים">
        <QuestionList items={bulletin.recap_questions || []} onChange={(v) => set({ recap_questions: v })} />
      </Field>

      <Field label="פעילויות">
        <StringList items={bulletin.activities || []} onChange={(v) => set({ activities: v })} placeholder="פעילות" />
      </Field>

      <Field label="חידת השבוע">
        <Textarea value={bulletin.weekly_riddle || ''} onChange={(e) => set({ weekly_riddle: e.target.value })} className="min-h-[60px]" />
      </Field>
      <Field label="תשובת חידת השבוע">
        <Input value={bulletin.weekly_riddle_answer || ''} onChange={(e) => set({ weekly_riddle_answer: e.target.value })} />
      </Field>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button onClick={onSave} disabled={saving || !dirty} className="gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} שמור
        </Button>
        <Button onClick={onExport} disabled={exporting} variant="outline" className="gap-1">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} הפק PDF
        </Button>
        {bulletin.status !== 'approved' && (
          <Button onClick={onApprove} disabled={saving} variant="secondary" className="gap-1">
            <CheckCircle2 className="w-4 h-4" /> אישרתי
          </Button>
        )}
      </div>
    </div>
  );
}