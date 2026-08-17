import React from 'react';
import { cn } from '@/lib/utils';

export default function SubjectFilter({ subjects, value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1" dir="rtl">
      <button
        onClick={() => onChange('all')}
        className={cn(
          'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors min-h-[36px]',
          value === 'all'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card border-border text-muted-foreground hover:bg-muted'
        )}
      >
        הכל
      </button>
      {subjects.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            'shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors min-h-[36px]',
            value === s
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-muted-foreground hover:bg-muted'
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}