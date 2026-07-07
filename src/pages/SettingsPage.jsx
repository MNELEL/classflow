import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Palette, LayoutGrid, Settings, Save, Trash2, Plus, Tag, Brush } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import BrandingPanel from '@/components/settings/BrandingPanel';

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
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => base44.entities.LessonCategory.list() });
  const [newCat, setNewCat] = useState({ name: '', description: '', icon: '', color_tag: '' });

  const addCat = useMutation({
    mutationFn: (d) => base44.entities.LessonCategory.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setNewCat({ name: '', description: '', icon: '', color_tag: '' }); toast.success('קטגוריה נוספה'); },
  });
  const delCat = useMutation({
    mutationFn: (id) => base44.entities.LessonCategory.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
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
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brush className="w-4 h-4" /> מיתוג אישי
              </CardTitle>
              <CardDescription>שנה לוגו, שמות תפריטים וכותרות בכל המערכת</CardDescription>
            </CardHeader>
            <CardContent>
              <BrandingPanel />
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Tag className="w-4 h-4" /> קטגוריות לימוד</CardTitle>
              <CardDescription>ניהול קטגוריות לחומרי לימוד ומבחנים</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1.5">
                    {c.icon && <span>{c.icon}</span>}
                    <span className="text-sm font-medium">{c.name}</span>
                    <button onClick={() => delCat.mutate(c.id)} className="text-destructive/40 hover:text-destructive mr-1"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="אייקון (אמוג'י)" value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))} className="w-20 text-center" />
                <Input placeholder="שם קטגוריה..." value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} className="flex-1" />
                <Button size="icon" onClick={() => newCat.name && addCat.mutate(newCat)} disabled={!newCat.name}><Plus className="w-4 h-4" /></Button>
              </div>
              <Input placeholder="תיאור פדגוגי (אופציונלי)" value={newCat.description} onChange={e => setNewCat(p => ({ ...p, description: e.target.value }))} />
            </CardContent>
          </Card>

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
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" /> אזור מסוכן
              </CardTitle>
              <CardDescription>מחיקת החשבון תמחק לצמיתות את פרופיל המורה ואת כל שיוכי הכיתות, התלמידים, הציונים והחומרים שהועלו. פעולה זו בלתי הפיכה.</CardDescription>
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

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeleteConfirmText(''); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">מחיקת חשבון - פעולה בלתי הפיכה</AlertDialogTitle>
            <AlertDialogDescription>
              כל הנתונים שלך יימחקו ולא ניתן לשחזרם לצמיתות: כיתות, רשומות תלמידים, ציונים, ספרייה, מטלות, חומרים שהועלו ועוד. פעולה זו בלתי הפיכה. האם אתה בטוח?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-sm mb-2 block">הקלד <strong>מחק</strong> או <strong>DELETE</strong> לאישור:</Label>
            <Input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="מחק"
              className="text-base h-11"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:gap-0">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={!['מחק', 'DELETE'].includes(deleteConfirmText.trim()) || isDeleting}
              onClick={async (e) => {
                 e.preventDefault();
                 setIsDeleting(true);
                 try {
                   await base44.auth.deleteMe();
                   localStorage.clear();
                   toast.success('החשבון נמחק בהצלחה. מתנתק...');
                   setTimeout(() => base44.auth.logout('/register'), 1500);
                 } catch (err) {
                   toast.error('שגיאה במחיקת החשבון');
                   setIsDeleting(false);
                 }
               }}
            >
              {isDeleting ? 'מוחק...' : <><Trash2 className="w-4 h-4 ml-1" /> מחק חשבון לצמיתות</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}