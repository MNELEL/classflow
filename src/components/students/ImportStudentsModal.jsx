import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileJson, CheckCircle2, AlertCircle, Users, Heart, Ban, X, Wand2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ─── JSON import helpers ──────────────────────────────────────────────────────

function parseStudentsFile(json) {
  if (json && Array.isArray(json.students)) {
    return json.students.map(s => ({ _importId: s.id, name: s.name }));
  }
  if (Array.isArray(json)) {
    return json.map(s => ({ _importId: s.student_id, name: s.name }));
  }
  return null;
}

function parsePreferencesFile(json) {
  if (!Array.isArray(json)) return null;
  return json.map(s => ({
    _importId: s.student_id,
    preferred: (s.preferred || []).filter(Boolean),
    not_preferred: (s.not_preferred || []).filter(Boolean),
  }));
}

function mergeData(students, preferences) {
  const prefMap = {};
  if (preferences) {
    preferences.forEach(p => {
      prefMap[p._importId] = {
        preferred: p.preferred || [],
        not_preferred: p.not_preferred || [],
      };
    });
  }
  return students.map(s => {
    const pref = prefMap[s._importId] || {};
    return {
      _importId: s._importId,
      name: s.name,
      _friendImportIds: pref.preferred || [],
      _avoidImportIds: pref.not_preferred || [],
    };
  });
}

// ─── AI free-text parser ──────────────────────────────────────────────────────

