import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { toast } from 'sonner';
import { Plus, Bell, Trash2, Play, Pause, Clock, Music, ToggleLeft, ToggleRight, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const SCHOOL_DAYS = [0, 1, 2, 3, 4]; // Sun-Thu

const SOUNDS = [
  { value: 'bell', label: '🔔 פעמון קלאסי' },
  { value: 'chime', label: '🎵 צלצול עדין' },
  { value: 'digital', label: '📟 דיגיטלי' },
  { value: 'melody_victory', label: '🏆 מנגינת ניצחון' },
  { value: 'melody_calm', label: '🌿 מנגינה רגועה' },
  { value: 'custom', label: '🎶 מותאם אישית' },
];

const BELL_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

// Sound synthesizer using Web Audio API
function playSound(type) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const sounds = {
    bell: () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(830, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(415, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.start(); osc.stop(ctx.currentTime + 1.5);
    },
    chime: () => {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.2 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 1);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 1);
      });
    },
    digital: () => {
      [800, 0, 800, 0, 800].forEach((freq, i) => {
        if (!freq) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15 + 0.1);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.1);
      });
    },
    melody_victory: () => {
      const notes = [523, 659, 784, 1047, 784, 1047, 1175];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'triangle';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.3);
      });
    },
    melody_calm: () => {
      const notes = [392, 440, 494, 523, 494, 440, 392];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.4);
        osc.start(ctx.currentTime + i * 0.25);
        osc.stop(ctx.currentTime + i * 0.25 + 0.4);
      });
    },
  };

  (sounds[type] || sounds.bell)();
}

const DEFAULT_FORM = { name: '', time: '', days: [...SCHOOL_DAYS], sound_type: 'bell', label: '', color: '#3b82f6', is_active: true, custom_sound_url: '' };

