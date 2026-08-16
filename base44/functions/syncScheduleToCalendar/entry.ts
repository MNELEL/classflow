import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4 };
const CAL_TZ = 'Asia/Jerusalem';
const CAL_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function pad(n) { return String(n).padStart(2, '0'); }
function ymd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Determine the target week's start (Sunday)
    let weekStart;
    if (body.week_start) {
      weekStart = new Date(body.week_start + 'T00:00:00');
    } else {
      const d = new Date();
      weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay()); // back to Sunday
    }
    const weekKey = ymd(weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const auth = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // ── Build lesson events from all WeeklyPlans for this week (shared calendar) ──
    const plans = await base44.asServiceRole.entities.WeeklyPlan.filter({ week_start: weekKey });
    const lessons = [];
    for (const plan of plans) {
      for (const dayBlock of (plan.days || [])) {
        const di = DAY_INDEX[dayBlock.day_key];
        if (di == null) continue;
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + di);
        for (const item of (dayBlock.items || [])) {
          const hour = item.hour || 8;
          const duration = item.duration || 1;
          const start = new Date(dayDate); start.setHours(hour, 0, 0, 0);
          const end = new Date(dayDate); end.setHours(hour + duration, 0, 0, 0);
          lessons.push({
            id: `lesson:${plan.id}:${item.id}`,
            summary: item.title || 'שיעור',
            description: [item.subject && `מקצוע: ${item.subject}`, item.notes].filter(Boolean).join('\n'),
            start: { dateTime: start.toISOString(), timeZone: CAL_TZ },
            end: { dateTime: end.toISOString(), timeZone: CAL_TZ },
          });
        }
      }
    }

    // ── Build task events (all-day) for tasks due this week ──
    const tasks = await base44.asServiceRole.entities.Task.list('-updated_date', 500);
    const taskEvents = [];
    for (const t of tasks) {
      if (!t.due_date) continue;
      const due = new Date(t.due_date + 'T00:00:00');
      if (due < weekStart || due >= weekEnd) continue;
      const next = new Date(due); next.setDate(due.getDate() + 1);
      taskEvents.push({
        id: `task:${t.id}`,
        summary: `📌 ${t.title}`,
        description: [
          t.description,
          t.subject && `מקצוע: ${t.subject}`,
          t.priority && `עדיפות: ${t.priority}`,
          t.status && `סטטוס: ${t.status}`,
        ].filter(Boolean).join('\n'),
        start: { date: ymd(due) },
        end: { date: ymd(next) },
      });
    }

    const allEvents = [...lessons, ...taskEvents];

    // ── List existing ClassFlow events for this week (idempotency) ──
    const listUrl = `${CAL_API}?timeMin=${encodeURIComponent(weekStart.toISOString())}` +
      `&timeMax=${encodeURIComponent(weekEnd.toISOString())}` +
      `&singleEvents=true&sharedExtendedProperty=${encodeURIComponent('classflow_week=' + weekKey)}`;
    const listRes = await fetch(listUrl, { headers: auth });
    const existingMap = new Map();
    if (listRes.ok) {
      const data = await listRes.json();
      for (const ev of (data.items || [])) {
        const cid = ev.extendedProperties?.shared?.classflow_id;
        if (cid) existingMap.set(cid, ev);
      }
    }

    let created = 0, updated = 0, deleted = 0;
    const seenIds = new Set();

    for (const evt of allEvents) {
      seenIds.add(evt.id);
      const payload = {
        summary: evt.summary,
        description: evt.description || '',
        start: evt.start,
        end: evt.end,
        extendedProperties: { shared: { classflow_week: weekKey, classflow_id: evt.id } },
      };
      const existing = existingMap.get(evt.id);
      if (existing) {
        const r = await fetch(`${CAL_API}/${existing.id}`, { method: 'PUT', headers: auth, body: JSON.stringify(payload) });
        if (r.ok) updated++;
      } else {
        const r = await fetch(CAL_API, { method: 'POST', headers: auth, body: JSON.stringify(payload) });
        if (r.ok) created++;
      }
    }

    // ── Delete orphaned events (lessons/tasks removed from the plan) ──
    for (const [cid, ev] of existingMap.entries()) {
      if (!seenIds.has(cid)) {
        const r = await fetch(`${CAL_API}/${ev.id}`, { method: 'DELETE', headers: auth });
        if (r.ok || r.status === 410) deleted++;
      }
    }

    return Response.json({
      ok: true,
      week: weekKey,
      lessons: lessons.length,
      tasks: taskEvents.length,
      created,
      updated,
      deleted,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}