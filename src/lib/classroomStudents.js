// Resolves classroom <-> student links to valid, existing, deduplicated IDs.
// Admin statistics count only real enrolled students this way — orphaned or
// duplicate IDs in classroom.student_ids can never inflate the numbers.
//
// Used by the admin overview dashboard and any classroom-student count UI so
// that every student actually assigned to a class is counted exactly once,
// and IDs left behind by deletions/merges can't skew the stats.

export function resolveClassroomStudentIds(classroom, allStudents = []) {
  if (!classroom?.student_ids?.length || !allStudents.length) return [];
  const valid = new Set(allStudents.map(s => s.id));
  const seen = new Set();
  const out = [];
  for (const id of classroom.student_ids) {
    if (id && valid.has(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function countClassroomStudents(classroom, allStudents = []) {
  return resolveClassroomStudentIds(classroom, allStudents).length;
}

// Distinct valid student IDs across a set of classrooms (for scoped overview).
// Returns a Set for O(1) membership checks when filtering tasks etc.
export function resolveScopedStudentIds(classrooms = [], allStudents = []) {
  const valid = new Set(allStudents.map(s => s.id));
  const seen = new Set();
  for (const c of classrooms) {
    for (const id of (c?.student_ids || [])) {
      if (id && valid.has(id)) seen.add(id);
    }
  }
  return seen;
}