import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Links a teacher record to the authenticated user via access code.
// Called from TeacherLogin — uses asServiceRole to bypass RLS since the
// teacher's user_id is not yet set at the time of linking.
//
// Security notes:
// - Rate-limited per requesting user: MAX_FAILED_ATTEMPTS consecutive wrong
//   codes lock this user out of linking for LOCKOUT_MS. Access codes have no
//   enforced length/format, so without a lockout this endpoint is a brute
//   force / account-takeover vector.
// - Re-linking a teacher that is already linked to a *different* user is
//   rejected outright — a leaked/guessed access code must not let a second
//   user silently take over an already-claimed teacher account.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function isLockedOut(record) {
  if (!record?.link_teacher_locked_until) return false;
  return new Date(record.link_teacher_locked_until).getTime() > Date.now();
}

function lockoutRemainingSeconds(record) {
  const remaining = new Date(record.link_teacher_locked_until).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { access_code } = body;

    if (!access_code) {
      return Response.json({ error: 'Missing access_code' }, { status: 400 });
    }

    // Find (or create) this user's security record to track link attempts.
    const secRecords = await base44.asServiceRole.entities.TeacherSecurity.filter({ uid: user.id });
    let secRecord = Array.isArray(secRecords) && secRecords.length > 0 ? secRecords[0] : null;

    if (isLockedOut(secRecord)) {
      return Response.json({
        error: 'יותר מדי ניסיונות שגויים. נסה שוב מאוחר יותר.',
        locked: true,
        retry_after_seconds: lockoutRemainingSeconds(secRecord),
      }, { status: 429 });
    }

    // Find teacher by access code (service role bypasses RLS)
    const teachers = await base44.asServiceRole.entities.Teacher.filter({
      access_code: access_code.trim(),
      is_active: true,
    });

    const teacher = Array.isArray(teachers) && teachers.length > 0 ? teachers[0] : null;

    // Reject if the code is wrong, OR if it's valid but the teacher record is
    // already linked to a different account — both are attacker-relevant
    // failures and both count toward the lockout.
    if (!teacher || (teacher.user_id && teacher.user_id !== user.id)) {
      const nextAttempts = (secRecord?.link_teacher_failed_attempts || 0) + 1;
      const update = {
        link_teacher_failed_attempts: nextAttempts,
        updated_at: new Date().toISOString(),
      };
      if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
        update.link_teacher_locked_until = new Date(Date.now() + LOCKOUT_MS).toISOString();
        update.link_teacher_failed_attempts = 0;
      }
      if (secRecord) {
        await base44.asServiceRole.entities.TeacherSecurity.update(secRecord.id, update);
      } else {
        await base44.asServiceRole.entities.TeacherSecurity.create({ uid: user.id, pin_enabled: false, ...update });
      }

      // Same generic message either way — don't reveal whether the code
      // exists but is already claimed vs. simply invalid.
      return Response.json(
        { error: 'קוד הגישה לא תקין או שאינו פעיל' },
        { status: 404 }
      );
    }

    // Success — reset this user's failure counter.
    if (secRecord && (secRecord.link_teacher_failed_attempts || secRecord.link_teacher_locked_until)) {
      await base44.asServiceRole.entities.TeacherSecurity.update(secRecord.id, {
        link_teacher_failed_attempts: 0,
        link_teacher_locked_until: '',
      });
    }

    // Link teacher to current user (idempotent if already linked to this same user)
    await base44.asServiceRole.entities.Teacher.update(teacher.id, {
      user_id: user.id,
    });

    // Update all classrooms assigned to this teacher with teacher_user_id
    const classrooms = await base44.asServiceRole.entities.Classroom.filter({
      teacher_id: teacher.id,
    });
    if (classrooms && classrooms.length > 0) {
      for (const c of classrooms) {
        await base44.asServiceRole.entities.Classroom.update(c.id, {
          teacher_user_id: user.id,
        });
      }
    }

    return Response.json({
      success: true,
      teacher: { id: teacher.id, full_name: teacher.full_name },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
