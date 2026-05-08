import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const EXAMPLE_QUERIES = [
  'מי התלמיד עם הממוצע הגבוה ביותר?',
  'מה הממוצע של הכיתה במתמטיקה?',
  'אילו תלמידים נכשלו בחודש האחרון?',
  'הצג השוואה בין הביצועים של ישראל ישראלי לבין שאר הכיתה',
  'מה מגמת הציונים של הכיתה בשלושת החודשים האחרונים?',
];

export default function AIGradeQuery({ students, grades }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const activeStudents = students.filter(s => s.is_active !== false);

  async function sendQuery(q) {
    const question = q || query.trim();
    if (!question) return;

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setQuery('');
    setIsLoading(true);

    // Build data context
    const studentMap = Object.fromEntries(activeStudents.map(s => [s.id, s.name]));
    const gradesContext = grades.map(g => ({
      student: studentMap[g.student_id] || 'לא ידוע',
      subject: g.subject,
      test: g.test_name || '',
      score: g.score,
      max: g.max_score || 100,
      pct: g.max_score ? Math.round((g.score / g.max_score) * 100) : g.score,
      period: g.period,
      date: g.date,
    }));

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `אתה עוזר אנליטיקה חכם למורה. ענה בעברית על שאלות על ציוני התלמידים.

נתוני ציונים (${gradesContext.length} רשומות):
${JSON.stringify(gradesContext.slice(0, 200), null, 1)}

תלמידים בכיתה (${activeStudents.length}): ${activeStudents.map(s => s.name).join(', ')}

שאלת המורה: "${question}"

הנחיות:
- ענה בעברית בצורה ברורה ותמציתית
- השתמש בנתונים האמיתיים מהמערכת
- אם אין מספיק נתונים, ציין זאת בצורה ברורה
- השתמש בטבלאות ורשימות כשזה עוזר לבהירות (markdown)
- אם שואלים על ממוצע — חשב אותו ואל תשכח לציין על כמה ציונים מבוסס החישוב`,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'מצטער, אירעה שגיאה בעיבוד השאלה. נסה שוב.' }]);
    }
    setIsLoading(false);
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">שאל שאלות על הציונים</h2>
        </div>
        <p className="text-xs text-muted-foreground">שאל בשפה חופשית על נתוני הציונים של הכיתה</p>
      </div>

      {/* Example queries */}
      {messages.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-xs text-muted-foreground mb-2 font-medium">שאלות לדוגמה:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => sendQuery(q)}
                className="text-xs bg-accent/70 hover:bg-accent text-accent-foreground px-3 py-1.5 rounded-full border border-border/50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border shadow-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <ReactMarkdown className="text-sm prose prose-sm prose-slate dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">מנתח...</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex gap-2 sticky bottom-0 bg-background pb-2">
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])} title="נקה שיחה">
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !isLoading && sendQuery()}
          placeholder="שאל שאלה על הציונים..."
          className="flex-1"
          dir="rtl"
          disabled={isLoading}
        />
        <Button onClick={() => sendQuery()} disabled={isLoading || !query.trim()} size="icon">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}