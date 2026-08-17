/**
 * Hebrew Calendar utilities — uses Intl.DateTimeFormat with u-ca-hebrew.
 * No external packages needed — built into modern browsers.
 */

export function toHebrewDate(date) {
  try {
    return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
      day: 'numeric',
      month: 'long',
    }).format(new Date(date));
  } catch {
    return '';
  }
}

export function toHebrewDay(date) {
  try {
    return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
      day: 'numeric',
    }).format(new Date(date));
  } catch {
    return '';
  }
}

export function toHebrewMonth(date) {
  try {
    return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
      month: 'long',
    }).format(new Date(date));
  } catch {
    return '';
  }
}

export function toHebrewMonthYear(date) {
  try {
    return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return '';
  }
}

export function toHebrewFull(date) {
  try {
    return new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return '';
  }
}

export function hebrewDayNumber(date) {
  try {
    const s = new Intl.DateTimeFormat('en-US-u-ca-hebrew', { day: 'numeric' }).format(new Date(date));
    return parseInt(s, 10);
  } catch {
    return null;
  }
}

function hebrewDayOfMonth(date) {
  try {
    const s = new Intl.DateTimeFormat('en-US-u-ca-hebrew', { day: 'numeric' }).format(new Date(date));
    return parseInt(s, 10);
  } catch {
    return null;
  }
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