import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shuffle, Users, Trophy, ListOrdered, Plus, RotateCcw, Sparkles, X, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const GROUP_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-500',
  'from-indigo-500 to-blue-500',
  'from-fuchsia-500 to-pink-500',
  'from-lime-500 to-green-500',
];

export default function RafflePage() {
  const qc = useQueryClient();
  const [type, setType] = useState('single');
  const [numGroups, setNumGroups] = useState(2);
  const [excluded, setExcluded] = useState([]);
  const [showExclude, setShowExclude] = useState(false);
  const [result, setResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [spinName, setSpinName] = useState('');
  const [spinTimer, setSpinTimer] = useState(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const activeStudents = students.filter(s => s.is_active !== false);
  const participants = activeStudents.filter(s => !excluded.includes(s.id));

  function toggleExclude(id) {
    setExcluded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function runRaffle() {
    if (participants.length === 0) {
      toast.error('אין תלמידים משתתפים');
      return;
    }
    if (type === 'groups' && participants.length < numGroups) {
      toast.error(`נדרשים לפחות ${numGroups} תלמידים`);
      return;
    }

    setSpinning(true);
    setResult(null);

    if (type === 'single') {
      // Spin animation
      let count = 0;
      const interval = setInterval(() => {
        const random = participants[Math.floor(Math.random() * participants.length)];
        setSpinName(random.name);
        count++;
        if (count > 20) {
          clearInterval(interval);
          const winner = participants[Math.floor(Math.random() * participants.length)];
          setSpinName(winner.name);
          setResult({ type: 'single', winner });
          setSpinning(false);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#fbbf24', '#f59e0b', '#3b82f6', '#10b981'] });
          saveRaffle('הגרלת תלמיד', 'single', winner.name);
        }
      }, 80);
      setSpinTimer(interval);
    } else if (type === 'groups') {
      const shuffled = shuffle(participants);
      const groups = Array.from({ length: numGroups }, () => []);
      shuffled.forEach((student, i) => groups[i % numGroups].push(student));
      setTimeout(() => {
        setResult({ type: 'groups', groups });
        setSpinning(false);
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        saveRaffle('חלוקה לקבוצות', 'groups', `${numGroups} קבוצות`);
      }, 800);
    } else if (type === 'teams') {
      const shuffled = shuffle(participants);
      const teamA = shuffled.filter((_, i) => i % 2 === 0);
      const teamB = shuffled.filter((_, i) => i % 2 === 1);
      setTimeout(() => {
        setResult({ type: 'teams', teamA, teamB });
        setSpinning(false);
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
        saveRaffle('חלוקה לקבוצות נגד', 'teams', 'קבוצה א׳ vs קבוצה ב׳');
      }, 800);
    } else if (type === 'order') {
      const ordered = shuffle(participants);
      setTimeout(() => {
        setResult({ type: 'order', ordered });
        setSpinning(false);
        saveRaffle('סדר הצגה אקראי', 'order', `${ordered.length} תלמידים`);
      }, 800);
    }
  }

  async function saveRaffle(name, raffleType, resultSummary) {
    try {
      await base44.entities.ClassroomRaffle.create({
        name,
        type: raffleType,
        num_groups: numGroups,
        participants: participants.map(p => p.id),
        excluded,
        result: resultSummary,
        created_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['raffles'] });
    } catch (e) {}
  }

  function reset() {
    setResult(null);
    setSpinName('');
    if (spinTimer) clearInterval(spinTimer);
  }

  const typeOptions = [
    { value: 'single', label: 'תלמיד אקראי', icon: Crown, desc: 'הגרל את תלמיד אחד' },
    { value: 'groups', label: 'חלוקה לקבוצות', icon: Users, desc: 'חלק ל-N קבוצות שוות' },
    { value: 'teams', label: 'קבוצות נגד', icon: Trophy, desc: 'שתי קבוצות מתחרות' },
    { value: 'order', label: 'סדר אקראי', icon: ListOrdered, desc: 'סדר הצגה אקראי' },
  ];

  return (
    <AppLayout>
      <div className="p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-2xl flex items-center justify-center">
            <Shuffle className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg">הגרלות כיתתיות</h1>
            <p className="text-xs text-muted-foreground">{participants.length} משתתפים • {excluded.length} מודרים</p>
          </div>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2">
          {typeOptions.map(opt => {
            const Icon = opt.icon;
            const active = type === opt.value;
            return (
              <button key={opt.value} onClick={() => { setType(opt.value); reset(); }}
                className={`p-3 rounded-2xl border-2 text-right transition-all ${active ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/20' : 'border-border bg-card hover:border-fuchsia-300'}`}>
                <Icon className={`w-5 h-5 mb-1.5 ${active ? 'text-fuchsia-600' : 'text-muted-foreground'}`} />
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Groups count for 'groups' type */}
        {type === 'groups' && (
          <div className="bg-card border rounded-2xl p-3 flex items-center justify-between">
            <span className="text-sm font-semibold">מספר קבוצות</span>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setNumGroups(Math.max(2, numGroups - 1))}>−</Button>
              <span className="font-bold text-lg w-8 text-center">{numGroups}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setNumGroups(Math.min(8, numGroups + 1))}>+</Button>
            </div>
          </div>
        )}

        {/* Exclude students */}
        <button onClick={() => setShowExclude(true)} className="w-full bg-card border rounded-2xl p-3 flex items-center justify-between hover:border-fuchsia-300 transition-colors">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">תלמידים מודרים</span>
            {excluded.length > 0 && <Badge variant="secondary" className="text-xs">{excluded.length}</Badge>}
          </div>
          <span className="text-xs text-muted-foreground">ערוך →</span>
        </button>

        {/* Action button */}
        <Button onClick={runRaffle} disabled={spinning || participants.length === 0} className="w-full gap-2 h-12 text-base" size="lg">
          {spinning ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {spinning ? 'מגריל...' : 'הגרל עכשיו!'}
        </Button>

        {/* Result */}
        <AnimatePresence>
          {spinning && type === 'single' && spinName && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-fuchsia-50 to-purple-50 dark:from-fuchsia-950/20 dark:to-purple-950/20 border-2 border-fuchsia-300 dark:border-fuchsia-700 rounded-3xl p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">🎲 מגריל...</p>
              <motion.p key={spinName} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-fuchsia-600">
                {spinName}
              </motion.p>
            </motion.div>
          )}

          {result && !spinning && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="space-y-3">
              {result.type === 'single' && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-2 border-amber-300 dark:border-amber-700 rounded-3xl p-8 text-center">
                  <Crown className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">🎉 הזוכה</p>
                  <p className="text-3xl font-bold text-amber-600">{result.winner.name}</p>
                </div>
              )}

              {result.type === 'groups' && (
                <div className="space-y-2">
                  {result.groups.map((group, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className={`bg-gradient-to-l ${GROUP_COLORS[i % GROUP_COLORS.length]} rounded-2xl p-3 text-white`}>
                      <p className="font-bold text-sm mb-1.5">קבוצה {i + 1} • {group.length} תלמידים</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.map(s => <span key={s.id} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{s.name}</span>)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {result.type === 'teams' && (
                <div className="grid grid-cols-2 gap-2">
                  {['קבוצה א׳', 'קבוצה ב׳'].map((label, i) => {
                    const team = i === 0 ? result.teamA : result.teamB;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: i === 0 ? -20 : 20 }} animate={{ opacity: 1, x: 0 }}
                        className={`bg-gradient-to-br ${i === 0 ? 'from-blue-500 to-cyan-500' : 'from-rose-500 to-pink-500'} rounded-2xl p-3 text-white`}>
                        <p className="font-bold text-sm mb-1.5">{label} • {team.length}</p>
                        <div className="space-y-1">
                          {team.map(s => <p key={s.id} className="text-xs bg-white/15 px-2 py-1 rounded-lg">{s.name}</p>)}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {result.type === 'order' && (
                <div className="bg-card border rounded-2xl p-3 space-y-1.5">
                  <p className="text-sm font-semibold mb-2">סדר הצגה אקראי:</p>
                  {result.ordered.map((s, i) => (
                    <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl">
                      <span className="w-7 h-7 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      <span className="text-sm">{s.name}</span>
                    </motion.div>
                  ))}
                </div>
              )}

              <Button variant="outline" onClick={reset} className="w-full gap-2">
                <RotateCcw className="w-4 h-4" /> הגרלה נוספת
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exclude modal */}
        <Dialog open={showExclude} onOpenChange={setShowExclude}>
          <DialogContent dir="rtl" className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>בחר תלמידים להדרה</DialogTitle></DialogHeader>
            <div className="space-y-1.5">
              {activeStudents.map(s => (
                <button key={s.id} onClick={() => toggleExclude(s.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors ${excluded.includes(s.id) ? 'border-destructive bg-destructive/5' : 'border-border hover:bg-accent'}`}>
                  <span className="text-sm">{s.name}</span>
                  {excluded.includes(s.id) ? <X className="w-4 h-4 text-destructive" /> : <span className="text-xs text-muted-foreground">הכלל</span>}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={() => setShowExclude(false)} className="w-full">סיום</Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}