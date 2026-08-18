import { createClientFromRequest } from 'npm:@base44/sdk@0.8.43';
import { gatherOrchestratorContext, summarizeContextForAI } from '../../shared/orchestratorContext.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await base44.auth.me().catch(() => null);
    // Scheduled invocations authenticate as service role (no user). On-demand
    // teacher calls carry a user — use their own (user-scoped) client so
    // created insights are owned by that teacher.
    const client = user ? base44 : base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'monitor';

    const ctx = await gatherOrchestratorContext(client);

    if (mode === 'snapshot') {
      return Response.json({ context: ctx });
    }

    // ── monitor mode: detect cross-module risks ──
    const insights = detectRisks(ctx);
    const saved = await persistInsights(client, insights);

    // ── AI synthesis (best-effort: never blocks structured insights) ──
    let briefing = null;
    try {
      briefing = await synthesizeBriefing(client, ctx, saved);
      if (briefing) await persistInsights(client, [briefing]);
    } catch (_e) {
      // LLM synthesis is optional — structured insights already saved.
    }

    return Response.json({
      insights: saved.length,
      briefing: !!briefing,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/* ── Risk detection (computational, deterministic) ─────────────────── */

function detectRisks(ctx) {
  const out = [];
  const activeStudents = (ctx.students || []).filter(s => s.is_active !== false);
  const byId = {};
  activeStudents.forEach(s => {
    byId[s.id] = {
      s, abs30: 0, absPrior: 0, gRecent: [], gPrior: [],
      overdue: 0, negBeh30: 0, hwAssigned: 0, hwSubmitted: 0,
      unviewed: 0, points30: 0,
    };
  });

  // Attendance
  (ctx.attendance || []).forEach(a => {
    if (!byId[a.student_id]) return;
    if (a.status !== 'absent') return;
    if (a.date >= ctx.since30) byId[a.student_id].abs30++;
    else if (a.date >= ctx.since60) byId[a.student_id].absPrior++;
  });

  // Grades
  (ctx.grades || []).forEach(g => {
    if (!byId[g.student_id]) return;
    if (g.date >= ctx.since30) byId[g.student_id].gRecent.push(g.score);
    else if (g.date >= ctx.since60) byId[g.student_id].gPrior.push(g.score);
  });

  // Overdue tasks
  (ctx.tasks || []).forEach(t => {
    if (!byId[t.student_id]) return;
    if (t.status !== 'done' && t.due_date && t.due_date < ctx.today) byId[t.student_id].overdue++;
  });

  // Negative behavior (last 30d)
  (ctx.behavior || []).forEach(b => {
    if (!byId[b.student_id]) return;
    const t = b.behavior_type || b.type;
    if ((t === 'negative' || t === 'concern') && b.date >= ctx.since30) byId[b.student_id].negBeh30++;
  });

  // Homework submission rate
  (ctx.homework || []).forEach(h => {
    const subs = h.submissions || [];
    subs.forEach(sub => {
      if (!byId[sub.student_id]) return;
      byId[sub.student_id].hwAssigned++;
      if (sub.submitted) byId[sub.student_id].hwSubmitted++;
    });
  });

  // Unviewed shared lessons (parent engagement)
  (ctx.sharedLessons || []).forEach(sl => {
    if (!byId[sl.student_id]) return;
    if (!sl.viewed_at) byId[sl.student_id].unviewed++;
  });

  // Reward points (last 30d)
  (ctx.rewards || []).forEach(r => {
    if (!byId[r.student_id]) return;
    if (r.date >= ctx.since30) byId[r.student_id].points30 += (r.points || 0);
  });

  // ── Build insights ──
  const add = (type, severity, title, desc, action, link, ids, snap) => {
    const names = ids.map(id => byId[id]?.s?.name).filter(Boolean);
    out.push({
      insight_type: type, severity, title, description: desc,
      suggested_action: action, action_link: link,
      student_ids: ids, student_names: names, context_snapshot: snap,
      generated_at: new Date().toISOString(),
    });
  };

  // 1. Attendance decline
  const attIds = [];
  activeStudents.forEach(s => {
    const m = byId[s.id];
    if (m.abs30 >= 3 || (m.abs30 > m.absPrior && m.abs30 >= 2)) {
      attIds.push(s.id);
      const sev = m.abs30 >= 5 ? 'high' : 'medium';
      add('attendance_decline', sev,
        `חיסורים מצטברים: ${s.name}`,
        `${s.name} צבר/ה ${m.abs30} ימי היעדרות ב-30 הימים האחרונים (לעומת ${m.absPrior} בחודש הקודם). חיסורים מרובים עלולים לפגוע ברצף הלמידה ובהישגים.`,
        'יש ליצור קשר עם ההורים, לברר סיבת ההיעדרות ולשקול תוכנית השלמה.',
        '/attendance', [s.id],
        { abs30: m.abs30, absPrior: m.absPrior });
    }
  });

  // 2. Grade drop
  activeStudents.forEach(s => {
    const m = byId[s.id];
    if (m.gRecent.length >= 2 && m.gPrior.length >= 2) {
      const avgR = m.gRecent.reduce((a, b) => a + b, 0) / m.gRecent.length;
      const avgP = m.gPrior.reduce((a, b) => a + b, 0) / m.gPrior.length;
      const drop = avgP - avgR;
      if (drop >= 10) {
        const sev = drop >= 20 ? 'high' : 'medium';
        add('grade_drop', sev,
          `ירידה בהישגים: ${s.name}`,
          `הממוצע של ${s.name} ירד מ-${Math.round(avgP)} ל-${Math.round(avgR)} (נפילה של ${Math.round(drop)} נקודות) ב-30 הימים האחרונים. כדאי לבדוק סיבות אפשריות: חיסורים, קושי בחומר או גורמים רגשיים.`,
          'מומלץ לשיחה אישית עם התלמיד/ה ולהתאים תרגול נוסף בנושאים החלשים.',
          '/grades', [s.id],
          { avgPrior: Math.round(avgP), avgRecent: Math.round(avgR), drop: Math.round(drop) });
      }
    }
  });

  // 3. Overdue task accumulation
  const overdueMap = {};
  activeStudents.forEach(s => { const c = byId[s.id].overdue; if (c >= 2) overdueMap[s.id] = c; });
  const overdueIds = Object.keys(overdueMap);
  if (overdueIds.length) {
    add('overdue_accumulation', overdueIds.length >= 3 ? 'high' : 'medium',
      `${overdueIds.length} תלמידים עם משימות באיחור`,
      `נצברו משימות שלא הושלמו בזמן אצל ${overdueIds.length} תלמידים. חלקם עם ${Math.max(...Object.values(overdueMap))} משימות באיחור. מומלץ לבדוק את הסיבות ולתת תמיכה.`,
      'סקירת רשימת המשימות ומתן עדיפות להשלמת הפריטים האקוטיים.',
      '/tasks-hub', overdueIds, { perStudent: overdueMap });
  }

  // 4. Behavior escalation (per student with >=2 negative events)
  activeStudents.forEach(s => {
    const m = byId[s.id];
    if (m.negBeh30 >= 2) {
      const sev = m.negBeh30 >= 4 ? 'high' : 'medium';
      add('behavior_escalation', sev,
        `אירועי התנהגות: ${s.name}`,
        `${s.name} תועד/ה ב-${m.negBeh30} אירועי התנהגות שליליים ב-30 הימים האחרונים. כדאי לבדוק דפוס, טריגרים ולשקול שיחה עם התלמיד/ה וההורים.`,
        'פתיחת ציר הזמן של התנהגות לסקירת ההקשר המלא.',
        '/behavior-timeline', [s.id], { negBeh30: m.negBeh30 });
    }
  });

  // 5. Low homework submission
  activeStudents.forEach(s => {
    const m = byId[s.id];
    if (m.hwAssigned >= 3 && m.hwSubmitted / m.hwAssigned < 0.5) {
      add('low_homework_submission', 'medium',
        `הגשת שיעורים נמוכה: ${s.name}`,
        `${s.name} הגיש/ה רק ${m.hwSubmitted} מתוך ${m.hwAssigned} שיעורי בית (${Math.round((m.hwSubmitted / m.hwAssigned) * 100)}% הגשה). הגשה נמוכה עלולה להצביע על קושי או חוסר מוטיבציה.`,
        'שיחה עם התלמיד/ה, בירור קשיים ובניית תוכנית הגשה מציאותית.',
        '/homework', [s.id], { hwAssigned: m.hwAssigned, hwSubmitted: m.hwSubmitted });
    }
  });

  // 6. Low parent engagement
  const unviewedIds = activeStudents.filter(s => byId[s.id].unviewed >= 2).map(s => s.id);
  if (unviewedIds.length) {
    add('low_parent_engagement', 'low',
      `קשר עם הורים: ${unviewedIds.length} תלמידים`,
      `הורים של ${unviewedIds.length} תלמידים לא צפו בסיכומי שיעורים ששותפו איתם. מעורבות הורים נמוכה עלולה לפגוע בתמיכה בלמידה בבית.`,
      'שליחת תזכורת אישית או יצירת קשר טלפוני לעידוד מעורבות.',
      '/parents', unviewedIds, { unviewedPerStudent: unviewedIds.map(id => ({ id, count: byId[id].unviewed })) });
  }

  // 7. Negative reward trend
  activeStudents.forEach(s => {
    const m = byId[s.id];
    if (m.points30 < 0) {
      add('negative_reward_trend', 'medium',
        `נקודות שליליות: ${s.name}`,
        `${s.name} צבר/ה ${m.points30} נקודות ב-30 הימים האחרונים. כדאי לבדוק את הסיבות ולבנות תוכנית עידוד חיובית.`,
        'מתן חיזוק חיובי על התקדמות קטנה והגדרת יעדים ברי השגה.',
        '/gamification', [s.id], { points30: m.points30 });
    }
  });

  // 8. Upcoming exams with unprepared library material
  const upcomingExams = (ctx.exams || []).filter(e => e.date >= ctx.today && e.date <= ctx.in14);
  const libSubjectsCovered = new Set((ctx.library || []).filter(i => i.coverage_status === 'completed' && i.subject).map(i => i.subject));
  upcomingExams.forEach(ex => {
    if (ex.subject && !libSubjectsCovered.has(ex.subject)) {
      add('upcoming_exam_unprepared', 'medium',
        `מבחן קרוב ללא חומר מוכן: ${ex.title || ex.subject}`,
        `מבחן ב${ex.subject} מתקרב (${ex.date}) ואין בספרייה חומרי למידה שכוסו בנושא זה. כדאי להכין חומר חזרה או סיכום.`,
        'יצירת חומר הכנה מבנק השאלות או העלאת סיכום לספרייה.',
        '/exam-builder', [], { exam_title: ex.title, exam_subject: ex.subject, exam_date: ex.date });
    }
  });

  return out;
}

/* ── Dedup + persist (skips active insights with same key) ────────── */

function insightKey(ins) {
  return ins.insight_type + '::' + (ins.student_ids || []).slice().sort().join(',');
}

async function persistInsights(client, insights) {
  if (!insights.length) return [];
  const existing = await client.entities.OrchestratorInsight.list('-generated_at', 500);
  const activeKeys = new Set(existing.filter(i => !i.is_dismissed).map(insightKey));

  const fresh = insights.filter(i => !activeKeys.has(insightKey(i)));
  const saved = [];
  for (const ins of fresh) {
    try {
      const rec = await client.entities.OrchestratorInsight.create({
        insight_type: ins.insight_type,
        severity: ins.severity,
        title: ins.title,
        description: ins.description,
        suggested_action: ins.suggested_action,
        action_link: ins.action_link,
        student_ids: ins.student_ids,
        student_names: ins.student_names,
        context_snapshot: ins.context_snapshot,
        generated_at: ins.generated_at || new Date().toISOString(),
        is_dismissed: false,
        is_read: false,
      });
      saved.push(rec);
    } catch (_e) {
      // skip individual failures — don't abort the whole run
    }
  }
  return saved;
}

/* ── AI synthesis: one prioritized pedagogical briefing ─────────────── */

async function synthesizeBriefing(client, ctx, savedInsights) {
  if (!savedInsights.length && (ctx.students || []).filter(s => s.is_active !== false).length === 0) return null;

  const aiSummary = summarizeContextForAI(ctx);
  const detectedTitles = savedInsights.map(i => `- [${i.severity}] ${i.title}: ${i.description}`).join('\n');

  const result = await client.integrations.Core.InvokeLLM({
    prompt: `אתה ה"מוח הפדגוגי" של מערכת ClassFlow. קיבלת תובנות שזוהו באופן אוטומטי מהנתונים, ותקציר של מצב הכיתה. סנתז את הכל לבריף יומי אחד, ברור ואקשנביל, בעברית.

תובנות שזוהו:
${detectedTitles || '(אין תובנות חריגות — מצב תקין)'}

תקציר מצב כללי:
${JSON.stringify(aiSummary).slice(0, 4000)}

כללים:
- החזר אובייקט JSON עם השדות title, description, suggested_action, severity.
- ה-title: כותרת קצרה לבריף היום (למשל "בריף פדגוגי — 3 נקודות לטיפול").
- ה-description: פסקה אחת, ממוקדת, שמסכמת את העיקר ומדרגת עדיפות פעולה.
- ה-suggested_action: פעולה אחת מרכזית שמומלץ לעשות היום.
- ה-severity: high/medium/low בהתאם לחומרת המצב הכללי.
- אם אין תובנות חריגות, החזר severity=low עם מסר חיובי.`,
    response_json_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        suggested_action: { type: 'string' },
        severity: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
      required: ['title', 'description', 'severity'],
    },
  });

  return {
    insight_type: 'daily_briefing',
    severity: result.severity || 'medium',
    title: result.title || 'בריף פדגוגי יומי',
    description: result.description || '',
    suggested_action: result.suggested_action || '',
    action_link: '/',
    student_ids: [],
    student_names: [],
    context_snapshot: { detected_count: savedInsights.length },
    generated_at: new Date().toISOString(),
  };
}