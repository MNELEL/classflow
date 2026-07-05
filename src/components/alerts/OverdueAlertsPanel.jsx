import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCheck, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function OverdueAlertsPanel() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ['overdue-alerts'],
    queryFn: () => base44.entities.OverdueAlert.filter({ is_read: false }, '-alerted_at', 20),
    refetchInterval: 60000,
  });

  // Auto-check on mount
  useEffect(() => {
    base44.functions.invoke('checkOverdueTasks', {}).catch(() => {});
  }, []);

  // Show toast on new unread alerts
  const [shownCount, setShownCount] = useState(0);
  useEffect(() => {
    if (alerts.length > shownCount && shownCount > 0) {
      toast.warning(`${alerts.length - shownCount} משימות מאחרות חדשות!`, {
        description: 'לחץ על הפעמון לפרטים',
        duration: 5000,
      });
    }
    setShownCount(alerts.length);
  }, [alerts.length]);

  async function markRead(id) {
    await base44.entities.OverdueAlert.update(id, { is_read: true });
    qc.invalidateQueries({ queryKey: ['overdue-alerts'] });
  }

  async function markAllRead() {
    await Promise.all(alerts.map(a => base44.entities.OverdueAlert.update(a.id, { is_read: true })));
    qc.invalidateQueries({ queryKey: ['overdue-alerts'] });
    setOpen(false);
  }

  const urgentCount = alerts.filter(a => a.days_overdue >= 3).length;

  return (
    <>
      {/* Bell trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-accent transition-colors"
        aria-label="התראות איחורים"
      >
        <AlertTriangle className={`w-5 h-5 ${alerts.length > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {alerts.length > 9 ? '9+' : alerts.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="absolute top-14 right-4 z-[200] w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-orange-50 dark:bg-orange-950/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="font-bold text-sm">משימות מאחרות</span>
                {urgentCount > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                    {urgentCount} דחוף
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {alerts.length > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    <CheckCheck className="w-3 h-3" /> סמן הכל
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label="סגור התראות" className="p-1 hover:bg-accent rounded-lg">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {alerts.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <CheckCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  אין משימות מאחרות 🎉
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className={`px-4 py-3 flex gap-3 items-start hover:bg-accent/30 transition-colors ${alert.days_overdue >= 3 ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${alert.days_overdue >= 3 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                      <Clock className={`w-4 h-4 ${alert.days_overdue >= 3 ? 'text-red-500' : 'text-orange-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{alert.task_title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">{alert.student_name}</span>
                      </div>
                      <p className={`text-[10px] mt-0.5 font-medium ${alert.days_overdue >= 3 ? 'text-red-500' : 'text-orange-500'}`}>
                        {alert.days_overdue === 0 ? 'איחור של היום' : `${alert.days_overdue} ימים איחור`}
                      </p>
                    </div>
                    <button onClick={() => markRead(alert.id)} aria-label="סמן התראה כנקראה" className="p-1 hover:bg-accent rounded-lg shrink-0">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}