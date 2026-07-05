import React, { useState, useRef, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Bava Kamma daf list (2a–119b)
const BK_DAFIM = [];
for (let d = 2; d <= 119; d++) {
  BK_DAFIM.push(`${d}א`);
  BK_DAFIM.push(`${d}ב`);
}

const TRACTATE_SUGGESTIONS = [
  { tractate: 'בבא קמא', sefaria_key: 'Bava_Kamma', dafim: BK_DAFIM },
  { tractate: 'בבא מציעא', sefaria_key: 'Bava_Metzia', dafim: [] },
  { tractate: 'בבא בתרא', sefaria_key: 'Bava_Batra', dafim: [] },
  { tractate: 'סנהדרין', sefaria_key: 'Sanhedrin', dafim: [] },
  { tractate: 'ברכות', sefaria_key: 'Berakhot', dafim: [] },
];

/**
 * Builds a Sefaria URL for a specific daf in Bava Kamma
 */
export function buildSefariaUrl(sefariaKey, daf) {
  // Convert Hebrew daf like "ל.א" → Sefaria format "30a"
  // daf format: "קכוב" / "לאב" — keep as-is and let Sefaria handle
  return `https://www.sefaria.org/${sefariaKey}.${encodeURIComponent(daf)}?lang=bi`;
}

export default function TractateSelector({ value, onChange, onInsertText }) {
  const [open, setOpen] = useState(false);
  const [selectedTractate, setSelectedTractate] = useState(TRACTATE_SUGGESTIONS[0]);
  const [fromDaf, setFromDaf] = useState('');
  const [toDaf, setToDaf] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleInsert() {
    if (!fromDaf) return;
    const text = toDaf
      ? `${selectedTractate.tractate} דף ${fromDaf} עד דף ${toDaf}`
      : `${selectedTractate.tractate} דף ${fromDaf}`;
    onInsertText(text);
    setOpen(false);
    setFromDaf('');
    setToDaf('');
  }

  const dafList = selectedTractate.dafim.length > 0 ? selectedTractate.dafim : BK_DAFIM;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors font-medium flex items-center gap-1.5"
      >
        📖 הוסף דפים מבבא קמא
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 z-50 bg-white border border-border rounded-xl shadow-lg p-3 w-72 space-y-2.5">
          <p className="text-xs font-bold text-amber-800">בחר מסכת ודפים</p>

          {/* Tractate select */}
          <Select
            value={selectedTractate.tractate}
            onValueChange={v => setSelectedTractate(TRACTATE_SUGGESTIONS.find(t => t.tractate === v) || TRACTATE_SUGGESTIONS[0])}
          >
            <SelectTrigger className="w-full text-xs h-9 border border-border rounded-lg bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRACTATE_SUGGESTIONS.map(t => (
                <SelectItem key={t.tractate} value={t.tractate}>{t.tractate}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Daf range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">מדף</label>
              <Select value={fromDaf || '_none'} onValueChange={v => setFromDaf(v === '_none' ? '' : v)}>
                <SelectTrigger className="w-full text-xs h-9 border border-border rounded-lg bg-background"><SelectValue placeholder="בחר..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">בחר...</SelectItem>
                  {dafList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">עד דף (אופציונלי)</label>
              <Select value={toDaf || '_none'} onValueChange={v => setToDaf(v === '_none' ? '' : v)}>
                <SelectTrigger className="w-full text-xs h-9 border border-border rounded-lg bg-background"><SelectValue placeholder="אחד בלבד" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">אחד בלבד</SelectItem>
                  {dafList.filter((_, i) => dafList.indexOf(fromDaf) >= 0 ? i > dafList.indexOf(fromDaf) : true).map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            onClick={handleInsert}
            disabled={!fromDaf}
            className="w-full text-xs bg-amber-600 text-white rounded-lg py-1.5 disabled:opacity-50 hover:bg-amber-700 transition-colors font-medium"
          >
            הכנס לתיבת ההספקים
          </button>
        </div>
      )}
    </div>
  );
}