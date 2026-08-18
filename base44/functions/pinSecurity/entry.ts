import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Generate a random 32-byte salt, returned as base64url.
function generateSalt() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// HMAC-SHA256 hash for PIN.
// The key material combines the server-side BASE44_APP_ID secret with a
// per-user salt. When salt is null/empty (legacy records), falls back to the
// old shared-key behaviour so existing hashes can still be verified.
async function hashPin(pin, salt) {
  const secret = Deno.env.get("BASE44_APP_ID") || "pin-security-fallback";
  const keyMaterial = salt ? `${secret}:${salt}` : secret;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keyMaterial),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(pin));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Constant-time comparison to prevent timing attacks
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Lockout policy for PIN verification — a 4-digit PIN only has 10,000
// combinations, so unthrottled attempts are brute-forceable in minutes.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function isLockedOut(record) {
  if (!record?.locked_until) return false;
  return new Date(record.locked_until).getTime() > Date.now();
}

function lockoutRemainingSeconds(record) {
  const remaining = new Date(record.locked_until).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, pin } = body;

    // All actions require authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user's security record (service role bypasses RLS)
    const records = await base44.asServiceRole.entities.TeacherSecurity.filter({ uid: user.id });
    const record = Array.isArray(records) && records.length > 0 ? records[0] : null;

    // ── get_status: check if PIN is enabled ──
    if (action === 'get_status') {
      return Response.json({ pin_enabled: record ? !!record.pin_enabled : false });
    }

    // ── set_pin: enable PIN lock with a new PIN (generates a fresh salt) ──
    if (action === 'set_pin') {
      if (!pin || !/^\d{4}$/.test(String(pin))) {
        return Response.json({ error: 'PIN חייב להכיל 4 ספרות' }, { status: 400 });
      }
      const salt = generateSalt();
      const hash = await hashPin(String(pin), salt);
      const now = new Date().toISOString();
      if (record) {
        await base44.asServiceRole.entities.TeacherSecurity.update(record.id, {
          pin_enabled: true,
          pin_hash: hash,
          pin_salt: salt,
          updated_at: now,
        });
      } else {
        await base44.asServiceRole.entities.TeacherSecurity.create({
          uid: user.id,
          pin_enabled: true,
          pin_hash: hash,
          pin_salt: salt,
          updated_at: now,
        });
      }
      return Response.json({ success: true, pin_enabled: true });
    }

    // ── verify_pin: check if the provided PIN is correct ──
    // For legacy records (no pin_salt), verifies against the old shared-key
    // hash and, on success, upgrades to a salted hash.
    if (action === 'verify_pin') {
      if (!pin || !/^\d{4}$/.test(String(pin))) {
        return Response.json({ valid: false });
      }
      if (!record || !record.pin_enabled || !record.pin_hash) {
        return Response.json({ valid: false });
      }
      const salt = record.pin_salt;
      if (salt) {
        const hash = await hashPin(String(pin), salt);
        return Response.json({ valid: safeEqual(hash, record.pin_hash) });
      }
      // Legacy: verify with old shared-key hash, then upgrade to salted
      const legacyHash = await hashPin(String(pin), null);
      if (!safeEqual(legacyHash, record.pin_hash)) {
        return Response.json({ valid: false });
      }
      const newSalt = generateSalt();
      const newHash = await hashPin(String(pin), newSalt);
      await base44.asServiceRole.entities.TeacherSecurity.update(record.id, {
        pin_hash: newHash,
        pin_salt: newSalt,
        updated_at: new Date().toISOString(),
      });
      return Response.json({ valid: true });
    }

    // ── disable_pin: verify current PIN then disable ──
    if (action === 'disable_pin') {
      if (!pin || !/^\d{4}$/.test(String(pin))) {
        return Response.json({ valid: false });
      }
      if (!record || !record.pin_enabled || !record.pin_hash) {
        return Response.json({ valid: false });
      }
      const salt = record.pin_salt;
      const hash = salt
        ? await hashPin(String(pin), salt)
        : await hashPin(String(pin), null);
      if (!safeEqual(hash, record.pin_hash)) {
        return Response.json({ valid: false });
      }
      await base44.asServiceRole.entities.TeacherSecurity.update(record.id, {
        pin_enabled: false,
        pin_hash: '',
        pin_salt: '',
        updated_at: new Date().toISOString(),
      });
      return Response.json({ valid: true, success: true, pin_enabled: false });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});