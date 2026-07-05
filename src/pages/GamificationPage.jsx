import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import Leaderboard from '@/components/gamification/Leaderboard';
import BulkReward from '@/components/gamification/BulkReward';
import RewardIdeas from '@/components/gamification/RewardIdeas';
import CampaignTemplates from '@/components/gamification/CampaignTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trophy, Star, Maximize2, Minimize2, Trash2, Loader2, Users, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { format } from 'date-fns';

const TABS = [
  ['leaderboard', '🏆 מובילים'],
  ['campaigns', '🎯 מבצעים'],
  ['bulk', '👥 הענק לכיתה'],
  ['ideas', '💡 רעיונות'],
  ['history', '📜 היסטוריה'],
];

export default function GamificationPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('leaderboard');
  const [kioskMode, setKioskMode] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [rewardForm, setRewardForm] = useState({ student_id: '', points: 1, reason: '' });
  const [campaignForm, setCampaignForm] = useState({ title: '', description: '', target_points: 100, reward_description: '', start_date: '', end_date: '' });

  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.filter({ is_active: true }) });
  const { data: rewards = [], isLoading: loadingRewards } = useQuery({ queryKey: ['rewards'], queryFn: () => base44.entities.Reward.list('-date', 200) });
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => base44.entities.Campaign.list('-created_date') });

  const handleRefresh = useCallback(async () => { await Promise.all([qc.invalidateQueries({ queryKey: ['rewards'] }), qc.invalidateQueries({ queryKey: ['campaigns'] })]); }, [qc]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const pointsMap = useMemo(() => {
    const map = {};
    rewards.forEach(r => { map[r.student_id] = (map[r.student_id] || 0) + (r.points || 0); });
    return map;
  }, [rewards]);

  const addReward = useMutation({
    mutationFn: (data) => base44.entities.Reward.create(data),
    onMutate: async (newReward) => {
      await qc.cancelQueries({ queryKey: ['rewards'] });
      const previous = qc.getQueryData(['rewards']);
      qc.setQueryData(['rewards'], (old = []) => [
        { ...newReward, id: `optimistic-${Date.now()}` },
        ...old,
      ]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['rewards'], ctx.previous);
      toast.error('שגיאה בשמירת הנקודות');
    },
    onSuccess: () => { toast.success('נקודות נרשמו!'); setShowRewardForm(false); setRewardForm({ student_id: '', points: 1, reason: '' }); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['rewards'] }),
  });

  const addCampaign = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('מבצע נוצר!'); setShowCampaignForm(false); setCampaignForm({ title: '', description: '', target_points: 100, reward_description: '', start_date: '', end_date: '' }); },
  });

  const deleteCampaign = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  function handleAddReward() {
    if (!rewardForm.student_id || !rewardForm.reason) { toast.error('מלא את כל השדות'); return; }
    const student = students.find(s => s.id === rewardForm.student_id);
    addReward.mutate({ ...rewardForm, student_name: student?.name || '', date: format(new Date(), 'yyyy-MM-dd'), points: Number(rewardForm.points) });
  }

  function applyTemplate(t) {
    setCampaignForm(f => ({ ...f, title: t.title, description: t.description, target_points: t.target_points, reward_description: t.reward_description }));
    setShowTemplates(false);
    setShowCampaignForm(true);
  }

  if (kioskMode) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 z-[100] overflow-auto" dir="rtl">
        <div className="max-w-lg mx-auto py-8 px-4">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-black text-white mb-1">🏆 לוח המובילים</h1>
          </div>
          <Leaderboard students={students} pointsMap={pointsMap} kioskMode />
        </div>
        <button onClick={() => setKioskMode(false)} className="fixed top-4 left-4 text-white/50 hover:text-white">
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="relative p-4 space-y-4">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center text-xl">🏆</div>
            <h1 className="font-bold text-base">גיימיפיקציה</h1>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setKioskMode(true)} aria-label="מצב תצוגה מלאה">
              <Maximize2 className="w-3.5 h-3.5" /> מצב תצוגה
            </Button>
            <Button size="sm" className="gap-1 text-xs" onClick={() => setShowRewardForm(true)}>
              <Plus className="w-3.5 h-3.5" /> הענק נקודות
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        {tab === 'leaderboard' && <Leaderboard students={students} pointsMap={pointsMap} />}

        {/* Campaigns */}
        {tab === 'campaigns' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => setShowTemplates(true)}>
                <Lightbulb className="w-3.5 h-3.5" /> מתבניות מוכנות
              </Button>
              <Button size="sm" className="flex-1 gap-1" onClick={() => setShowCampaignForm(true)}>
                <Plus className="w-3.5 h-3.5" /> מבצע חדש
              </Button>
            </div>
            {campaigns.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>אין מבצעים פעילים</p>
                <p className="text-xs mt-1">צור מבצע ראשון עם תבנית מוכנה!</p>
              </div>
            )}
            {campaigns.map(c => {
              const topPoints = Math.max(...students.map(s => pointsMap[s.id] || 0), 1);
              const progress = Math.min(100, Math.round((topPoints / c.target_points) * 100));
              return (
                <div key={c.id} className="bg-card border border-border/70 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{c.title}</p>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </div>
                    <button onClick={() => deleteCampaign.mutate(c.id)} className="text-destructive/40 hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>🎁 {c.reward_description}</span>
                    <span>יעד: {c.target_points} נק'</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bulk reward */}
        {tab === 'bulk' && (
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-blue-700 dark:text-blue-300">הענק נקודות למספר תלמידים בבת אחת</p>
            </div>
            <BulkReward students={students} onDone={() => setTab('leaderboard')} />
          </div>
        )}

        {/* Ideas */}
        {tab === 'ideas' && (
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <p className="text-xs text-amber-700 dark:text-amber-300">רעיונות לצ'פר ולתגמל תלמידים — לחץ להעתקה</p>
            </div>
            <RewardIdeas students={students} />
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="space-y-2">
            {loadingRewards && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
            {rewards.length === 0 && !loadingRewards && (
              <div className="text-center py-10 text-muted-foreground text-sm">אין רשומות עדיין</div>
            )}
            <AnimatePresence>
              {rewards.slice(0, 50).map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-3 py-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${r.points > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {r.points > 0 ? '+' : ''}{r.points}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.student_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.reason}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{r.date}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Reward Dialog */}
      <Dialog open={showRewardForm} onOpenChange={setShowRewardForm}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> הענקת נקודות</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <MobileSelect value={rewardForm.student_id} onValueChange={v => setRewardForm(p => ({ ...p, student_id: v }))} placeholder="בחר תלמיד..." className="text-sm">
              {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </MobileSelect>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground shrink-0">נקודות:</label>
              <div className="flex gap-1.5 flex-1">
                {[1,2,3,5,10,-1,-3].map(p => (
                  <button key={p} onClick={() => setRewardForm(r => ({ ...r, points: p }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${rewardForm.points === p ? (p > 0 ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500') : 'border-border'}`}>
                    {p > 0 ? `+${p}` : p}
                  </button>
                ))}
              </div>
            </div>
            <Input placeholder="סיבה / תיאור..." value={rewardForm.reason} onChange={e => setRewardForm(p => ({ ...p, reason: e.target.value }))} />
            <Button className="w-full" onClick={handleAddReward} disabled={addReward.isPending}>
              {addReward.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '✨ הענק נקודות'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent dir="rtl" className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>🎯 תבניות מבצעים מוכנות</DialogTitle></DialogHeader>
          <CampaignTemplates onSelect={applyTemplate} />
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={showCampaignForm} onOpenChange={setShowCampaignForm}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle>🎯 צור מבצע חדש</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="שם המבצע..." value={campaignForm.title} onChange={e => setCampaignForm(p => ({ ...p, title: e.target.value }))} />
            <Textarea placeholder="תיאור..." value={campaignForm.description} onChange={e => setCampaignForm(p => ({ ...p, description: e.target.value }))} className="resize-none text-sm min-h-[60px]" />
            <div className="flex gap-2 items-center">
              <label className="text-sm text-muted-foreground shrink-0">יעד נקודות:</label>
              <Input type="number" value={campaignForm.target_points} onChange={e => setCampaignForm(p => ({ ...p, target_points: +e.target.value }))} className="h-8" />
            </div>
            <Input placeholder="🎁 הפרס..." value={campaignForm.reward_description} onChange={e => setCampaignForm(p => ({ ...p, reward_description: e.target.value }))} />
            <Button className="w-full" onClick={() => addCampaign.mutate(campaignForm)} disabled={!campaignForm.title || addCampaign.isPending}>
              {addCampaign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'צור מבצע'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}