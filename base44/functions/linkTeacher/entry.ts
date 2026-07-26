import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Links a teacher record to the authenticated user via access code.
// Called from TeacherLogin — uses asServiceRole to bypass RLS since the
// teacher's user_id is not yet set at the time of linking.
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

    // Find teacher by access code (service role bypasses RLS)
    const teachers = await base44.asServiceRole.entities.Teacher.filter({
      access_code: access_code.trim(),
      is_active: true,
    });

    if (!teachers || teachers.length === 0) {
      return Response.json(
        { error: 'קוד הגישה לא תקין או שאינו פעיל' },
        { status: 404 }
      );
    }

    const teacher = teachers[0];

    // Link teacher to current user
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