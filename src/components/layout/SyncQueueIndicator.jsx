import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { subscribeQueue, flushQueue, isOnline } from '@/lib/offlineQueue';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const EXECUTORS = {
  attendance: async ({ studentId, date, status, justified, justification_reason }) => {
    const existing = await base44.entities.Attendance.filter({ student_id: studentId, date });
    const payload = { status };
    if (justified !== undefined) payload.justified = justified;
    if (justification_reason !== undefined) payload.justification_reason = justification_reason;
    if (existing[0]) return base44.entities.Attendance.update(existing[0].id, payload);
    return base44.entities.Attendance.create({ student_id: studentId, date, ...payload });
  },
  grade: async (data) => base44.entities.Grade.create(data),
};

/**
 * אייקון קטן בכותרת שמופיע רק כשיש פעולות ממתינות לסנכרון (נוכחות/ציונים
 * שנשמרו בזמן ניתוק). לחיצה מנסה סנכרון מיידי — שימושי כשהחיבור חוזר אבל
 * ה-listener של 'online' לא נדלק (למשל מעבר מ-WiFi חלש לחיבור סלולרי).
 */
export default function SyncQueueIndicator() {
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => subscribeQueue((items) => setCount(items.length)), []);

  if (count === 0) return null;

  async function handleClick() {
    if (!isOnline() || syncing) return;
    setSyncing(true);
    try {
      const { sent } = await flushQueue(EXECUTORS);
      if (sent > 0) toast.success(sent === 1 ? 'פעולה אחת סונכנה' : `${sent} פעולות סונכנו`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={syncing}
      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-accent transition-colors select-none relative"
      aria-label={`${count} פעולות ממתינות לסנכרון — לחץ לניסיון מיידי`}
      title="פעולות ממתינות לסנכרון"
    >
      <RefreshCw className={`w-5 h-5 text-amber-600 dark:text-amber-400 ${syncing ? 'animate-spin' : ''}`} />
      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
        {count}
      </span>
    </button>
  );
}
