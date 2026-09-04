import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import {
  subscribeQueue, flushQueue, isOnline,
} from '@/lib/offlineQueue';

// executor אמיתי לכל סוג פעולה נתמך. upsert (לא רק create) כי נוכחות/ציון
// יכולים כבר להתקיים לאותו יום/מבחן כשהסנכרון קורה.
const EXECUTORS = {
  attendance: async ({ studentId, date, status, justified, justification_reason }) => {
    const existing = await base44.entities.Attendance.filter({ student_id: studentId, date });
    const payload = { status };
    if (justified !== undefined) payload.justified = justified;
    if (justification_reason !== undefined) payload.justification_reason = justification_reason;
    if (existing[0]) {
      return base44.entities.Attendance.update(existing[0].id, payload);
    }
    return base44.entities.Attendance.create({ student_id: studentId, date, ...payload });
  },
  grade: async (data) => base44.entities.Grade.create(data),
};

/**
 * Hook משותף לתור הסנכרון: חושף את אורך התור הנוכחי, ומריץ flush אוטומטי
 * ברגע שהחיבור חוזר (אירוע 'online') וגם בטעינה הראשונית של האפליקציה,
 * למקרה שהיו פעולות ממתינות מסשן קודם.
 */
export function useOfflineSyncQueue() {
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const runFlush = useCallback(async () => {
    if (!isOnline() || syncing) return;
    setSyncing(true);
    try {
      const { sent } = await flushQueue(EXECUTORS);
      if (sent > 0) {
        toast.success(sent === 1 ? 'פעולה אחת סונכרנה' : `${sent} פעולות סונכרנו`);
      }
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => subscribeQueue(setQueue), []);

  useEffect(() => {
    runFlush();
    window.addEventListener('online', runFlush);
    return () => window.removeEventListener('online', runFlush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pendingCount: queue.length, syncing, runFlush };
}
