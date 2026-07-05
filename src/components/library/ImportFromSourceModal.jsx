import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Search, Loader2, Download, ExternalLink, CheckCircle2, BookOpen, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const SOURCES = [
  {
    value: 'daf_yomi',
    label: 'פורטל הדף היומי',
    emoji: '📖',
    url: 'https://daf-yomi.com',
    color: 'bg-amber-50 border-amber-200 text-amber-800',
    badge: 'bg-amber-100 text-amber-700',
    description: 'סיכומים, שאלות, שיעורי שמע/וידאו, דפי עזר לכל דפי הגמרא',
    searchUrl: 'https://daf-yomi.com/Search.aspx',
    categories: ['ללמוד ולהבין', 'להעמיק', 'להתחדד', 'שיעורי שמע', 'מאמרים'],
  },
  {
    value: 'kol_halashon',
    label: 'קול הלשון',
    emoji: '🎙️',
    url: 'https://www.kolhalashon.com',
    color: 'bg-blue-50 border-blue-200 text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
    description: 'ספריית שיעורי תורה שמע/וידאו ענקית מגדולי ישראל',
    categories: ['גמרא', 'הלכה', 'מחשבה', 'פרשת שבוע', 'מועדים'],
  },
  {
    value: 'kol_hadaf',
    label: 'קול הדף',
    emoji: '📻',
    url: 'https://www.kolhadaf.com',
    color: 'bg-purple-50 border-purple-200 text-purple-800',
    badge: 'bg-purple-100 text-purple-700',
    description: 'שיעורי הדף היומי עם פירושים ובאורים מרבנים מובילים',
    categories: ['שיעורים', 'סיכומים', 'חזרות'],
  },
  {
    value: 'dirshu',
    label: 'דירשו',
    emoji: '🏫',
    url: 'https://www.dirshu.com',
    color: 'bg-green-50 border-green-200 text-green-800',
    badge: 'bg-green-100 text-green-700',
    description: 'חומרי עזר לדף היומי, חזרות, בחנים ועלוני חידושים',
    categories: ['בחנים', 'חזרות', 'חידושים', 'הלכה'],
  },
];

const CONTENT_TYPES = [
  { value: 'summary', label: 'סיכום הדף' },
  { value: 'lesson_plan', label: 'מערך שיעור' },
  { value: 'questions', label: 'שאלות חזרה' },
  { value: 'audio_links', label: 'שיעורי שמע' },
  { value: 'all', label: 'כל הסוגים' },
];

