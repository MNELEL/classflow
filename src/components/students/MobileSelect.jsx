import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

/**
 * On mobile (touch): renders a bottom-sheet drawer for selection.
 * On desktop: falls back to the standard Select component.
 */
export default function MobileSelect({ value, onValueChange, placeholder, options, label, triggerClassName }) {
  const [open, setOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;

  const current = options.find(o => o.value === value);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn('mt-1', triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'mt-1 flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm text-right',
          !current && 'text-muted-foreground',
          triggerClassName
        )}
      >
        <span className="flex-1 text-right truncate">{current?.label ?? placeholder ?? 'בחר...'}</span>
        <svg className="w-4 h-4 opacity-50 mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent dir="rtl">
          {label && (
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-right text-base">{label}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className="flex flex-col pb-[env(safe-area-inset-bottom,16px)] px-4 pb-6 gap-1">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onValueChange(o.value); setOpen(false); }}
                className={cn(
                  'flex items-center justify-between w-full rounded-xl px-4 py-3.5 text-sm text-right transition-colors',
                  value === o.value
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-muted active:bg-muted'
                )}
              >
                <span>{o.label}</span>
                {value === o.value && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}