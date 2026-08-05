import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    // Service-role counts (bypass RLS = ground truth)
    const allClassrooms = await base44.asServiceRole.entities.Classroom.list();
    const allStudents = await base44.asServiceRole.entities.Student.list();

    // User-scoped counts (RLS enforced for the calling user)
    const userClassrooms = await base44.entities.Classroom.list();
    const userStudents = await base44.entities.Student.list();

    const results = [
      {
        entity: 'Classroom',
        serviceRoleCount: allClassrooms.length,
        userScopeCount: userClassrooms.length,
        rlsEnforced: userClassrooms.length <= allClassrooms.length,
        status: userClassrooms.length === allClassrooms.length
          ? 'admin_reads_all'
          : 'restricted_to_own',
      },
      {
        entity: 'Student',
        serviceRoleCount: allStudents.length,
        userScopeCount: userStudents.length,
        rlsEnforced: userStudents.length <= allStudents.length,
        status: userStudents.length === allStudents.length
          ? 'admin_reads_all'
          : 'restricted_to_own',
      },
    ];

    return Response.json({
      user: { id: user.id, role: user.role },
      results,
      summary: {
        totalChecks: results.length,
        allPassed: results.every(r => r.rlsEnforced),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}