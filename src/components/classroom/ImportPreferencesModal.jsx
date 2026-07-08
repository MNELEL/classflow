import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Parses bulk student names pasted as text (comma, newline, semicolon separated)
 */
function parseNameList(text) {
  return text
    .split(/[\n,;]+/)
    .map(n => n.trim())
    .filter(Boolean);
}

/**
 * Finds a student by approximate name match
 */
function findStudent(students, name) {
  const lower = name.toLowerCase().trim();
  return (
    students.find(s => s.name.toLowerCase() === lower) ||
    students.find(s => s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase()))
  );
}

export default function ImportPreferencesModal({ open, onClose, students, onApplyPreferences }) {
  const [tab, setTab] = useState('bulk'); // 'bulk' | 'file' | 'custom'
  const [bulkText, setBulkText] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [parsedNames, setParsedNames] = useState([]);
  const [fileStatus, setFileStatus] = useState(null); // null | 'loading' | 'done' | 'error'
  const [fileResult, setFileResult] = useState(null);
  const [aiParsed, setAiParsed] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileRef = useRef(null);

  function handleBulkParse() {
    const names = parseNameList(bulkText);
    setParsedNames(names);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileStatus('loading');
    setFileResult(null);
    setAiParsed(null);

    try {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const isOffice = file.name.match(/\.(xlsx|xls|csv|doc|docx)$/i);
      const isText = file.type.startsWith('text/') || file.name.match(/\.(txt|json)$/i);

      let extractedText = '';

      if (isText) {
        extractedText = await file.text();
      } else {
        // Use base44 ExtractDataFromUploadedFile for PDF, images, office docs
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              students: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    preferences: { type: 'string', description: 'all preferences / conditions for this student' }
                  }
                }
              },
              raw_text: { type: 'string' }
            }
          }
        });
        const result = extracted?.output || extracted;
        if (result?.students?.length > 0) {
          setAiParsed(result.students);
          setFileStatus('done');
          setFileResult(`נמצאו ${result.students.length} תלמידים בקובץ`);
          return;
        }
        extractedText = result?.raw_text || '';
      }

      // Parse the text with AI
      if (extractedText) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Parse the following text and extract student names and their seating preferences.
Text: ${extractedText.slice(0, 4000)}