async function parseWithAI(text) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `אתה מנתח רשימות כיתה בעברית. המשתמש הדביק טקסט חופשי שמכיל שמות תלמידים והעדפות ישיבה. 
חלץ מהטקסט הבא רשימת תלמידים מסודרת עם ההעדפות שלהם.

כללי חילוץ:
- "רוצה לשבת עם X" / "חבר של X" / "קרוב ל-X" → friends (מי שהוא רוצה לשבת קרוב אליהם)
- "לא לשבת עם X" / "להרחיק מ-X" / "בעיה עם X" / "מריב עם X" → avoid (מי שאסור לשבת ליד)
- "להפריד בין X ל-Y" / "לא ביחד X ו-Y" → separate (צריך מרחק גדול)
- "קדמי" / "שורה ראשונה" / "ליד הלוח" → row_preference: "front"
- "אחורי" / "שורה אחרונה" → row_preference: "back"  
- "אמצעי" / "אמצע" → row_preference: "middle"
- "ימין" → side_preference: "right"
- "שמאל" → side_preference: "left"
- "גבוה" → height: "tall"
- "נמוך" → height: "short"
- "קשיי ראייה" / "לא רואה" → special_needs: ["vision"]
- "קשיי שמיעה" / "לא שומע" → special_needs: ["hearing"]
- "ADHD" / "קשב" / "ריכוז" → special_needs: ["adhd"]
- "נכות" / "כיסא גלגלים" → special_needs: ["mobility"]

טקסט לניתוח:
"""
${text}
"""

החזר JSON עם שדה "students" שהוא מערך של אובייקטים. כל אובייקט:
{
  "name": "שם מלא",
  "friends": ["שם1", "שם2"],
  "avoid": ["שם3"],
  "separate": ["שם4"],
  "row_preference": "front"|"middle"|"back"|"none",
  "side_preference": "left"|"right"|"center"|"none",
  "height": "short"|"medium"|"tall",
  "special_needs": [],
  "notes": "הערות נוספות אם יש"
}

חשוב: השתמש אך ורק בשמות שמופיעים בטקסט. אל תמציא שמות.`,
    response_json_schema: {
      type: 'object',
      properties: {
        students: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              friends: { type: 'array', items: { type: 'string' } },
              avoid: { type: 'array', items: { type: 'string' } },
              separate: { type: 'array', items: { type: 'string' } },
              row_preference: { type: 'string' },
              side_preference: { type: 'string' },
              height: { type: 'string' },
              special_needs: { type: 'array', items: { type: 'string' } },
              notes: { type: 'string' },
            },
          },
        },
      },
    },
  });
  return result?.students || [];
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ImportStudentsModal({ open, onClose, onImport }) {
  const [tab, setTab] = useState('ai'); // 'ai' | 'json'

  // AI tab state
  const [freeText, setFreeText] = useState('');
  const [aiResult, setAiResult] = useState(null); // array of parsed students
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // JSON tab state
  const [studentsData, setStudentsData] = useState(null);
  const [prefsData, setPrefsData] = useState(null);
  const [studentsFileName, setStudentsFileName] = useState('');
  const [prefsFileName, setPrefsFileName] = useState('');
  const [jsonError, setJsonError] = useState('');
  const studentsRef = useRef();
  const prefsRef = useRef();

  function reset() {
    setFreeText('');
    setAiResult(null);
    setAiLoading(false);
    setAiError('');
    setStudentsData(null);
    setPrefsData(null);
    setStudentsFileName('');
    setPrefsFileName('');
    setJsonError('');
  }

  // ── AI parse ──
  async function handleAIParse() {
    if (!freeText.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const parsed = await parseWithAI(freeText);
      if (!parsed || parsed.length === 0) {
        setAiError('לא נמצאו תלמידים בטקסט — נסה להוסיף יותר פרטים');
      } else {
        setAiResult(parsed);
      }
    } catch {
      setAiError('שגיאה בניתוח — נסה שוב');
    }
    setAiLoading(false);
  }

  function handleAIImport() {
    if (!aiResult || aiResult.length === 0) return;
    // Convert AI result to the format onImport expects
    const preview = aiResult.map((s, i) => ({
      _importId: `ai-${i}`,
      name: s.name,
      _friendImportIds: [],
      _avoidImportIds: [],
      // Direct fields for the student entity
      friends_names: s.friends || [],
      avoid_names: s.avoid || [],
      separate_names: s.separate || [],
      row_preference: s.row_preference || 'none',
      side_preference: s.side_preference || 'none',
      height: s.height || 'medium',
      special_needs: s.special_needs || [],
      notes: s.notes || '',
    }));
    onImport(preview, null, true /* isAI */);
    onClose();
  }

  // ── JSON helpers ──
  function readFile(file, onParsed, setFileName) {
    setJsonError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        onParsed(json);
      } catch {
        setJsonError('שגיאה בקריאת הקובץ — ודא שהוא JSON תקני');
      }
    };
    reader.readAsText(file);
  }

  function handleStudentsFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file, (json) => {
      const parsed = parseStudentsFile(json);
      if (!parsed) { setJsonError('פורמט קובץ תלמידים לא מוכר'); return; }
      setStudentsData(parsed);
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
      if (!prefs) { setJsonError('פורמט קובץ העדפות לא מוכר'); return; }
      setPrefsData(prefs);
    }, setPrefsFileName);
  }

  const jsonPreview = studentsData ? mergeData(studentsData, prefsData) : [];

  function handleJSONImport() {
    if (!studentsData || studentsData.length === 0) return;
    onImport(jsonPreview, prefsData);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" /> ייבוא תלמידים
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${tab === 'ai' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('ai')}
          >
            ✨ ייבוא חכם (AI)
          </button>
          <button
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${tab === 'json' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setTab('json')}
          >
            📂 ייבוא JSON
          </button>
        </div>

        {/* ── AI Tab ── */}
        {tab === 'ai' && (
          <div className="space-y-4">
            <div className="bg-accent/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">הדבק כאן כל טקסט עם שמות התלמידים והעדפות</p>
              <p>אפשר לכתוב בצורה חופשית, לא מסודרת. ה-AI יחלץ את השמות, חברויות, אילוצים והעדפות ישיבה.</p>
              <p className="text-[10px]">לדוגמה: <i>"דנה רוצה לשבת עם נועה, אסור לשים ליד תומר. ירדן צריך שורה קדמית כי יש לו בעיות ראייה..."</i></p>
            </div>

            <Textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="הדבק כאן את הרשימה שלך..."
              className="min-h-[140px] text-sm"
              dir="rtl"
            />

            <Button
              onClick={handleAIParse}
              disabled={!freeText.trim() || aiLoading}
              className="w-full"
            >
              {aiLoading ? (
                <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> מנתח...</>
              ) : (
                <><Wand2 className="w-4 h-4 ml-1" /> נתח עם AI</>
              )}
            </Button>

            {aiError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {aiError}
              </div>
            )}

            {aiResult && aiResult.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  נמצאו {aiResult.length} תלמידים
                </p>
                <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
                  {aiResult.map((s, i) => (
                    <div key={i} className="bg-card rounded-md px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{s.name}</span>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {s.row_preference && s.row_preference !== 'none' && (
                            <Badge variant="outline" className="text-[10px]">{s.row_preference === 'front' ? 'קדמי' : s.row_preference === 'back' ? 'אחורי' : 'אמצעי'}</Badge>
                          )}
                          {s.special_needs?.length > 0 && (
                            <Badge variant="secondary" className="text-[10px]">{s.special_needs.join(', ')}</Badge>
                          )}
                          {s.friends?.length > 0 && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 text-[10px] border-0">
                              <Heart className="w-2.5 h-2.5 ml-0.5" />{s.friends.length}
                            </Badge>
                          )}
                          {s.avoid?.length > 0 && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[10px] border-0">
                              <Ban className="w-2.5 h-2.5 ml-0.5" />{s.avoid.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {s.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{s.notes}</p>}
                    </div>
                  ))}
                </div>

                <DialogFooter className="flex-row-reverse gap-2 pt-3">
                  <Button onClick={handleAIImport}>
                    <CheckCircle2 className="w-4 h-4 ml-1" /> ייבא {aiResult.length} תלמידים
                  </Button>
                  <Button variant="outline" onClick={() => { reset(); onClose(); }}>ביטול</Button>
                </DialogFooter>
              </div>
            )}
          </div>
        )}

        {/* ── JSON Tab ── */}
        {tab === 'json' && (
          <div className="space-y-4">
            <div className="bg-accent/30 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
              <p className="font-semibold text-foreground">פורמטים נתמכים:</p>
              <p>📋 <b>רשימת תלמידים:</b> <code className="bg-muted px-1 rounded">{"{ students: [{id, name}] }"}</code></p>
              <p>❤️ <b>העדפות:</b> <code className="bg-muted px-1 rounded">{"[{ student_id, preferred:[ids], not_preferred:[ids] }]"}</code></p>
            </div>

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

            {jsonError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0" /> {jsonError}
              </div>
            )}

            {jsonPreview.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  תצוגה מקדימה — {jsonPreview.length} תלמידים
                </p>
                <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2">
                  {jsonPreview.map(s => (
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

            <DialogFooter className="flex-row-reverse gap-2">
              <Button onClick={handleJSONImport} disabled={!studentsData || studentsData.length === 0}>
                <CheckCircle2 className="w-4 h-4 ml-1" /> ייבא {jsonPreview.length > 0 ? `${jsonPreview.length} תלמידים` : ''}
              </Button>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>ביטול</Button>
            </DialogFooter>
          </div>
        )}
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
          <button onClick={e => { e.stopPropagation(); onClear(); }} className="ml-1 text-muted-foreground hover:text-destructive">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">לחץ לבחירת קובץ</p>
      )}
    </div>
  );
}