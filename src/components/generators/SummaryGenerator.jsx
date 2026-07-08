import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, FileText, Copy, Save, GraduationCap, Eye, EyeOff, Mic } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const LEVEL_OPTIONS = [
  { value: 'basic', label: 'בסיסית', desc: 'תלמידים מתקשים — מושגי יסוד, הסברים פשוטים, דוגמאות בסיסיות' },
  { value: 'intermediate', label: 'בינונית', desc: 'רוב הכיתה — איזון בין יסודות להרחבה' },
  { value: 'advanced', label: 'מתקדמת', desc: 'תלמידים חזקים — ניתוח, קשרים, הרחבות' },
  { value: 'high', label: 'גבוהה', desc: 'מצטיינים — מושגים מתקדמים, חקירה עצמאית, אתגרים' },
];

const SCOPE_OPTIONS = [
  { value: 'full', label: 'סיכום מלא', desc: 'כל הנושאים, פירוט מעמיק, תמלול + סיכום' },
  { value: 'partial', label: 'סיכום חלקי', desc: 'נקודות מפתח בלבד, תמציתי' },
];

export default function SummaryGenerator() {
  const qc = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [level, setLevel] = useState('medium');
  const [scope, setScope] = useState('full');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 100),
  });

  const itemsWithContent = libraryItems.filter(i => i.transcript || i.ai_summary);

  async function handleGenerate() {
    if (!selectedItemId) { toast.error('בחר חומר לימוד'); return; }
    const item = libraryItems.find(i => i.id === selectedItemId);
    if (!item) return;

    setGenerating(true);
    setResult(null);
    try {
      const content = item.transcript || item.ai_summary || '';
      const levelDesc = LEVEL_OPTIONS.find(l => l.value === level)?.desc || '';
      const scopeDesc = SCOPE_OPTIONS.find(s => s.value === scope)?.desc || '';

      const prompt = `אתה מורה מומחה. צור סיכום פדגוגי אוטומטי ומלא של השיעור, מותאם אישית לתלמידים.

חומר המקור:
כותרת: "${item.title}"
${item.subject ? `מקצוע: ${item.subject}` : ''}

תוכן השיעור (תמלול/סיכום גולמי):
"""
${content.slice(0, 4000)}
"""

התאמה נדרשת:
- רמת קושי: ${levelDesc}
- היקף הסיכום: ${scopeDesc}

צור סיכום מלא ומותאם בעברית בלבד, בפורמט Markdown מסודר. הסיכום יכלול:

## סיכום השיעור
- כותרת ראשית ברורה
- נקודות מפתח מותאמות לרמת הקושי שנבחרה:
  * רמה בסיסית: מושגי יסוד, הסברים פשוטים, דוגמאות בסיסיות
  * רמה בינונית: איזון בין יסודות להרחבה
  * רמה מתקדמת: ניתוח, קשרים בין מושגים, הרחבות
  * רמה גבוהה: מושגים מתקדמים, חקירה עצמאית, אתגרים
- דוגמאות מעשיות מותאמות לרמה
- ${scope === 'full' ? 'תרגול עצמי מומלץ (3-5 שאלות)' : 'שאלה אחת לחשיבה'}
- טיפ למורה

הסיכום צריך לכסות את מלוא תוכן השיעור בצורה מסודרת ונגישה.`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setResult({ content: res, transcript: content, itemId: selectedItemId, title: item.title });
      toast.success('הסיכום הופק!');
    } catch (err) {
      toast.error('שגיאה ביצירת הסיכום: ' + (err.message || ''));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveToLibrary() {
    if (!result) return;
    try {
      const item = libraryItems.find(i => i.id === result.itemId);
      const artifacts = item?.generated_artifacts || [];
      await base44.entities.LibraryItem.update(result.itemId, {
        generated_artifacts: [...artifacts, {
          id: Date.now().toString(),
          type: 'lesson_summary',
          title: `סיכום מותאם (${LEVEL_OPTIONS.find(l => l.value === level)?.label} - ${SCOPE_OPTIONS.find(s => s.value === scope)?.label})`,
          content: result.content,
          created_at: new Date().toLocaleDateString('he-IL'),
        }],
      });
      qc.invalidateQueries({ queryKey: ['library'] });
      toast.success('הסיכום נשמר לספרייה!');
    } catch {
      toast.error('שגיאה בשמירה');
    }
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm">מחולל סיכומים מותאם</h3>
            <p className="text-[11px] text-muted-foreground">סיכום פדגוגי לפי רמת תלמידים והיקף</p>
          </div>
        </div>

        {/* Source selector */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block">בחר חומר לימוד</label>
          <MobileSelect value={selectedItemId} onValueChange={setSelectedItemId} placeholder="בחר מהספרייה..." className="h-10">
            {itemsWithContent.length === 0 ? (
              <SelectItem value={null} disabled>אין חומרים עם תוכן</SelectItem>
            ) : (
              itemsWithContent.map(i => (
                <SelectItem key={i.id} value={i.id}>
                  {i.title}{i.subject ? ` · ${i.subject}` : ''}
                </SelectItem>
              ))
            )}
          </MobileSelect>
        </div>

        {/* Level selector */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> רמת תלמידים</label>
          <div className="grid grid-cols-3 gap-2">
            {LEVEL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setLevel(opt.value)}
                disabled={generating}
                className={`p-2.5 rounded-xl border text-center transition-all min-h-[60px] ${level === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <p className="text-xs font-bold">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Scope selector */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block">היקף הסיכום</label>
          <div className="grid grid-cols-2 gap-2">
            {SCOPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setScope(opt.value)}
                disabled={generating}
                className={`p-2.5 rounded-xl border text-center transition-all min-h-[50px] ${scope === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
              >
                <p className="text-xs font-bold">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={generating || !selectedItemId} className="w-full gap-2 h-11">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'מייצר סיכום...' : 'צור סיכום מותאם'}
        </Button>

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                {LEVEL_OPTIONS.find(l => l.value === level)?.label} · {SCOPE_OPTIONS.find(s => s.value === scope)?.label}
              </Badge>
              <div className="flex gap-1">
                {result.transcript && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1 h-7"
                    onClick={() => setShowTranscript(!showTranscript)}
                  >
                    {showTranscript ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showTranscript ? 'הסתר תמלול' : 'הצג תמלול'}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => { navigator.clipboard.writeText(result.content); toast.success('הועתק!'); }}>
                  <Copy className="w-3 h-3" /> העתק
                </Button>
                <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={handleSaveToLibrary}>
                  <Save className="w-3 h-3" /> שמור
                </Button>
              </div>
            </div>

            {/* Transcript view */}
            {showTranscript && result.transcript && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 max-h-[300px] overflow-y-auto">
                <div className="flex items-center gap-1.5 mb-2">
                  <Mic className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400">תמלול מלא</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{result.transcript}</p>
              </div>
            )}

            {/* Summary view */}
            <div className="bg-muted/30 rounded-xl p-3 max-h-[400px] overflow-y-auto border border-border/60">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">סיכום מלא</span>
              </div>
              <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed" dir="rtl">
                {result.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}