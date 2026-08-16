import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, UserPlus, RefreshCw, X, ArrowLeft, ArrowLeftRight, Merge, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import StudentColumnMapper, { guessTarget, applyMapping } from './StudentColumnMapper';
import DuplicateMergeModal from './DuplicateMergeModal';
import { extractStudentsFromFile } from '@/lib/studentFileImport';

const ACCEPTED = '.csv,.xlsx,.xls,.json,.txt,.pdf,.png,.jpg,.jpeg,.docx,.html,.htm';

function normName(n) { return (n || '').toString().trim().replace(/\s+/g, ' ').toLowerCase(); }

function sampleValue(rows, key) {
  for (const r of rows) {
    const v = r[key];
    if (v !== '' && v != null) return String(v).slice(0, 24);
  }
  return '';
}

const DUP_ID_KEYS = ['id_number', 'father_id', 'mother_id'];

// Detect duplicate rows within the batch (same name OR same ID field) via union-find.
function findDuplicateGroups(rows) {
  const parent = rows.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { parent[find(a)] = find(b); };
  const byName = {};
  rows.forEach((r, i) => { const k = normName(r.name); if (k) { (byName[k] ||= []).push(i); } });
  Object.values(byName).forEach(idxs => { for (let j = 1; j < idxs.length; j++) union(idxs[0], idxs[j]); });
  DUP_ID_KEYS.forEach(key => {
    const byId = {};
    rows.forEach((r, i) => { const v = r.custom_fields?.[key]; if (v && String(v).trim()) { const k = String(v).trim(); (byId[k] ||= []).push(i); } });
    Object.values(byId).forEach(idxs => { for (let j = 1; j < idxs.length; j++) union(idxs[0], idxs[j]); });
  });
  const groups = {};
  rows.forEach((_, i) => { const root = find(i); (groups[root] ||= []).push(i); });
  return Object.values(groups)
    .filter(g => g.length > 1)
    .map(g => g.map(i => ({ index: i, row: rows[i] })));
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
  const [mergeGroup, setMergeGroup] = useState(null);

  const groups = useMemo(() => findDuplicateGroups(rows), [rows]);
  const groupIndexSet = useMemo(() => new Set(groups.flatMap(g => g.map(x => x.index))), [groups]);

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
      const { rows: raw } = await extractStudentsFromFile(f);
      if (!raw.length) {
        setError('לא זוהו תלמידים בקובץ — ודא שהקובץ מכיל טבלת תלמידים עם שורת כותרת ועמודת שם');
        setLoading(false);
        return;
      }
      // Source columns = union of keys across rows, in first-row order
      const keyOrder = [];
      const seen = new Set();
      raw.forEach(r => Object.keys(r).forEach(k => { if (!seen.has(k)) { seen.add(k); keyOrder.push(k); } }));
      const cols = keyOrder.map(k => ({ key: k, sample: sampleValue(raw, k) }));

      const defaultMap = {};
      cols.forEach(c => { defaultMap[c.key] = guessTarget(c.key); });

      setRawRows(raw);
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
      setError('מיפוי לא תקין — ודא שלפחות עמודת שם ממופה לשדה "שם מלא"');
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
      return { ...r, name: value, _existing: existingByName[normName(value)] || null };
    }));
  }

  function applyMerge(mergedRow) {
    const removeIdx = new Set((mergeGroup || []).map(x => x.index));
    setRows(rs => [...rs.filter((_, i) => !removeIdx.has(i)), mergedRow]);
    setMergeGroup(null);
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
              כל פורמט: CSV, Excel, PDF, Word, תמונה, JSON, HTML. המערכת מחלצת את כל השורות עם שמות העמודות המקוריים, מזהה קיימים לפי שם ומעדכנת, מוסיפה חדשים. לאחר החילוץ תוכל/י למפות כל עמודה לשדה הנכון.
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
            <label
              className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors text-center border-border hover:border-primary/40 hover:bg-accent/20"
            >
              <input type="file" accept={ACCEPTED} className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
              {loading ? (
                <>
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium">מחלץ נתונים מהקובץ...</p>
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
            </label>
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

            {groups.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> זוהו {groups.length} קבוצות כפילויות — מומלץ למזג לכרטיס אחד
                </div>
                {groups.map((g, gi) => (
                  <div key={gi} className="border border-amber-300/50 dark:border-amber-700/40 rounded-lg p-2 bg-amber-50/40 dark:bg-amber-900/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-muted-foreground">{g.length} רשומות זהות</span>
                      <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => setMergeGroup(g)}>
                        <Merge className="w-3 h-3 ml-1" /> מזג לכרטיס אחד
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {g.map((item) => (
                        <div key={item.index} className="text-xs bg-card rounded px-2 py-1 border border-border/40">
                          <span className="font-semibold">{item.row.name}</span>
                          {item.row._existing && <span className="text-[10px] text-blue-600 mr-1">• קיים</span>}
                          {item.row.custom_fields && Object.keys(item.row.custom_fields).length > 0 && (
                            <span className="text-[10px] text-muted-foreground mr-1">• {Object.keys(item.row.custom_fields).join(', ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
              {rows.map((r, i) => {
                if (groupIndexSet.has(i)) return null;
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

        <DuplicateMergeModal open={!!mergeGroup} group={mergeGroup} onClose={() => setMergeGroup(null)} onMerge={applyMerge} />
      </DialogContent>
    </Dialog>
  );
}