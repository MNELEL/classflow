import { isRoshChodesh } from './hebrewDate';

function dateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Does a rule apply to a given Gregorian date?
function ruleMatchesDate(rule, date) {
  const dow = date.getDay();
  const ds = dateToStr(date);
  if (rule.specific_date && rule.specific_date === ds) return true;
  if (rule.day_of_week != null && rule.day_of_week === dow) return true;
  if (rule.hebrew_event === 'rosh_chodesh' && isRoshChodesh(date)) return true;
  // erev_chag / chag / vacation by hebrew_event require an explicit specific_date
  return false;
}

// Compute the schedule status for one date from the active rules.
export function getDayStatus(rules, date) {
  const active = (rules || []).filter(r => r.is_active !== false);
  let noSchool = null;
  let earlyDismissal = null;
  for (const r of active) {
    if (!ruleMatchesDate(r, date)) continue;
    if (r.rule_type === 'no_school' && !noSchool) noSchool = r;
    if (r.rule_type === 'early_dismissal' && !earlyDismissal) earlyDismissal = r;
  }
  return { noSchool, earlyDismissal };
}

export function dismissalHour(dismissalTime) {
  if (!dismissalTime) return null;
  const h = parseInt(String(dismissalTime).split(':')[0], 10);
  return isNaN(h) ? null : h;
}