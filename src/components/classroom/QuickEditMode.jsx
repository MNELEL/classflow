import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, EyeOff, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuickEditMode({ active, onToggle, onQuickAction, selectedSeat }) {
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
        <div className="text-[11px] font-medium text-primary bg-primary/10 rounded px-2 py-1">
          נבחר: שורה {selectedSeat.row + 1}, טור {selectedSeat.col + 1}
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
      </div>
    </div>
  );
}