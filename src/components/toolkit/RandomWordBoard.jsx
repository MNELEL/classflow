import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shuffle, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STARTER_WORDS = ['שלום', 'ידידות', 'יצירה', 'חקר', 'פתרון', 'שאלה', 'גילוי', 'שיתוף'];

export default function RandomWordBoard() {
  const [words, setWords] = useState(STARTER_WORDS);
  const [newWord, setNewWord] = useState('');
  const [selected, setSelected] = useState(null);
  const [count, setCount] = useState(1);

  function pickRandom() {
    const picks = [];
    const pool = [...words];
    for (let i = 0; i < Math.min(count, pool.length); i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    setSelected(picks);
  }

  function addWord() {
    const trimmed = newWord.trim();
    if (!trimmed || words.includes(trimmed)) return;
    setWords(w => [...w, trimmed]);
    setNewWord('');
  }

  function remove(w) { setWords(prev => prev.filter(x => x !== w)); }

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-3">
      <h3 className="font-bold text-sm flex items-center gap-2">🎲 בחירת מילה/נושא אקראי</h3>

      {/* Selected */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex flex-wrap gap-2 justify-center py-3">
            {selected.map((w, i) => (
              <motion.div key={w} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                className="bg-primary text-primary-foreground rounded-2xl px-4 py-2 font-black text-lg shadow-lg">
                {w}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">כמות:</span>
        {[1, 2, 3].map(n => (
          <button key={n} onClick={() => setCount(n)}
            className={`w-8 h-7 rounded-lg border text-xs font-medium transition-all ${count === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
            {n}
          </button>
        ))}
        <Button size="sm" className="flex-1 gap-1" onClick={pickRandom}>
          <Shuffle className="w-3.5 h-3.5" /> בחר אקראי
        </Button>
      </div>

      {/* Add word */}
      <div className="flex gap-2">
        <Input placeholder="הוסף מילה..." value={newWord} onChange={e => setNewWord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addWord()} className="h-8 text-sm" />
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={addWord}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Words pool */}
      <div className="flex flex-wrap gap-1.5">
        {words.map(w => (
          <span key={w} className="group flex items-center gap-1 text-xs bg-muted/60 rounded-full px-2.5 py-1">
            {w}
            <button onClick={() => remove(w)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}