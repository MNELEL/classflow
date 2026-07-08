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
import { Trash2, Settings, LogOut, UserX, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function TeacherAccountSettings({ teacher, onLogout }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(null); // 'deactivate' | 'delete'
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const CONFIRM_WORDS = ['מחק', 'DELETE'];
  const isConfirmed = CONFIRM_WORDS.includes(confirmText.trim());

  function openConfirm(m) {
    setMode(m);
    setConfirmText('');
  }

  function closeConfirm() {
    setMode(null);
    setConfirmText('');
  }

  async function handleDeactivate() {
    setBusy(true);
    try {
      await base44.entities.Teacher.update(teacher.id, { is_active: false });
      toast.success('החשבון הושבת בהצלחה');
      localStorage.clear();
      sessionStorage.clear();
      base44.auth.logout('/teacher-login');
    } catch (error) {
      toast.error('שגיאה בהשבתת החשבון');
      setBusy(false);
      closeConfirm();
      setOpen(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await base44.entities.Teacher.delete(teacher.id);
      await base44.auth.deleteMe();
      localStorage.clear();
      sessionStorage.clear();
      toast.success('הפרופיל והחשבון נמחקו לצמיתות. מתנתק...');
      setTimeout(() => navigate('/register', { replace: true }), 1500);
    } catch (error) {
      toast.error('שגיאה במחיקת הפרופיל');
      setBusy(false);
      closeConfirm();
      setOpen(false);
    }
  }

  const isDeactivate = mode === 'deactivate';

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="הגדרות חשבון">
        <Settings className="w-5 h-5" />
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
                <p className="font-medium text-sm">{teacher.full_name}</p>
                <p className="text-xs text-muted-foreground">{teacher.email || 'מורה פעיל'}</p>
              </div>
            </div>

            {/* Prominent Delete Account — instantly visible for store compliance */}
            <Button
              variant="destructive"
              className="w-full gap-2 font-semibold"
              onClick={() => openConfirm('delete')}
            >
              <Trash2 className="w-4 h-4" /> מחיקת חשבון
            </Button>

            <Button variant="outline" className="w-full gap-2" onClick={onLogout}>
              <LogOut className="w-4 h-4" /> התנתקות
            </Button>

            {/* Deactivation */}
            <div className="rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                <UserX className="w-4 h-4" /> השבתת חשבון
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                השבתת החשבון תסיר את הגישה שלך למערכת. ניתן לפנות למנהל המערכת לשחזור הגישה.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                onClick={() => openConfirm('deactivate')}
              >
                <UserX className="w-4 h-4" /> בקשת השבתת חשבון
              </Button>
            </div>

            {/* Permanent deletion */}
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> מחיקת פרופיל לצמיתות
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                פעולה זו תמחק את פרופיל המורה שלך לצמיתות ולא ניתן לשחזרו. ודא שברצונך להמשיך.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
                onClick={() => openConfirm('delete')}
              >
                <Trash2 className="w-4 h-4" /> מחיקת פרופיל לצמיתות
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={mode !== null} onOpenChange={(o) => { if (!o) closeConfirm(); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className={isDeactivate ? '' : 'text-destructive'}>
              {isDeactivate ? 'השבתת חשבון' : 'מחיקת פרופיל - פעולה בלתי הפיכה'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isDeactivate
                ? 'השבתת החשבון תסיר את הגישה שלך למערכת. ניתן לפנות למנהל המערכת לשחזור הגישה.'
                : 'פרופיל המורה שלך יימחק לצמיתות ולא ניתן לשחזרו. פעולה זו בלתי הפיכה. האם אתה בטוח?'}
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
                if (isDeactivate) handleDeactivate();
                else handleDelete();
              }}
              className={isDeactivate
                ? 'border-amber-500 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/30'
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {busy
                ? (isDeactivate ? 'משבית...' : 'מוחק...')
                : <>{isDeactivate
                  ? <><UserX className="w-4 h-4 ml-1" /> השבת חשבון</>
                  : <><Trash2 className="w-4 h-4 ml-1" /> מחק פרופיל לצמיתות</>}</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}