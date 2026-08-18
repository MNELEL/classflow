import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Brain, RefreshCw, X, AlertTriangle, TrendingDown, CalendarClock,
  MessageSquareWarning, BookX, Trophy, GraduationCap, Sparkles, Loader2, ChevronLeft,
} from 'lucide-react';

const TYPE_META = {
  attendance_decline:      { icon: CalendarClock,           color: 'orange' },
  grade_drop:              { icon: TrendingDown,            color: 'red' },
  overdue_accumulation:   { icon: AlertTriangle,           color: 'orange' },
  behavior_escalation:    { icon: AlertTriangle,           color: 'red' },
  low_homework_submission:{ icon: BookX,                   color: 'purple' },
  low_parent_engagement:  { icon: MessageSquareWarning,    color: 'blue' },
  coverage_gap:           { icon: BookX,                   color: 'purple' },
  upcoming_exam_unprepared:{ icon: GraduationCap,           color: 'orange' },
  negative_reward_trend:  { icon: Trophy,                  color: 'purple' },
  daily_briefing:         { icon: Sparkles,                color: 'teal' },
  general:                { icon: Brain,                   color: 'teal' },
};

const SEV_STYLE = {
  high:   { ring: 'border-red-300 bg-red-50/70 dark:bg-red-900/15 dark:border-red-800', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
  medium: { ring: 'border-amber-300 bg-amber-50/70 dark:bg-amber-900/15 dark:border-amber-800', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  low:    { ring: 'border-blue-200 bg-blue-50/60 dark:bg-blue-900/12 dark:border-blue-800', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
};

const SEV_LABEL = { high: 'דחוף', medium: 'חשוב', low: 'מידע' };

export default function OrchestratorInsights() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['orchestrator-insights'],
    queryFn: () => base44.entities.OrchestratorInsight.list('-generated_at', 50),
    staleTime: 60000,
  });

  const active = insights.filter(i => !i.is_dismissed);
  const briefing = active.find(i => i.insight_type === 'daily_briefing');
  const risks = active.filter(i => i.insight_type !== 'daily_briefing')
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    });

  const dismiss = useMutation({
    mutationFn: (id) => base44.entities.OrchestratorInsight.update(id, { is_dismissed: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orchestrator-insights'] }),
  });

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await base44.functions.invoke('orchestrator', { mode: 'monitor' });
      const data = res.data || res;
      const count = (data.insights || 0) + (data.briefing ? 1 : 0);
      toast.success(count > 0 ? `המוח סרק את הנתונים — ${count} תובנות חדשות` : 'הסריקה הושלמה — אין תובנות חדשות');
      qc.invalidateQueries({ queryKey: ['orchestrator-insights'] });
    } catch (err) {
      toast.error('לא הצלחתי להריץ את הסריקה');
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">תובנות פרואקטיביות</span>
        </div>
        <div className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-semibold">המוח הפדגוגי</span>
          {risks.length > 0 && (
            <span className="text-xs text-muted-foreground">{risks.length} תובנות</span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          סריקה מחדש
        </button>
      </div>

      <div className="space-y-2.5">
        {/* ── Daily briefing (AI synthesis) ── */}
        {briefing && (
          <InsightCard key={briefing.id} insight={briefing} onDismiss={() => dismiss.mutate(briefing.id)} highlight />
        )}

        {/* ── Risk insights ── */}
        <AnimatePresence>
          {risks.map(ins => (
            <InsightCard key={ins.id} insight={ins} onDismiss={() => dismiss.mutate(ins.id)} />
          ))}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {!briefing && risks.length === 0 && !refreshing && (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">הכל תקין</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">המוח סרק את כל המודולים — אין תובנות חריגות כרגע</p>
            </div>
            <button onClick={refresh} disabled={refreshing} className="text-[11px] text-emerald-700 hover:underline disabled:opacity-50">
              סרוק שוב
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InsightCard({ insight, onDismiss, highlight }) {
  const meta = TYPE_META[insight.insight_type] || TYPE_META.general;
  const Icon = meta.icon;
  const sev = SEV_STYLE[insight.severity] || SEV_STYLE.medium;
  const names = (insight.student_names || []).slice(0, 3);
  const extraNames = (insight.student_names || []).length - names.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-2xl border p-3.5 ${sev.ring} ${highlight ? 'ring-1 ring-primary/30' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sev.badge}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.description}</p>
            </div>
            <button
              onClick={onDismiss}
              className="w-7 h-7 shrink-0 -mt-1 -ml-1 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors"
              aria-label="בטל תובנה"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {insight.suggested_action && (
            <p className="text-[11px] text-foreground/80 mt-2 flex items-start gap-1">
              <span className="text-primary">↳</span>
              <span className="flex-1">{insight.suggested_action}</span>
            </p>
          )}

          {(names.length > 0 || insight.action_link) && (
            <div className="flex items-center justify-between mt-2.5 gap-2">
              {names.length > 0 ? (
                <div className="flex items-center gap-1 flex-wrap min-w-0">
                  {names.map((n, i) => (
                    <span key={i} className="text-[10px] bg-white/70 dark:bg-black/20 px-1.5 py-0.5 rounded-md truncate max-w-[90px]">
                      {n}
                    </span>
                  ))}
                  {extraNames > 0 && <span className="text-[10px] text-muted-foreground">+{extraNames}</span>}
                </div>
              ) : <span /> }
              {insight.action_link && (
                <Link to={insight.action_link} className="flex items-center gap-0.5 text-[11px] text-primary hover:underline shrink-0">
                  פתח <ChevronLeft className="w-3 h-3" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}