import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import ReviewCard from '@/components/review/ReviewCard';
import { executePendingUpdate } from '@/lib/pendingUpdateActions';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck, CheckCheck, Trash2, Loader2,
  Inbox, CheckCircle2, XCircle, Clock
} from 'lucide-react';

const TABS = [
  { id: 'pending', label: 'ממתינות', icon: Clock },
  { id: 'approved', label: 'אושרו', icon: CheckCircle2 },
  { id: 'rejected', label: 'נדחו', icon: XCircle },
];

export default function ReviewPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [processingIds, setProcessingIds] = useState(new Set());
  const [approvingAll, setApprovingAll] = useState(false);

  const { data: allPending = [], isLoading } = useQuery({
    queryKey: ['pendingUpdates'],
    queryFn: () => base44.entities.PendingUpdate.list('-created_date', 200),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const pending = allPending.filter(p => p.status === 'pending');
  const approved = allPending.filter(p => p.status === 'approved');
  const rejected = allPending.filter(p => p.status === 'rejected');

  const tabData = { pending, approved, rejected }[tab] || [];

  const handleRefresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['pendingUpdates'] });
  }, [qc]);

  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  async function handleApprove(item, editedPayload) {
    setProcessingIds(prev => new Set([...prev, item.id]));
    try {
      // Execute the actual write FIRST, before marking the record approved.
      // Previously this set status: 'approved' before calling
      // executePendingUpdate — if that write then threw (e.g. an
      // out-of-range score, a deleted student, a dropped connection), the
      // PendingUpdate record was already persisted as "approved" even
      // though nothing was actually written to Grade/Attendance/etc. The
      // teacher saw an error toast but the item vanished from the pending
      // queue, silently losing the suggestion. Now the record only moves
      // to 'approved' once the write has actually succeeded — if it
      // hasn't, the item stays in 'pending' so it's still there to retry.
      await executePendingUpdate({ ...item, payload: editedPayload });
      await base44.entities.PendingUpdate.update(item.id, {
        payload: editedPayload,
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      });
      toast.success(`אושר: ${item.summary}`);
      qc.invalidateQueries({ queryKey: ['pendingUpdates'] });
      qc.invalidateQueries();
    } catch (err) {
      toast.error('שגיאה באישור: ' + (err.message || ''));
      // Rethrow so handleApproveAll's success/error counters are accurate.
      // The per-item error toast already fired above; a caller that just
      // wants fire-and-forget (a single-item click) can ignore the
      // rejection since ReviewCard doesn't await this call's result.
      throw err;
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    }
  }

  async function handleReject(item) {
    setProcessingIds(prev => new Set([...prev, item.id]));
    try {
      await base44.entities.PendingUpdate.update(item.id, {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      });
      toast.success('ההצעה נדחתה');
      qc.invalidateQueries({ queryKey: ['pendingUpdates'] });
    } catch (err) {
      toast.error('שגיאה בדחייה: ' + (err.message || ''));
    }
    setProcessingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
  }

  async function handleApproveAll() {
    if (pending.length === 0) return;
    setApprovingAll(true);
    let success = 0;
    let errors = 0;
    for (const item of pending) {
      try {
        await handleApprove(item, item.payload);
        success++;
      } catch {
        errors++;
      }
    }
    setApprovingAll(false);
    if (success > 0) toast.success(`${success} הצעות אושרו${errors > 0 ? `, ${errors} נכשלו` : ''}`);
  }

  async function handleClearReviewed() {
    const reviewed = [...approved, ...rejected];
    if (reviewed.length === 0) return;
    try {
      for (const item of reviewed) {
        await base44.entities.PendingUpdate.delete(item.id);
      }
      toast.success('הרשימה נוקתה');
      qc.invalidateQueries({ queryKey: ['pendingUpdates'] });
    } catch (err) {
      toast.error('שגיאה בניקוי');
    }
  }

  const isProcessing = processingIds.size > 0 || approvingAll;

  return (
    <AppLayout>
      <div ref={containerRef} className="min-h-full bg-background pb-8 relative" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />

        {/* Header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">מסך סקירה</h1>
              <p className="text-xs text-muted-foreground">אשר או דחה עדכונים שה-AI הציע</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 p-3 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pending.length}</div>
            <div className="text-[10px] text-muted-foreground">ממתינות</div>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{approved.length}</div>
            <div className="text-[10px] text-muted-foreground">אושרו</div>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 p-3 text-center">
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">{rejected.length}</div>
            <div className="text-[10px] text-muted-foreground">נדחו</div>
          </div>
        </div>

        {/* Approve all / clear */}
        {pending.length > 1 && (
          <div className="px-4 mb-3 flex gap-2">
            <Button
              className="flex-1 gap-1.5"
              onClick={handleApproveAll}
              disabled={isProcessing}
            >
              {approvingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              אשר הכל ({pending.length})
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 mb-3 flex gap-1.5">
          {TABS.map(t => {
            const count = { pending: pending.length, approved: approved.length, rejected: rejected.length }[t.id];
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/30'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full ${active ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="px-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : tabData.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
                <Inbox className="w-10 h-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {tab === 'pending'
                    ? 'אין הצעות ממתינות. פקודות AI חדשות יופיעו כאן'
                    : tab === 'approved'
                    ? 'עדיין לא אישרת הצעות'
                    : 'אין הצעות שנדחו'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="popLayout">
              {tabData.map(item => (
                <ReviewCard
                  key={item.id}
                  pending={item}
                  students={students}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={processingIds.has(item.id)}
                />
              ))}
            </AnimatePresence>
          )}

          {/* Clear reviewed */}
          {tab !== 'pending' && tabData.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-muted-foreground mt-4"
              onClick={handleClearReviewed}
            >
              <Trash2 className="w-3.5 h-3.5" /> נקה רשימה
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}