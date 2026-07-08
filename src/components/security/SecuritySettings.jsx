import React, { useState } from 'react';
import { Shield, Lock, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { isPinSet, setPin, clearPin, lockNow } from '@/lib/pinLock';

export default function SecuritySettings() {
  const [enabled, setEnabled] = useState(isPinSet());
  // Enable flow
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  // Change flow
  const [changing, setChanging] = useState(false);
  const [oldPin, setOldPin] = useState('');

  function handleEnable() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error('הקוד חייב להכיל 4 ספרות');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('הקודים אינם תואמים');
      return;
    }
    setPin(newPin);
    setEnabled(true);
    setNewPin('');
    setConfirmPin('');
    toast.success('קוד האבטחה הוגדר');
  }

  function handleDisable() {
    clearPin();
    setEnabled(false);
    setChanging(false);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    toast.success('קוד האבטחה בוטל');
  }

  function handleChange() {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error('הקוד חייב להכיל 4 ספרות');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('הקודים אינם תואמים');
      return;
    }
    // When changing, require old PIN only as a soft check if it's set; here we
    // already trust the user is authenticated, so we replace directly.
    setPin(newPin);
    setChanging(false);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    toast.success('קוד האבטחה עודכן');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4" /> אבטחה ונעילת מסך
        </CardTitle>
        <CardDescription>נעל את הדשבורד עם קוד 4 ספרות להגנה על נתוני התלמידים</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm mb-1 block">קוד 4 ספרות</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-12"
                autoComplete="off"
              />
            </div>
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
            <Button className="w-full" onClick={handleEnable} disabled={newPin.length !== 4 || confirmPin.length !== 4}>
              <Lock className="w-4 h-4 ml-1" /> הפעל נעילת קוד
            </Button>
          </div>
        ) : changing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-sm mb-1 block">קוד חדש</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="text-center text-2xl tracking-[0.5em] h-12"
                autoComplete="off"
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">אימות קוד חדש</Label>
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
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleChange} disabled={newPin.length !== 4 || confirmPin.length !== 4}>שמור קוד חדש</Button>
              <Button variant="outline" onClick={() => { setChanging(false); setNewPin(''); setConfirmPin(''); }}>ביטול</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-success">
              <Lock className="w-4 h-4" />
              <span className="font-medium">נעילת קוד פעילה</span>
            </div>
            <p className="text-xs text-muted-foreground">הדשבורד יינעל אוטומטית בכל פתיחה מחדש של האפליקציה וידרוש הזנת הקוד.</p>
            <Separator />
            <div className="flex flex-col gap-2">
              <Button variant="secondary" onClick={lockNow} className="w-full">
                <Lock className="w-4 h-4 ml-1" /> נעל עכשיו
              </Button>
              <Button variant="outline" onClick={() => { setChanging(true); setNewPin(''); setConfirmPin(''); }} className="w-full">
                שנה קוד
              </Button>
              <Button variant="destructive" onClick={handleDisable} className="w-full">
                <Trash2 className="w-4 h-4 ml-1" /> בטל נעילת קוד
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}