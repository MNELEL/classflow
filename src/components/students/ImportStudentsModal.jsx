import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileJson, CheckCircle2, AlertCircle, Users, Heart, Ban, X } from 'lucide-react';

/**
 * Supports two JSON formats:
 * 1. Students list:  { teacher?: string, students: [{id, name}] }
 * 2. Preferences:   [{student_id, name, preferred:[id,...], not_preferred:[id,...]}]
 *
 * When both are loaded together they are merged.
 * The final output is an array of Student-entity-compatible objects.
 */

function parseStudentsFile(json) {
  // Format 1
  if (json && Array.isArray(json.students)) {
    return json.students.map(s => ({ _importId: s.id, name: s.name }));
  }
  // Format 2 – preferences only
  if (Array.isArray(json)) {
    return json.map(s => ({ _importId: s.student_id, name: s.name }));
  }
  return null;
}

function parsePreferencesFile(json) {
  if (!Array.isArray(json)) return null;
  // [{student_id, preferred:[ids], not_preferred:[ids]}]
  return json.map(s => ({
    _importId: s.student_id,
    preferred: (s.preferred || []).filter(Boolean),
    not_preferred: (s.not_preferred || []).filter(Boolean),
  }));
}

function mergeData(students, preferences) {
  // Build id→name map from students
  const nameMap = {};
  students.forEach(s => { nameMap[s._importId] = s.name; });

  // Build preference map
  const prefMap = {};
  if (preferences) {
    preferences.forEach(p => {
      prefMap[p._importId] = {
        preferred: (p.preferred || []).filter(Boolean),
        not_preferred: (p.not_preferred || []).filter(Boolean),
      };
    });
  }

  return students.map(s => {
    const pref = prefMap[s._importId] || {};
    const friends = (pref.preferred || []).map(id => String(id));
    const avoid = (pref.not_preferred || []).map(id => String(id));
    return {
      _importId: s._importId,
      name: s.name,
      // Store numeric import IDs temporarily; resolved to entity IDs after creation
      _friendImportIds: pref.preferred || [],
      _avoidImportIds: pref.not_preferred || [],
    };
  });
}

export default function ImportStudentsModal({ open, onClose, onImport }) {
  const [studentsData, setStudentsData] = useState(null); // parsed students array
  const [prefsData, setPrefsData] = useState(null);       // parsed preferences array
  const [studentsFileName, setStudentsFileName] = useState('');
  const [prefsFileName, setPrefsFileName] = useState('');
  const [error, setError] = useState('');
  const studentsRef = useRef();
  const prefsRef = useRef();

  function readFile(file, onParsed, setFileName) {
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        onParsed(json);
      } catch {
        setError('שגיאה בקריאת הקובץ — ודא שהוא JSON תקני');
      }
    };
    reader.readAsText(file);
  }

  function handleStudentsFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file, (json) => {
      const parsed = parseStudentsFile(json);
      if (!parsed) { setError('פורמט קובץ תלמידים לא מוכר'); return; }
      setStudentsData(parsed);
      // If this file also contains preferences format
      if (Array.isArray(json)) {
        const prefs = parsePreferencesFile(json);
        if (prefs) setPrefsData(prefs);
      }
    }, setStudentsFileName);
  }

  function handlePrefsFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file, (json) => {
      const prefs = parsePreferencesFile(json);
      if (!prefs) { setError('פורמט קובץ העדפות לא מוכר'); return; }
      setPrefsData(prefs);
    }, setPrefsFileName);
  }

  const preview = studentsData ? mergeData(studentsData, prefsData) : [];

  function handleImport() {
    if (!studentsData || studentsData.length === 0) return;
    onImport(preview, prefsData);
    onClose();
  }

  function reset() {
    setStudentsData(null);
    setPrefsData(null);
    setStudentsFileName('');
    setPrefsFileName('');
    setError('');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> ייבוא רשימת תלמידים
          </DialogTitle>
          <DialogDescription>
            טען קובץ JSON של תלמידים ו/או קובץ העדפות ישיבה
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File format hint */}
          <div className="bg-accent/30 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
            <p className="font-semibold text-foreground">פורמטים נתמכים:</p>
            <p>📋 <b>רשימת תלמידים:</b> <code className="bg-muted px-1 rounded">{"{ teacher, students: [{id, name}] }"}</code></p>
            <p>❤️ <b>העדפות:</b> <code className="bg-muted px-1 rounded">{"[{ student_id, preferred:[ids], not_preferred:[ids] }]"}</code></p>
          </div>

          {/* Upload zones */}
          <div className="grid grid-cols-2 gap-3">
            <UploadZone
              label="רשימת תלמידים"
              icon={<Users className="w-5 h-5" />}
              fileName={studentsFileName}
              loaded={!!studentsData}
              inputRef={studentsRef}
              onChange={handleStudentsFile}
              onClear={() => { setStudentsData(null); setStudentsFileName(''); }}
              count={studentsData?.length}
            />
            <UploadZone
              label="קובץ העדפות"
              icon={<Heart className="w-5 h-5" />}
              fileName={prefsFileName}
              loaded={!!prefsData}
              inputRef={prefsRef}
              onChange={handlePrefsFile}
              onClear={() => { setPrefsData(null); setPrefsFileName(''); }}
              count={prefsData?.length}
              optional
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                תצוגה מקדימה — {preview.length} תלמידים
              </p>
              <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
                {preview.map(s => (
                  <div key={s._importId} className="flex items-center justify-between text-sm bg-card rounded-md px-3 py-1.5">
                    <span className="font-medium">{s.name}</span>
                    <div className="flex items-center gap-2">
                      {s._friendImportIds?.length > 0 && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[10px] gap-1 border-0">
                          <Heart className="w-2.5 h-2.5" />{s._friendImportIds.filter(Boolean).length}
                        </Badge>
                      )}
                      {s._avoidImportIds?.length > 0 && (
                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px] gap-1 border-0">
                          <Ban className="w-2.5 h-2.5" />{s._avoidImportIds.filter(Boolean).length}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row-reverse gap-2 sm:gap-2 pt-2">
          <Button onClick={handleImport} disabled={!studentsData || studentsData.length === 0}>
            <CheckCircle2 className="w-4 h-4 ml-1" /> ייבא {preview.length > 0 ? `${preview.length} תלמידים` : ''}
          </Button>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadZone({ label, icon, fileName, loaded, inputRef, onChange, onClear, count, optional }) {
  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors text-center
        ${loaded ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-accent/20'}`}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".json" className="hidden" onChange={onChange} />
      <div className={`${loaded ? 'text-primary' : 'text-muted-foreground'}`}>{icon}</div>
      <p className="text-xs font-medium leading-tight">{label}</p>
      {optional && !loaded && <p className="text-[10px] text-muted-foreground">(אופציונלי)</p>}
      {loaded ? (
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] text-primary font-medium">{count} רשומות</span>
          <button
            onClick={e => { e.stopPropagation(); onClear(); }}
            className="ml-1 text-muted-foreground hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">לחץ לבחירת קובץ</p>
      )}
    </div>
  );
}