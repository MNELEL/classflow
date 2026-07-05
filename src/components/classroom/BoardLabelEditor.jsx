import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';

const PRESETS = ['לוח המורה', 'שולחן הרב', 'שולחן המנחה', 'הלוח', 'שולחן המרצה', 'לוח הכיתה'];

export default function BoardLabelEditor({ label, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(label);
  const inputRef = useRef(null);

  useEffect(() => { setVal(label); }, [label]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function confirm() {
    if (val.trim()) onSave(val.trim());
    setEditing(false);
  }
  function cancel() { setVal(label); setEditing(false); }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
        title="לחץ לעריכה"
        aria-label="ערוך כותרת לוח"
      >
        📋 {label}
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel(); }}
        className="border border-primary/50 rounded-lg px-3 py-1 text-sm text-center font-bold bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-44"
        maxLength={30}
      />
      <div className="flex flex-wrap gap-1 justify-center">
        {PRESETS.map(p => (
          <button key={p} onClick={() => { setVal(p); }} className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 border border-border hover:border-primary/30 transition-colors text-muted-foreground hover:text-primary">
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={confirm} aria-label="אשר כותרת" className="flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
          <Check className="w-3 h-3" /> שמור
        </button>
        <button onClick={cancel} aria-label="בטל עריכת כותרת" className="flex items-center gap-1 px-3 py-1 rounded-lg border border-border text-xs hover:bg-muted">
          <X className="w-3 h-3" /> ביטול
        </button>
      </div>
    </div>
  );
}