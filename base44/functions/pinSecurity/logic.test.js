import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────
// These mirror the exact algorithms in base44/functions/pinSecurity/entry.ts
// and base44/functions/linkTeacher/entry.ts. We can't import those files
// directly: they run on Deno (Deno.serve, Deno.env, `npm:` specifiers) and
// aren't reachable from a Node/Vitest process. If you change the lockout
// policy or the comparison logic in either entry.ts, update the mirrored
// copy here too — a mismatch is a signal the two have drifted apart.
// ─────────────────────────────────────────────────────────────────────────

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

function isLockedOut(record, now = Date.now()) {
  if (!record?.locked_until) return false;
  return new Date(record.locked_until).getTime() > now;
}

function lockoutRemainingSeconds(record, now = Date.now()) {
  const remaining = new Date(record.locked_until).getTime() - now;
  return Math.max(0, Math.ceil(remaining / 1000));
}

// Mirrors the attempt-counting branch shared by verify_pin / disable_pin /
// linkTeacher: increment on failure, and once the threshold is hit, set a
// lockout timestamp and reset the counter.
function recordFailedAttempt(record) {
  const nextAttempts = (record?.failed_attempts || 0) + 1;
  const update = { failed_attempts: nextAttempts };
  if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
    update.locked_until = new Date(Date.now() + LOCKOUT_MS).toISOString();
    update.failed_attempts = 0;
  }
  return update;
}

describe('safeEqual (constant-time string comparison)', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true);
  });

  it('returns false for different strings of the same length', () => {
    expect(safeEqual('abc123', 'abc124')).toBe(false);
  });

  it('returns false for different lengths without throwing', () => {
    expect(safeEqual('short', 'muchlongerstring')).toBe(false);
  });

  it('returns false when comparing against an empty string', () => {
    expect(safeEqual('nonempty', '')).toBe(false);
  });

  it('treats two empty strings as equal', () => {
    expect(safeEqual('', '')).toBe(true);
  });

  it('is case-sensitive', () => {
    expect(safeEqual('AbC123', 'abc123')).toBe(false);
  });
});

describe('isLockedOut', () => {
  it('is false when there is no record', () => {
    expect(isLockedOut(null)).toBe(false);
  });

  it('is false when locked_until is unset', () => {
    expect(isLockedOut({ failed_attempts: 3 })).toBe(false);
  });

  it('is false once locked_until is empty string (explicit unlock)', () => {
    expect(isLockedOut({ locked_until: '' })).toBe(false);
  });

  it('is true while locked_until is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isLockedOut({ locked_until: future })).toBe(true);
  });

  it('is false once locked_until is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isLockedOut({ locked_until: past })).toBe(false);
  });
});

describe('lockoutRemainingSeconds', () => {
  it('never returns a negative number for an already-expired lockout', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(lockoutRemainingSeconds({ locked_until: past })).toBe(0);
  });

  it('rounds up to the nearest whole second', () => {
    const now = Date.now();
    const target = new Date(now + 1_500).toISOString(); // 1.5s ahead
    expect(lockoutRemainingSeconds({ locked_until: target }, now)).toBe(2);
  });
});

describe('recordFailedAttempt (shared lockout policy)', () => {
  it('increments the counter below the threshold without locking', () => {
    const update = recordFailedAttempt({ failed_attempts: 1 });
    expect(update.failed_attempts).toBe(2);
    expect(update.locked_until).toBeUndefined();
  });

  it('treats a missing counter as zero', () => {
    const update = recordFailedAttempt({});
    expect(update.failed_attempts).toBe(1);
  });

  it('locks out and resets the counter on the Nth failure', () => {
    const update = recordFailedAttempt({ failed_attempts: MAX_FAILED_ATTEMPTS - 1 });
    expect(update.failed_attempts).toBe(0);
    expect(update.locked_until).toBeDefined();
    expect(new Date(update.locked_until).getTime()).toBeGreaterThan(Date.now());
  });

  it('sets a lockout window of approximately LOCKOUT_MS', () => {
    const before = Date.now();
    const update = recordFailedAttempt({ failed_attempts: MAX_FAILED_ATTEMPTS - 1 });
    const lockedUntil = new Date(update.locked_until).getTime();
    expect(lockedUntil - before).toBeGreaterThanOrEqual(LOCKOUT_MS - 1000);
    expect(lockedUntil - before).toBeLessThanOrEqual(LOCKOUT_MS + 1000);
  });
});
