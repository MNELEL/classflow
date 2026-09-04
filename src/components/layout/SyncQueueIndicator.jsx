import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { subscribeQueue, flushQueue, isOnline } from '@/lib/offlineQueue';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * אייקון קטן בכותרת שמופיע רק כשיש פעולות ממתינות לסנכרון (נוכחות/ציונים
 * שנשמרו בזמן ניתוק). לחיצה מנסה סנכרון מיידי — שימושי כשהחיבור חוזר אבל
 * ה-listener של 'online' לא נדלק (למשל מעבר מ-WiFi חלש לחיבור סלולרי).
 */
export default function SyncQueueIndicator() {
  const [count, setCount] = useState(0);
  const { syncing, runFlush } = useOfflineSyncQueue();

  useEffect(() => subscribeQueue((items) => setCount(items.length)), []);

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={runFlush}
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
