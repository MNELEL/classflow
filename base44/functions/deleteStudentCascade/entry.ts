import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Entities that reference a student via a plain `student_id` field and can
// be bulk-deleted by that filter. Matches the SINGLE_ENTITIES list in
// mergeStudents/entry.ts (which reassigns rather than deletes these on
// merge) plus Certificate, Reward, SeatHistory, and SeatingArrangement,
// which mergeStudents leaves untouched but which do carry a real student_id
// per base44/entities/*.jsonc and should not be left orphaned on a hard
// delete, since there's no "kept" student for them to remain attached to.
const SINGLE_STUDENT_ID_ENTITIES = [
  'Grade',
  'Attendance',
  'FastFeedback',
  'BehaviorEvent',
  'StudentPortfolioItem',
  'ParentContact',
  'Task',
  'OverdueAlert',
  'SharedLesson',
  'Certificate',
  'Reward',
  'SeatHistory',
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const studentId = body?.student_id;
    if (!studentId) return Response.json({ error: 'student_id required' }, { status: 400 });

    const svc = base44.asServiceRole;

    const student = await svc.entities.Student.get(studentId).catch(() => null);
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

    // Same authorization the Student entity's own RLS enforces for delete:
    // the teacher who created the record, or an admin. Checked explicitly
    // here (rather than relying on svc.entities.Student.delete to enforce
    // it) because we're using the service-role client to reach the related
    // entities below, which bypasses RLS by design.
    const isOwner = student.created_by_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deletedCounts = {};
    const errors = [];

    // Plain student_id-keyed entities: fetch matching ids, then delete each.
    // Deletes run best-effort per record — one failure shouldn't abort
    // cleanup of everything else, but every failure is reported back so
    // the caller can see if anything was left behind.
    for (const entityName of SINGLE_STUDENT_ID_ENTITIES) {
      let count = 0;
      try {
        const records = await svc.entities[entityName].filter({ student_id: studentId });
        for (const record of records) {
          try {
            await svc.entities[entityName].delete(record.id);
            count++;
          } catch (e) {
            errors.push(`${entityName}:${record.id}: ${e.message}`);
          }
        }
      } catch (e) {
        errors.push(`${entityName} (list): ${e.message}`);
      }
      deletedCounts[entityName] = count;
    }

    // SeatingArrangement: student_id lives inside a `seats` array, not as a
    // top-level field, so it needs a filter-in-code + partial update rather
    // than a direct delete-by-field.
    try {
      const arrangements = await svc.entities.SeatingArrangement.list('-updated_date', 500);
      let touched = 0;
      for (const arr of arrangements) {
        const seats = arr.seats || [];
        const filtered = seats.filter(s => s.student_id !== studentId);
        if (filtered.length !== seats.length) {
          await svc.entities.SeatingArrangement.update(arr.id, { seats: filtered });
          touched++;
        }
      }
      deletedCounts.SeatingArrangement_seats_cleared = touched;
    } catch (e) {
      errors.push(`SeatingArrangement: ${e.message}`);
    }

    // HomeworkAssignment: student_ids array + submissions[].student_id,
    // same shape mergeStudents already handles — here we remove rather
    // than reassign.
    try {
      const homework = await svc.entities.HomeworkAssignment.list('-updated_date', 500);
      const hwUpdates = [];
      for (const hw of homework) {
        let changed = false;
        const studentIds = (hw.student_ids || []).filter(id => {
          if (id === studentId) { changed = true; return false; }
          return true;
        });
        let submissions = hw.submissions || [];
        const filteredSubmissions = submissions.filter(sub => {
          if (sub.student_id === studentId) { changed = true; return false; }
          return true;
        });
        if (changed) hwUpdates.push({ id: hw.id, student_ids: studentIds, submissions: filteredSubmissions });
      }
      if (hwUpdates.length) await svc.entities.HomeworkAssignment.bulkUpdate(hwUpdates);
      deletedCounts.HomeworkAssignment_updated = hwUpdates.length;
    } catch (e) {
      errors.push(`HomeworkAssignment: ${e.message}`);
    }

    // Classroom.student_ids: remove the deleted student from every classroom's
    // enrollment array so admin statistics aren't left with orphan IDs.
    try {
      const classrooms = await svc.entities.Classroom.list('-updated_date', 1000);
      const clsUpdates = [];
      for (const c of classrooms) {
        const ids = c.student_ids || [];
        const filtered = ids.filter(id => id !== studentId);
        if (filtered.length !== ids.length) clsUpdates.push({ id: c.id, student_ids: filtered });
      }
      if (clsUpdates.length) await svc.entities.Classroom.bulkUpdate(clsUpdates);
      deletedCounts.Classroom_unenrolled = clsUpdates.length;
    } catch (e) {
      errors.push(`Classroom: ${e.message}`);
    }

    // Remove this student from other students' friends/avoid/separate
    // reference arrays — same remap mergeStudents does, minus the "keep"
    // target since there's nothing to remap to on a real delete.
    try {
      const allStudents = await svc.entities.Student.list('-updated_date', 1000);
      const refUpdates = [];
      for (const s of allStudents) {
        if (s.id === studentId) continue;
        let changed = false;
        const strip = (arr) => {
          if (!arr || !arr.length) return arr;
          const out = arr.filter(v => v !== studentId);
          if (out.length !== arr.length) changed = true;
          return out;
        };
        const friends = strip(s.friends);
        const avoid = strip(s.avoid);
        const separate = strip(s.separate);
        if (changed) refUpdates.push({ id: s.id, friends, avoid, separate });
      }
      if (refUpdates.length) await svc.entities.Student.bulkUpdate(refUpdates);
      deletedCounts.Student_references_cleared = refUpdates.length;
    } catch (e) {
      errors.push(`Student references: ${e.message}`);
    }

    // Finally, delete the student record itself.
    await svc.entities.Student.delete(studentId);

    return Response.json({
      ok: true,
      deleted_student_id: studentId,
      related_deleted: deletedCounts,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}