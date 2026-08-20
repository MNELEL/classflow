import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // Non-fatal: the app works fine without a service worker (it just
      // falls back to always hitting the network, same as before this
      // feature existed), so this is a console-only signal, not a toast.
      console.error('[ServiceWorker] registration failed:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      dir="rtl"
      role="status"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 sm:right-auto sm:max-w-sm z-[100] bg-card border border-border rounded-2xl shadow-lg p-4 flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <RefreshCw className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium text-foreground">גרסה חדשה זמינה</p>
        <p className="text-xs text-muted-foreground">
          עדכון לאפליקציה מוכן להתקנה. הדף ייטען מחדש כדי להשלים את העדכון.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => updateServiceWorker(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            עדכון עכשיו
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            מאוחר יותר
          </button>
        </div>
      </div>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="סגור"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
