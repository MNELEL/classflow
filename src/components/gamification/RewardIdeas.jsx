import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'praise', label: '🌟 שבח מילולי', desc: 'ביטויים מחמיאים ומעודדים' },
  { id: 'reward', label: '🎁 פרסים סמליים', desc: 'מדבקות, תעודות, זכויות יתר' },
  { id: 'activity', label: '🎮 פעילויות', desc: 'משחקים ופעילויות כיתתיות' },
  { id: 'privilege', label: '👑 זכויות יתר', desc: 'הרשאות מיוחדות בכיתה' },
  { id: 'group', label: '🤝 פרסי קבוצה', desc: 'פרסים לכל הכיתה יחד' },
];

const QUICK_PRAISE = [
  'עבודה מדהימה! 🌟', 'אני גאה בך! 💪', 'ממש הפתעת אותי! ✨',
  'זה נהדר, כל הכבוד! 👏', 'אתה/את מוכשר/ת ממש! 🎯',
  'המאמץ שלך ניכר! 💡', 'התקדמת מאוד! 🚀', 'פשוט מצוין! 🏆',
  'עמל וכישרון ביחד! 🌈', 'הכי מרשים בשיעור! 👑',
];

export default function RewardIdeas({ students = [], onQuickReward }) {
  const [category, setCategory] = useState('praise');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  async function generate() {
    setLoading(true);
    const cat = CATEGORIES.find(c => c.id === category);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `תן לי 8 רעיונות יצירתיים לצ'פר/לתגמל תלמידים בקטגוריה: "${cat.label} - ${cat.desc}".
      ההקשר: כיתה יסודית/חטיבה בישראל.
      פורמט: רשימה ממוספרת קצרה, כל פריט שורה אחת, כולל אמוג'י.
      השב בעברית בלבד.`,
      response_json_schema: {
        type: 'object',
        properties: { ideas: { type: 'array', items: { type: 'string' } } },
      },
    });
    setIdeas(res.ideas || []);
    setLoading(false);
  }

  function copyIdea(idea) {
    navigator.clipboard.writeText(idea);
    setCopied(idea);
    setTimeout(() => setCopied(''), 2000);
    toast.success('הועתק!');
  }

  return (
    <div className="space-y-4">
      {/* Quick praise chips */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">💬 שבח מהיר — לחץ להעתקה:</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PRAISE.map(p => (
            <button key={p} onClick={() => copyIdea(p)}
              className="text-xs px-2.5 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 transition-colors">
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">🤖 רעיונות AI לפי קטגוריה:</p>
        {/* Category selector */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${category === c.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
              {c.label}
            </button>
          ))}
        </div>

        <Button size="sm" className="w-full gap-1.5 mb-3" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'מייצר רעיונות...' : 'צור רעיונות'}
        </Button>

        <AnimatePresence>
          {ideas.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="space-y-1.5">
              {ideas.map((idea, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between bg-card border border-border/60 rounded-xl px-3 py-2 group">
                  <p className="text-sm flex-1">{idea}</p>
                  <button onClick={() => copyIdea(idea)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary ml-2">
                    {copied === idea ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </motion.div>
              ))}
              <Button size="sm" variant="ghost" className="w-full gap-1 text-xs" onClick={generate}>
                <RefreshCw className="w-3 h-3" /> רעיונות נוספים
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}