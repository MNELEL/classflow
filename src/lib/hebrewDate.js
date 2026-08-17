/**
 * Hebrew Calendar utilities — uses Intl.DateTimeFormat with u-ca-hebrew for
 * month names and numeric day/year, then renders day and year as Gematria
 * (Hebrew letters with geresh/gershayim) independently of the `nu-hebr`
 * numbering system, which is not reliably supported across runtimes.
 */

const GEM_UNITS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const GEM_TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const GEM_HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת'];

/** Convert a positive integer to Hebrew Gematria with geresh/gershayim. */
export function numToGematria(num) {
  if (!num || num <= 0) return '';
  // Years drop the thousands (5786 → 786 → תשפ״ו)
  let n = num % 1000;
  let result = '';
  while (n >= 400) { result += 'ת'; n -= 400; }
  if (n >= 100) { result += GEM_HUNDREDS[Math.floor(n / 100)]; n %= 100; }
  if (n === 15) { result += 'טו'; }
  else if (n === 16) { result += 'טז'; }
  else {
    if (n >= 10) { result += GEM_TENS[Math.floor(n / 10)]; n %= 10; }
    if (n > 0) { result += GEM_UNITS[n]; }
  }
  if (!result) return '';
  if (result.length === 1) return result + '׳';        // geresh  (א׳)
  return result.slice(0, -1) + '״' + result.slice(-1);  // gershayim (י״ז)
}

function hebrewDayNum(date) {
  try {
    const s = new Intl.DateTimeFormat('en-US-u-ca-hebrew', { day: 'numeric' }).format(new Date(date));
    return parseInt(s, 10);
  } catch {
    return 0;
  }
}

function hebrewYearNum(date) {
  try {
    const s = new Intl.DateTimeFormat('en-US-u-ca-hebrew', { year: 'numeric' }).format(new Date(date));
    return parseInt(s, 10);
  } catch {
    return 0;
  }
}

function hebrewMonthName(date) {
  try {
    return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long' }).format(new Date(date));
  } catch {
    return '';
  }
}

/** Hebrew day as Gematria — e.g. ו׳, ט״ו, כ״ט. */
export function toHebrewDay(date) {
  const d = hebrewDayNum(date);
  return d ? numToGematria(d) : '';
}

/** Hebrew month name — e.g. תשרי, חשוון. */
export function toHebrewMonth(date) {
  return hebrewMonthName(date);
}

/** Hebrew date (day month) — e.g. ו׳ תשרי. */
export function toHebrewDate(date) {
  const day = hebrewDayNum(date);
  const month = hebrewMonthName(date);
  if (!day || !month) return '';
  return `${numToGematria(day)} ${month}`;
}

/** Hebrew month + year — e.g. תשרי תשפ״ו. */
export function toHebrewMonthYear(date) {
  const month = hebrewMonthName(date);
  const year = hebrewYearNum(date);
  if (!month || !year) return '';
  return `${month} ${numToGematria(year)}`;
}

/** Full Hebrew date (day month year) — e.g. ו׳ תשרי תשפ״ו. */
export function toHebrewFull(date) {
  const day = hebrewDayNum(date);
  const month = hebrewMonthName(date);
  const year = hebrewYearNum(date);
  if (!day || !month || !year) return '';
  return `${numToGematria(day)} ${month} ${numToGematria(year)}`;
}

/** Numeric Hebrew day-of-month (1-30) as an integer (no Gematria). */
export function hebrewDayNumber(date) {
  return hebrewDayNum(date) || null;
}

function hebrewDayOfMonth(date) {
  return hebrewDayNum(date) || null;
}

export function isRoshChodesh(date) {
  const d = hebrewDayOfMonth(date);
  if (d === 1) return true;
  if (d === 30) {
    const next = hebrewDayOfMonth(new Date(new Date(date).getTime() + 86400000));
    return next === 1;
  }
  return false;
}