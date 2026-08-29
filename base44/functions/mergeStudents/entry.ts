import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const keepId = body?.keep_id;
    const removeIds = Array.isArray(body?.remove_ids)
      ? body.remove_ids.filter(x => x && x !== keepId)
      : [];
    if (!keepId || removeIds.length === 0)
      return Response.json({ error: 'keep_id and remove_ids required' }, { status: 400 });

    const svc = base44.asServiceRole;

    const keep = await svc.entities.Student.get(keepId);
    const dups = [];
    for (const rid of removeIds) {
      try { dups.push(await svc.entities.Student.get(rid)); } catch {}
    }
    if (!dups.length) return Response.json({ error: 'No duplicate students found' }, { status: 404 });

    // Merge scalar fields (keep wins, then first non-empty from duplicates)
    const SCALARS = ['name','gender','height','row_preference','permanent_row','permanent_col','side_preference','avoid_edges','learning_group','group','notes','is_active','academic_level','achievements','custom_conditions'];
    const merged = { ...keep };
    for (const f of SCALARS) {
      if (merged[f] == null || merged[f] === '') {
        for (const d of dups) { if (d[f] != null && d[f] !== '') { merged[f] = d[f]; break; } }
      }
    }
    // special_needs union
    const sn = new Set(keep.special_needs || []);
    dups.forEach(d => (d.special_needs || []).forEach(v => sn.add(v)));
    if (sn.size) merged.special_needs = [...sn];
    // custom_fields merge (first non-empty per key)
    const cf = { ...(keep.custom_fields || {}) };
    for (const d of dups) {
      for (const k of Object.keys(d.custom_fields || {})) {
        if (cf[k] == null || String(cf[k]).trim() === '') {
          const v = d.custom_fields[k];
          if (v != null && String(v).trim() !== '') cf[k] = v;
        }
      }
    }
    merged.custom_fields = cf;
    // friends/avoid/separate union (id arrays)
    const unionIds = (field) => {
      const set = new Set(keep[field] || []);
      dups.forEach(d => (d[field] || []).forEach(v => set.add(v)));
      set.delete(keepId);
      removeIds.forEach(r => set.delete(r));
      return [...set];
    };
    merged.friends = unionIds('friends');
    merged.avoid = unionIds('avoid');
    merged.separate = unionIds('separate');

    // Update the kept student with merged data (strip built-ins)
    const { id, created_date, updated_date, created_by, created_by_id, ...keepUpdate } = merged;
    await svc.entities.Student.update(keepId, keepUpdate);

    // Reassign related single student_id entities to the kept student
    const SINGLE_ENTITIES = ['Grade','Attendance','FastFeedback','BehaviorEvent','StudentPortfolioItem','ParentContact','Task','OverdueAlert','SharedLesson'];
    for (const ent of SINGLE_ENTITIES) {
      for (const rid of removeIds) {
        let hasMore = true;
        while (hasMore) {
          const res = await svc.entities[ent].updateMany({ student_id: rid }, { $set: { student_id: keepId } });
          hasMore = res?.has_more === true;
        }
      }
    }

    // HomeworkAssignment: student_ids array + submissions[].student_id
    const homework = await svc.entities.HomeworkAssignment.list('-updated_date', 500);
    const hwUpdates = [];
    for (const hw of homework) {
      let changed = false;
      const setIdSet = new Set(hw.student_ids || []);
      for (const rid of removeIds) { if (setIdSet.has(rid)) { setIdSet.delete(rid); changed = true; } }
      setIdSet.add(keepId);
      const newStudentIds = [...setIdSet];
      let submissions = hw.submissions || [];
      if (submissions.length) {
        submissions = submissions.map(sub => {
          if (removeIds.includes(sub.student_id)) { changed = true; return { ...sub, student_id: keepId }; }
          return sub;
        });
      }
      if (changed) hwUpdates.push({ id: hw.id, student_ids: newStudentIds, submissions });
    }
    if (hwUpdates.length) await svc.entities.HomeworkAssignment.bulkUpdate(hwUpdates);

    // Classroom.student_ids: replace removed IDs with keepId and dedupe, so the
    // kept student inherits the duplicates' enrollments and no orphan IDs remain.
    try {
      const classrooms = await svc.entities.Classroom.list('-updated_date', 1000);
      const clsUpdates = [];
      for (const c of classrooms) {
        const ids = c.student_ids || [];
        let changed = false;
        const seen = new Set();
        const out = [];
        for (const id of ids) {
          const nv = removeIds.includes(id) ? keepId : id;
          if (seen.has(nv)) { changed = true; continue; }
          seen.add(nv);
          if (nv !== id) changed = true;
          out.push(nv);
        }
        if (changed) clsUpdates.push({ id: c.id, student_ids: out });
      }
      if (clsUpdates.length) await svc.entities.Classroom.bulkUpdate(clsUpdates);
    } catch {}

    // Remap friends/avoid/separate references on all students
    const allStudents = await svc.entities.Student.list('-updated_date', 1000);
    const refUpdates = [];
    for (const s of allStudents) {
      let changed = false;
      const remap = (arr) => {
        if (!arr || !arr.length) return arr;
        const out = [];
        const seen = new Set();
        for (const v of arr) {
          const nv = removeIds.includes(v) ? keepId : v;
          if (nv === s.id) { if (nv !== v) changed = true; continue; }
          if (seen.has(nv)) { changed = true; continue; }
          if (nv !== v) changed = true;
          seen.add(nv); out.push(nv);
        }
        if (arr.length !== out.length) changed = true;
        return out;
      };
      const friends = remap(s.friends);
      const avoid = remap(s.avoid);
      const separate = remap(s.separate);
      if (changed) refUpdates.push({ id: s.id, friends, avoid, separate });
    }
    if (refUpdates.length) await svc.entities.Student.bulkUpdate(refUpdates);

    // Delete the duplicate students
    for (const rid of removeIds) {
      try { await svc.entities.Student.delete(rid); } catch {}
    }

    return Response.json({ ok: true, kept: keepId, removed: removeIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}