export default function BellSchedulePage() {
  const qc = useQueryClient();
  const handleRefresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ['bells'] }); }, [qc]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editing, setEditing] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [nextBell, setNextBell] = useState(null);
  const timerRef = useRef(null);

  const { data: bells = [], isLoading } = useQuery({
    queryKey: ['bells'],
    queryFn: () => base44.entities.BellSchedule.list('time', 50),
  });

  // Find next upcoming bell
  useEffect(() => {
    const now = new Date();
    const todayDay = now.getDay();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const upcoming = bells
      .filter(b => b.is_active && b.days?.includes(todayDay))
      .map(b => {
        const [h, m] = (b.time || '').split(':').map(Number);
        const bellMins = h * 60 + m;
        return { ...b, minsUntil: bellMins - nowMins };
      })
      .filter(b => b.minsUntil > 0)
      .sort((a, b) => a.minsUntil - b.minsUntil);

    setNextBell(upcoming[0] || null);
  }, [bells]);

  // Bell checker interval
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = new Date();
      const todayDay = now.getDay();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const timeNow = `${hh}:${mm}`;

      bells.forEach(bell => {
        if (bell.is_active && bell.time === timeNow && bell.days?.includes(todayDay)) {
          playSound(bell.sound_type || 'bell');
          toast(`🔔 ${bell.name}`, {
            description: bell.label || bell.time,
            duration: 4000,
          });
        }
      });
    }, 15000);
    return () => clearInterval(timerRef.current);
  }, [bells]);

  const saveMutation = useMutation({
    mutationFn: async ({ form, editing }) => {
      if (editing) {
        await base44.entities.BellSchedule.update(editing, form);
        return 'updated';
      } else {
        await base44.entities.BellSchedule.create(form);
        return 'created';
      }
    },
    onMutate: async ({ form, editing }) => {
      await qc.cancelQueries({ queryKey: ['bells'] });
      const previous = qc.getQueryData(['bells']);
      if (editing) {
        qc.setQueryData(['bells'], (old = []) => old.map(b => b.id === editing ? { ...b, ...form } : b));
      } else {
        qc.setQueryData(['bells'], (old = []) => [...old, { ...form, id: `opt-${Date.now()}` }]);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.previous) qc.setQueryData(['bells'], ctx.previous); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['bells'] }),
    onSuccess: (_data, { editing }) => {
      toast.success(editing ? 'עודכן!' : 'נוסף!');
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setEditing(null);
    },
  });

  function save() {
    if (!form.name || !form.time) return;
    saveMutation.mutate({ form, editing });
  }

  async function deleteBell(id) {
    await base44.entities.BellSchedule.delete(id);
    qc.invalidateQueries({ queryKey: ['bells'] });
    toast.success('נמחק');
  }

  const toggleMutation = useMutation({
    mutationFn: ({ bell }) => base44.entities.BellSchedule.update(bell.id, { is_active: !bell.is_active }),
    onMutate: async ({ bell }) => {
      await qc.cancelQueries({ queryKey: ['bells'] });
      const previous = qc.getQueryData(['bells']);
      qc.setQueryData(['bells'], (old = []) =>
        old.map(b => b.id === bell.id ? { ...b, is_active: !b.is_active } : b)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['bells'], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['bells'] }),
  });

  function toggleActive(bell) {
    toggleMutation.mutate({ bell });
  }

  function openEdit(bell) {
    setForm({ ...DEFAULT_FORM, ...bell });
    setEditing(bell.id);
    setShowForm(true);
  }

  function toggleDay(d) {
    setForm(f => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort(),
    }));
  }

  const grouped = { active: bells.filter(b => b.is_active), inactive: bells.filter(b => !b.is_active) };

  return (
    <AppLayout>
      <div ref={containerRef} className="p-4 space-y-4" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg">לוח צלצולים</h1>
              <p className="text-xs text-muted-foreground">{bells.filter(b => b.is_active).length} צלצולים פעילים</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(DEFAULT_FORM); setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> הוסף צלצול
          </Button>
        </div>

        {/* Next bell banner */}
        {nextBell && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-l from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">הצלצול הבא</p>
                <p className="font-bold text-sm">{nextBell.name} — {nextBell.time}</p>
              </div>
            </div>
            <span className="text-sm font-mono font-bold text-amber-600">
              בעוד {nextBell.minsUntil} דק׳
            </span>
          </motion.div>
        )}

        {/* Quick presets */}
        <div className="bg-card border rounded-2xl p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">יצירה מהירה — תבניות נפוצות</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { name: 'התחלת שיעור', time: '08:00', sound_type: 'chime', label: 'שיעור 1' },
              { name: 'הפסקה ראשונה', time: '09:30', sound_type: 'bell', label: 'הפסקה 10 דק׳' },
              { name: 'הפסקת אוכל', time: '11:00', sound_type: 'melody_calm', label: 'הפסקה ארוכה' },
              { name: 'סיום יום', time: '14:00', sound_type: 'melody_victory', label: 'סיום' },
            ].map(preset => (
              <button key={preset.name}
                onClick={() => { setForm({ ...DEFAULT_FORM, ...preset, days: [...SCHOOL_DAYS] }); setEditing(null); setShowForm(true); }}
                className="text-xs px-3 py-1.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors bg-background">
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bell list */}
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">טוען...</div>
        ) : bells.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">אין צלצולים מוגדרים</p>
            <p className="text-sm mt-1">הוסף את הצלצול הראשון שלך</p>
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.active.map(bell => (
              <BellCard key={bell.id} bell={bell} onEdit={openEdit} onDelete={deleteBell} onToggle={toggleActive} onPreview={() => playSound(bell.sound_type)} playingId={playingId} />
            ))}
            {grouped.inactive.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground mt-3 mb-1 px-1">לא פעיל</p>
                {grouped.inactive.map(bell => (
                  <BellCard key={bell.id} bell={bell} onEdit={openEdit} onDelete={deleteBell} onToggle={toggleActive} onPreview={() => playSound(bell.sound_type)} playingId={playingId} inactive />
                ))}
              </>
            )}
          </div>
        )}

        {/* Form dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4" /> {editing ? 'עריכת צלצול' : 'הוספת צלצול'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">שם הצלצול</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="הפסקה ראשונה..." className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">שעה</label>
                  <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="h-9 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">תיאור (אופציונלי)</label>
                <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="למשל: הפסקה 15 דק׳" className="h-9 text-sm" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">ימים פעיל</label>
                <div className="flex gap-1.5">
                  {DAY_SHORT.map((d, i) => (
                    <button key={i} onClick={() => toggleDay(i)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold border-2 transition-colors ${form.days.includes(i) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">סוג צלצול</label>
                <div className="flex gap-2">
                  <MobileSelect value={form.sound_type} onValueChange={v => setForm(f => ({ ...f, sound_type: v }))} className="h-9 text-sm flex-1">
                    {SOUNDS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </MobileSelect>
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => playSound(form.sound_type)}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {form.sound_type === 'custom' && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">קישור לקובץ שמע (URL)</label>
                  <Input value={form.custom_sound_url} onChange={e => setForm(f => ({ ...f, custom_sound_url: e.target.value }))} placeholder="https://..." className="h-9 text-sm" />
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">צבע</label>
                <div className="flex gap-2">
                  {BELL_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={save} disabled={saveMutation.isPending}>שמור</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>ביטול</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function BellCard({ bell, onEdit, onDelete, onToggle, onPreview, inactive }) {
  const dayLabels = (bell.days || []).map(d => DAY_SHORT[d]).join(' ');
  const soundEmoji = SOUNDS.find(s => s.value === bell.sound_type)?.label?.split(' ')[0] || '🔔';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`border rounded-2xl p-3 flex items-center gap-3 transition-all ${inactive ? 'opacity-50 bg-muted/30' : 'bg-card hover:border-primary/30'}`}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm"
        style={{ backgroundColor: bell.color || '#3b82f6' }}>
        {soundEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{bell.name}</p>
          {bell.label && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{bell.label}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-xs text-primary font-bold">{bell.time}</span>
          <span className="text-[10px] text-muted-foreground">{dayLabels}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onPreview} aria-label="השמע צלצול" className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-colors">
          <Play className="w-3.5 h-3.5 text-primary" />
        </button>
        <button onClick={() => onToggle(bell)} aria-label={bell.is_active ? 'השבת צלצול' : 'הפעל צלצול'} className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-colors">
          {bell.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
        </button>
        <button onClick={() => onEdit(bell)} aria-label="ערוך צלצול" className="w-8 h-8 rounded-xl hover:bg-accent flex items-center justify-center transition-colors">
          <Music className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button onClick={() => onDelete(bell.id)} aria-label="מחק צלצול" className="w-8 h-8 rounded-xl hover:bg-destructive/10 flex items-center justify-center transition-colors">
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
    </motion.div>
  );
}