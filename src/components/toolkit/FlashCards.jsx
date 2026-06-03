import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ChevronRight, ChevronLeft, RotateCcw, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_CARDS = [
  { q: 'מהי פוטוסינתזה?', a: 'תהליך בו צמחים מייצרים מזון מאנרגיית אור, מים ופחמן דו-חמצני' },
  { q: 'מהו הנוסחה של מים?', a: 'H₂O' },
];

export default function FlashCards() {
  const [cards, setCards] = useState(DEFAULT_CARDS);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');

  const cur = cards[idx];

  function next() { setFlipped(false); setTimeout(() => setIdx(i => (i + 1) % cards.length), 150); }
  function prev() { setFlipped(false); setTimeout(() => setIdx(i => (i - 1 + cards.length) % cards.length), 150); }
  function shuffle() { setFlipped(false); setCards(c => [...c].sort(() => Math.random() - 0.5)); setIdx(0); }
  function addCard() {
    if (!newQ.trim() || !newA.trim()) return;
    setCards(c => [...c, { q: newQ, a: newA }]);
    setNewQ(''); setNewA(''); setAdding(false);
  }
  function removeCard(i) {
    setCards(c => c.filter((_, j) => j !== i));
    if (idx >= cards.length - 1) setIdx(0);
  }

  return (
    <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">🃏 כרטיסיות פלאש</h3>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={shuffle} title="ערבב">
            <Shuffle className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAdding(v => !v)}>
            <Plus className="w-3 h-3" /> הוסף
          </Button>
        </div>
      </div>

      {adding && (
        <div className="bg-muted/40 rounded-xl p-3 space-y-2">
          <Input placeholder="שאלה..." value={newQ} onChange={e => setNewQ(e.target.value)} className="h-8 text-sm" />
          <Textarea placeholder="תשובה..." value={newA} onChange={e => setNewA(e.target.value)} className="h-16 text-sm resize-none" />
          <div className="flex gap-2">
            <Button size="sm" onClick={addCard} className="h-7 text-xs">הוסף</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="h-7 text-xs">ביטול</Button>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">אין כרטיסיות — הוסף ראשונה</p>
      ) : (
        <>
          {/* Card */}
          <div className="relative" style={{ perspective: 600 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={idx + (flipped ? '-f' : '-q')}
                initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setFlipped(v => !v)}
                className={`cursor-pointer rounded-2xl p-5 min-h-[120px] flex items-center justify-center text-center select-none ${
                  flipped
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent/40 border border-border'
                }`}
              >
                <div>
                  <p className="text-[10px] font-medium opacity-60 mb-2">{flipped ? '✅ תשובה' : '❓ שאלה'}</p>
                  <p className="text-sm font-semibold leading-relaxed">{flipped ? cur.a : cur.q}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="text-center text-xs text-muted-foreground">לחץ לצפייה בתשובה · {idx + 1}/{cards.length}</p>

          {/* Nav */}
          <div className="flex items-center justify-between">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={prev} disabled={cards.length < 2}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setFlipped(false); setIdx(0); }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={next} disabled={cards.length < 2}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Card list */}
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {cards.map((c, i) => (
              <div key={i} onClick={() => { setIdx(i); setFlipped(false); }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${i === idx ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/40'}`}>
                <span className="truncate flex-1">{c.q}</span>
                <button onClick={e => { e.stopPropagation(); removeCard(i); }}
                  className="text-muted-foreground hover:text-destructive ml-2 flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}