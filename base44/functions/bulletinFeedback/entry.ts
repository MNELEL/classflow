import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// HMAC-SHA256 token for bulletin feedback authorization.
// The token proves the caller received a valid share link from the teacher,
// preventing unauthenticated feedback injection on arbitrary bulletins.
async function generateBulletinToken(bulletinId) {
  const secret = Deno.env.get("BASE44_APP_ID") || "bulletin-fallback-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(bulletinId));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Constant-time comparison to prevent timing attacks
async function validateBulletinToken(bulletinId, token) {
  if (!token || typeof token !== 'string') return false;
  const expected = await generateBulletinToken(bulletinId);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, bulletin_id, parent_name, rating, text, token } = body;

    if (!bulletin_id) {
      return Response.json({ error: 'Missing bulletin_id' }, { status: 400 });
    }

    // ── GET: return bulletin content for public feedback page ──
    if (action === 'get') {
      // Validate token — only parents with a valid share link can view the bulletin
      const isValid = await validateBulletinToken(bulletin_id, token);
      if (!isValid) {
        return Response.json({ error: 'קישור המשוב אינו תקין או שפג תוקפו. נא להשתמש בקישור שקיבלת מהמורה.' }, { status: 403 });
      }
      const bulletin = await base44.asServiceRole.entities.WeeklyBulletin.get(bulletin_id);
      if (!bulletin) {
        return Response.json({ error: 'Bulletin not found' }, { status: 404 });
      }
      // Return only public-safe fields
      return Response.json({
        id: bulletin.id,
        class_name: bulletin.class_name,
        start_date: bulletin.start_date,
        end_date: bulletin.end_date,
        digest_summary: bulletin.digest_summary,
        study_points: bulletin.study_points,
        recap_questions: bulletin.recap_questions,
        weekly_riddle: bulletin.weekly_riddle,
        activities: bulletin.activities,
        feedbacks: bulletin.parent_feedbacks || [],
      });
    }

    // ── Generate share link (authenticated — teacher only) ──
    if (action === 'get_share_link') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const shareToken = await generateBulletinToken(bulletin_id);
      const origin = req.headers.get("origin") || "";
      return Response.json({ share_url: `${origin}/feedback/${bulletin_id}?token=${shareToken}` });
    }

    // ── POST: submit parent feedback (requires valid token) ──
    if (action === 'submit') {
      // Validate token — only parents with a valid share link can submit
      const isValid = await validateBulletinToken(bulletin_id, token);
      if (!isValid) {
        return Response.json({ error: 'קישור המשוב אינו תקין או שפג תוקפו. נא להשתמש בקישור שקיבלת מהמורה.' }, { status: 403 });
      }

      const bulletin = await base44.asServiceRole.entities.WeeklyBulletin.get(bulletin_id);
      if (!bulletin) {
        return Response.json({ error: 'Bulletin not found' }, { status: 404 });
      }

      const existing = bulletin.parent_feedbacks || [];

      // Rate limit: max 1 submission per 30 seconds (check last entry)
      if (existing.length > 0) {
        const lastFeedback = existing[existing.length - 1];
        if (lastFeedback?.created_at) {
          const elapsed = Date.now() - new Date(lastFeedback.created_at).getTime();
          if (elapsed < 30000) {
            return Response.json({ error: 'נא להמתין מספר שניות לפני שליחה חוזרת' }, { status: 429 });
          }
        }
      }

      // Validate rating
      const ratingNum = Number(rating);
      if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        return Response.json({ error: 'דירוג חייב להיות בין 1 ל-5' }, { status: 400 });
      }

      // Append new feedback
      const newFeedback = {
        parent_name: (parent_name || '').slice(0, 100),
        rating: ratingNum,
        text: (text || '').slice(0, 1000),
        created_at: new Date().toISOString(),
      };

      const updatedFeedbacks = [...existing, newFeedback];

      await base44.asServiceRole.entities.WeeklyBulletin.update(bulletin_id, {
        parent_feedbacks: updatedFeedbacks,
      });

      return Response.json({ success: true, feedback: newFeedback });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});