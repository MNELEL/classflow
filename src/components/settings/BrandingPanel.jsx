import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Upload, Save, RotateCcw, Building2, Palette, Navigation, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { loadBranding, saveBranding, saveBrandingSync, DEFAULT_BRANDING } from '@/lib/branding';
import { useTheme } from '@/lib/themeContext';
import { THEMES } from '@/lib/themes';
import { cn } from '@/lib/utils';

const NAV_PATHS = [
  { path: '/', defaultLabel: 'דשבורד' },
  { path: '/seating', defaultLabel: 'ישיבה' },
  { path: '/students', defaultLabel: 'תלמידים' },
  { path: '/attendance', defaultLabel: 'נוכחות' },
  { path: '/grades', defaultLabel: 'ציונים' },
  { path: '/library', defaultLabel: 'ספרייה' },
  { path: '/gamification', defaultLabel: 'נקודות' },
  { path: '/toolkit', defaultLabel: 'כלים' },
  { path: '/parents', defaultLabel: 'הורים' },
  { path: '/worksheets', defaultLabel: 'דפ"ע' },
  { path: '/question-bank', defaultLabel: 'עזרים' },
];

export default function BrandingPanel() {
  const [branding, setBranding] = useState(loadBranding);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const { theme, setTheme } = useTheme();

  function update(key, value) {
    setBranding(prev => ({ ...prev, [key]: value }));
  }

  function updateNavLabel(path, value) {
    setBranding(prev => ({
      ...prev,
      nav_labels: { ...prev.nav_labels, [path]: value },
      page_titles: { ...prev.page_titles, [path]: value },
    }));
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setBranding(prev => ({ ...prev, logo_url: file_url }));
    setUploading(false);
    toast.success('הלוגו הועלה בהצלחה!');
  }

  async function handleSave() {
    saveBrandingSync(branding);
    toast.success('הגדרות המיתוג נשמרו וסונכרנו!');
    // Force page reload so AppLayout re-reads branding
    setTimeout(() => window.location.reload(), 300);
  }

  function handleReset() {
    saveBranding(DEFAULT_BRANDING);
    setBranding(DEFAULT_BRANDING);
    toast.success('המיתוג אופס לברירת המחדל');
    setTimeout(() => window.location.reload(), 300);
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* School Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" /> זהות בית הספר
          </CardTitle>
          <CardDescription>שם, לוגו ומידע שיופיעו בכל הדפים והמסמכים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div>
            <Label className="text-sm mb-2 block">לוגו</Label>
            <div className="flex items-center gap-3">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt="לוגו" className="h-14 w-14 object-contain rounded-xl border border-border bg-muted/30" />
              ) : (
                <div className="h-14 w-14 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-muted-foreground text-xs">
                  לוגו
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Button size="sm" variant="outline" onClick={() => fileRef.current.click()} disabled={uploading}>
                  <Upload className="w-3.5 h-3.5 ml-1" />
                  {uploading ? 'מעלה...' : 'העלה לוגו'}
                </Button>
                {branding.logo_url && (
                  <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => update('logo_url', '')}>
                    הסר לוגו
                  </Button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm mb-1 block">שם בית הספר / מוסד</Label>
              <Input
                value={branding.school_name}
                onChange={e => update('school_name', e.target.value)}
                placeholder="ClassManager Pro"
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">שם המורה</Label>
              <Input
                value={branding.teacher_name}
                onChange={e => update('teacher_name', e.target.value)}
                placeholder="שם המורה..."
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">שם הכיתה</Label>
              <Input
                value={branding.class_name}
                onChange={e => update('class_name', e.target.value)}
                placeholder="לדוגמה: ד'2, כיתה ז..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Labels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-4 h-4" /> שמות תפריטים
          </CardTitle>
          <CardDescription>התאם את שמות הדפים בסרגל הניווט</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NAV_PATHS.map(({ path, defaultLabel }) => (
              <div key={path}>
                <Label className="text-xs text-muted-foreground mb-1 block">{defaultLabel}</Label>
                <Input
                  className="h-8 text-sm"
                  value={branding.nav_labels?.[path] || defaultLabel}
                  onChange={e => updateNavLabel(path, e.target.value)}
                  placeholder={defaultLabel}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" /> ערכת נראות
          </CardTitle>
          <CardDescription>בחר ערכת עיצוב — ההגדרה תסונכרן בין מכשירים</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  'relative rounded-xl border-2 p-3 text-right transition-all',
                  theme === t.id
                    ? 'border-primary ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/40'
                )}
              >
                {theme === t.id && (
                  <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <div className="flex gap-1 mb-2">
                  {t.preview.map((color, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 rounded-full border border-border"
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={handleSave}>
          <Save className="w-4 h-4 ml-1" /> שמור מיתוג
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 ml-1" /> אפס
        </Button>
      </div>
    </div>
  );
}