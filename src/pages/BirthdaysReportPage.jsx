import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Cake, Printer } from 'lucide-react';
import { toHebrewDate, toHebrewMonth, hebrewDayNumber } from '@/lib/hebrewDate';

function parseBirth(raw) {
  if (!raw) return null;
  const iso = String(raw).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const dmy = String(raw).match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  if (dmy) { let y = +dmy[3]; if (y < 100) y += 2000; return new Date(y, +dmy[2] - 1, +dmy[1]); }
  const d = new Date(raw);
  return isNaN(d) ? null : d;
}

const MONTH_INDEX = { 'תשרי': 1, 'חשוון': 2, 'מרחשוון': 2, 'חשון': 2, 'כסלו': 3, 'טבת': 4, 'שבט': 5, 'אדר': 6, 'ניסן': 7, 'אייר': 8, 'סיוון': 9, 'סיון': 9, 'תמוז': 10, 'אב': 11, 'אלול': 12 };
function monthIdx(name) { const n = (name || '').replace(/אדר [אב]/, 'אדר').trim(); return MONTH_INDEX[n] || 99; }
function monthKey(name) { return (name || '').replace(/אדר [אב]/, 'אדר'); }

export default function BirthdaysReportPage() {
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: () => base44.entities.Student.list() });

  const rows = useMemo(() => {
    return students.map(s => {
      const raw = s?.custom_fields?.birth_date;
      const d = parseBirth(raw);
      if (!d) return null;
      const monthName = toHebrewMonth(d);
      const day = hebrewDayNumber(d) || 1;
      return { s, monthName, day, display: toHebrewDate(d), idx: monthIdx(monthName) };
    }).filter(Boolean);
  }, [students]);

  const byMonth = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const k = monthKey(r.monthName);
      (map[k] ||= { key: k, idx: r.idx, name: r.monthName, items: [] }).items.push(r);
    });
    return Object.values(map).sort((a, b) => a.idx - b.idx).map(m => {
      m.items.sort((a, b) => a.day - b.day);
      return m;
    });
  }, [rows]);

  const [active, setActive] = useState(null);
  const currentHebrewMonth = useMemo(() => monthKey(toHebrewMonth(new Date())), []);
  const visible = active ? byMonth.filter(m => monthKey(m.name) === active) : byMonth;

  function printReport() {
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return;
    const html = byMonth.map(m => `<h3>${m.name} (${m.items.length})</h3><ol>${m.items.map(r => `<li>${r.s.name} — ${r.display}</li>`).join('')}</ol>`).join('');
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>ימי הולדת לפי חודשים עבריים</title><style>body{font-family:Heebo,sans-serif;padding:24px;color:#111}h2{font-size:18px}h3{margin-top:16px;font-size:15px;border-bottom:1px solid #ddd;padding-bottom:4px}ol{padding-right:22px;font-size:13px;line-height:1.8}</style></head><body><h2>ימי הולדת לפי חודשים עבריים</h2>${html}<script>window.onload=function(){window.print();}</script></body></html>`);
    w.document.close();
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-2">
          <Cake className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">ימי הולדת לפי חודשים עבריים</h1>
            <p className="text-xs text-muted-foreground">{rows.length} תלמידים עם תאריך לידה</p>
          </div>
          <Button variant="outline" size="sm" onClick={printReport}><Printer className="w-4 h-4 ml-1" /> הדפסה</Button>
        </div>

        {byMonth.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setActive(null)} className={!active ? 'px-3 py-1.5 rounded-full text-xs bg-primary text-primary-foreground' : 'px-3 py-1.5 rounded-full text-xs border border-border hover:bg-muted'}>הכל</button>
            {byMonth.map(m => {
              const k = monthKey(m.name);
              const sel = active === k;
              const cur = k === currentHebrewMonth;
              return (
                <button key={k} onClick={() => setActive(sel ? null : k)}
                  className={`${sel ? 'bg-primary text-primary-foreground' : cur ? 'border border-primary text-primary' : 'border border-border text-foreground hover:bg-muted'} px-3 py-1.5 rounded-full text-xs flex items-center gap-1`}>
                  {m.name} <span className="opacity-70">{m.items.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Cake className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">אין תאריכי לידה מוזנים</p>
            <p className="text-xs mt-1">הוסף תאריך לידה בכרטיס התלמיד כדי לראות כאן</p>
          </div>
        ) : visible.map(m => (
          <div key={m.name} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold">{m.name}</h2>
              <span className="text-xs text-muted-foreground">{m.items.length} תלמידים</span>
              {monthKey(m.name) === currentHebrewMonth && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">החודש</span>}
            </div>
            <div className="bg-card border rounded-2xl overflow-hidden">
              {m.items.map((r, i) => (
                <div key={r.s.id} className={`flex items-center justify-between px-3 py-2.5 ${i > 0 ? 'border-t border-border/50' : ''}`}>
                  <span className="text-sm font-medium">{r.s.name}</span>
                  <span className="text-xs text-muted-foreground">{r.display}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}