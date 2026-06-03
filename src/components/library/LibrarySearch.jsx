import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

export default function LibrarySearch({ items }) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [usedItems, setUsedItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [showSources, setShowSources] = useState(false);

  const QUICK = [
    'תסכם את כל החומרים לפי נושא',
    'אילו נושאים עדיין לא כוסו?',
    'מה המושגים המרכזיים בחומרים?',
    'צור שאלות מסכמות לשיעור',
    'הכן עבודת בית מהחומרים',
  ];

  async function ask(q) {
    const question = q || query;
    if (!question.trim() || loading) return;
    setLoading(true);
    setAnswer('');
    setUsedItems([]);

    const readyItems = items.filter(i => i.ai_status === 'ready');
    const context = readyItems.slice(0, 20).map(i =>
      `📚 ${i.title} (${i.subject || 'ללא נושא'})\nסיכום: ${i.ai_summary || 'אין'}\nנקודות מפתח: ${(i.ai_key_points || []).join(', ')}`
    ).join('\n\n---\n\n');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `אתה עוזר מורה חכם. השב בעברית, בצורה בהירה ומעשית.
      
השאלה: ${question}

חומרים זמינים בספרייה:
${context || 'אין חומרים עם ניתוח AI זמינים עדיין'}

בסיום תשובתך, ציין בשורה נפרדת: SOURCES: [כותרות חומרים שבהם השתמשת, מופרדות בפסיקים]`,
      response_json_schema: {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    setAnswer(res.answer || '');
    setUsedItems(res.sources || []);
    setHistory(h => [{ q: question, a: res.answer, s: res.sources || [] }, ...h.slice(0, 4)]);
    setQuery('');
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK.map(q => (
          <button key={q} onClick={() => ask(q)}
            className="text-xs px-2.5 py-1 rounded-full border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors">
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          placeholder="שאל כל שאלה על חומרי הספרייה..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
          className="resize-none h-16 text-sm"
        />
        <Button onClick={() => ask()} disabled={loading || !query.trim()} size="sm" className="self-end h-16 px-3">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Answer */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 animate-pulse text-primary" /> מחפש בחומרים...
          </motion.div>
        )}
        {answer && !loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-accent/30 border border-accent rounded-xl p-4 space-y-3">
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
            {usedItems.length > 0 && (
              <div>
                <button onClick={() => setShowSources(v => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <BookOpen className="w-3 h-3" /> {usedItems.length} מקורות
                  {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showSources && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {usedItems.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-card border border-border rounded-full">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">היסטוריה</p>
          {history.slice(1).map((h, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-xl p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">🙋 {h.q}</p>
              <p className="text-xs text-foreground/80 line-clamp-2">{h.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}