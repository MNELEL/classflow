import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Unlock, EyeOff, Minus, X, Ban, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const BLOCK_REASONS = [
  { value: 'broken', label: '🪑 כיסא תקול' },
  { value: 'speaker', label: '🔊 ליד רמקול' },
  { value: 'ac', label: '❄️ ליד מזגן' },
  { value: 'door', label: '🚪 ליד דלת' },
  { value: 'other', label: '⚠️ סיבה אחרת' },
];

export default function QuickEditMode({ active, onToggle, onQuickAction, selectedSeat, students = [] }) {
  const [showBlockReasons, setShowBlockReasons] = useState(false);
  const [fixedSeatInput, setFixedSeatInput] = useState('');

  if (!active) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={onToggle}>
        ✏️ מצב עריכה מהירה
      </Button>
    );
  }

  return (
    <div className="bg-primary/5 border border-primary/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-primary">מצב עריכה מהירה</span>
        <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">לחץ על מושב ולאחר מכן בחר פעולה:</p>

      {selectedSeat && (
        <div className="text-[11px] font-medium text-primary bg-primary/10 rounded px-2 py-1 space-y-0.5">
          <div>נבחר: שורה {selectedSeat.row + 1}, טור {selectedSeat.col + 1}</div>
          {selectedSeat.student_id && (() => {
            const s = students.find(x => x.id === selectedSeat.student_id);
            return s ? <div className="text-muted-foreground">תלמיד: {s.name}</div> : null;
          })()}
          {selectedSeat.is_locked && <div className="text-yellow-600">🔒 מושב נעול</div>}
          {selectedSeat.fixed_seat_number && <div className="text-blue-600">📌 מושב קבוע #{selectedSeat.fixed_seat_number}</div>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          disabled={!selectedSeat}
          onClick={() => onQuickAction('lock')}
        >
          {selectedSeat?.is_locked ? <Unlock className="w-3 h-3 ml-1" /> : <Lock className="w-3 h-3 ml-1" />}
          {selectedSeat?.is_locked ? 'שחרר' : 'נעל'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          disabled={!selectedSeat}
          onClick={() => onQuickAction('hide')}
        >
          <EyeOff className="w-3 h-3 ml-1" />
          {selectedSeat?.is_hidden ? 'הצג' : 'הסתר'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8 col-span-2"
          disabled={!selectedSeat}
          onClick={() => onQuickAction('gap')}
        >
          <Minus className="w-3 h-3 ml-1" />
          {selectedSeat?.is_gap ? 'בטל גאפ' : 'הפוך לגאפ'}
        </Button>

        {/* Fixed seat number */}
        <div className="col-span-2 space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-500" /> מושב קבוע לתלמיד (נעול לסידור אוטומטי)
          </p>
          <div className="flex gap-1">
            <Input
              type="number"
              min="1"
              placeholder="מס׳ מושב..."
              value={fixedSeatInput || (selectedSeat?.fixed_seat_number ?? '')}
              onChange={e => setFixedSeatInput(e.target.value)}
              className="h-7 text-xs flex-1"
              disabled={!selectedSeat}
            />
            <Button size="sm" className="h-7 text-xs px-2" disabled={!selectedSeat}
              onClick={() => { onQuickAction('fixSeat', fixedSeatInput ? Number(fixedSeatInput) : null); setFixedSeatInput(''); }}>
              📌 קבע
            </Button>
            {selectedSeat?.fixed_seat_number && (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-destructive" disabled={!selectedSeat}
                onClick={() => { onQuickAction('fixSeat', null); setFixedSeatInput(''); }}>
                ✕
              </Button>
            )}
          </div>
          {selectedSeat?.fixed_seat_number && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" disabled={!selectedSeat}
                onClick={() => onQuickAction('lockFixed')}>
                {selectedSeat?.is_locked ? <Unlock className="w-3 h-3 ml-1" /> : <Lock className="w-3 h-3 ml-1" />}
                {selectedSeat?.is_locked ? 'שחרר נעילה' : 'נעל מושב קבוע'}
              </Button>
            </div>
          )}
        </div>

        {/* Block / Unblock */}
        {selectedSeat?.is_blocked ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 col-span-2 border-orange-300 text-orange-600 hover:bg-orange-50"
            disabled={!selectedSeat}
            onClick={() => { onQuickAction('block', null); setShowBlockReasons(false); }}
          >
            <Ban className="w-3 h-3 ml-1" /> בטל חסימה
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 col-span-2 border-orange-300 text-orange-600 hover:bg-orange-50"
              disabled={!selectedSeat}
              onClick={() => setShowBlockReasons(v => !v)}
            >
              <Ban className="w-3 h-3 ml-1" /> חסום מושב
            </Button>
            {showBlockReasons && (
              <div className="col-span-2 space-y-1">
                {BLOCK_REASONS.map(r => (
                  <button
                    key={r.value}
                    className="w-full text-right text-xs px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-colors"
                    onClick={() => { onQuickAction('block', r.value); setShowBlockReasons(false); }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}