import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, Wand2, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

// Parse CSV text → array of objects
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

const STUDENT_FIELDS = {
  name: 'שם תלמיד (חובה)',
  height: 'גובה (short/medium/tall)',
  gender: 'מגדר (male/female)',
  learning_group: 'קבוצת לימוד',
  notes: 'הערות',
  academic_level: 'רמה אקדמית (weak/average/strong/excellent)',
};

const GRADE_FIELDS = {
  student_name: 'שם תלמיד (חובה)',
  subject: 'מקצוע (חובה)',
  test_name: 'שם מבחן',
  score: 'ציון (חובה)',
  max_score: 'ציון מקסימלי',
  date: 'תאריך (YYYY-MM-DD)',
  period: 'סוג (exam/quiz/homework)',
};

export default function CsvImportModal({ open, onClose, mode, students = [], onImportStudents, onImportGrades }) {
  const [step, setStep] = useState('upload'); // upload | mapping | preview | done
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const targetFields = mode === 'students' ? STUDENT_FIELDS : GRADE_FIELDS;

  function reset() { setStep('upload'); setRawRows([]); setMapping({}); setPreview([]); }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) { toast.error('הקובץ ריק או בפורמט שגוי'); return; }
    setRawRows(rows);
    await doMapping(rows, Object.keys(rows[0]));
  }

  async function doMapping(rows, csvHeaders) {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a data mapping assistant. Map CSV column headers to the target entity fields.
CSV headers: ${JSON.stringify(csvHeaders)}
Target fields: ${JSON.stringify(Object.keys(targetFields))}
Return ONLY a JSON object mapping each target field to the best matching CSV header, or null if no match.
Example: {"name": "שם", "score": "ציון", "subject": null}`,
        response_json_schema: {
          type: 'object',
          properties: Object.fromEntries(Object.keys(targetFields).map(f => [f, { type: ['string', 'null'] }]))
        }
      });
      setMapping(res);
      buildPreview(rows, res);
      setStep('preview');
    } catch {
      // fallback: auto-map by name similarity
      const fallback = {};
      Object.keys(targetFields).forEach(f => {
        const match = csvHeaders.find(h => h.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(h.toLowerCase()));
        fallback[f] = match || null;
      });
      setMapping(fallback);
      buildPreview(rows, fallback);
      setStep('preview');
    }
    setLoading(false);
  }

  function buildPreview(rows, map) {
    const mapped = rows.slice(0, 50).map(row => {
      const obj = {};
      Object.entries(map).forEach(([field, col]) => { if (col && row[col] !== undefined) obj[field] = row[col]; });
      return obj;
    });
    setPreview(mapped);
  }

  async function doImport() {
    setLoading(true);
    if (mode === 'students') {
      const valid = preview.filter(r => r.name);
      await onImportStudents(valid);
    } else {
      // grades: need to resolve student names → IDs
      const nameToId = {};
      students.forEach(s => { nameToId[s.name] = s.id; });
      const valid = preview.filter(r => r.student_name && r.score && r.subject);
      const gradeObjs = valid.map(r => ({
        student_id: nameToId[r.student_name] || '',
        student_name: r.student_name,
        subject: r.subject,
        test_name: r.test_name || r.subject,
        score: parseFloat(r.score) || 0,
        max_score: parseFloat(r.max_score) || 100,
        date: r.date || new Date().toISOString().slice(0, 10),
        period: r.period || 'exam',
      })).filter(g => g.student_id);
      await onImportGrades(gradeObjs);
    }
    setLoading(false);
    setStep('done');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'students' ? '📥 ייבוא תלמידים מ-CSV' : '📥 ייבוא ציונים מ-CSV'}</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">לחץ לבחירת קובץ CSV</p>
              <p className="text-xs text-muted-foreground mt-1">המערכת תמפה את העמודות אוטומטית</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />

            {/* Template download */}
            <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">עמודות מומלצות ל{mode === 'students' ? 'תלמידים' : 'ציונים'}:</p>
              <p dir="ltr">{Object.values(targetFields).join(' | ')}</p>
            </div>

            {loading && <div className="flex items-center gap-2 text-sm text-primary"><Wand2 className="w-4 h-4 animate-pulse" /> ממפה עמודות חכם...</div>}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>מיפוי אוטומטי הושלם • {preview.length} שורות</span>
            </div>

            {/* Mapping summary */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(mapping).map(([field, col]) => (
                col ? (
                  <Badge key={field} variant="secondary" className="text-xs">
                    {targetFields[field]?.split(' ')[0]} ← {col}
                  </Badge>
                ) : null
              ))}
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>{Object.keys(targetFields).filter(f => mapping[f]).map(f => (
                    <th key={f} className="px-3 py-2 text-right font-medium text-muted-foreground">{targetFields[f]?.split(' ')[0]}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-border/50">
                      {Object.keys(targetFields).filter(f => mapping[f]).map(f => (
                        <td key={f} className="px-3 py-1.5">{row[f] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 5 && <p className="text-xs text-muted-foreground text-center">... ועוד {preview.length - 5} שורות</p>}

            {mode === 'grades' && preview.filter(r => r.student_name).some(r => !students.find(s => s.name === r.student_name)) && (
              <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 text-xs rounded-lg p-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                חלק מהתלמידים לא נמצאו במערכת ולא ייובאו
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold">הייבוא הושלם בהצלחה!</p>
          </div>
        )}

        <DialogFooter className="flex gap-2 flex-row-reverse">
          {step === 'preview' && (
            <Button onClick={doImport} disabled={loading}>
              {loading ? 'מייבא...' : `ייבא ${preview.length} שורות`}
            </Button>
          )}
          {step === 'done' && <Button onClick={() => { reset(); onClose(); }}>סגור</Button>}
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper: export to CSV download
export function exportToCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}