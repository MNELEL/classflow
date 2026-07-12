// Performance Score calculation — weighted metric combining grades, attendance, and behavior.
// Returns 0-100 score plus component breakdowns.

const LEVEL_SCORES = {
  weak: 30, below_average: 45, average: 60, above_average: 75, strong: 85, excellent: 95,
};

/**
 * Calculate a composite performance score for a student.
 * @param {object} student - Student entity
 * @param {array} grades - Grade records for this student
 * @param {array} attendance - Attendance records for this student
 * @param {array} behaviorEvents - BehaviorEvent records for this student
 * @returns {{ score: number, gradeScore: number, attendanceScore: number, behaviorScore: number, needsAttention: boolean, trend: string }}
 */
export function calculatePerformanceScore(student, grades = [], attendance = [], behaviorEvents = []) {
  // ── Grade score (40%) ──
  let gradeScore = LEVEL_SCORES[student.academic_level] ?? 60;
  if (grades.length > 0) {
    const avgPercent = grades.reduce((sum, g) => {
      const max = g.max_score || 100;
      return sum + ((g.score || 0) / max) * 100;
    }, 0) / grades.length;
    // Blend: 60% from actual grades, 40% from academic level baseline
    gradeScore = Math.round(avgPercent * 0.6 + (LEVEL_SCORES[student.academic_level] ?? 60) * 0.4);
  }

  // ── Attendance score (30%) ──
  let attendanceScore = 90; // default if no data
  if (attendance.length > 0) {
    const present = attendance.filter(a => a.status === 'present').length;
    const late = attendance.filter(a => a.status === 'late').length;
    // Late counts as half-present
    const rate = (present + late * 0.5) / attendance.length;
    attendanceScore = Math.round(rate * 100);
  }

  // ── Behavior score (30%) ──
  let behaviorScore = 80; // default neutral
  if (behaviorEvents.length > 0) {
    let points = 0;
    for (const evt of behaviorEvents) {
      if (evt.type === 'positive' || evt.type === 'improvement') points += 5;
      else if (evt.type === 'negative' || evt.type === 'concern') points -= 8;
      // neutral = 0
      // Severity modifier
      if (evt.severity === 'high') points += evt.type === 'positive' ? 3 : -5;
    }
    // Start at 80, apply deltas, clamp 0-100
    behaviorScore = Math.max(0, Math.min(100, 80 + points));
  }

  // ── Weighted composite ──
  const score = Math.round(gradeScore * 0.4 + attendanceScore * 0.3 + behaviorScore * 0.3);

  // ── Trend (compare recent vs older grades) ──
  let trend = 'stable';
  if (grades.length >= 4) {
    const sorted = [...grades].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const half = Math.floor(sorted.length / 2);
    const oldAvg = sorted.slice(0, half).reduce((s, g) => s + ((g.score || 0) / (g.max_score || 100)) * 100, 0) / half;
    const newAvg = sorted.slice(half).reduce((s, g) => s + ((g.score || 0) / (g.max_score || 100)) * 100, 0) / (sorted.length - half);
    if (newAvg > oldAvg + 5) trend = 'up';
    else if (newAvg < oldAvg - 5) trend = 'down';
  }

  const needsAttention = score < 55 || attendanceScore < 70 || behaviorScore < 60;

  return { score, gradeScore, attendanceScore, behaviorScore, needsAttention, trend };
}

export function getScoreColor(score) {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 70) return 'text-blue-600 dark:text-blue-400';
  if (score >= 55) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function getScoreBg(score) {
  if (score >= 85) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (score >= 70) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (score >= 55) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}