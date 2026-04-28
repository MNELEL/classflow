import React from 'react';
import { cn } from '@/lib/utils';

const ROW_FILTERS = [
  { value: 'all', label: 'הכל' },
  { value: 'front', label: '⬆️ קדימה' },
  { value: 'middle', label: '↔️ אמצע' },
  { value: 'back', label: '⬇️ אחורה' },
  { value: 'left', label: '◀️ שמאל' },
  { value: 'right', label: '▶️ ימין' },
];

export default function StudentPanelFilters({ activeFilter, onFilterChange }) {
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {ROW_FILTERS.map(f => (
        <button
          key={f.value}
          onClick={() => onFilterChange(f.value === activeFilter ? 'all' : f.value)}
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded border transition-colors',
            activeFilter === f.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border hover:border-primary/40 text-muted-foreground'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}