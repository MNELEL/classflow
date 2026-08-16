import React, { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, UserPlus, RefreshCw, X, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import StudentColumnMapper, { defaultTargetFor, applyMapping } from './StudentColumnMapper';

const ACCEPTED = '.csv,.xlsx,.xls,.json,.html,.htm,.pdf,.png,.jpg,.jpeg,.txt,.docx';

// Known student entity fields (everything else goes to custom_fields)
const KNOWN_KEYS = new Set([
  'name', 'first_name', 'last_name', 'full_name', 'gender', 'height',
  'row_preference', 'side_preference', 'special_needs', 'learning_group',
  'academic_level', 'group', 'notes',
]);

const ROW_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'שם מלא (שם פרטי + שם משפחה משולב)' },
    first_name: { type: 'string', description: 'שם פרטי' },
    last_name: { type: 'string', description: 'שם משפחה' },
    gender: { type: 'string', enum: ['male', 'female', 'other'] },
    height: { type: 'string', enum: ['short', 'medium', 'tall'] },
    row_preference: { type: 'string', enum: ['front', 'middle', 'back', 'none'] },
    side_preference: { type: 'string', enum: ['left', 'right', 'center', 'none'] },
    special_needs: { type: 'array', items: { type: 'string' } },
    learning_group: { type: 'string' },
    academic_level: { type: 'string', enum: ['weak', 'below_average', 'average', 'above_average', 'strong', 'excellent'] },
    group: { type: 'string' },
    notes: { type: 'string' },
    custom_fields: {
      type: 'object',
      description: 'כל שאר העמודות בקובץ שאינן ברשימה לעיל (תעודת זהות, תאריך לידה, טלפון הורים וכו). מפתח = שם העמודה בקובץ, ערך = מחרוזת',
      additionalProperties: { type: 'string' },
    },
  },
};

function normName(n) { return (n || '').toString().trim().replace(/\s+/g, ' ').toLowerCase(); }
function ext(name) { return (name.split('.').pop() || '').toLowerCase(); }
function isPdfOrImage(name) { return ['pdf', 'png', 'jpg', 'jpeg'].includes(ext(name)); }
function isTabular(name) { return ['csv', 'xlsx', 'xls', 'json', 'html', 'htm', 'txt'].includes(ext(name)); }

// Combine first/last into name; drop intermediate keys; collect unknown keys into custom_fields.
function normalizeRow(raw) {
  const { first_name, last_name, full_name, custom_fields, ...rest } = raw;
  let name = (rest.name || full_name || '').toString().trim();
  if (!name) {
    name = [(first_name || '').toString().trim(), (last_name || '').toString().trim()].filter(Boolean).join(' ');
  }
  const custom = { ...(custom_fields || {}) };
  Object.keys(rest).forEach(k => {
    if (k.startsWith('_')) return;
    if (!KNOWN_KEYS.has(k)) {
      const v = rest[k];
      if (v !== null && v !== undefined && v !== '') custom[k] = String(v);
      delete rest[k];
    }
  });
  return { ...rest, name, custom_fields: custom };
}

async function extractWithLLM(file_url, fileName) {
  const prompt = `אתה מנתח מסמכים של רשימות תלמידים. הקובץ המצורף (${fileName}) מכיל טבלת תלמידים.

חשוב מאוד:
- חלץ את כל השורות בקובץ — כל תלמיד אחד הוא שורה נפרדת. אל תדלג על אף תלמיד ואל תמזג שורות.
- אם יש עמודת שם פרטי ועמודת שם משפחה בנפרד, שלב אותן לשדה name (שם מלא).
- זהה את העמודות המוכרות ומלא אותן: gender (male/female/other), height (short/medium/tall), row_preference (front/middle/back/none), side_preference (left/right/center/none), special_needs (מערך), learning_group, academic_level, group, notes.
- כל עמודה אחרת שקיימת בקובץ (תעודת זהות, תאריך לידה, טלפון הורים, כתובת וכו) — הכנס לשדה custom_fields כאובייקט שבו המפתח הוא שם העמודה בקובץ והערך הוא מחרוזת. אל תשמיט אף עמודה.
- החזר JSON עם שדה "students" שהוא מערך של כל התלמידים.`;
  const res = await base44.integrations.Core.InvokeLLM({
    prompt, file_urls: [file_url],
    response_json_schema: {
      type: 'object',
      properties: { students: { type: 'array', items: { ...ROW_SCHEMA, additionalProperties: true } } },
    },
  });
  return Array.isArray(res?.students) ? res.students : [];
}

