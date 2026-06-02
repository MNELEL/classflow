import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, BookOpenCheck, Loader2, Pencil, Trash2, Copy, LayoutTemplate, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LessonPlanEditor from './LessonPlanEditor';
import ShareModal from './ShareModal';

export default function LessonPlanningTab() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState(null);
  const [sharingPlan, setSharingPlan] = useState(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['lesson-plans'],
    queryFn: () => base44.entities.LessonPlan.list('-created_date', 50),
  });

  const deletePlan = useMutation({
    mutationFn: (id) => base44.entities.LessonPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-plans'] }),
  });

  const duplicatePlan = useMutation({
    mutationFn: (plan) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = plan;
      return base44.entities.LessonPlan.create({ ...rest, title: `${rest.title} (עותק)` });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lesson-plans'] }),
  });

  if (editingPlan !== null) {
    return (
      <LessonPlanEditor
        planId={editingPlan === 'new' ? null : editingPlan}
        onBack={() => setEditingPlan(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm">מערכי שיעור</h2>
          <p className="text-xs text-muted-foreground">{plans.length} מערכים שמורים</p>
        </div>
        <Button size="sm" onClick={() => setEditingPlan('new')} className="gap-1">
          <Plus className="w-4 h-4" /> מערך חדש
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpenCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">אין מערכי שיעור עדיין</p>
          <p className="text-sm mt-1">צור את מערך השיעור הראשון שלך</p>
          <Button size="sm" className="mt-4 gap-1" onClick={() => setEditingPlan('new')}>
            <Plus className="w-3.5 h-3.5" /> מערך חדש
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border rounded-xl p-3 flex items-start gap-3"
              >
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  {plan.is_template ? <LayoutTemplate className="w-4 h-4 text-primary" /> : <BookOpenCheck className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0" onClick={() => setEditingPlan(plan.id)}>
                  <p className="font-semibold text-sm truncate">{plan.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.subject}{plan.grade_level ? ` · ${plan.grade_level}` : ''}
                    {plan.blocks?.length ? ` · ${plan.blocks.length} בלוקים` : ''}
                  </p>
                  {plan.learning_objectives?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      🎯 {plan.learning_objectives[0]}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setSharingPlan(plan)}>
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => duplicatePlan.mutate(plan)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditingPlan(plan.id)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive"
                    onClick={() => deletePlan.mutate(plan.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {sharingPlan && (
        <ShareModal item={sharingPlan} type="lesson" onClose={() => setSharingPlan(null)} />
      )}
    </div>
  );
}