import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Sparkles, Loader2, ClipboardCheck, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const PRESETS = [
  { label: 'סיכום שיעור', prompt: 'צור 3 שאלות סיכום קצרות לשיעור על הנושא' },
  { label: 'הבנת הנקרא', prompt: 'צור שאלות הבנת הנקרא פשוטות לנושא' },
  { label: 'רפלקציה', prompt: 'צור 2 שאלות רפלקציה: מה למדתי? מה עוד לא ברור לי?' },
  { label: 'יציאה מהכיתה', prompt: 'צור כרטיס יציאה: שאלה אחת שכל תלמיד עונה לפני שיוצא' },
];

export default function ExitTicket() {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState(0);

  async function generate() {
    if (!topic.trim()) return;
    setLoading(true);
    setResult('');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${PRESETS[preset].prompt}: "${topic}". השב בעברית, בפורמט Markdown, עם כותרות ונקודות. קצר ומעשי.`,
    });
    setResult(res);
    setLoading(false);
  }

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-3">
      <h3 className="font-bold text-sm flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> בדיקת הבנה מהירה</h3>

      {/* Preset selector */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => setPreset(i)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${preset === i ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="נושא השיעור... (למשל: שברים, מלחמת העצמאות)"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generate()}
          className="h-9 text-sm"
        />
        <Button size="sm" onClick={generate} disabled={loading || !topic.trim()} className="gap-1 px-3 whitespace-nowrap">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          צור
        </Button>
      </div>

      {result && (
        <div className="bg-accent/20 border border-border rounded-xl p-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-medium text-muted-foreground">תוצאה:</p>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={generate}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
          <Button size="sm" variant="outline" className="mt-2 h-7 text-xs w-full"
            onClick={() => { const w = window.open('', '_blank'); w.document.write(`<html dir="rtl"><body style="font-family:sans-serif;padding:24px;direction:rtl"><pre style="white-space:pre-wrap">${result}</pre></body></html>`); w.print(); }}>
            🖨️ הדפס לתלמידים
          </Button>
        </div>
      )}
    </div>
  );
}