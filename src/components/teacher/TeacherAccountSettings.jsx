import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Settings, LogOut, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { purgeUserData, clearLocalState } from '@/lib/accountCleanup';

export default function TeacherAccountSettings({ teacher, onLogout, triggerLabel, triggerVariant = 'ghost', triggerSize = 'icon' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const CONFIRM_WORDS = ['מחק', 'DELETE'];
  const isConfirmed = CONFIRM_WORDS.includes(confirmText.trim());

  function closeConfirm() {
    setShowConfirm(false);
    setConfirmText('');
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const user = await base44.auth.me();
      // Purge user-owned entities first (non-blocking — failures don't
      // abort the flow since deleteMe is the authoritative step).
      await purgeUserData(user);
      // Explicitly await the SDK de-provisioning endpoint to cleanly remove
      // backend profile credentials and session database entries BEFORE
      // purging any local state.
      await base44.auth.deleteMe();
      clearLocalState();
      toast.success('החשבון נמחק לצמיתות. מתנתק...');
      setTimeout(() => navigate('/register', { replace: true }), 1500);
    } catch (error) {
      toast.error('שגיאה במחיקת החשבון');
      setBusy(false);
      closeConfirm();
      setOpen(false);
    }
  }

  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)} aria-label={triggerLabel || "הגדרות חשבון"} className="w-full gap-2">
        {triggerLabel ? <><Settings className="w-4 h-4" /> {triggerLabel}</> : <Settings className="w-5 h-5" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> הגדרות חשבון
            </DialogTitle>
            <DialogDescription>נהל את חשבון המורה שלך</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium text-sm">{teacher?.full_name || 'משתמש'}</p>
                <p className="text-xs text-muted-foreground">{teacher?.email || 'חשבון פעיל'}</p>
              </div>
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={onLogout}>
              <LogOut className="w-4 h-4" /> התנתקות
            </Button>

            {/* Permanent account deletion */}
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> מחיקת חשבון לצמיתות
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                פעולה זו תמחק את חשבונך וכל הנתונים המשויכים לצמיתות ולא ניתן לשחזרם. ודא שברצונך להמשיך.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => { setConfirmText(''); setShowConfirm(true); }}
              >
                <Trash2 className="w-4 h-4" /> מחיקת חשבון לצמיתות
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={(o) => { if (!o) closeConfirm(); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">מחיקת חשבון - פעולה בלתי הפיכה</AlertDialogTitle>
            <AlertDialogDescription>
              חשבונך וכל הנתונים המשויכים אליו יימחקו לצמיתות ולא ניתן לשחזרם. פעולה זו בלתי הפיכה. האם אתה בטוח?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-sm mb-2 block">
              הקלד <strong>מחק</strong> או <strong>DELETE</strong> לאישור:
            </Label>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="מחק"
              className="text-base h-11"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:gap-0">
            <AlertDialogCancel disabled={busy}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              disabled={!isConfirmed || busy}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? 'מוחק...' : <><Trash2 className="w-4 h-4 ml-1" /> מחק חשבון לצמיתות</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}