export default function ImportFromSourceModal({ open, onClose }) {
  const qc = useQueryClient();
  const [selectedSource, setSelectedSource] = useState('daf_yomi');
  const [query, setQuery] = useState('');
  const [contentType, setContentType] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState({});
  const [imported, setImported] = useState({});

  const source = SOURCES.find(s => s.value === selectedSource);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);

    const res = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `חפש תכנים לימודיים באתר ${source.label} (${source.url}) בנושא: "${query}".
סוג תוכן מבוקש: ${CONTENT_TYPES.find(c => c.value === contentType)?.label || 'כל הסוגים'}.
תיאור האתר: ${source.description}

חפש ומצא 6 פריטים רלוונטיים מהאתר. לכל פריט החזר:
- title: כותרת מדויקת
- type: סוג התוכן (סיכום / מערך שיעור / שאלות / שיעור שמע / עלון / ספר)
- description: תיאור מה מכיל הפריט (3-4 משפטים בעברית)
- url: קישור ישיר לפריט (השתמש בתבניות URL אמיתיות של האתר אם ידועות, אחרת null)
- content_preview: תוכן מקדים / קטע לדוגמה מהפריט (3-5 משפטים בעברית)
- subject: נושא הפריט (למשל: גמרא / הלכה / שבת / כפל)
- keywords: מילות מפתח (מערך 3-5 מילים)
- source_type: pdf / youtube_link / audio_file / external_link / text_note

השב בעברית בלבד.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
                url: { type: ['string', 'null'] },
                content_preview: { type: 'string' },
                subject: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
                source_type: { type: 'string' },
              }
            }
          }
        }
      }
    });

    setResults(res.items || []);
    setLoading(false);
  }

  async function handleImport(item, idx) {
    setImporting(prev => ({ ...prev, [idx]: true }));
    try {
      const sourceTypeMap = {
        pdf: 'pdf', youtube_link: 'youtube_link', audio_file: 'audio_file',
        external_link: 'external_link', text_note: 'text_note',
      };
      await base44.entities.LibraryItem.create({
        title: item.title,
        description: item.description,
        source_type: sourceTypeMap[item.source_type] || 'external_link',
        external_url: item.url || source.url,
        youtube_url: item.source_type === 'youtube_link' ? item.url : undefined,
        subject: item.subject || query,
        tags: item.keywords || [],
        transcript: item.content_preview || '',
        ai_status: 'ready',
        ai_summary: item.description,
        ai_key_points: item.keywords || [],
        category: source.label,
        coverage_status: 'not_started',
      });
      qc.invalidateQueries({ queryKey: ['library'] });
      setImported(prev => ({ ...prev, [idx]: true }));
      toast.success(`"${item.title}" נוסף לספרייה!`);
    } catch {
      toast.error('שגיאה בייבוא');
    } finally {
      setImporting(prev => ({ ...prev, [idx]: false }));
    }
  }

  async function handleImportAll() {
    const toImport = results.filter((_, i) => !imported[i]);
    if (toImport.length === 0) return;
    for (let i = 0; i < results.length; i++) {
      if (!imported[i]) await handleImport(results[i], i);
    }
  }

  const importedCount = Object.values(imported).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0" dir="rtl">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Download className="w-5 h-5 text-primary" />
            ייבוא מאתרי לימוד
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Source selector */}
          <div className="grid grid-cols-2 gap-2">
            {SOURCES.map(s => (
              <button
                key={s.value}
                onClick={() => { setSelectedSource(s.value); setResults([]); }}
                className={`rounded-xl border-2 p-3 text-right transition-all ${
                  selectedSource === s.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 bg-card'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{s.emoji}</span>
                  <span className="text-xs font-bold leading-tight">{s.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{s.description}</p>
              </button>
            ))}
          </div>

          {/* Source info bar */}
          <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${source.color}`}>
            <span className="text-xs font-medium">{source.label}</span>
            <a href={source.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100">
              <ExternalLink className="w-3 h-3" /> פתח אתר
            </a>
          </div>

          {/* Search bar */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="חפש נושא... (גמרא, שבת, בבא מציעא)"
                  className="pr-9 h-9"
                />
              </div>
              <MobileSelect value={contentType} onValueChange={setContentType} className="h-9 w-36 text-xs">
                {CONTENT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </MobileSelect>
            </div>
            <Button className="w-full gap-2 h-9" onClick={handleSearch} disabled={!query.trim() || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'מחפש באתר...' : `חפש ב${source.label}`}
            </Button>
          </div>

          {/* Results */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">נמצאו {results.length} פריטים</p>
                  {importedCount < results.length && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleImportAll}>
                      <Download className="w-3 h-3" /> ייבא הכל
                    </Button>
                  )}
                </div>

                {results.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border rounded-xl p-3 bg-card space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className="font-semibold text-sm leading-snug">{item.title}</p>
                          <Badge className={`text-[9px] px-1.5 border-0 shrink-0 ${source.badge}`}>{item.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      </div>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary shrink-0 mt-0.5">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {item.content_preview && (
                      <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1.5 leading-relaxed line-clamp-3 border-r-2 border-primary/30">
                        {item.content_preview}
                      </p>
                    )}

                    {item.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.keywords.map((k, j) => (
                          <span key={j} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{k}</span>
                        ))}
                      </div>
                    )}

                    <Button
                      size="sm"
                      className="w-full h-8 gap-1.5 text-xs"
                      variant={imported[i] ? 'outline' : 'default'}
                      disabled={importing[i] || imported[i]}
                      onClick={() => handleImport(item, i)}
                    >
                      {importing[i] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : imported[i] ? (
                        <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> נוסף לספרייה</>
                      ) : (
                        <><Download className="w-3.5 h-3.5" /> ייבא לספרייה</>
                      )}
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!loading && results.length === 0 && query && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">חפש נושא לייבוא תכנים</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}