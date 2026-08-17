import { toHebrewDate, toHebrewFull } from './hebrewDate';

const WEEKDAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/**
 * Default Hebrew date for a record — "day month year" in the Hebrew calendar.
 * Falls back to a Gregorian he-IL string if the date can't be converted.
 */
export function formatDate(date) {
  if (!date) return '';
  const h = toHebrewDate(date);
  if (h) return h;
  try { return new Date(date).toLocaleDateString('he-IL'); } catch { return ''; }
}

/**
 * Long Hebrew date with weekday — "יום שני, י׳ אלול תשפ״ו".
 */
export function formatDateLong(date) {
  if (!date) return '';
  const h = toHebrewFull(date);
  if (!h) return formatDate(date);
  const d = new Date(date);
  return `יום ${WEEKDAY[d.getDay()]}, ${h}`;
}