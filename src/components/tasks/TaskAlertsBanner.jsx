import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { he } from 'date-fns/locale';

export default function TaskAlertsBanner({ classData }) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Collect all actionable items across classes
  const alerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const items = [];

    for (const cd of classData) {
      const className = cd.classroom.name;

      // Homework with pending submissions due today/tomorrow or overdue
      for (const hw of cd.homework) {
        const submitted = hw.submissions?.filter(s => s.submitted).length || 0;
        const total = hw.submissions?.length || hw.student_ids?.length || 0;
        if (submitted >= total) continue;

        if (!hw.due_date) continue;
        const dueDate = new Date(hw.due_date);
        const daysDiff = differenceInCalendarDays(dueDate, today);

        let urgency = null;
        if (daysDiff < 0) urgency = 'overdue';
        else if (daysDiff === 0) urgency = 'today';
        else if (daysDiff === 1) urgency = 'tomorrow';
        else continue;

        items.push({
          id: hw.id,
          type: 'homework',
          className,
          title: hw.title,
          subject: hw.subject,
          dueDate: hw.due_date,
          urgency,
          pendingCount: total - submitted,
        });
      }

      // Tasks not done, due today/tomorrow or overdue
      for (const t of cd.tasks) {
        if (t.status === 'done' || !t.due_date) continue;
        const dueDate = new Date(t.due_date);
        const daysDiff = differenceInCalendarDays(dueDate, today);

        let urgency = null;
        if (daysDiff < 0) urgency = 'overdue';
        else if (daysDiff === 0) urgency = 'today';
        else if (daysDiff === 1) urgency = 'tomorrow';
        else continue;

        items.push({
          id: t.id,
          type: 'task',
          className,
          title: t.title,
          subject: t.subject,
          dueDate: t.due_date,
          urgency,
        });
      }
    }

    // Sort: overdue first, then today, then tomorrow
    const order = { overdue: 0, today: 1, tomorrow: 2 };
    items.sort((a, b) => order[a.urgency] - order[b.urgency]);
    return items;
  }, [classData]);

  if (dismissed || alerts.length === 0) return null;

  const overdueCount = alerts.filter(a => a.urgency === 'overdue').length;
  const todayCount = alerts.filter(a => a.urgency === 'today').length;
  const tomorrowCount = alerts.filter(a => a.urgency === 'tomorrow').length;

  const urgencyConfig = {
    overdue: { label: 'איחור', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: AlertCircle },
    today: { label: 'היום', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', icon: Clock },
    tomorrow: { label: 'מחר', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: Bell },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 ${overdueCount > 0 ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${overdueCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
          <Bell className={`w-4 h-4 ${overdueCount > 0 ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">תזכורת יומית — מטלות שדורשות טיפול</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {overdueCount > 0 && <span className="text-[11px] font-semibold text-red-600">{overdueCount} באיחור</span>}
            {todayCount > 0 && <span className="text-[11px] font-semibold text-orange-600">{todayCount} להיום</span>}
            {tomorrowCount > 0 && <span className="text-[11px] font-semibold text-amber-600">{tomorrowCount} למחר</span>}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={() => setDismissed(true)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5">
              {alerts.map((item) => {
                const cfg = urgencyConfig[item.urgency];
                const Icon = cfg.icon;
                return (
                  <div key={`${item.type}-${item.id}`} className={`flex items-center gap-2 rounded-lg ${cfg.bg} ${cfg.border} border px-3 py-2`}>
                    <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.className}{item.subject ? ` · ${item.subject}` : ''}
                        {item.pendingCount ? ` · ${item.pendingCount} לא הגישו` : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold ${cfg.color} shrink-0`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}