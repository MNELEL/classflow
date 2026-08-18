import React, { useState, useEffect } from 'react';
import { Lock, Delete, LogOut, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { verifyPin, unlock } from '@/lib/pinLock';

export default function PinLockScreen({ onUnlock }) {
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null); // epoch ms, or null
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const isLockedOut = lockedUntil !== null && remainingSeconds > 0;

  // Countdown ticker while locked out.
  useEffect(() => {
    if (lockedUntil === null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) setLockedUntil(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    if (entry.length === 4 && !verifying && !isLockedOut) {
      setVerifying(true);
      verifyPin(entry).then(({ valid, locked, retryAfterSeconds }) => {
        if (valid) {
          unlock();
          onUnlock?.();
        } else if (locked) {
          setLockedUntil(Date.now() + (retryAfterSeconds || 300) * 1000);
          fail();
        } else {
          fail();
        }
      }).catch(() => fail());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, verifying, onUnlock, isLockedOut]);

  function fail() {
    setError(true);
    setTimeout(() => {
      setEntry('');
      setError(false);
      setVerifying(false);
    }, 650);
  }

  const press = (d) => {
    if (entry.length < 4 && !error && !verifying && !isLockedOut) setEntry(e => e + d);
  };

  const backspace = () => {
    if (!error && !verifying && !isLockedOut) setEntry(e => e.slice(0, -1));
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0'];

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-6 select-none" dir="rtl">
      <div className="w-full max-w-[340px] bg-card border border-border rounded-3xl shadow-xl p-8 flex flex-col items-center">
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-foreground">לוח הבקרה נעול</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-8">הזן קוד 4 ספרות לפתיחה</p>

        {/* 4 boxes */}
        <div className={`flex gap-3 mb-6 ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center transition-colors ${
                error
                  ? 'border-destructive'
                  : entry.length > i
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
              }`}
            >
              {verifying && entry.length > i ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : entry.length > i ? (
                <div className={`w-3 h-3 rounded-full ${error ? 'bg-destructive' : 'bg-primary'}`} />
              ) : null}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-destructive text-sm mb-4">PIN שגוי</p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {KEYS.map((k, idx) => {
            if (k === '') return <div key={idx} />;
            return (
              <button
                key={idx}
                onClick={() => press(k)}
                disabled={verifying}
                className="h-14 rounded-2xl bg-secondary/50 border border-border text-xl font-semibold text-foreground hover:bg-accent active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
              >
                {k}
              </button>
            );
          })}
          <button
            onClick={backspace}
            disabled={verifying}
            className="h-14 rounded-2xl bg-secondary/50 border border-border text-foreground hover:bg-accent active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            aria-label="מחק"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Logout link */}
        <button
          onClick={handleLogout}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          יציאה מהחשבון
        </button>
      </div>
    </div>
  );
}