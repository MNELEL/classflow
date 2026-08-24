/**
 * חישוב פרשת השבוע — משתמש ב-@hebcal/core (כבר מותקן בפרויקט).
 * פונקציות טהורות, בטוחות להרצה גם בצד הלקוח.
 */
import { HDate, Locale, getSedra } from '@hebcal/core';

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function isoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** יום ראשון שפותח את השבוע שמכיל את d. */
export function weekStartOf(d) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

/**
 * שם הפרשה שנקראת בשבת של השבוע שמתחיל ב-sunday.
 * בשבת חג מחזיר את שם קריאת החג (למשל "שבת חול המועד פסח").
 */
export function parashaForWeek(sunday) {
  const shabbat = addDays(sunday, 6);
  const hd = new HDate(shabbat);
  try {
    const sedra = getSedra(hd.getFullYear(), true); // true = לוח ישראל
    const res = sedra.lookup(hd);
    const names = res?.parsha ?? [];
    if (!names.length) return null;
    return names.map((n) => Locale.gettext(n, 'he')).join(' – ');
  } catch {
    return null;
  }
}
