// PIN lock utilities — stores a hashed 4-digit PIN in localStorage.
// Lock state lives in sessionStorage so the app stays unlocked during a session
// and re-locks on a fresh app launch.
const PIN_HASH_KEY = 'classflow_pin_hash';
const UNLOCKED_KEY = 'classflow_unlocked';

// Lightweight non-crypto hash — obscures the PIN from a casual localStorage peek.
export function hashPin(pin) {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) {
    h = ((h << 5) + h) + pin.charCodeAt(i);
    h = h & 0xffffffff;
  }
  return 'h' + (h >>> 0).toString(36);
}

export function isPinSet() {
  return !!localStorage.getItem(PIN_HASH_KEY);
}

export function verifyPin(pin) {
  return isPinSet() && hashPin(pin) === localStorage.getItem(PIN_HASH_KEY);
}

export function setPin(pin) {
  localStorage.setItem(PIN_HASH_KEY, hashPin(pin));
  window.dispatchEvent(new Event('pin-lock-changed'));
}

export function clearPin() {
  localStorage.removeItem(PIN_HASH_KEY);
  sessionStorage.removeItem(UNLOCKED_KEY);
  window.dispatchEvent(new Event('pin-lock-changed'));
}

export function isLocked() {
  return isPinSet() && sessionStorage.getItem(UNLOCKED_KEY) !== '1';
}

export function unlock() {
  sessionStorage.setItem(UNLOCKED_KEY, '1');
}

export function lockNow() {
  sessionStorage.removeItem(UNLOCKED_KEY);
  window.dispatchEvent(new Event('pin-lock-changed'));
}