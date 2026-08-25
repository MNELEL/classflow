import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Map as MapIcon, Search, FileDown, Loader2, ChevronLeft, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getMapTree, MAP_SUPER_CATEGORIES } from '@/lib/systemMap';

export default function SystemMapPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [query, setQuery] = useState('');
  const [superCat, setSuperCat] = useState('all');
  const [exporting, setExporting] = useState(false);
  // קבוצות פתוחות: מפת string. ריק = הכל סגור (ברירת מחדל).
  const [openSupers, setOpenSupers] = useState(() => new Set());
  const [openSubs, setOpenSubs] = useState(() => new Set());

  const tree = useMemo(() => getMapTree(isAdmin), [isAdmin]);

  const visibleTree = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searching = q !== '';
    return tree
      .filter((sup) => superCat === 'all' || superCat === sup.title)
      .map((sup) => ({
        ...sup,
        subs: sup.subs
          .map((s) => ({
            ...s,
            items: s.items.filter(
              (it) =>
                q === '' ||
                it.label.toLowerCase().includes(q) ||
                it.sub.toLowerCase().includes(q),
            ),
          }))
          .filter((s) => s.items.length > 0),
      }))
      .filter((sup) => sup.subs.length > 0)
      .map((sup) => ({ ...sup, searching }));
  }, [tree, query, superCat]);

  const resultCount = visibleTree.reduce(
    (a, sup) => a + sup.subs.reduce((b, s) => b + s.items.length, 0),
    0,
  );

  // כשמחפשים — פותחים אוטומטית את כל ההורים של תוצאות החיפוש.
  const effectiveOpenSupers = useMemo(() => {
    const set = new Set(openSupers);
    visibleTree.forEach((sup) => { if (sup.searching) set.add(sup.title); });
    // כשבוחרים קטגוריית-על יחידה בסינון — פותחים אותה אוטומטית.
    if (superCat !== 'all') set.add(superCat);
    return set;
  }, [openSupers, visibleTree, superCat]);

  const effectiveOpenSubs = useMemo(() => {
    const set = new Set(openSubs);
    visibleTree.forEach((sup) => {
      if (sup.searching) {
        sup.subs.forEach((s) => set.add(`${sup.title}::${s.title}`));
      }
    });
    return set;
  }, [openSubs, visibleTree]);

  function toggleSuper(title) {
    setOpenSupers((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }
  function toggleSub(key) {
    setOpenSubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { exportSystemMapPdf } = await import('@/lib/systemMapExport');
      // הייצוא מצפה למערך סקציות שטוח { title, items } — משטחים את התוצאות המוצגות.
      const flat = visibleTree.flatMap((sup) => sup.subs);
      await exportSystemMapPdf(flat, {});
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
            כל מה שיש במערכת, מקובץ לפי נושאים — פותחים מה שרלוונטי.
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
            <Select value={superCat} onValueChange={setSuperCat}>
              <SelectTrigger className="sm:w-56" aria-label="סינון לפי נושא">
                <SelectValue placeholder="כל הנושאים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הנושאים</SelectItem>
                {MAP_SUPER_CATEGORIES.map((s) => (
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
            לא נמצא מסך שמתאים לחיפוש. נסה מילה אחרת או בחר "כל הנושאים".
          </div>
        )}

        {visibleTree.map((sup) => {
          const superOpen = effectiveOpenSupers.has(sup.title);
          const subCount = sup.subs.reduce((a, s) => a + s.items.length, 0);
          return (
            <div key={sup.title} className="border rounded-2xl bg-card overflow-hidden">
              {/* כותרת קטגוריית-על */}
              <button
                onClick={() => toggleSuper(sup.title)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-right hover:bg-accent/50 transition-colors"
                aria-expanded={superOpen}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-bold">{sup.title}</span>
                  <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-1.5 py-0.5">
                    {subCount}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${superOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {/* קטגוריות-משנה */}
              {superOpen && (
                <div className="divide-y border-t">
                  {sup.subs.map((s) => {
                    const key = `${sup.title}::${s.title}`;
                    const subOpen = effectiveOpenSubs.has(key);
                    return (
                      <div key={key}>
                        <button
                          onClick={() => toggleSub(key)}
                          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-right bg-muted/30 hover:bg-muted/50 transition-colors"
                          aria-expanded={subOpen}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-semibold text-muted-foreground">{s.title}</span>
                            <span className="text-[10px] text-muted-foreground/70">{s.items.length}</span>
                          </div>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${subOpen ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                        {subOpen && (
                          <div className="divide-y">
                            {s.items.map((it) => (
                              <button
                                key={`${sup.title}-${s.title}-${it.path}`}
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}