async function extractTabular(file_url) {
  const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: ROW_SCHEMA });
  if (res?.status !== 'success') throw new Error(res?.details || 'חילוץ הנתונים נכשל');
  return Array.isArray(res.output) ? res.output : (res.output ? [res.output] : []);
}

function sampleValue(rows, key, isCustom) {
  for (const r of rows) {
    const v = isCustom ? r.custom_fields?.[key] : r[key];
    if (v !== '' && v != null) return String(v).slice(0, 24);
  }
  return '';
}

export default function FileImportStudents({ open, onClose, students = [], onDone }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload'); // 'upload' | 'mapping' | 'preview'
  const [rawRows, setRawRows] = useState([]);
  const [sourceColumns, setSourceColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const existingByName = useMemo(() => {
    const map = {};
    students.forEach(s => { map[normName(s.name)] = s; });
    return map;
  }, [students]);

  function reset() {
    setFile(null); setLoading(false); setError(''); setStep('upload');
    setRawRows([]); setSourceColumns([]); setMapping({}); setRows([]); setSaving(false);
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

      let list = [];
      if (isPdfOrImage(f.name)) list = await extractWithLLM(file_url, f.name);
      else if (isTabular(f.name)) list = await extractTabular(file_url);
      else list = await extractWithLLM(file_url, f.name);

      list = list.map(normalizeRow).filter(r => r.name);
      if (!list.length) {
        setError('לא זוהו תלמידים בקובץ — ודא שהקובץ מכיל טבלת תלמידים עם עמודת שם');
        setLoading(false);
        return;
      }

      // Build source columns from detected keys
      const keySet = new Set();
      const customSet = new Set();
      list.forEach(r => {
        Object.keys(r).forEach(k => {
          if (k.startsWith('_') || k === 'custom_fields') return;
          if (r[k] !== '' && r[k] != null) keySet.add(k);
        });
        Object.keys(r.custom_fields || {}).forEach(k => customSet.add(k));
      });
      const cols = [
        ...[...keySet].map(k => ({ key: k, isCustom: false, sample: sampleValue(list, k, false) })),
        ...[...customSet].map(k => ({ key: k, isCustom: true, sample: sampleValue(list, k, true) })),
      ];
      // Ensure 'name' is first
      cols.sort((a, b) => (a.key === 'name' ? -1 : b.key === 'name' ? 1 : 0));

      const defaultMap = {};
      cols.forEach(c => { defaultMap[c.key] = defaultTargetFor(c); });

      setRawRows(list);
      setSourceColumns(cols);
      setMapping(defaultMap);
      setStep('mapping');
    } catch (e) {
      setError(e?.message || 'שגיאה בעיבוד הקובץ');
    }
    setLoading(false);
  }

  function updateMapping(key, value) {
    setMapping(m => ({ ...m, [key]: value }));
  }

  function confirmMapping() {
    const finalRows = applyMapping(rawRows, sourceColumns, mapping);
    if (!finalRows.length) {
      setError('מיפוי לא תקין — ודא שעמודת שם ממופה לשדה "שם מלא"');
      return;
    }
    const matched = finalRows.map(r => ({
      ...r,
      _existing: existingByName[normName(r.name)] || null,
      _checked: true,
    }));
    setError('');
    setRows(matched);
    setStep('preview');
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

      let created = [];
      if (toCreate.length) created = await base44.entities.Student.bulkCreate(toCreate);

      if (toUpdate.length) {
        await Promise.all(toUpdate.map(r => {
          const { id, created_date, updated_date, created_by, created_by_id, _existing, _checked, ...next } = r;
          if (_existing.custom_fields && next.custom_fields) {
            next.custom_fields = { ..._existing.custom_fields, ...next.custom_fields };
          }
          return base44.entities.Student.update(_existing.id, next);
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
  const customKeys = useMemo(() => {
    const keys = new Set();
    rows.forEach(r => Object.keys(r.custom_fields || {}).forEach(k => keys.add(k)));
    return [...keys];
  }, [rows]);

  const titleByStep = step === 'mapping' ? 'זיהוי עמודות' : step === 'preview' ? 'תצוגה מקדימה' : 'ייבוא ועדכון מקובץ';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> {titleByStep}
          </DialogTitle>
          {step === 'upload' && (
            <p className="text-xs text-muted-foreground font-normal">
              כל פורמט: CSV, Excel, PDF, Word, תמונה, JSON, HTML. המערכת מחלצת את כל השורות, משלבת שם פרטי+משפחה, מזהה קיימים לפי שם ומעדכנת, מוסיפה חדשים. לאחר החילוץ תוכל/י למפות כל עמודה לשדה הנכון (ת"ז, טלפון, תאריך לידה ועוד).
            </p>
          )}
          {step === 'mapping' && (
            <p className="text-xs text-muted-foreground font-normal">
              זוהו {sourceColumns.length} עמודות בקובץ. בחר/י לכל עמודה לאיזה שדה במערכת היא תוכנס, כדי שהנתונים יישמרו במקום הנכון.
            </p>
          )}
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-3">
            <div
              className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors text-center border-border hover:border-primary/40 hover:bg-accent/20"
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
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

        {step === 'mapping' && (
          <div className="space-y-3">
            <StudentColumnMapper sourceColumns={sourceColumns} mapping={mapping} onMappingChange={updateMapping} />
            {error && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}
            <DialogFooter className="flex-row-reverse gap-2">
              <Button onClick={confirmMapping}>
                <ArrowLeftRight className="w-4 h-4 ml-1" /> המשך לתצוגה מקדימה
              </Button>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>
                <X className="w-4 h-4 ml-1" /> ביטול
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
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

            {customKeys.length > 0 && (
              <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2">
                <span className="font-semibold">שדות מותאמים שיישמרו: </span>
                {customKeys.map(k => (
                  <span key={k} className="inline-block bg-card border border-border rounded px-1.5 py-0.5 ml-1 mt-1">{k}</span>
                ))}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
              {rows.map((r, i) => {
                const cf = r.custom_fields || {};
                const cfKeys = Object.keys(cf);
                return (
                  <div key={i} className={`rounded-md px-3 py-2 text-sm border ${r._checked ? 'bg-card border-border/60' : 'bg-muted/40 border-transparent opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={r._checked} onChange={() => toggleRow(i)} className="w-4 h-4 shrink-0 accent-primary" />
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
                    {(r.gender || r.height || r.row_preference || r.side_preference || r.special_needs?.length || r.academic_level || r.learning_group || cfKeys.length) ? (
                      <div className="flex flex-wrap gap-1 mt-1.5 pr-6 text-[10px] text-muted-foreground">
                        {r.gender && <span>👤 {r.gender === 'male' ? 'זכר' : r.gender === 'female' ? 'נקבה' : 'אחר'}</span>}
                        {r.height && <span>📏 {r.height === 'tall' ? 'גבוה' : r.height === 'short' ? 'נמוך' : 'בינוני'}</span>}
                        {r.row_preference && r.row_preference !== 'none' && <span>📍 {r.row_preference === 'front' ? 'קדמי' : r.row_preference === 'back' ? 'אחורי' : 'אמצעי'}</span>}
                        {r.side_preference && r.side_preference !== 'none' && <span>↔️ {r.side_preference === 'right' ? 'ימין' : r.side_preference === 'left' ? 'שמאל' : 'מרכז'}</span>}
                        {r.special_needs?.length > 0 && <span>🏥 {r.special_needs.join(',')}</span>}
                        {r.academic_level && <span>📊 {r.academic_level}</span>}
                        {r.learning_group && <span>👥 {r.learning_group}</span>}
                        {cfKeys.map(k => <span key={k} className="bg-muted rounded px-1">📎 {k}: {String(cf[k]).slice(0, 18)}</span>)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <DialogFooter className="flex-row-reverse gap-2">
              <Button onClick={handleImport} disabled={saving || (newCount + updateCount) === 0}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> שומר...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 ml-1" /> הוסף {newCount} · עדכן {updateCount}</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="w-4 h-4 ml-1" /> חזור למיפוי
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}