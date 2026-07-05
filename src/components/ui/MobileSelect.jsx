import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Check, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export { SelectItem } from '@/components/ui/select';

function extractOptions(children) {
  const options = [];
  React.Children.toArray(children).forEach(child => {
    if (child?.props && child.props.value !== undefined && child.props.value !== null) {
      let label = '';
      const childContent = child.props.children;
      if (typeof childContent === 'string') {
        label = childContent;
      } else if (Array.isArray(childContent)) {
        label = childContent.map(c => typeof c === 'string' ? c : '').join('').trim();
      }
      options.push({ value: String(child.props.value), label: label || String(child.props.value), raw: child.props.value });
    }
  });
  return options;
}

export function MobileSelect({ value, onValueChange, placeholder, disabled, children, className, title }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  const options = useMemo(() => extractOptions(children), [children]);
  const currentValue = value !== null && value !== undefined ? String(value) : '';
  const current = options.find(o => o.value === currentValue);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    );
  }

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm text-right disabled:cursor-not-allowed disabled:opacity-50',
          !current && 'text-muted-foreground',
          className
        )}
      >
        <span className="flex-1 text-right truncate">{current?.label ?? placeholder ?? 'בחר...'}</span>
        <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
      </button>

      <Drawer open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
        <DrawerContent dir="rtl">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-right text-base">{title || placeholder || 'בחירה'}</DrawerTitle>
          </DrawerHeader>
          {options.length > 6 && (
            <div className="px-4 pb-2 relative">
              <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חיפוש..."
                className="h-9 text-sm pr-8"
              />
            </div>
          )}
          <div className="flex flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] gap-1 max-h-[50vh] overflow-y-auto">
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onValueChange(o.raw); setOpen(false); setSearch(''); }}
                className={cn(
                  'flex items-center justify-between w-full rounded-xl px-4 py-3.5 text-sm text-right transition-colors',
                  currentValue === o.value
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-muted active:bg-muted'
                )}
              >
                <span>{o.label}</span>
                {currentValue === o.value && <Check className="w-4 h-4 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">אין תוצאות</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default MobileSelect;