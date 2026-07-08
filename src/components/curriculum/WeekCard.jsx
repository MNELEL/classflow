import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Trash2, CheckCircle2, Clock, BookMarked, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import WeekGoalCard from './WeekGoalCard';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const STATUS_MAP = {
  planned: { label: 'מתוכנן', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'בביצוע', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completed: { label: 'הושלם', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

export default function WeekCard({ week, onDelete }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const goals = week.parsed_goals || [];
  const completed = goals.filter(g => g.is_completed).length;
  const status = STATUS_MAP[week.status] || STATUS_MAP.planned;

  async function toggleComplete(goalId) {
    const updated = goals.map(g => g.id === goalId ? { ...g, is_completed: !g.is_completed } : g);
    await base44.entities.CurriculumWeek.update(week.id, { parsed_goals: updated });
    qc.invalidateQueries({ queryKey: ['curriculum_weeks'] });
  }

  async function handleDelete() {
    await base44.entities.CurriculumWeek.delete(week.id);
    qc.invalidateQueries({ queryKey: ['curriculum_weeks'] });
    toast.success('שבוע נמחק');
    onDelete?.();
  }

  // Build "suggested next" for last completed goal
  const nextSuggestions = goals.filter(g => g.suggested_next);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-right min-h-[64px]"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
            <BookMarked className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold">{week.week_label || new Date(week.week_start).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {week.subject && <span className="text-[11px] text-muted-foreground">{week.subject}</span>}
              <Badge className={`${status.color} border-0 text-[10px]`}>{status.label}</Badge>
              {goals.length > 0 && (
                <span className="text-[11px] text-muted-foreground">{completed}/{goals.length} הושלמו</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); handleDelete(); }}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2">
              {week.free_text_goals && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 leading-relaxed">"{week.free_text_goals}"</p>
              )}

              {goals.length > 0 ? (
                <div className="space-y-2">
                  {goals.map(goal => (
                    <WeekGoalCard key={goal.id} goal={goal} onToggleComplete={toggleComplete} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">לא נמצאו הספקים</p>
              )}

              {nextSuggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px] font-bold text-violet-700 mb-1.5 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> המשך מוצע לשבוע הבא
                  </p>
                  {nextSuggestions.map((g, i) => (
                    <p key={i} className="text-xs text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400 rounded-lg px-3 py-1.5 mb-1">{g.suggested_next}</p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}