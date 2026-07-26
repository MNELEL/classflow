import { base44 } from '@/api/base44Client';

// PIN lock utilities — PIN hash is stored server-side only (TeacherSecurity entity).
// The client never sees the hash; all verification goes through the pinSecurity
// backend function.
//
// pin_enabled is cached in localStorage for synchronous isLocked() checks on
// app load. The unlock state lives in sessionStorage so the app re-locks on a
// fresh session but stays unlocked during navigation.
const PIN_ENABLED_KEY = 'classflow_pin_enabled';
const UNLOCKED_KEY = 'classflow_unlocked';

export function isPinEnabledCached() {
  return localStorage.getItem(PIN_ENABLED_KEY) === '1';
}

export function isLocked() {
  return isPinEnabledCached() && sessionStorage.getItem(UNLOCKED_KEY) !== '1';
}

export function unlock() {
  sessionStorage.setItem(UNLOCKED_KEY, '1');
}

export function lockNow() {
  sessionStorage.removeItem(UNLOCKED_KEY);
  window.dispatchEvent(new Event('pin-lock-changed'));
}

// ── Server-side operations (via backend function) ──

export async function refreshPinStatus() {
  try {
    const res = await base44.functions.invoke('pinSecurity', { action: 'get_status' });
    const enabled = !!res.data?.pin_enabled;
    const prev = localStorage.getItem(PIN_ENABLED_KEY);
    localStorage.setItem(PIN_ENABLED_KEY, enabled ? '1' : '0');
    if (prev !== (enabled ? '1' : '0')) {
      window.dispatchEvent(new Event('pin-lock-changed'));
    }
    return enabled;
  } catch {
    return isPinEnabledCached();
  }
}

export async function setPin(pin) {
  const res = await base44.functions.invoke('pinSecurity', { action: 'set_pin', pin });
  if (res.data?.success) {
    localStorage.setItem(PIN_ENABLED_KEY, '1');
    sessionStorage.setItem(UNLOCKED_KEY, '1');
    window.dispatchEvent(new Event('pin-lock-changed'));
    return true;
  }
  throw new Error(res.data?.error || 'שגיאה בהגדרת קוד');
}

export async function verifyPin(pin) {
  try {
    const res = await base44.functions.invoke('pinSecurity', { action: 'verify_pin', pin });
    return res.data?.valid === true;
  } catch {
    return false;
  }
}

export async function disablePin(pin) {
  const res = await base44.functions.invoke('pinSecurity', { action: 'disable_pin', pin });
  if (res.data?.success) {
    localStorage.setItem(PIN_ENABLED_KEY, '0');
    sessionStorage.removeItem(UNLOCKED_KEY);
    window.dispatchEvent(new Event('pin-lock-changed'));
    return true;
  }
  return false;
}