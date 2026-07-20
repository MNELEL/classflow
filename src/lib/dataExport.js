import { base44 } from '@/api/base44Client';

// אותה רשימת ישויות "בבעלות המשתמש" כמו ב-accountCleanup.js, כדי שהייצוא
// יכלול בדיוק את מה שהמחיקה הייתה מוחקת - שום דבר פחות, שום דבר יותר.
const USER_OWNED_ENTITIES = [
  'Student',
  'LibraryItem',
  'HomeworkAssignment',
  'BehaviorEvent',
  'FastFeedback',
  'ClassroomRaffle',
  'Worksheet',
  'Exam',
  'Grade',
  'SeatingArrangement',
  'SeatHistory',
  'Attendance',
  'WeeklyPlan',
  'StudyPlan',
  'BellSchedule',
  'SchoolEvent',
  'SharedLesson',
  'WeeklyBulletin',
  'TeacherSettings',
  'TeacherStyleProfile',
  'Task',
  'CurriculumWeek',
  'Reward',
  'Campaign',
  'ParentContact',
  'StudentPortfolioItem',
  'LessonPlan',
  'LessonCategory',
];

/**
 * מייצא את כל הנתונים של המשתמש המחובר מכל הישויות הרלוונטיות.
 * פעולת קריאה בלבד - לא משנה ולא מוחקת כלום. מיועד לגיבוי/העברה ידנית
 * לפלטפורמה אחרת.
 * @param {{id: string}} user
 * @returns {Promise<{exported_at: string, data: Record<string, any[]>, errors: Record<string, string>}>}
 */
export async function exportAllUserData(user) {
  if (!user?.id) throw new Error('משתמש לא מחובר');

  const filter = { created_by_id: user.id };
  const data = {};
  const errors = {};

  await Promise.all(
    USER_OWNED_ENTITIES.map(async (name) => {
      try {
        const entity = base44.entities[name];
        if (!entity) {
          errors[name] = 'ישות לא זמינה';
          return;
        }
        data[name] = await entity.filter(filter);
      } catch (err) {
        errors[name] = err?.message || 'שגיאה לא ידועה';
        data[name] = [];
      }
    })
  );

  return {
    exported_at: new Date().toISOString(),
    data,
    errors,
  };
}

/** מפעיל הורדה של אובייקט JSON בדפדפן, בשם הקובץ הנתון. */
export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
