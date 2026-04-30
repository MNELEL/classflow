import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Palette, LayoutGrid, Settings, Save, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const SETTINGS_KEY = 'classmanager_settings';

const COLOR_PALETTES = [
  { id: 'indigo', label: 'אינדיגו (ברירת מחדל)', primary: '245 70% 58%', accent: '245 70% 95%' },
  { id: 'blue', label: 'כחול', primary: '217 91% 60%', accent: '217 91% 95%' },
  { id: 'emerald', label: 'ירוק', primary: '152 76% 40%', accent: '152 76% 95%' },
  { id: 'rose', label: 'ורוד', primary: '347 77% 50%', accent: '347 77% 95%' },
  { id: 'orange', label: 'כתום', primary: '25 95% 53%', accent: '25 95% 95%' },
  { id: 'purple', label: 'סגול', primary: '270 70% 58%', accent: '270 70% 95%' },
];

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch { return {}; }
}

function applyPalette(paletteId) {
  const palette = COLOR_PALETTES.find(p => p.id === paletteId);
  if (!palette) return;
  document.documentElement.style.setProperty('--primary', palette.primary);
  document.documentElement.style.setProperty('--accent', palette.accent);
  document.documentElement.style.setProperty('--ring', palette.primary);
}

export default function SettingsPage() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [settings, setSettings] = useState({
    color_palette: 'indigo',
    theme: 'light',
    default_rows: 5,
    default_cols: 6,
    show_numbers_default: false,
    show_seat_conflicts: true,
    compact_mode: false,
    ...loadSettings(),
  });

  useEffect(() => {
    applyPalette(settings.color_palette);
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'color_palette') applyPalette(value);
    if (key === 'theme') {
      if (value === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Apply default rows/cols to arrangement storage
    const arr = (() => { try { return JSON.parse(localStorage.getItem('classmanager_arrangement') || '{}'); } catch { return {}; } })();
    toast.success('ההגדרות נשמרו בהצלחה');
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6" dir="rtl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">הגדרות</h1>
          <p className="text-muted-foreground text-sm mt-1">התאמה אישית של הממשק וניהול הכיתה</p>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4" /> מראה וצבעים
              </CardTitle>
              <CardDescription>התאם את צבעי הממשק לפי העדפתך</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">ערכת נושא</Label>
                <div className="flex gap-2">
                  {[{ id: 'light', label: '☀️ בהיר' }, { id: 'dark', label: '🌙 כהה' }].map(t => (
                    <button
                      key={t.id}
                      onClick={() => update('theme', t.id)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                        settings.theme === t.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm mb-2 block">פלטת צבעים</Label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PALETTES.map(palette => (
                    <button
                      key={palette.id}
                      onClick={() => update('color_palette', palette.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-colors ${
                        settings.color_palette === palette.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ background: `hsl(${palette.primary})` }}
                      />
                      {palette.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" /> פורמט תצוגה
              </CardTitle>
              <CardDescription>הגדר את אופן הצגת הכיתה</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">מצב קומפקטי</Label>
                  <p className="text-xs text-muted-foreground">מושבים קטנים יותר, יותר תוכן במסך</p>
                </div>
                <Switch
                  checked={settings.compact_mode}
                  onCheckedChange={v => update('compact_mode', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">הצג מספרי מושבים כברירת מחדל</Label>
                  <p className="text-xs text-muted-foreground">מספור אוטומטי עם פתיחת הכיתה</p>
                </div>
                <Switch
                  checked={settings.show_numbers_default}
                  onCheckedChange={v => update('show_numbers_default', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">הדגשת קונפליקטים</Label>
                  <p className="text-xs text-muted-foreground">הצג מושבים עם בעיות אילוצים בצבע אדום</p>
                </div>
                <Switch
                  checked={settings.show_seat_conflicts}
                  onCheckedChange={v => update('show_seat_conflicts', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Classroom defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" /> הגדרות ברירת מחדל לכיתה
              </CardTitle>
              <CardDescription>הגדרות שיחולו על כל סידור ישיבה חדש</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm mb-1 block">מספר שורות ברירת מחדל</Label>
                  <Input
                    type="number"
                    min={1} max={15}
                    value={settings.default_rows}
                    onChange={e => update('default_rows', parseInt(e.target.value) || 5)}
                  />
                </div>
                <div>
                  <Label className="text-sm mb-1 block">מספר טורים ברירת מחדל</Label>
                  <Input
                    type="number"
                    min={1} max={15}
                    value={settings.default_cols}
                    onChange={e => update('default_cols', parseInt(e.target.value) || 6)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={saveSettings}>
            <Save className="w-4 h-4 ml-1" /> שמור הגדרות
          </Button>

          {/* Danger Zone */}
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" /> אזור מסוכן
              </CardTitle>
              <CardDescription>פעולות בלתי הפיכות</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 ml-1" /> מחק חשבון
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-destructive">מחיקת חשבון</DialogTitle>
            <DialogDescription>
              פעולה זו בלתי הפיכה. כל הנתונים שלך, כולל תלמידים וסידורי ישיבה, יימחקו לצמיתות.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                localStorage.clear();
                toast.success('החשבון נמחק. להתראות!');
                setShowDeleteDialog(false);
              }}
            >
              <Trash2 className="w-4 h-4 ml-1" /> אישור מחיקה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}