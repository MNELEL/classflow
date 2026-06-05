import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock, AlertTriangle, MessageSquare,
  UserX, TrendingDown, Zap, ChevronLeft, Sun
} from 'lucide-react';
import { format, subDays, parseISO, isToday, isPast } from 'date-fns';
import { he } from 'date-fns/locale';

const TODAY = format(new Date(), 'yyyy-MM-dd');
const SINCE_30 = format(subDays(new Date(), 30), 'yyyy-MM-dd');
const HOUR = new Date().getHours();
const GREETING = HOUR < 12 ? 'בוקר טוב' : HOUR < 17 ? 'צהריים טובים' : 'ערב טוב';

/* ── helpers ──────────────────────────────────────────── */
function Section({ color, icon, title, count, link, linkLabel, children }) {
  const colors = {
    orange: 'border-orange-200 bg-orange-50/60 dark:bg-orange-900/10 dark:border-orange-800',
    red:    'border-red-200   bg-red-50/60   dark:bg-red-900/10   dark:border-red-800',
    blue:   'border-blue-200  bg-blue-50/60  dark:bg-blue-900/10  dark:border-blue-800',
    purple: 'border-purple-200 bg-purple-50/60 dark:bg-purple-900/10 dark:border-purple-800',
  };
  const iconColors = {
    orange: 'text-orange-500', red: 'text-red-500', blue: 'text-blue-500', purple: 'text-purple-500',
  };
  const badgeColors = {
    orange: 'bg-orange-100 text-orange-700 border-0',
    red:    'bg-red-100    text-red-700    border-0',
    blue:   'bg-blue-100   text-blue-700   border-0',
    purple: 'bg-purple-100 text-purple-700 border-0',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={iconColors[color]}>{icon}</span>
          <span className="text-sm font-semibold">{title}</span>
          {count > 0 && <Badge className={`text-[10px] h-4 px-1.5 ${badgeColors[color]}`}>{count}</Badge>}
        </div>
        {link && (
          <Link to={link} className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            {linkLabel} <ChevronLeft className="w-3 h-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ children, className = '' }) {
  return <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${className}`}>{children}</div>;
}

/* ── main ─────────────────────────────────────────────── */
export default function DailyBriefing({ students = [] }) {
  const studentMap = useMemo(() => Object.fromEntries(students.map(s => [s.id, s])), [students]);

  const { data: tasks = [] } = useQuery({ queryKey: ['tasks', 'all'], queryFn: () => base44.entities.Task.list() });
  const { data: attendance = [] } = useQuery({ queryKey: ['attendance'], queryFn: () => base44.entities.Attendance.list('-date', 300) });
  const { data: grades = [] } = useQuery({ queryKey: ['grades'], queryFn: () => base44.entities.Grade.list('-date', 200) });
  const { data: sharedLessons = [] } = useQuery({ queryKey: ['shared_lessons_all'], queryFn: () => base44.entities.SharedLesson.list('-shared_at', 50) });
  const { data: parentContacts = [] } = useQuery({ queryKey: ['parent_contacts'], queryFn: () => base44.entities.ParentContact.list('-date', 30) });
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => base44.entities.Reward.list('-date', 100) });

  /* ── today's tasks ── */
  const todayTasks = useMemo(() => tasks.filter(t => t.due_date === TODAY && t.status !== 'done'), [tasks]);
  const overdueTasks = useMemo(() => tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < TODAY), [tasks]);

  /* ── parent notifications ── */
  const unviewedShared = useMemo(() => sharedLessons.filter(s => !s.viewed_at), [sharedLessons]);
  const parentComments = useMemo(() => sharedLessons.filter(s => s.parent_comment?.trim()), [sharedLessons]);
  const pendingFollowUps = useMemo(() => parentContacts.filter(c => c.follow_up_needed && (!c.follow_up_date || c.follow_up_date <= TODAY)), [parentContacts]);

  /* ── students needing attention ── */
  const needsAttention = useMemo(() => {
    const result = [];
    const activeStudents = students.filter(s => s.is_active !== false);

    // Absences in last 30 days
    const recentAbsences = attendance.filter(a => a.status === 'absent' && a.date >= SINCE_30);
    const absenceCounts = {};
    recentAbsences.forEach(a => { absenceCounts[a.student_id] = (absenceCounts[a.student_id] || 0) + 1; });

    // Average grade per student (last 60 days)
    const gradeMap = {};
    grades.forEach(g => {
      if (!gradeMap[g.student_id]) gradeMap[g.student_id] = [];
      gradeMap[g.student_id].push(g.score);
    });

    // Reward points (last 30 days)
    const recentRewards = rewards.filter(r => r.date >= SINCE_30);
    const rewardMap = {};
    recentRewards.forEach(r => { rewardMap[r.student_id] = (rewardMap[r.student_id] || 0) + r.points; });

    activeStudents.forEach(s => {
      const reasons = [];
      const absences = absenceCounts[s.id] || 0;
      if (absences >= 3) reasons.push({ icon: '🏠', text: `${absences} חיסורים ב-30 יום`, severity: absences >= 5 ? 'high' : 'medium' });

      const sg = gradeMap[s.id];
      if (sg?.length >= 2) {
        const avg = sg.reduce((a, b) => a + b, 0) / sg.length;
        if (avg < 60) reasons.push({ icon: '📉', text: `ממוצע ${Math.round(avg)}`, severity: 'high' });
        else if (avg < 70) reasons.push({ icon: '📊', text: `ממוצע ${Math.round(avg)}`, severity: 'medium' });
      }

      const pts = rewardMap[s.id] || 0;
      if (pts < 0) reasons.push({ icon: '⚠️', text: 'נקודות שליליות', severity: 'medium' });

      const traitFlags = s.traits?.filter(t => ['struggling', 'needs_teacher_attention', 'needs_encouragement'].includes(t)) || [];
      if (traitFlags.length) reasons.push({ icon: '💬', text: traitFlags.map(t => ({ struggling: 'מתקשה', needs_teacher_attention: 'דורש תשומת לב', needs_encouragement: 'צריך עידוד' })[t]).join(', '), severity: 'low' });

      if (reasons.length) result.push({ student: s, reasons, topSeverity: reasons.some(r => r.severity === 'high') ? 'high' : reasons.some(r => r.severity === 'medium') ? 'medium' : 'low' });
    });

    return result.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.topSeverity] - order[b.topSeverity];
    });
  }, [students, attendance, grades, rewards]);

  const totalAlerts = todayTasks.length + overdueTasks.length + unviewedShared.length + parentComments.length + pendingFollowUps.length + needsAttention.length;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mb-6">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-yellow-500" />
          <span className="font-semibold text-sm">{GREETING} — {format(new Date(), 'EEEE, d בMMMM', { locale: he })}</span>
        </div>
        {totalAlerts > 0
          ? <Badge className="bg-primary/10 text-primary border-0 text-xs">{totalAlerts} פריטים לטיפול</Badge>
          : <Badge className="bg-green-100 text-green-700 border-0 text-xs">✓ הכל תקין</Badge>
        }
      </div>

      {/* ── TODAY'S TASKS ── */}
      {(todayTasks.length > 0 || overdueTasks.length > 0) && (
        <Section color="orange" icon={<Clock className="w-4 h-4" />} title="משימות להיום"
          count={todayTasks.length + overdueTasks.length} link="/students" linkLabel="כל המשימות">
          <div className="space-y-1.5">
            {overdueTasks.slice(0, 2).map(t => (
              <Row key={t.id} className="bg-red-100/60 dark:bg-red-900/20">
                <span className="font-medium text-red-700 dark:text-red-400 truncate max-w-[70%]">
                  ⚠️ {studentMap[t.student_id]?.name || '—'}: {t.title}
                </span>
                <span className="text-red-500 text-[10px] shrink-0">באיחור</span>
              </Row>
            ))}
            {todayTasks.slice(0, 3).map(t => (
              <Row key={t.id} className="bg-orange-100/50 dark:bg-orange-900/20">
                <span className="font-medium truncate max-w-[70%]">{studentMap[t.student_id]?.name || '—'}: {t.title}</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">{t.subject || t.priority}</Badge>
              </Row>
            ))}
            {(todayTasks.length + overdueTasks.length) > 5 && (
              <p className="text-[10px] text-muted-foreground pr-1">ועוד {todayTasks.length + overdueTasks.length - 5} משימות...</p>
            )}
          </div>
        </Section>
      )}

      {/* ── PARENT NOTIFICATIONS ── */}
      {(unviewedShared.length > 0 || parentComments.length > 0 || pendingFollowUps.length > 0) && (
        <Section color="blue" icon={<MessageSquare className="w-4 h-4" />} title="התראות הורים"
          count={unviewedShared.length + parentComments.length + pendingFollowUps.length}
          link="/parents" linkLabel="פורטל הורים">
          <div className="space-y-1.5">
            {parentComments.slice(0, 3).map(s => (
              <Row key={s.id} className="bg-blue-100/50 dark:bg-blue-900/20">
                <span className="font-medium truncate max-w-[70%]">
                  💬 {s.student_name}: "{s.parent_comment?.slice(0, 40)}{s.parent_comment?.length > 40 ? '...' : ''}"
                </span>
                <Badge className="bg-blue-200 text-blue-800 border-0 text-[9px] h-4 px-1 shrink-0">הערה חדשה</Badge>
              </Row>
            ))}
            {pendingFollowUps.slice(0, 2).map(c => (
              <Row key={c.id} className="bg-blue-100/50 dark:bg-blue-900/20">
                <span className="font-medium truncate max-w-[70%]">📞 {studentMap[c.student_id]?.name || c.parent_name}: {c.summary?.slice(0, 35)}...</span>
                <Badge className="bg-amber-100 text-amber-800 border-0 text-[9px] h-4 px-1 shrink-0">ממתין למעקב</Badge>
              </Row>
            ))}
            {unviewedShared.length > 0 && (
              <Row className="bg-blue-50 dark:bg-blue-900/10">
                <span className="text-muted-foreground">📄 {unviewedShared.length} סיכומים שלא נצפו על ידי הורים</span>
                <Link to="/parents" className="text-blue-600 text-[11px] hover:underline shrink-0">עקוב</Link>
              </Row>
            )}
          </div>
        </Section>
      )}

      {/* ── STUDENTS NEEDING ATTENTION ── */}
      {needsAttention.length > 0 && (
        <Section color={needsAttention.some(n => n.topSeverity === 'high') ? 'red' : 'purple'}
          icon={<UserX className="w-4 h-4" />} title="תלמידים זקוקים לתשומת לב"
          count={needsAttention.length} link="/students" linkLabel="לניהול תלמידים">
          <div className="space-y-1.5">
            {needsAttention.slice(0, 5).map(({ student, reasons, topSeverity }) => (
              <Row key={student.id} className={
                topSeverity === 'high' ? 'bg-red-100/60 dark:bg-red-900/20'
                : topSeverity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/10'
                : 'bg-purple-50 dark:bg-purple-900/10'
              }>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    topSeverity === 'high' ? 'bg-red-500' : topSeverity === 'medium' ? 'bg-amber-500' : 'bg-purple-500'
                  }`}>
                    {student.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs">{student.name}</span>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {reasons.slice(0, 2).map((r, i) => (
                        <span key={i} className="text-[10px] text-muted-foreground">{r.icon} {r.text}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <Link to={`/students`} className="text-[11px] text-primary hover:underline shrink-0">פתח</Link>
              </Row>
            ))}
            {needsAttention.length > 5 && (
              <p className="text-[10px] text-muted-foreground pr-1">ועוד {needsAttention.length - 5} תלמידים...</p>
            )}
          </div>
        </Section>
      )}

      {/* All clear */}
      {totalAlerts === 0 && students.length > 0 && (
        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">הכל תקין!</p>
            <p className="text-xs text-green-600 dark:text-green-400">אין משימות, התראות, או תלמידים הדורשים תשומת לב מיוחדת</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}