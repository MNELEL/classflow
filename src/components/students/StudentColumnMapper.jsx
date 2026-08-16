import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

// Target field options the user can map a file column to.
// k:<field>  → known Student entity field
// c:<key>    → custom_fields key (id_number, birth_date, parent_phone, ...)
// keep       → keep as custom_fields under the original column name
export const TARGETS = [
  { value: 'ignore', label: '— התעלם —', group: 'כללי' },
  { value: 'keep', label: 'שמור כשדה מותאם (שם מקורי)', group: 'כללי' },
  { value: 'k:name', label: 'שם מלא', group: 'שדות מערכת' },
  { value: 'k:gender', label: 'מגדר', group: 'שדות מערכת' },
  { value: 'k:height', label: 'גובה', group: 'שדות מערכת' },
  { value: 'k:row_preference', label: 'העדפת שורה', group: 'שדות מערכת' },
  { value: 'k:side_preference', label: 'העדפת צד', group: 'שדות מערכת' },
  { value: 'k:special_needs', label: 'צרכים מיוחדים', group: 'שדות מערכת' },
  { value: 'k:learning_group', label: 'קבוצת לימוד', group: 'שדות מערכת' },
  { value: 'k:academic_level', label: 'רמה אקדמית', group: 'שדות מערכת' },
  { value: 'k:group', label: 'קבוצה', group: 'שדות מערכת' },
  { value: 'k:notes', label: 'הערות', group: 'שדות מערכת' },
  { value: 'c:id_number', label: 'תעודת זהות', group: 'שדות מותאמים' },
  { value: 'c:birth_date', label: 'תאריך לידה', group: 'שדות מותאמים' },
  { value: 'c:parent_phone', label: 'טלפון הורה', group: 'שדות מותאמים' },
  { value: 'c:address', label: 'כתובת', group: 'שדות מותאמים' },
  { value: 'c:email', label: 'אימייל', group: 'שדות מותאמים' },
];

const ENUMS = {
  gender: ['male', 'female', 'other'],
  height: ['short', 'medium', 'tall'],
  row_preference: ['front', 'middle', 'back', 'none'],
  side_preference: ['left', 'right', 'center', 'none'],
  academic_level: ['weak', 'below_average', 'average', 'above_average', 'strong', 'excellent'],
};

export function defaultTargetFor(col) {
  if (col.isCustom) return 'keep';
  const k = col.key;
  if (k === 'name') return 'k:name';
  if (['gender', 'height', 'row_preference', 'side_preference', 'special_needs',
       'learning_group', 'academic_level', 'group', 'notes'].includes(k)) return 'k:' + k;
  return 'keep';
}

// Apply the user's column mapping to the extracted raw rows → final entity fields.
export function applyMapping(rawRows, sourceColumns, mapping) {
  return rawRows.map(row => {
    const entity = { is_active: true };
    const custom = {};
    const nameParts = [];
    for (const sc of sourceColumns) {
      const target = mapping[sc.key] ?? defaultTargetFor(sc);
      if (!target || target === 'ignore') continue;
      const val = sc.isCustom ? (row.custom_fields?.[sc.key]) : row[sc.key];
      if (val === '' || val == null) continue;
      if (target === 'keep') { custom[sc.key] = String(val); continue; }
      if (target === 'k:name') { nameParts.push(String(val)); continue; }
      if (target.startsWith('k:')) {
        const field = target.slice(2);
        if (field === 'special_needs') {
          const arr = Array.isArray(val) ? val : String(val).split(/[,;]/).map(s => s.trim()).filter(Boolean);
          if (arr.length) entity.special_needs = arr;
          continue;
        }
        if (ENUMS[field] && !ENUMS[field].includes(val)) continue; // skip invalid enum value
        entity[field] = val;
        continue;
      }
      if (target.startsWith('c:')) { custom[target.slice(2)] = String(val); continue; }
    }
    const name = nameParts.join(' ').trim() || (row.name || '').toString().trim();
    if (!name) return null;
    entity.name = name;
    if (Object.keys(custom).length) entity.custom_fields = custom;
    return entity;
  }).filter(Boolean);
}

export default function StudentColumnMapper({ sourceColumns, mapping, onMappingChange }) {
  const groups = {};
  TARGETS.forEach(t => { (groups[t.group] = groups[t.group] || []).push(t); });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <ArrowLeftRight className="w-3.5 h-3.5" />
        לכל עמודה בקובץ, בחר/י לאיזה שדה במערכת היא תוכנס.
      </div>
      {sourceColumns.map(col => (
        <div key={col.key + (col.isCustom ? '|c' : '|k')} className="flex items-center gap-2 bg-card border border-border/60 rounded-lg px-2.5 py-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{col.key}</div>
            {col.sample ? <div className="text-[11px] text-muted-foreground truncate">דוגמה: {col.sample}</div> : null}
          </div>
          <select
            value={mapping[col.key] ?? defaultTargetFor(col)}
            onChange={e => onMappingChange(col.key, e.target.value)}
            className="text-xs rounded-md border border-input bg-background px-2 py-1.5 max-w-[45%] shrink-0 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Object.entries(groups).map(([gName, opts]) => (
              <optgroup key={gName} label={gName}>
                {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}