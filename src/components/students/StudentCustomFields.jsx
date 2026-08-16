import React from 'react';
import { Cake, Phone, Hash, Mail, MapPin, IdCard } from 'lucide-react';

// Known custom field keys → friendly label + icon
const KNOWN = {
  birth_date: { icon: Cake, label: 'יום הולדת', color: 'text-pink-600 dark:text-pink-400' },
  parent_phone: { icon: Phone, label: 'טלפון הורה', color: 'text-emerald-600 dark:text-emerald-400' },
  id_number: { icon: Hash, label: 'ת"ז', color: 'text-indigo-600 dark:text-indigo-400' },
  email: { icon: Mail, label: 'אימייל', color: 'text-blue-600 dark:text-blue-400' },
  address: { icon: MapPin, label: 'כתובת', color: 'text-amber-600 dark:text-amber-400' },
};

// Friendly Hebrew label for any custom field key (for the AI assistant / generic display)
export const CUSTOM_FIELD_LABELS = {
  birth_date: 'יום הולדת',
  parent_phone: 'טלפון הורים',
  id_number: 'תעודת זהות',
  email: 'אימייל',
  address: 'כתובת',
};

export default function StudentCustomFields({ student, max = 4 }) {
  const cf = student?.custom_fields;
  if (!cf || typeof cf !== 'object') return null;
  const keys = Object.keys(cf).filter(k => cf[k] != null && String(cf[k]).trim() !== '');
  if (!keys.length) return null;
  const shown = keys.slice(0, max);

  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      {shown.map(k => {
        const meta = KNOWN[k];
        const Icon = meta?.icon || IdCard;
        const val = String(cf[k]).trim();
        return (
          <span key={k} className={`inline-flex items-center gap-1 text-[10px] font-medium bg-muted/50 rounded-full px-1.5 py-0.5 ${meta?.color || 'text-muted-foreground'}`} title={meta ? meta.label : k}>
            <Icon className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate max-w-[120px]">{val}</span>
          </span>
        );
      })}
      {keys.length > max && (
        <span className="text-[10px] text-muted-foreground">+{keys.length - max}</span>
      )}
    </div>
  );
}