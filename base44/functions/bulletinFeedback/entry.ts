import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, bulletin_id, parent_name, rating, text } = body;

    if (!bulletin_id) {
      return Response.json({ error: 'Missing bulletin_id' }, { status: 400 });
    }

    // ── GET: return bulletin content for public feedback page ──
    if (action === 'get') {
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

    // ── POST: submit parent feedback ──
    if (action === 'submit') {
      // Basic spam prevention: check existing feedbacks for recent submissions
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
        parent_name: parent_name || '',
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