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
import { GitBranch, Plus, TrendingUp, TrendingDown, Minus, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const TYPE_META = {
  positive: { label: 'חיובי', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: TrendingUp, dot: 'bg-emerald-500' },
  negative: { label: 'שלילי', color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', icon: TrendingDown, dot: 'bg-rose-500' },
  improvement: { label: 'שיפור', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: TrendingUp, dot: 'bg-blue-500' },
  concern: { label: 'חשש', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: TrendingDown, dot: 'bg-amber-500' },
  neutral: { label: 'ניטרלי', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-900/30', icon: Minus, dot: 'bg-slate-400' },
};

const CATEGORIES = ['participation', 'homework', 'behavior', 'social', 'academic', 'attendance', 'other'];
const CATEGORY_LABELS = { participation: 'השתתפות', homework: 'שעורי בית', behavior: 'התנהגות', social: 'חברתי', academic: 'אקדמי', attendance: 'נוכחות', other: 'אחר' };

export default function BehaviorTimelinePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ student_id: '', type: 'positive', category: 'behavior', description: '', severity: 'low', action_taken: '', follow_up: false });

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['behavior-events'],
    queryFn: () => base44.entities.BehaviorEvent.list('-date', 100),
  });

  const activeStudents = students.filter(s => s.is_active !== false);
  const studentMap = useMemo(() => Object.fromEntries(activeStudents.map(s => [s.id, s.name])), [activeStudents]);

  const filtered = events.filter(e => {
    if (filterStudent !== 'all' && e.student_id !== filterStudent) return false;
    if (filterType !== 'all' && e.type !== filterType) return false;
    return true;
  });

  // Group by date
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(e => {
      const date = new Date(e.date).toLocaleDateString('he-IL');
      if (!g[date]) g[date] = [];
      g[date].push(e);
    });
    return g;
  }, [filtered]);

  async function save() {
    if (!form.student_id || !form.description) {
      toast.error('בחרו תלמיד וכתבו תיאור');
      return;
    }
    await base44.entities.BehaviorEvent.create({
      ...form,
      student_name: studentMap[form.student_id] || '',
      date: new Date().toISOString(),
    });
    qc.invalidateQueries({ queryKey: ['behavior-events'] });
    toast.success('האירוע נוסף!');
    setShowForm(false);
    setForm({ student_id: '', type: 'positive', category: 'behavior', description: '', severity: 'low', action_taken: '', follow_up: false });
  }

  // Stats
  const stats = useMemo(() => {
    const positive = filtered.filter(e => e.type === 'positive' || e.type === 'improvement').length;
    const negative = filtered.filter(e => e.type === 'negative' || e.type === 'concern').length;
    const followUps = filtered.filter(e => e.follow_up).length;
    return { positive, negative, followUps, total: filtered.length };
  }, [filtered]);

  return (
    <AppLayout>
      <div className="p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg">ציר זמן התנהגות</h1>
            <p className="text-xs text-muted-foreground">{stats.total} אירועים רשומים</p>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> אירוע
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-emerald-600">{stats.positive}</p>
            <p className="text-[10px] text-muted-foreground">חיוביים</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-rose-600">{stats.negative}</p>
            <p className="text-[10px] text-muted-foreground">שליליים</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-center">
            <p className="text-xl font-bold text-amber-600">{stats.followUps}</p>
            <p className="text-[10px] text-muted-foreground">נדרש מעקב</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterStudent} onValueChange={setFilterStudent}>
            <SelectTrigger className="h-9 text-xs flex-1"><SelectValue placeholder="תלמיד" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התלמידים</SelectItem>
              {activeStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 text-xs flex-1"><SelectValue placeholder="סוג" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">אין אירועים עדיין</p>
            <p className="text-sm mt-1">הוסף אירוע התנהגות ראשון</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-bold text-muted-foreground mb-2 sticky top-0 bg-background py-1">{date}</p>
                <div className="relative pr-4 space-y-2">
                  <div className="absolute right-1.5 top-2 bottom-2 w-0.5 bg-border" />
                  {items.map(event => {
                    const meta = TYPE_META[event.type] || TYPE_META.neutral;
                    const Icon = meta.icon;
                    return (
                      <motion.div key={event.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className="relative pr-6">
                        <div className={`absolute right-0 top-2.5 w-3 h-3 rounded-full ${meta.dot} border-2 border-background`} />
                        <button onClick={() => navigate(`/students/${event.student_id}`)}
                          className="w-full bg-card border rounded-xl p-3 text-right hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold ${meta.color}`}>{studentMap[event.student_id] || event.student_name}</span>
                              <Badge variant="outline" className={`text-[10px] ${meta.bg} ${meta.color} border-0`}>{meta.label}</Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{new Date(event.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm">{event.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{CATEGORY_LABELS[event.category] || event.category}</span>
                            {event.severity === 'high' && <span className="text-[10px] text-rose-500 font-semibold">⚠️ חמור</span>}
                            {event.follow_up && <span className="text-[10px] text-amber-500 font-semibold">📌 נדרש מעקב</span>}
                          </div>
                          {event.action_taken && <p className="text-[11px] text-muted-foreground mt-1 italic">פעולה: {event.action_taken}</p>}
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent dir="rtl" className="max-w-sm">
            <DialogHeader><DialogTitle>אירוע התנהגות חדש</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.student_id} onValueChange={v => setForm(f => ({ ...f, student_id: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="בחרו תלמיד..." /></SelectTrigger>
                <SelectContent>
                  {activeStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">סוג אירוע</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <button key={k} onClick={() => setForm(f => ({ ...f, type: k }))}
                      className={`py-2 rounded-xl text-[10px] font-semibold border-2 transition-all ${form.type === k ? `${v.bg} ${v.color} border-current` : 'border-border'}`}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">תיאור</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="מה קרה..." className="text-sm" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">פעולה שננקטה (אופציונלי)</label>
                <Input value={form.action_taken} onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))} placeholder="שיחה, הודעה להורים..." className="text-sm" />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs">דרגת חומרה</label>
                <div className="flex gap-1">
                  {['low', 'medium', 'high'].map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, severity: s }))}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 ${form.severity === s ? (s === 'high' ? 'border-rose-500 text-rose-600 bg-rose-50' : s === 'medium' ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-emerald-500 text-emerald-600 bg-emerald-50') : 'border-border'}`}>
                      {s === 'low' ? 'קל' : s === 'medium' ? 'בינוני' : 'חמור'}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.follow_up} onChange={e => setForm(f => ({ ...f, follow_up: e.target.checked }))} className="w-4 h-4" />
                נדרש מעקב
              </label>

              <Button onClick={save} className="w-full">שמרו אירוע</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}