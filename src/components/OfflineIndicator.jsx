import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { toast } from 'sonner';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      toast.success('החיבור לאינטרנט חזר');
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
