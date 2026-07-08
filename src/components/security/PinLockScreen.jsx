import React, { useState, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';
import { verifyPin, unlock } from '@/lib/pinLock';

export default function PinLockScreen({ onUnlock }) {
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (entry.length === 4) {
      if (verifyPin(entry)) {
        unlock();
        onUnlock?.();
      } else {
        setError(true);
        const t = setTimeout(() => {
          setEntry('');
          setError(false);
        }, 600);
        return () => clearTimeout(t);
      }
    }
  }, [entry, onUnlock]);

  const press = (d) => {
    if (entry.length < 4 && !error) setEntry(e => e + d);
  };

  const backspace = () => {
    if (!error) setEntry(e => e.slice(0, -1));
  };

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0'];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-6 select-none" dir="rtl">
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">ClassFlow נעול</h1>
        <p className="text-sm text-muted-foreground mt-1">הזן קוד 4 ספרות לפתיחה</p>
      </div>

      <div className={`flex gap-4 mb-10 ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              error
                ? 'border-destructive bg-destructive'
                : entry.length > i
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/40'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-[280px] w-full">
        {KEYS.map((k, idx) => {
          if (k === '') {
            return <div key={idx} />;
          }
          return (
            <button
              key={idx}
              onClick={() => press(k)}
              className="h-16 rounded-2xl bg-card border border-border text-2xl font-semibold text-foreground hover:bg-accent active:scale-95 transition-all flex items-center justify-center"
            >
              {k}
            </button>
          );
        })}
        <button
          onClick={backspace}
          className="h-16 rounded-2xl bg-card border border-border text-foreground hover:bg-accent active:scale-95 transition-all flex items-center justify-center"
          aria-label="מחק"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <p className="text-destructive text-sm mt-6">קוד שגוי, נסה שוב</p>
      )}
    </div>
  );
}