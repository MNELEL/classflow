import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const SUGGESTIONS = [
  'סמן את דני נעדר',
  'הוסף תלמיד חדש בשם רוני',
  'תן ציון 90 במתמטיקה לדני',
  'הוסף משימה: להתקשר להורים של דני',
];

export default function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const qc = useQueryClient();
  const inputRef = useRef(null);
  const recogRef = useRef(null);

  const executeCommand = useCallback(async (text) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('aiAssistant', { command: text });
      const data = res.data || res;
      if (data.success) {
        toast.success(data.message);
        // Invalidate common query keys so UI reflects the change
        qc.invalidateQueries();
      } else {
        toast.error(data.message || 'לא הצלחתי לבצע את הפקודה');
      }
      setInput('');
      setOpen(false);
    } catch (err) {
      toast.error('שגיאה בעיבוד הפקודה');
    } finally {
      setLoading(false);
    }
  }, [qc]);

  const toggleVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error('זיהוי קולי לא נתמך בדפדפן זה');
      return;
    }

    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }

    const recog = new SR();
    recog.lang = 'he-IL';
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
      // Auto-execute after recognition
      setTimeout(() => executeCommand(transcript), 300);
    };
    recog.onerror = () => {
      setListening(false);
      toast.error('לא הצלחתי לשמוע, נסה שוב');
    };
    recog.onend = () => setListening(false);

    recogRef.current = recog;
    recog.start();
    setListening(true);
  }, [listening, executeCommand]);

  const handleSubmit = (e) => {
    e.preventDefault();
    executeCommand(input);
  };

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="trigger"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 200); }}
            className="fixed bottom-20 left-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
            aria-label="עוזר AI"
          >
            <Sparkles className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-background" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Dock panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dock"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-4 right-4 z-40 max-w-md mx-auto"
            style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
            dir="rtl"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl shadow-primary/10 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">עוזר ClassFlow</span>
                </div>
                <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors" aria-label="סגור">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-colors ${
                    listening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-accent text-foreground hover:bg-accent/80'
                  }`}
                  aria-label="הקלטה קולית"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={listening ? 'מקשיב...' : 'כתוב פקודה או דבר...'}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl bg-background border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-11 h-11 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  aria-label="שלח"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>

              {/* Suggestions */}
              {!loading && !listening && (
                <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => executeCommand(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-muted/70 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}