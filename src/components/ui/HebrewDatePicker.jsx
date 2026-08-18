import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDateBoth } from '@/lib/formatDate';
import { cn } from '@/lib/utils';

/**
 * Single-date picker that displays the selected date in Hebrew + Gregorian
 * (via formatDateBoth) and lets the user pick via a popover Calendar.
 *
 * value / onChange use an ISO date string:
 *  - default (includeTime=false): "yyyy-MM-dd"
 *  - includeTime=true:            "yyyy-MM-ddTHH:mm"  (a separate time input is shown)
 *
 * This keeps the same value format the existing type="date" / type="datetime-local"
 * fields used, so saving to entities is unaffected.
 */
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HebrewDatePicker({
  value,
  onChange,
  className,
  placeholder,
  includeTime = false,
  dir,
  disabled,
}) {
  const [open, setOpen] = useState(false);

  const datePart = value ? String(value).slice(0, 10) : '';
  const timePart = includeTime && value ? String(value).slice(11, 16) || '00:00' : '';

  const selectedDate = datePart ? new Date(datePart + 'T00:00:00') : undefined;
  const validSelected = selectedDate instanceof Date && !isNaN(selectedDate) ? selectedDate : undefined;

  function handleSelect(d) {
    if (!d) { onChange(''); return; }
    const iso = toISODate(d);
    onChange(includeTime ? `${iso}T${timePart || '00:00'}` : iso);
    setOpen(false);
  }

  function handleTimeChange(e) {
    const t = e.target.value || '00:00';
    if (datePart) onChange(`${datePart}T${t}`);
    else onChange(`${new Date().toISOString().slice(0, 10)}T${t}`);
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)} dir={dir}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="flex-1 justify-start text-right font-normal h-9 px-3"
          >
            <CalendarIcon className="w-4 h-4 ml-2 shrink-0" />
            {datePart ? (
              <span className="truncate">{formatDateBoth(datePart)}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder || 'בחר תאריך'}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={validSelected} onSelect={handleSelect} dir="rtl" />
        </PopoverContent>
      </Popover>
      {includeTime && (
        <Input
          type="time"
          value={timePart}
          onChange={handleTimeChange}
          disabled={disabled}
          className="w-28 h-9 shrink-0"
          dir="ltr"
        />
      )}
    </div>
  );
}