Return a JSON array of students with their preferences extracted.`,
          response_json_schema: {
            type: 'object',
            properties: {
              students: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    preferences: { type: 'string' }
                  }
                }
              }
            }
          }
        });
        if (result?.students?.length > 0) {
          setAiParsed(result.students);
          setFileStatus('done');
          setFileResult(`נמצאו ${result.students.length} תלמידים בקובץ`);
          return;
        }
        // Fallback: just extract names from raw text
        const names = parseNameList(extractedText);
        if (names.length > 0) {
          setAiParsed(names.map(n => ({ name: n, preferences: '' })));
          setFileStatus('done');
          setFileResult(`נמצאו ${names.length} שמות בקובץ`);
          return;
        }
      }

      setFileStatus('error');
      setFileResult('לא נמצאו נתונים בקובץ');
    } catch (err) {
      setFileStatus('error');
      setFileResult(err.message || 'שגיאה בעיבוד הקובץ');
    }
  }

  async function handleApplyAiParsed() {
    if (!aiParsed?.length) return;
    setIsProcessing(true);
    try {
      // Use AI to map parsed names+preferences to actual student entities
      const studentNames = students.map(s => s.name);
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You have a list of students in a class: ${JSON.stringify(studentNames)}.

The following preferences were extracted from an uploaded file:
${JSON.stringify(aiParsed, null, 2)}

Map each entry to the closest matching student in the class list.
For preferences, extract: row_preference (front/middle/back/none), side_preference (left/center/right/none), friends (list of student names who want to sit together), avoid (list of names to avoid), custom_condition (any free text condition that doesn't fit the above).

Return only students that could be matched.`,
        response_json_schema: {
          type: 'object',
          properties: {
            mappings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  student_name: { type: 'string' },
                  row_preference: { type: 'string' },
                  side_preference: { type: 'string' },
                  friends: { type: 'array', items: { type: 'string' } },
                  avoid: { type: 'array', items: { type: 'string' } },
                  custom_condition: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (result?.mappings?.length > 0) {
        onApplyPreferences(result.mappings);
        toast.success(`הועברו העדפות ל-${result.mappings.length} תלמידים`);
        onClose();
      } else {
        toast.error('לא ניתן היה למפות את ההעדפות לתלמידים');
      }
    } catch (err) {
      toast.error('שגיאה בעיבוד ההעדפות');
    }
    setIsProcessing(false);
  }

  function handleApplyBulk() {
    const names = parseNameList(bulkText);
    if (names.length === 0) { toast.error('לא הוכנסו שמות'); return; }
    onApplyPreferences(names.map(n => ({ student_name: n, _bulk_only: true })));
    toast.success(`הועברו ${names.length} שמות`);
    onClose();
  }

  function handleApplyCustom() {
    if (!customCondition.trim()) { toast.error('יש להכניס תנאי'); return; }
    onApplyPreferences([{ _custom_condition: customCondition.trim() }]);
    toast.success('תנאי מותאם נשמר');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>ייבוא העדפות ותנאים</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
          {[
            { id: 'bulk', label: 'הכנסת שמות' },
            { id: 'file', label: 'טעינת קובץ' },
            { id: 'custom', label: 'תנאי מותאם' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: bulk names */}
        {tab === 'bulk' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">הכנס שמות תלמידים — מופרדים בפסיק, נקודה-פסיק או שורה חדשה</p>
            <Textarea
              value={bulkText}
              onChange={e => { setBulkText(e.target.value); setParsedNames([]); }}
              placeholder={"ישראל ישראלי\nסמי כהן, דנה לוי\nמשה דוד"}
              rows={5}
              className="text-sm resize-none"
              dir="rtl"
            />
            <Button variant="outline" size="sm" onClick={handleBulkParse} disabled={!bulkText.trim()}>
              פרסר שמות
            </Button>
            {parsedNames.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium">{parsedNames.length} שמות זוהו:</p>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {parsedNames.map((n, i) => {
                    const found = findStudent(students, n);
                    return (
                      <Badge key={i} variant={found ? 'default' : 'outline'} className={`text-xs ${!found ? 'border-warning text-warning' : ''}`}>
                        {n} {found ? '✓' : '?'}
                      </Badge>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">✓ = תלמיד נמצא, ? = לא זוהה</p>
                <Button size="sm" onClick={handleApplyBulk}>החל רשימת שמות</Button>
              </div>
            )}
          </div>
        )}

        {/* Tab: file upload */}
        {tab === 'file' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">ניתן לטעון קובץ JSON, Excel, CSV, TXT, PDF, תמונה — המערכת תחלץ שמות והעדפות אוטומטית</p>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-accent/30 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">לחץ לבחירת קובץ</p>
              <p className="text-xs text-muted-foreground mt-1">JSON · Excel · CSV · TXT · PDF · תמונה</p>
              <input ref={fileRef} type="file" accept=".json,.xlsx,.xls,.csv,.txt,.pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileUpload} />
            </div>

            {fileStatus === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> מעבד קובץ...
              </div>
            )}
            {fileStatus === 'done' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="w-4 h-4" /> {fileResult}
                </div>
                {aiParsed?.length > 0 && (
                  <>
                    <div className="max-h-40 overflow-y-auto space-y-1 bg-muted rounded-lg p-2">
                      {aiParsed.map((s, i) => (
                        <div key={i} className="text-xs flex gap-2">
                          <span className="font-medium">{s.name}</span>
                          {s.preferences && <span className="text-muted-foreground truncate">{s.preferences}</span>}
                        </div>
                      ))}
                    </div>
                    <Button size="sm" onClick={handleApplyAiParsed} disabled={isProcessing}>
                      {isProcessing ? <><Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />מעבד...</> : 'החל העדפות על תלמידים'}
                    </Button>
                  </>
                )}
              </div>
            )}
            {fileStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" /> {fileResult}
              </div>
            )}
          </div>
        )}

        {/* Tab: custom condition */}
        {tab === 'custom' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">הכנס תנאי מותאם אישית שיועבר ל-AI בסידור החכם — תאר בחופשיות</p>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">דוגמאות:</p>
              <div className="flex flex-wrap gap-1">
                {[
                  'כל תלמיד יקבל לפחות חבר אחד בשורה',
                  'תלמידים עם ADHD ישבו קדמה',
                  'דני ויוסי לא ישבו בשורה אחת',
                  'הקבוצות החזקות יפוזרו',
                ].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setCustomCondition(ex)}
                    className="text-xs bg-accent/50 hover:bg-accent px-2 py-1 rounded-md transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={customCondition}
              onChange={e => setCustomCondition(e.target.value)}
              placeholder="תאר את התנאי בחופשיות..."
              rows={4}
              className="text-sm resize-none"
              dir="rtl"
            />
            <Button size="sm" onClick={handleApplyCustom} disabled={!customCondition.trim()}>
              שמור תנאי
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}