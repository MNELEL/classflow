import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// HMAC-SHA256 hash for PIN — uses BASE44_APP_ID as server-side secret.
// The hash is never sent to the client; only this function can compute/compare it.
async function hashPin(pin) {
  const secret = Deno.env.get("BASE44_APP_ID") || "pin-security-fallback";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
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

    // ── set_pin: enable PIN lock with a new PIN ──
    if (action === 'set_pin') {
      if (!pin || !/^\d{4}$/.test(String(pin))) {
        return Response.json({ error: 'PIN חייב להכיל 4 ספרות' }, { status: 400 });
      }
      const hash = await hashPin(String(pin));
      const now = new Date().toISOString();
      if (record) {
        await base44.asServiceRole.entities.TeacherSecurity.update(record.id, {
          pin_enabled: true,
          pin_hash: hash,
          updated_at: now,
        });
      } else {
        await base44.asServiceRole.entities.TeacherSecurity.create({
          uid: user.id,
          pin_enabled: true,
          pin_hash: hash,
          updated_at: now,
        });
      }
      return Response.json({ success: true, pin_enabled: true });
    }

    // ── verify_pin: check if the provided PIN is correct ──
    if (action === 'verify_pin') {
      if (!pin || !/^\d{4}$/.test(String(pin))) {
        return Response.json({ valid: false });
      }
      if (!record || !record.pin_enabled || !record.pin_hash) {
        return Response.json({ valid: false });
      }
      const hash = await hashPin(String(pin));
      const valid = safeEqual(hash, record.pin_hash);
      return Response.json({ valid });
    }

    // ── disable_pin: verify current PIN then disable ──
    if (action === 'disable_pin') {
      if (!pin || !/^\d{4}$/.test(String(pin))) {
        return Response.json({ valid: false });
      }
      if (!record || !record.pin_enabled || !record.pin_hash) {
        return Response.json({ valid: false });
      }
      const hash = await hashPin(String(pin));
      if (!safeEqual(hash, record.pin_hash)) {
        return Response.json({ valid: false });
      }
      await base44.asServiceRole.entities.TeacherSecurity.update(record.id, {
        pin_enabled: false,
        pin_hash: '',
        updated_at: new Date().toISOString(),
      });
      return Response.json({ valid: true, success: true, pin_enabled: false });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});