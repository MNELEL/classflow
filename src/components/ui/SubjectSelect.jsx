import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable subject filter dropdown. Options: "הכל" + the distinct subjects
 * passed in (derived by the parent from whatever data that page already loads).
 * Local-only: parent owns the state, this is a controlled presentational select.
 */
export default function SubjectSelect({ value, onChange, subjects, className, ariaLabel }) {
  const list = (subjects || []).filter(Boolean);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel || 'סינון לפי מקצוע'}
      className={cn(
        'h-9 rounded-md border border-input bg-transparent px-2 text-sm whitespace-nowrap',
        className
      )}
    >
      <option value="all">מקצוע: הכל</option>
      {list.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}