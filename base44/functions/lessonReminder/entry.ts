import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled function: runs every 5 minutes, checks for upcoming lessons and sends reminders
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const dayMap = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
    const todayKey = dayMap[now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Only check on school days
    if (!['sun', 'mon', 'tue', 'wed', 'thu'].includes(todayKey)) {
      return Response.json({ status: 'weekend' });
    }

    // Find week_start for this week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const plans = await base44.asServiceRole.entities.WeeklyPlan.filter({ week_start: weekStartStr });
    if (!plans.length) return Response.json({ status: 'no_plan' });

    const plan = plans[0];
    const todayBlock = plan.days?.find(d => d.day_key === todayKey);
    if (!todayBlock?.items?.length) return Response.json({ status: 'no_lessons_today' });

    // Get all users to notify
    const users = await base44.asServiceRole.entities.User.list();
    const remindersKey = `reminder_sent_${weekStartStr}_${todayKey}`;

    const sentReminders = [];

    for (const lesson of todayBlock.items) {
      const lessonHour = lesson.hour || 0;
      // Send reminder 15 minutes before the lesson
      const reminderMinuteOfDay = lessonHour * 60 - 15;
      const currentMinuteOfDay = currentHour * 60 + currentMinute;

      // Check if we're within the 5-minute window for this reminder
      if (currentMinuteOfDay >= reminderMinuteOfDay && currentMinuteOfDay < reminderMinuteOfDay + 5) {
        const reminderKey = `${remindersKey}_${lesson.id}`;

        // Check if reminder was already sent (using a simple entity to track)
        const existing = await base44.asServiceRole.entities.SentReminder?.filter?.({ reminder_key: reminderKey }).catch(() => []);
        if (existing?.length > 0) continue;

        // Send email to all users
        for (const user of users) {
          if (!user.email) continue;

          const subject = `🔔 שיעור עוד 15 דקות: ${lesson.title}`;
          const body = `
שלום ${user.full_name || 'מורה'},

שיעור "${lesson.title}" מתחיל בעוד 15 דקות (בשעה ${String(lessonHour).padStart(2, '0')}:00).

${lesson.subject ? `מקצוע: ${lesson.subject}` : ''}
${lesson.notes ? `הערות: ${lesson.notes}` : ''}

היכנס למערכת כדי לצפות בחומרי השיעור:
https://classflow.base44.app/library

בהצלחה!
ClassFlow
          `.trim();

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user.email,
            subject,
            body,
            from_name: 'ClassFlow',
          });
        }

        // Mark reminder as sent
        await base44.asServiceRole.entities.SentReminder?.create?.({
          reminder_key: reminderKey,
          lesson_title: lesson.title,
          lesson_hour: lessonHour,
          sent_at: now.toISOString(),
        }).catch(() => {});

        sentReminders.push(lesson.title);
      }
    }

    return Response.json({ status: 'ok', reminders_sent: sentReminders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});