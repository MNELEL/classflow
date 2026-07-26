import React, { useState, useEffect } from 'react';
import { Shield, Lock, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { isPinEnabledCached, setPin, disablePin, lockNow, refreshPinStatus } from '@/lib/pinLock';

export default function SecuritySettings() {
  const [enabled, setEnabled] = useState(isPinEnabledCached());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('enable');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refreshPinStatus().then(() => setEnabled(isPinEnabledCached()));
  }, []);

  function openEnable() {
    setDialogMode('enable');
    setPin('');
    setConfirmPin('');
    setDialogOpen(true);
  }

  function openDisable() {
    setDialogMode('disable');
    setPin('');
    setDialogOpen(true);
  }

  function openChange() {
    setDialogMode('change');
    setPin('');
    setConfirmPin('');
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (dialogMode === 'enable' || dialogMode === 'change') {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        toast.error('הקוד חייב להכיל 4 ספרות');
        return;
      }
      if (pin !== confirmPin) {
        toast.error('הקודים אינם תואמים');
        return;
      }
      setBusy(true);
      try {
        await setPin(pin);
        setEnabled(true);
        setDialogOpen(false);
        toast.success(dialogMode === 'enable' ? 'נעילת הקוד הופעלה' : 'הקוד עודכן');
      } catch (e) {
        toast.error(e.message || 'שגיאה בשמירת הקוד');
      } finally {
        setBusy(false);
      }
    } else if (dialogMode === 'disable') {
      if (pin.length !== 4) {
        toast.error('הזן קוד 4 ספרות');
        return;
      }
      setBusy(true);
      try {
        const success = await disablePin(pin);
        if (success) {
          setEnabled(false);
          setDialogOpen(false);
          toast.success('נעילת הקוד בוטלה');
        } else {
          toast.error('קוד שגוי');
        }
      } catch {
        toast.error('שגיאה בביטול הנעילה');
      } finally {
        setBusy(false);
      }
    }
  }

  const dialogTitle = {
    enable: 'הפעלת נעילת קוד',
    disable: 'ביטול נעילת קוד',
    change: 'שינוי קוד',
  }[dialogMode];

  const dialogDesc = {
    enable: 'בחר קוד 4 ספרות שיגן על לוח הבקרה. יש לזכור את הקוד — איפוס אפשרי רק דרך יציאה מהחשבון.',
    disable: 'הזן את הקוד הנוכחי כדי לבטל את הנעילה.',
    change: 'הזן קוד חדש 4 ספרות. הקוד הישן יוחלף.',
  }[dialogMode];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> נעילת לוח הבקרה
          </CardTitle>
          <CardDescription>נעל את הדשבורד עם קוד 4 ספרות להגנה על נתוני התלמידים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className={`w-4 h-4 ${enabled ? 'text-success' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">
                {enabled ? 'נעילת קוד פעילה' : 'נעילת קוד כבויה'}
              </span>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => {
                if (checked) openEnable();
                else openDisable();
              }}
            />
          </div>

          {enabled && (
            <>
              <p className="text-xs text-muted-foreground">
                הדשבורד יינעל אוטומטית בכל פתיחה מחדש של האפליקציה וידרוש הזנת הקוד.
                שכחת קוד? האפשרות היחידה היא יציאה מהחשבון והתחברות מחדש.
              </p>
              <Separator />
              <div className="flex flex-col gap-2">
                <Button variant="secondary" onClick={lockNow} className="w-full">
                  <Lock className="w-4 h-4 ml-1" /> נעל עכשיו
                </Button>
                <Button variant="outline" onClick={openChange} className="w-full">
                  <KeyRound className="w-4 h-4 ml-1" /> שנה קוד
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!busy) setDialogOpen(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm mb-1 block">
                {dialogMode === 'disable' ? 'קוד נוכחי' : 'קוד 4 ספרות'}
              </Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-12"
                autoComplete="off"
                autoFocus
              />
            </div>
            {(dialogMode === 'enable' || dialogMode === 'change') && (
              <div>
                <Label className="text-sm mb-1 block">אימות קוד</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="text-center text-2xl tracking-[0.5em] h-12"
                  autoComplete="off"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
              ביטול
            </Button>
            <Button onClick={handleSubmit} disabled={busy || pin.length !== 4}>
              {busy ? 'מעבד...' : dialogMode === 'disable' ? 'בטל נעילה' : 'שמור'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}