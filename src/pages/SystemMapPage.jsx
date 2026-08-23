import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Map as MapIcon, Search, FileDown, Loader2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { MAP_SECTIONS } from '@/lib/systemMap';

export default function SystemMapPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [exporting, setExporting] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MAP_SECTIONS.map((s) => ({
      ...s,
      items: s.items.filter(
        (it) =>
          (!it.adminOnly || isAdmin) &&
          (category === 'all' || category === s.title) &&
          (q === '' ||
            it.label.toLowerCase().includes(q) ||
            it.sub.toLowerCase().includes(q)),
      ),
    })).filter((s) => s.items.length > 0);
  }, [query, category, isAdmin]);

  const resultCount = visible.reduce((a, s) => a + s.items.length, 0);

  async function handleExport() {
    setExporting(true);
    try {
      const { exportSystemMapPdf } = await import('@/lib/systemMapExport');
      await exportSystemMapPdf(visible, {});
    } catch {
      toast.error('הפקת המסמך נכשלה. נסה שוב.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppLayout>
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MapIcon className="w-6 h-6 text-primary" aria-hidden="true" /> מפת המערכת
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            כל מה שיש במערכת, בעברית ובלחיצה אחת.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש לפי שם או תיאור — למשל: תעודות, נוכחות, מבחן"
                aria-label="חיפוש במפת המערכת"
                className="pr-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-56" aria-label="סינון לפי קטגוריה">
                <SelectValue placeholder="כל הקטגוריות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {MAP_SECTIONS.map((s) => (
                  <SelectItem key={s.title} value={s.title}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{resultCount} מסכים מוצגים</p>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || resultCount === 0}>
              {exporting
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <FileDown className="h-4 w-4" aria-hidden="true" />}
              ייצוא המפה ל-PDF
            </Button>
          </div>
        </div>

        {resultCount === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground border rounded-2xl bg-card">
            לא נמצא מסך שמתאים לחיפוש. נסה מילה אחרת או בחר "כל הקטגוריות".
          </div>
        )}

        {visible.map((section) => (
          <div key={section.title} className="border rounded-2xl bg-card overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/40 border-b">
              <p className="text-sm font-bold">{section.title}</p>
            </div>
            <div className="divide-y">
              {section.items.map((it) => (
                <button
                  key={`${section.title}-${it.path}`}
                  onClick={() => navigate(it.path)}
                  className="w-full flex items-start justify-between gap-2 px-4 py-3 text-right hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{it.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{it.sub}</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
