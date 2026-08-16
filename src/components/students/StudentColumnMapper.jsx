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

// Hebrew → enum value normalization
const ENUM_NORMALIZE = {
  gender: { 'זכר': 'male', 'ז': 'male', 'בן': 'male', 'male': 'male', 'm': 'male', 'נקבה': 'female', 'נ': 'female', 'בת': 'female', 'female': 'female', 'f': 'female', 'אחר': 'other', 'other': 'other' },
  height: { 'נמוך': 'short', 'short': 'short', 'בינוני': 'medium', 'medium': 'medium', 'גבוה': 'tall', 'tall': 'tall' },
  row_preference: { 'קדמי': 'front', 'קדימה': 'front', 'front': 'front', 'אמצע': 'middle', 'middle': 'middle', 'אחורי': 'back', 'אחורה': 'back', 'back': 'back', 'none': 'none' },
  side_preference: { 'ימין': 'right', 'right': 'right', 'שמאל': 'left', 'left': 'left', 'מרכז': 'center', 'center': 'center', 'none': 'none' },
  academic_level: { 'חלש': 'weak', 'weak': 'weak', 'מתחת לממוצע': 'below_average', 'below_average': 'below_average', 'ממוצע': 'average', 'average': 'average', 'מעל ממוצע': 'above_average', 'above_average': 'above_average', 'חזק': 'strong', 'strong': 'strong', 'מצטיין': 'excellent', 'excellent': 'excellent' },
};

function normEnum(field, val) {
  const map = ENUM_NORMALIZE[field];
  if (!map) return val;
  const v = String(val).trim();
  return map[v] || map[v.toLowerCase()] || v;
}

// Auto-guess a target from the original column header (Hebrew + English keywords).
export function guessTarget(key) {
  const he = (key || '').trim();
  const lo = he.toLowerCase();
  if (/שם|name|פרטי|משפחה|first|last|surname|full name/.test(he + ' ' + lo)) return 'k:name';
  if (/תעודת זהות|ת\.ז|ת"ז|תז|id|identity|identity number/.test(he + ' ' + lo)) return 'c:id_number';
  if (/תאריך לידה|לידה|birth|date of birth|dob/.test(he + ' ' + lo)) return 'c:birth_date';
  if (/טלפון|פלאפון|נייד|phone|mobile|tel/.test(he + ' ' + lo)) return 'c:parent_phone';
  if (/כתובת|address/.test(he + ' ' + lo)) return 'c:address';
  if (/אימייל|מייל|email|mail/.test(he + ' ' + lo)) return 'c:email';
  if (/מגדר|מין|gender|sex/.test(he + ' ' + lo)) return 'k:gender';
  if (/גובה|height/.test(he + ' ' + lo)) return 'k:height';
  if (/שורה|row/.test(he + ' ' + lo)) return 'k:row_preference';
  if (/צד|side/.test(he + ' ' + lo)) return 'k:side_preference';
  if (/צרכים מיוחדים|צרכים|special|needs/.test(he + ' ' + lo)) return 'k:special_needs';
  if (/קבוצת לימוד|learning group|קבוצת/.test(he + ' ' + lo)) return 'k:learning_group';
  if (/רמה|level|אקדמי/.test(he + ' ' + lo)) return 'k:academic_level';
  if (/הערות|הערה|notes|note|comment/.test(he + ' ' + lo)) return 'k:notes';
  return 'keep';
}

// Apply the user's column mapping to the raw extracted rows → final entity fields.
export function applyMapping(rawRows, columns, mapping) {
  return rawRows.map(row => {
    const entity = { is_active: true };
    const custom = {};
    const nameParts = [];
    for (const col of columns) {
      const target = mapping[col.key] ?? guessTarget(col.key);
      if (!target || target === 'ignore') continue;
      const raw = row[col.key];
      if (raw === '' || raw == null) continue;
      const val = String(raw).trim();
      if (!val) continue;
      if (target === 'keep') { custom[col.key] = val; continue; }
      if (target === 'k:name') { nameParts.push(val); continue; }
      if (target.startsWith('k:')) {
        const field = target.slice(2);
        if (field === 'special_needs') {
          const arr = val.split(/[,;]/).map(s => s.trim()).filter(Boolean);
          if (arr.length) entity.special_needs = arr;
          continue;
        }
        const norm = normEnum(field, val);
        if (ENUMS[field] && !ENUMS[field].includes(norm)) continue;
        entity[field] = norm;
        continue;
      }
      if (target.startsWith('c:')) { custom[target.slice(2)] = val; continue; }
    }
    const name = nameParts.join(' ').trim();
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
        לכל עמודה בקובץ, בחר/י לאיזה שדה במערכת היא תוכנס. המערכת כבר ניחשה לפי שם העמודה — ניתן לשנות.
      </div>
      {sourceColumns.map(col => (
        <div key={col.key} className="flex items-center gap-2 bg-card border border-border/60 rounded-lg px-2.5 py-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{col.key}</div>
            {col.sample ? <div className="text-[11px] text-muted-foreground truncate">דוגמה: {col.sample}</div> : null}
          </div>
          <select
            value={mapping[col.key] ?? guessTarget(col.key)}
            onChange={e => onMappingChange(col.key, e.target.value)}
            className="text-xs rounded-md border border-input bg-background px-2 py-1.5 max-w-[48%] shrink-0 focus:outline-none focus:ring-1 focus:ring-ring"
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