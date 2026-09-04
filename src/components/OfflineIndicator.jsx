import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { flushQueue } from '@/lib/offlineQueue';
import { base44 } from '@/api/base44Client';

// אותם ה-executors זהים לאלו ב-SyncQueueIndicator.jsx בכוונה — שני המקומות
// מריצים את אותו התור וצריכים לבצע אותה פעולה על הנתונים האמיתיים.
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

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      toast.success('החיבור לאינטרנט חזר');
      // מנסים לרוקן את התור מיד כשהחיבור חוזר — המורה לא צריך לשים לב לאייקון
      // הסינכון וללחוץ עליו בעצמו. שגיאות עדיינות נשארות בתור לניסיון הבא.
      flushQueue(EXECUTORS).then(({ sent }) => {
        if (sent > 0) toast.success(sent === 1 ? 'פעולה אחת סונכנה' : `${sent} פעולות סונכנו`);
      }).catch(() => {
        // כשל סנכרון אוטומטי נכשל — התור נשאר, המורה עדיין יכול לסנכן ידנית דרך SyncQueueIndicator.
      });
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 bg-destructive/95 text-destructive-foreground text-xs font-medium py-1.5 px-3"
      style={{ paddingTop: 'calc(0.375rem + env(safe-area-inset-top, 0px))' }}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>אין חיבור לאינטרנט — סימון נוכחות וציונים יישמרו ויסונכרנו כשהחיבור יחזור</span>
    </div>
  );
}
