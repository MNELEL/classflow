import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Sparkles, Loader2, Plus, ExternalLink, BookOpen, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const SOURCES = [
  { value: 'general', label: '🌐 חיפוש כללי' },
  { value: 'gemara', label: '📜 דפי גמרא ומקורות' },
  { value: 'ministry', label: '📚 משרד החינוך' },
  { value: 'cet', label: '🖥️ מט"ח (CET)' },
  { value: 'davidson', label: '✡️ מכון דוידסון' },
];

const OUTPUT_TYPES = [
  { value: 'lesson_plan', label: '📐 מערך שיעור' },
  { value: 'worksheet', label: '📓 דף עבודה' },
  { value: 'summary', label: '📋 סיכום' },
  { value: 'questions', label: '❓ שאלות הבנה' },
];

export default function ExternalSourceSearch() {
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('general');
  const [outputType, setOutputType] = useState('lesson_plan');
  const [gradeLevel, setGradeLevel] = useState('');
  const [results, setResults] = useState([]);
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedResults, setSelectedResults] = useState([]);
  const [savedToLib, setSavedToLib] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setGenerated('');
    setSelectedResults([]);

    const sourceLabel = SOURCES.find(s => s.value === source)?.label || source;
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `חפש חומרי לימוד בנושא: "${query}" מהמקור: ${sourceLabel}.
      ${gradeLevel ? `שכבת גיל: ${gradeLevel}` : ''}
      
      החזר 5 תוצאות רלוונטיות עם:
      - כותרת
      - תיאור קצר (2-3 משפטים)
      - קישור משוער (URL אמיתי אם ידוע, אחרת null)
      - תוכן עיקרי / ציטוט מרכזי
      - מילות מפתח
      
      השב בעברית.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                url: { type: ['string', 'null'] },
                main_content: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
              }
            }
          }
        }
      }
    });
    setResults(res.results || []);
    setLoading(false);
  }

  async function generateFromSelected() {
    const toUse = selectedResults.length > 0 ? selectedResults : results;
    if (toUse.length === 0) return;
    setGenerating(true);
    const outLabel = OUTPUT_TYPES.find(o => o.value === outputType)?.label || outputType;
    const content = toUse.map(r => `## ${r.title}\n${r.description}\n${r.main_content}`).join('\n\n---\n\n');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `בהתבסס על החומרים הבאים:
${content}

צור ${outLabel} מקצועי ומלא ${gradeLevel ? `לשכבת ${gradeLevel}` : ''} בנושא "${query}".
כלול: מטרות, פעילויות, שאלות, הנחיות למורה.
פורמט Markdown, עברית, מפורט ומעשי.`,
      response_json_schema: {
        type: 'object',
        properties: { content: { type: 'string' } }
      }
    });
    setGenerated(res.content || '');
    setGenerating(false);
    setSavedToLib(false);
  }

  async function saveToLibrary() {
    const outLabel = OUTPUT_TYPES.find(o => o.value === outputType)?.label || '';
    await base44.entities.LibraryItem.create({
      title: `${outLabel} - ${query}`,
      source_type: 'text_note',
      transcript: generated,
      subject: query,
      ai_status: 'ready',
      ai_summary: generated.slice(0, 200),
    });
    qc.invalidateQueries({ queryKey: ['library'] });
    toast.success('נשמר לספרייה!');
    setSavedToLib(true);
  }

  function toggleSelect(result) {
    setSelectedResults(prev =>
      prev.some(r => r.title === result.title)
        ? prev.filter(r => r.title !== result.title)
        : [...prev, result]
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
            <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm">מאגרים חיצוניים</h3>
            <p className="text-xs text-muted-foreground">חפש חומרים ויצור מהם מערכי שיעור ודפי עבודה</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="נושא לחיפוש... (למשל: בבא מציעא, שבת, כפל, ירושת מצרים)"
              className="pr-9 h-9 bg-white dark:bg-card"
            />
          </div>
          <div className="flex gap-2">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-8 text-xs flex-1 bg-white dark:bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={gradeLevel}
              onChange={e => setGradeLevel(e.target.value)}
              placeholder="כיתה / שכבה..."
              className="h-8 text-xs flex-1 bg-white dark:bg-card"
            />
          </div>
          <Button className="w-full gap-1.5 h-9" onClick={search} disabled={!query.trim() || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'מחפש...' : 'חפש חומרים'}
          </Button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">נמצאו {results.length} תוצאות</p>
              <p className="text-xs text-muted-foreground">
                {selectedResults.length > 0 ? `${selectedResults.length} נבחרו` : 'לחץ לבחירה'}
              </p>
            </div>

            {results.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => toggleSelect(r)}
                className={`bg-card border rounded-xl p-3 cursor-pointer transition-all ${
                  selectedResults.some(s => s.title === r.title)
                    ? 'border-primary bg-primary/5'
                    : 'border-border/70 hover:border-primary/40'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                    {r.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.keywords.slice(0, 4).map((k, j) => (
                          <span key={j} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-primary shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Generate section */}
            <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground">יצירת חומר מהתוצאות:</p>
              <Select value={outputType} onValueChange={setOutputType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_TYPES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button className="w-full gap-1.5 h-9" onClick={generateFromSelected} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'יוצר...' : `צור ${OUTPUT_TYPES.find(o => o.value === outputType)?.label || ''} מ-${selectedResults.length || results.length} תוצאות`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated content */}
      <AnimatePresence>
        {generated && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> חומר שנוצר
              </p>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
                onClick={saveToLibrary} disabled={savedToLib}>
                <Plus className="w-3 h-3" />
                {savedToLib ? '✅ נשמר' : 'שמור לספרייה'}
              </Button>
            </div>
            <div className="bg-white dark:bg-card border border-border/40 rounded-xl p-4 max-h-96 overflow-y-auto">
              <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed" dir="rtl">
                {generated}
              </ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}