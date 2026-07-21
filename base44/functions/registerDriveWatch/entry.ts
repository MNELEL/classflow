import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// פונקציה זו רושמת (או מחדשת) watch channel אצל Google Drive Changes API,
// כך שהשינויים ישלחו בפועל ל-syncDriveStudentDocs במקום להסתמך רק על פולינג
// ידני. יש להריץ אותה פעם אחת כדי להפעיל, ולאחר מכן לחדש לפני שהערוץ פג
// (Google מגביל ל-max 7 ימים ל-expiration).
//
// דרישות מוקדמות (יש להגדיר לפני הרצה):
// 1. Secret בשם DRIVE_WEBHOOK_TOKEN מוגדר בהגדרות הפרויקט (Base44 dashboard).
// 2. חיבור Google Drive מחובר ותקין (connector googledrive).
//
// קריאה: יש לקרוא לפונקציה הזו כמשתמש מחובר (admin), לא כ-webhook חיצוני.
// זו קריאה יזומה חד-פעמית (או תקופתית), לא נקודת קצה לגוגל.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized - must be called by a logged-in user' }, { status: 401 });
    }

    const webhookToken = Deno.env.get('DRIVE_WEBHOOK_TOKEN');
    if (!webhookToken) {
      return Response.json({
        error: 'DRIVE_WEBHOOK_TOKEN secret is not configured. Set it in the Base44 dashboard before registering the watch channel.',
      }, { status: 500 });
    }

    // בונה את כתובת ה-webhook מתוך ה-URL האמיתי של הבקשה הנוכחית, כדי
    // להימנע מהנחות שגויות לגבי מבנה הכתובת בסביבה הזו.
    const currentUrl = new URL(req.url);
    const webhookAddress = `${currentUrl.origin}${currentUrl.pathname.replace(
      /registerDriveWatch\/?$/,
      'syncDriveStudentDocs'
    )}`;

    if (!webhookAddress.includes('syncDriveStudentDocs')) {
      return Response.json({
        error: 'Could not derive webhook address from request URL',
        derived: webhookAddress,
        requestUrl: req.url,
      }, { status: 500 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // ה-channel ID חייב להיות ייחודי; משתמשים ב-timestamp כדי שאפשר יהיה
    // לרשום ערוץ חדש מעת לעת בלי להתנגש בישן.
    const channelId = `drive-watch-${Date.now()}`;

    // Drive Changes API דורש startPageToken תקף כדי לפתוח watch על changes
    const tokenRes = await fetch('https://www.googleapis.com/drive/v3/changes/startPageToken', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!tokenRes.ok) {
      return Response.json({ error: 'Failed to get start page token', details: await tokenRes.text() }, { status: 502 });
    }
    const { startPageToken } = await tokenRes.json();

    const watchRes = await fetch(
      `https://www.googleapis.com/drive/v3/changes/watch?pageToken=${startPageToken}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookAddress,
          token: webhookToken,
          // Google מגביל ל-7 ימים מקסימום; מבקשים את המקסימום ומחדשים לפני התפוגה.
          expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
      }
    );

    const watchResult = await watchRes.json();
    if (!watchRes.ok) {
      return Response.json({ error: 'Failed to register watch channel', details: watchResult }, { status: 502 });
    }

    // שומר/מעדכן את ה-SyncState עם ה-page token ההתחלתי, כדי ש-syncDriveStudentDocs
    // ידע מאיפה להתחיל לקרוא שינויים.
    const existing = await base44.asServiceRole.entities.SyncState.list();
    if (existing.length > 0) {
      await base44.asServiceRole.entities.SyncState.update(existing[0].id, { page_token: startPageToken });
    } else {
      await base44.asServiceRole.entities.SyncState.create({ page_token: startPageToken });
    }

    return Response.json({
      status: 'registered',
      channelId,
      webhookAddress,
      expiration: watchResult.expiration,
      resourceId: watchResult.resourceId,
      note: 'Save resourceId + channelId if you need to manually stop this channel later via drive.channels.stop().',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
