import { toHebrewDate, toHebrewFull } from './hebrewDate';

const WEEKDAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/** Default Hebrew date (day month). */
export function formatDate(date) {
  if (!date) return '';
  const h = toHebrewDate(date);
  if (h) return h;
  try { return new Date(date).toLocaleDateString('he-IL'); } catch { return ''; }
}

/** Long Hebrew date with weekday — "יום שני, י׳ אלול תשפ״ו". */
export function formatDateLong(date) {
  if (!date) return '';
  const h = toHebrewFull(date);
  if (!h) return formatDate(date);
  const d = new Date(date);
  return `יום ${WEEKDAY[d.getDay()]}, ${h}`;
}

/** Full Hebrew date (day month year). */
export function formatDateFull(date) {
  if (!date) return '';
  const h = toHebrewFull(date);
  return h || formatDate(date);
}

/** Hebrew date alongside the Gregorian — "י׳ אלול תשפ״ו (17.8.2026)". */
export function formatDateBoth(date) {
  if (!date) return '';
  const h = toHebrewFull(date);
  let g = '';
  try { g = new Date(date).toLocaleDateString('he-IL'); } catch { g = ''; }
  if (h && g) return `${h} (${g})`;
  return h || g || '';
}