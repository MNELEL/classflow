import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Activity, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StudentEngagementPanel
 * מציג מדד מעורבות לכל תלמיד על בסיס:
 *  - ציונים (50%): ממוצע ציונים מנורמל ל-0–100
 *  - השלמת משימות (30%): יחס משימות שהושלמו מתוך סה"כ
 *  - הגשת שיעורים (20%): יחס הגשות מתוך מטלות מוקצות
 */
export default function StudentEngagementPanel({ students, grades, homework }) {
  const [search, setSearch] = useState('');

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-for-engagement'],
    queryFn: () => base44.entities.Task.list('-due_date', 200),
    staleTime: 60000,
  });

  const engagementData = useMemo(() => {
    if (!students?.length) return [];
    return students
      .filter(s => s.is_active !== false)
      .map(student => {
        const sid = student.id;
        const sGrades = grades?.filter(g => g.student_id === sid) || [];
        const sTasks = tasks.filter(t => t.student_id === sid);
        const doneTasks = sTasks.filter(t => t.status === 'done');

        // חישוב הגשות שיעורים מתוך מערך submissions במטלות
        let assignedCount = 0;
        let submittedCount = 0;
        (homework || []).forEach(hw => {
          const sub = hw.submissions?.find(su => su.student_id === sid);
          if (sub) {
            assignedCount++;
            if (sub.submitted) submittedCount++;
          }
        });

        // ציון ציונים: ממוצע נורמל ל-100
        const gradeScore = sGrades.length > 0
          ? Math.round(sGrades.reduce((sum, g) => sum + (g.score || 0) / (g.max_score || 100) * 100, 0) / sGrades.length)
          : null;

        // יחס השלמת משימות
        const taskRatio = sTasks.length > 0 ? (doneTasks.length / sTasks.length) * 100 : null;

        // יחס הגשת שיעורים
        const hwRatio = assignedCount > 0 ? (submittedCount / assignedCount) * 100 : null;

        // חישוב מדד מעורבות משוקלל
        let total = 0;
        let weight = 0;
        if (gradeScore !== null) { total += gradeScore * 0.5; weight += 0.5; }
        if (taskRatio !== null) { total += taskRatio * 0.3; weight += 0.3; }
        if (hwRatio !== null) { total += hwRatio * 0.2; weight += 0.2; }

        const engagement = weight > 0 ? Math.round(total / weight) : null;

        return {
          id: sid,
          name: student.name,
          engagement,
          gradeScore,
          taskRatio: taskRatio !== null ? Math.round(taskRatio) : null,
          hwRatio: hwRatio !== null ? Math.round(hwRatio) : null,
          gradeCount: sGrades.length,
          taskTotal: sTasks.length,
          taskDone: doneTasks.length,
          hwAssigned: assignedCount,
          hwSubmitted: submittedCount,
        };
      })
      .sort((a, b) => (b.engagement ?? -1) - (a.engagement ?? -1));
  }, [students, grades, tasks, homework]);

  const filtered = engagementData.filter(s =>
    !search || s.name.includes(search.trim())
  );

  const avgEngagement = engagementData.length > 0 && engagementData.some(e => e.engagement !== null)
    ? Math.round(engagementData.filter(e => e.engagement !== null).reduce((s, e) => s + e.engagement, 0) / engagementData.filter(e => e.engagement !== null).length)
    : null;

  const getLevel = (score) => {
    if (score === null) return { label: 'אין נתונים', color: 'text-muted-foreground', bg: 'bg-muted', bar: 'bg-muted' };
    if (score >= 80) return { label: 'מעורבות גבוהה', color: 'text-emerald-600', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' };
    if (score >= 60) return { label: 'מעורבות בינונית', color: 'text-blue-600', bg: 'bg-blue-500/10', bar: 'bg-blue-500' };
    if (score >= 40) return { label: 'מעורבות נמוכה', color: 'text-yellow-600', bg: 'bg-yellow-500/10', bar: 'bg-yellow-500' };
    return { label: 'טעון שיפור', color: 'text-red-600', bg: 'bg-red-500/10', bar: 'bg-red-500' };
  };

  const topStudent = engagementData[0]?.engagement !== null ? engagementData[0] : null;
  const bottomStudent = [...engagementData].reverse().find(e => e.engagement !== null) || null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-primary" /> מדד מעורבות תלמידים
          </CardTitle>
          {avgEngagement !== null && (
            <div className="text-xs text-muted-foreground">
              ממוצע כיתתי: <span className="font-bold text-foreground">{avgEngagement}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          ציונים (50%) · השלמת משימות (30%) · הגשת שיעורים (20%)
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* סיכום מהיר */}
        {topStudent && bottomStudent && topStudent.id !== bottomStudent.id && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">מוביל</p>
                <p className="text-sm font-semibold text-emerald-700 truncate">{topStudent.name}</p>
              </div>
              <span className="text-lg font-bold text-emerald-600 mr-auto">{topStudent.engagement}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-2">
              <TrendingDown className="w-4 h-4 text-yellow-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">טעון תשומת לב</p>
                <p className="text-sm font-semibold text-yellow-700 truncate">{bottomStudent.name}</p>
              </div>
              <span className="text-lg font-bold text-yellow-600 mr-auto">{bottomStudent.engagement}</span>
            </div>
          </div>
        )}

        {/* חיפוש */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="חיפוש תלמיד..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 h-9"
          />
        </div>

        {/* רשימת תלמידים */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2 text-center">
            <Activity className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">
              {students?.length === 0 ? 'אין תלמידים בכיתה' : 'לא נמצאו תוצאות'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
            {filtered.map((s, i) => {
              const level = getLevel(s.engagement);
              const trendIcon = i < (engagementData.length / 3)
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                : i > (engagementData.length * 2 / 3)
                ? <TrendingDown className="w-3.5 h-3.5 text-yellow-500" />
                : <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-lg border border-border/60 p-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {trendIcon}
                      <span className="text-sm font-medium truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${level.bg} ${level.color}`}>
                        {level.label}
                      </span>
                      <span className={`text-lg font-bold ${level.color} w-10 text-center tabular-nums`}>
                        {s.engagement !== null ? s.engagement : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={`h-2 rounded-full ${level.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.engagement ?? 0}%` }}
                      transition={{ duration: 0.7, delay: i * 0.02 + 0.1 }}
                    />
                  </div>
                  {/* פירוט נתונים */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span title="ממוצע ציונים">
                      📊 {s.gradeScore !== null ? `${s.gradeScore}` : '—'}
                      <span className="text-[10px] opacity-70"> / 100</span>
                    </span>
                    <span title="משימות שהושלמו">
                      ✓ {s.taskDone}/{s.taskTotal || 0}
                      {s.taskRatio !== null && <span className="text-[10px] opacity-70"> ({s.taskRatio}%)</span>}
                    </span>
                    <span title="הגשת שיעורים">
                      📚 {s.hwSubmitted}/{s.hwAssigned || 0}
                      {s.hwRatio !== null && <span className="text-[10px] opacity-70"> ({s.hwRatio}%)</span>}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}