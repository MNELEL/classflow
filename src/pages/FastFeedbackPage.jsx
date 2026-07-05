import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Zap, Send, Search, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_OPTIONS = [
  { emoji: '🌟', label: 'כוכב', category: 'achievement' },
  { emoji: '👍', label: 'מעולה', category: 'praise' },
  { emoji: '💪', label: 'מאמץ', category: 'encouragement' },
  { emoji: '🎯', label: 'פגיעה', category: 'achievement' },
  { emoji: '💡', label: 'רעיון', category: 'praise' },
  { emoji: '❤️', label: 'תודה', category: 'praise' },
  { emoji: '🏆', label: 'ניצחון', category: 'achievement' },
  { emoji: '⭐', label: 'כוכב', category: 'praise' },
  { emoji: '📚', label: 'למידה', category: 'praise' },
  { emoji: '🎉', label: 'חגיגה', category: 'achievement' },
  { emoji: '📈', label: 'התקדמות', category: 'improvement' },
  { emoji: '🔥', label: 'אש', category: 'achievement' },
  { emoji: '😅', label: 'קושי', category: 'concern' },
  { emoji: '⚠️', label: 'שים לב', category: 'concern' },
];

const QUICK_MESSAGES = [
  'עבודה מצוינת היום!',
  'השתפרת מאוד!',
  'תודה על ההשתתפות',
  'מאמץ יפה!',
  'כל הכבוד על הריכוז',
  'המשך כך!',
  'התקדמות מרשימה',
  'צריך להשקיע יותר',
  'חשוב להגיע מוכן',
  'שאלה מצוינת!',
];

export default function FastFeedbackPage() {
  const qc = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [emoji, setEmoji] = useState('🌟');
  const [category, setCategory] = useState('praise');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: feedbacks = [] } = useQuery({
    queryKey: ['fast-feedbacks'],
    queryFn: () => base44.entities.FastFeedback.list('-date', 30),
  });

  const activeStudents = students.filter(s => s.is_active !== false);
  const filtered = activeStudents.filter(s => s.name?.includes(search));

  const sendMutation = useMutation({
    mutationFn: (newFeedback) => base44.entities.FastFeedback.create(newFeedback),
    onMutate: async (newFeedback) => {
      await qc.cancelQueries({ queryKey: ['fast-feedbacks'] });
      const previous = qc.getQueryData(['fast-feedbacks']);
      qc.setQueryData(['fast-feedbacks'], (old = []) => [
        { ...newFeedback, id: `opt-${Date.now()}`, student_id: selectedStudent?.id, student_name: selectedStudent?.name },
        ...old,
      ]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['fast-feedbacks'], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['fast-feedbacks'] }),
  });

  function send() {
    if (!selectedStudent || !emoji) {
      toast.error('בחרו תלמיד ואימוג׳י');
      return;
    }
    const payload = {
      student_id: selectedStudent.id,
      student_name: selectedStudent.name,
      emoji,
      category,
      message: message || '',
      date: new Date().toISOString(),
    };
    sendMutation.mutate(payload);
    toast.success(`${emoji} נשלח אל${selectedStudent.name}!`);
    setSelectedStudent(null);
    setEmoji('🌟');
    setMessage('');
    setCategory('praise');
  }

  return (
    <AppLayout>
      <div className="p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg">משוב מהיר</h1>
            <p className="text-xs text-muted-foreground">שלחו משוב מיידי לתלמיד</p>
          </div>
        </div>

        {/* Recent feedbacks */}
        {feedbacks.length > 0 && (
          <div className="bg-card border rounded-2xl p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> אחרונים
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {feedbacks.slice(0, 8).map(f => {
                const student = activeStudents.find(s => s.id === f.student_id);
                return (
                  <div key={f.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-xl">
                    <span className="text-lg">{f.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{f.student_name}</p>
                      {f.message && <p className="text-[11px] text-muted-foreground truncate">{f.message}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(f.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Student picker */}
        <button onClick={() => setShowStudentPicker(true)}
          className="w-full bg-card border rounded-2xl p-4 flex items-center justify-between hover:border-yellow-300 transition-colors">
          {selectedStudent ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary">
                  {selectedStudent.name?.[0]}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{selectedStudent.name}</p>
                  <p className="text-xs text-muted-foreground">תלמיד נבחר</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">החלף →</span>
            </>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">בחרו תלמיד</span>
              <Search className="w-4 h-4 text-muted-foreground" />
            </>
          )}
        </button>

        {/* Emoji selector */}
        <div className="bg-card border rounded-2xl p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">בחר אימוג׳י</p>
          <div className="grid grid-cols-7 gap-1.5">
            {EMOJI_OPTIONS.map(opt => (
              <button key={opt.emoji} onClick={() => { setEmoji(opt.emoji); setCategory(opt.category); }}
                className={`aspect-square rounded-xl text-xl flex items-center justify-center border-2 transition-all ${emoji === opt.emoji ? 'border-primary bg-primary/10 scale-110' : 'border-transparent hover:bg-accent'}`}>
                {opt.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Quick messages */}
        <div className="bg-card border rounded-2xl p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">הודעות מהירות</p>
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_MESSAGES.map(msg => (
              <button key={msg} onClick={() => setMessage(msg)}
                className={`text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${message === msg ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'}`}>
                {msg}
              </button>
            ))}
          </div>
        </div>

        {/* Custom message */}
        <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="או כתוב הודעה משלך..." className="h-10" />

        {/* Send */}
        <Button onClick={send} disabled={!selectedStudent} className="w-full gap-2 h-12" size="lg">
          <Send className="w-4 h-4" /> שלחו משוב
        </Button>

        {/* Student picker dialog */}
        <Dialog open={showStudentPicker} onOpenChange={setShowStudentPicker}>
          <DialogContent dir="rtl" className="max-w-sm max-h-[80vh]">
            <DialogHeader><DialogTitle>בחרו תלמיד</DialogTitle></DialogHeader>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש..." className="mb-2" />
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {filtered.map(s => (
                <button key={s.id} onClick={() => { setSelectedStudent(s); setShowStudentPicker(false); setSearch(''); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent transition-colors text-right">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary text-sm">{s.name?.[0]}</div>
                  <span className="text-sm">{s.name}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">לא נמצאו תלמידים</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}