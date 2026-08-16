import React, { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, UserPlus, RefreshCw, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// File types supported by the ExtractDataFromUploadedFile integration
const ACCEPTED = '.csv,.xlsx,.xls,.json,.html,.htm,.pdf,.png,.jpg,.jpeg,.txt,.docx';

// Schema describing a single student record the extractor should return
const STUDENT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'שם מלא של התלמיד' },
    gender: { type: 'string', enum: ['male', 'female', 'other'] },
    height: { type: 'string', enum: ['short', 'medium', 'tall'] },
    row_preference: { type: 'string', enum: ['front', 'middle', 'back', 'none'] },
    side_preference: { type: 'string', enum: ['left', 'right', 'center', 'none'] },
    special_needs: { type: 'array', items: { type: 'string' } },
    learning_group: { type: 'string' },
    academic_level: { type: 'string', enum: ['weak', 'below_average', 'average', 'above_average', 'strong', 'excellent'] },
    group: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['name'],
};

// Normalize a Hebrew name for matching: trim, collapse spaces, lowercase
function normName(n) {
  return (n || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Only keep non-empty scalar fields suitable for create/update
function toEntityFields(s) {
  const fields = { name: s.name, is_active: true };
  if (s.gender) fields.gender = s.gender;
  if (s.height) fields.height = s.height;
  if (s.row_preference) fields.row_preference = s.row_preference;
  if (s.side_preference) fields.side_preference = s.side_preference;
  if (Array.isArray(s.special_needs) && s.special_needs.length) fields.special_needs = s.special_needs;
  if (s.learning_group) fields.learning_group = s.learning_group;
  if (s.academic_level) fields.academic_level = s.academic_level;
  if (s.group) fields.group = s.group;
  if (s.notes) fields.notes = s.notes;
  return fields;
}

export default function FileImportStudents({ open, onClose, students = [], onDone }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]); // extracted + matched rows
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const existingByName = useMemo(() => {
    const map = {};
    students.forEach(s => { map[normName(s.name)] = s; });
    return map;
  }, [students]);

  function reset() {
    setFile(null);
    setLoading(false);
    setError('');
    setRows([]);
    setSaving(false);
  }

  async function handleFile(f) {
    if (!f) return;
    reset();
    setFile(f);
    setLoading(true);
    setError('');
    try {
      const up = await base44.integrations.Core.UploadFile({ file: f });
      const file_url = up?.file_url;
      if (!file_url) throw new Error('העלאת הקובץ נכשלה');
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: STUDENT_SCHEMA,
      });
      if (res?.status !== 'success') throw new Error(res?.details || 'חילוץ הנתונים נכשל');
      let list = Array.isArray(res.output) ? res.output : (res.output ? [res.output] : []);
      // Keep only rows with a usable name
      list = list.map(r => ({ ...r, name: (r.name || '').toString().trim() })).filter(r => r.name);
      if (!list.length) {
        setError('לא זוהו תלמידים בקובץ — ודא שהקובץ מכיל טבלת תלמידים עם עמודת שם');
        setLoading(false);
        return;
      }
      const matched = list.map(r => {
        const existing = existingByName[normName(r.name)];
        return { ...r, _existing: existing || null, _checked: true };
      });
      setRows(matched);
    } catch (e) {
      setError(e?.message || 'שגיאה בעיבוד הקובץ');
    }
    setLoading(false);
  }

  function toggleRow(i) {
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, _checked: !r._checked } : r));
  }

  function editRowName(i, value) {
    setRows(rs => rs.map((r, idx) => {
      if (idx !== i) return r;
      const existing = existingByName[normName(value)];
      return { ...r, name: value, _existing: existing || null };
    }));
  }

  async function handleImport() {
    const selected = rows.filter(r => r._checked);
    if (!selected.length) return;
    setSaving(true);
    try {
      const toCreate = selected.filter(r => !r._existing);
      const toUpdate = selected.filter(r => r._existing);

      // Create new students
      let created = [];
      if (toCreate.length) {
        created = await base44.entities.Student.bulkCreate(toCreate.map(toEntityFields));
      }

      // Update existing students (only non-empty fields override current values)
      if (toUpdate.length) {
        await Promise.all(toUpdate.map(r => {
          const next = toEntityFields(r);
          delete next.is_active;
          delete next.name; // don't overwrite name on update
          const merged = { ...r._existing, ...next };
          // remove built-ins
          const { id, created_date, updated_date, created_by, created_by_id, ...rest } = merged;
          return base44.entities.Student.update(r._existing.id, rest);
        }));
      }

      onDone?.();
      toast.success(`הסתיים: ${created.length} נוספו, ${toUpdate.length} עודכנו`);
      reset();
      onClose();
    } catch (e) {
      toast.error('שגיאה בשמירה — ' + (e?.message || 'נסו שוב'));
    }
    setSaving(false);
  }

  const newCount = rows.filter(r => r._checked && !r._existing).length;
  const updateCount = rows.filter(r => r._checked && r._existing).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> ייבוא ועדכון מקובץ
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-normal">
            כל פורמט: CSV, Excel, PDF, Word, תמונה, JSON, HTML. המערכת מחלצת את נתוני התלמידים, מזהה קיימים לפי שם ומעדכנת, ומוסיפה חדשים.
          </p>
        </DialogHeader>

        {!rows.length && (
          <div className="space-y-3">
            <div
              className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors text-center border-border hover:border-primary/40 hover:bg-accent/20"
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0])}
              />
              {loading ? (
                <>
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium">מעלה ומחלץ נתונים...</p>
                  <p className="text-xs text-muted-foreground">זה עשוי לקחת כמה שניות</p>
                </>
              ) : file ? (
                <>
                  <FileText className="w-8 h-8 text-primary" />
                  <p className="text-sm font-medium truncate max-w-full">{file.name}</p>
                  <p className="text-xs text-muted-foreground">לחץ להחלפת קובץ</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">לחץ לבחירת קובץ או גרור לכאן</p>
                  <p className="text-[11px] text-muted-foreground">CSV · Excel · PDF · Word · תמונה · JSON · HTML</p>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">זוהו {rows.length} תלמידים</span>
              <div className="flex gap-1.5">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0">
                  <UserPlus className="w-3 h-3 ml-0.5" /> {newCount} חדשים
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-0">
                  <RefreshCw className="w-3 h-3 ml-0.5" /> {updateCount} עדכונים
                </Badge>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
              {rows.map((r, i) => (
                <div key={i} className={`rounded-md px-3 py-2 text-sm border ${r._checked ? 'bg-card border-border/60' : 'bg-muted/40 border-transparent opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r._checked}
                      onChange={() => toggleRow(i)}
                      className="w-4 h-4 shrink-0 accent-primary"
                    />
                    <input
                      value={r.name}
                      onChange={e => editRowName(i, e.target.value)}
                      className="flex-1 bg-transparent font-semibold outline-none focus:bg-muted/40 rounded px-1 -mx-1 min-w-0"
                    />
                    {r._existing ? (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-0 text-[10px] shrink-0">
                        <RefreshCw className="w-2.5 h-2.5 ml-0.5" /> עדכון
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0 text-[10px] shrink-0">
                        <UserPlus className="w-2.5 h-2.5 ml-0.5" /> חדש
                      </Badge>
                    )}
                  </div>
                  {(r.row_preference || r.side_preference || r.special_needs?.length || r.academic_level || r.notes) && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pr-6 text-[10px] text-muted-foreground">
                      {r.gender && <span>👤 {r.gender === 'male' ? 'זכר' : r.gender === 'female' ? 'נקבה' : 'אחר'}</span>}
                      {r.height && <span>📏 {r.height === 'tall' ? 'גבוה' : r.height === 'short' ? 'נמוך' : 'בינוני'}</span>}
                      {r.row_preference && r.row_preference !== 'none' && <span>📍 {r.row_preference === 'front' ? 'קדמי' : r.row_preference === 'back' ? 'אחורי' : 'אמצעי'}</span>}
                      {r.side_preference && r.side_preference !== 'none' && <span>↔️ {r.side_preference === 'right' ? 'ימין' : r.side_preference === 'left' ? 'שמאל' : 'מרכז'}</span>}
                      {r.special_needs?.length > 0 && <span>🏥 {r.special_needs.join(',')}</span>}
                      {r.academic_level && <span>📊 {r.academic_level}</span>}
                      {r.learning_group && <span>👥 {r.learning_group}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}

            <DialogFooter className="flex-row-reverse gap-2">
              <Button onClick={handleImport} disabled={saving || (newCount + updateCount) === 0}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> שומר...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 ml-1" /> הוסף {newCount} · עדכן {updateCount}</>
                )}
              </Button>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>
                <X className="w-4 h-4 ml-1" /> ביטול
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}