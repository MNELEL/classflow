import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, X, Send, Loader2, MessageSquareText, HelpCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ReviewCard from '@/components/review/ReviewCard';
import { executePendingUpdate } from '@/lib/pendingUpdateActions';

const SUGGESTIONS = [
  'קח אותי לציונים',
  'מה היה היום: דני נעדר, רוני קיבל 95 בחידון, יוסי הפריע בשיעור',
  'תזכורת: לבדוק מחר למה דני לא מגיש שיעורי בית',
  'מה ההערות הפתוחות שלי?',
  'סמן את דני נעדר',
  'איך המצב של רוני השבוע?',
];

// reply = { type: 'answer' | 'clarify', text: string }
export default function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [reply, setReply] = useState(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const recogRef = useRef(null);

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const [pendingPreview, setPendingPreview] = useState(null);
  const [quickProcessing, setQuickProcessing] = useState(false);

  async function handleQuickApprove(item, editedPayload) {
    setQuickProcessing(true);
    try {
      await executePendingUpdate({ ...item, payload: editedPayload });
      await base44.entities.PendingUpdate.update(item.id, { payload: editedPayload, status: 'approved', reviewed_at: new Date().toISOString() });
      toast.success(`אושר: ${item.summary}`);
      setPendingPreview(null);
      setReply({ type: 'answer', text: `אושר בהצלחה: ${item.summary}` });
      qc.invalidateQueries({ queryKey: ['pendingUpdates'] });
      qc.invalidateQueries();
    } catch (err) {
      toast.error('שגיאה באישור: ' + (err.message || ''));
    } finally {
      setQuickProcessing(false);
    }
  }

  async function handleQuickReject(item) {
    setQuickProcessing(true);
    try {
      await base44.entities.PendingUpdate.update(item.id, { status: 'rejected', reviewed_at: new Date().toISOString() });
      toast.success('ההצעה נדחתה');
      setPendingPreview(null);
      qc.invalidateQueries({ queryKey: ['pendingUpdates'] });
    } catch {
      toast.error('שגיאה בדחייה');
    } finally {
      setQuickProcessing(false);
    }
  }

  const executeCommand = useCallback(async (text, isVoice = false) => {
    if (!text.trim()) return;
    setLoading(true);
    setReply(null);
    try {
      const res = await base44.functions.invoke('aiAssistant', { command: text, voice: isVoice });
      const data = res.data || res;
      if (data.needs_clarification) {
        // שאלת הבהרה — מציגים בפאנל ומשאירים פתוח להשלמת התשובה. לא מבצעים.
        setReply({ type: 'clarify', text: data.message });
        setInput('');
        setTimeout(() => inputRef.current?.focus(), 200);
      } else if (data.success && data.bulk) {
        // יומן יומי מרוכז — מספר הצעות נפרדות נוצרו לסקירה.
        qc.invalidateQueries({ queryKey: ['pendingUpdates'] });
        setReply({ type: 'answer', text: data.message });
        toast.success(data.message, {
          action: { label: 'לסקירה', onClick: () => navigate('/review') },
        });
        setInput('');
      } else if (data.success && data.navigate) {
        // ניווט — עוברים למסך המבוקש ומציגים אישור.
        navigate(data.navigate);
        setReply({ type: 'answer', text: data.message });
        setInput('');
        setOpen(false);
      } else if (data.success && data.pending) {
        // פעולת כתיבה — נשמרה כהצעה. מציגים אישור מהיר בתוך הפאנל
        // (עריכת שדות + אישור/דחייה) בלי לעבור למסך הסקירה.
        qc.invalidateQueries({ queryKey: ['pendingUpdates'] });
        try {
          const rec = await base44.entities.PendingUpdate.get(data.pending_id);
          setPendingPreview(rec);
        } catch {
          toast.success('הצעה נוצרה', { action: { label: 'לסקירה', onClick: () => navigate('/review') } });
        }
        setInput('');
      } else if (data.success) {
        // שאלת קריאה / שליפת הערות — מציגים את התשובה ומקורות לאימות.
        setReply({ type: 'answer', text: data.message, sources: data.sources });
        setInput('');
      } else {
        toast.error(data.message || 'לא הצלחתי להבין את הפקודה');
      }
    } catch (err) {
      toast.error('שגיאה בעיבוד הפקודה');
    } finally {
      setLoading(false);
    }
  }, [qc, navigate]);

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
      setTimeout(() => executeCommand(transcript, true), 300);
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
                <button onClick={() => { setOpen(false); setReply(null); setPendingPreview(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors" aria-label="סגור">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Inline reply (read answer or clarification question) */}
              <AnimatePresence>
                {reply && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`px-4 py-3 border-b text-sm leading-relaxed whitespace-pre-wrap ${
                      reply.type === 'clarify'
                        ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800/40'
                        : 'bg-primary/5 border-primary/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {reply.type === 'clarify'
                        ? <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                        : <MessageSquareText className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />}
                      <div className="min-w-0">
                        {reply.type === 'clarify' && (
                          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-0.5">צריך עוד פרט</p>
                        )}
                        <p className={reply.type === 'clarify' ? 'text-amber-900 dark:text-amber-100' : 'text-foreground'}>
                          {reply.text}
                        </p>
                        {reply.type === 'answer' && Array.isArray(reply.sources) && reply.sources.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {reply.sources.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => { navigate(s.path); setOpen(false); }}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* אישור מהיר — עריכת שדות + אישור/דחייה בלי לעבור למסך הסקירה */}
              <AnimatePresence>
                {pendingPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-3 pb-2 max-h-[55vh] overflow-y-auto"
                  >
                    <p className="text-[11px] font-semibold text-muted-foreground px-1 pb-1.5">אישור מהיר — ערוך שדות ואשר</p>
                    <ReviewCard
                      pending={pendingPreview}
                      students={students}
                      onApprove={handleQuickApprove}
                      onReject={handleQuickReject}
                      isProcessing={quickProcessing}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

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
                  placeholder={listening ? 'מקשיב...' : 'ספר/כתוב מה קרה או מה לעשות...'}
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
              {!loading && !listening && !reply && !pendingPreview && (
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