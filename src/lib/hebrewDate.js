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