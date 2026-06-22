import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Users, BookOpen, Mail, Phone, Save, Loader2, FileText,
  Calendar, TrendingUp, Award, AlertCircle, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import PreMeetingBriefing from '@/components/admin/PreMeetingBriefing';
import TeacherMeetingManager from '@/components/admin/TeacherMeetingManager';

export default function TeacherInsightsDetail({ teacher, classrooms, allStudents, allTasks, allGrades, allBehavior }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(teacher.admin_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  // Meetings for this teacher
  const { data: meetings = [] } = useQuery({
    queryKey: ['teacher-meetings', teacher.id],
    queryFn: () => base44.entities.TeacherMeeting.filter({ teacher_id: teacher.id }),
  });

  // Teacher's classes and students
  const teacherClassrooms = classrooms.filter(c => c.teacher_id === teacher.id);
  const teacherStudentIds = teacherClassrooms.flatMap(c => c.student_ids || []);
  const teacherStudents = allStudents.filter(s => teacherStudentIds.includes(s.id));
  const teacherTasks = allTasks.filter(t => teacherStudentIds.includes(t.student_id));
  const teacherGrades = allGrades.filter(g => teacherStudentIds.includes(g.student_id));
  const teacherBehavior = allBehavior.filter(e => teacherStudentIds.includes(e.student_id));

  // Derived metrics
  const doneTasks = teacherTasks.filter(t => t.status === 'done').length;
  const completionRate = teacherTasks.length ? Math.round((doneTasks / teacherTasks.length) * 100) : 0;
  const avgScore = teacherGrades.length
    ? Math.round(teacherGrades.reduce((s, g) => s + (g.score / (g.max_score || 100)) * 100, 0) / teacherGrades.length)
    : null;
  const positiveEvents = teacherBehavior.filter(e => e.type === 'positive' || e.type === 'improvement').length;
  const negativeEvents = teacherBehavior.filter(e => e.type === 'negative' || e.type === 'concern').length;
  const positiveRatio = teacherBehavior.length ? Math.round((positiveEvents / teacherBehavior.length) * 100) : 0;

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await base44.entities.Teacher.update(teacher.id, { admin_notes: notes });
      qc.invalidateQueries({ queryKey: ['teachers'] });
      toast.success('הערות נשמרו');
    } catch {
      toast.error('שגיאה בשמירה');
    } finally {
      setSavingNotes(false);
    }
  }

  const sortedMeetings = [...meetings].sort((a, b) =>
    new Date(b.meeting_date || 0) - new Date(a.meeting_date || 0)
  );

  return (
    <div className="space-y-4">
      {/* Teacher header */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg">{teacher.full_name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
            {teacher.subject && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{teacher.subject}</span>}
            {teacher.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{teacher.email}</span>}
            {teacher.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{teacher.phone}</span>}
          </div>
        </div>
        <Badge variant={teacher.is_active !== false ? 'default' : 'secondary'} className="text-xs">
          {teacher.is_active !== false ? 'פעיל' : 'לא פעיל'}
        </Badge>
      </div>

      {/* Pre-meeting briefing (AI) */}
      <PreMeetingBriefing
        teacher={teacher}
        students={teacherStudents}
        tasks={teacherTasks}
        grades={teacherGrades}
        behaviorEvents={teacherBehavior}
        meetings={meetings}
        onSaved={() => qc.invalidateQueries({ queryKey: ['teachers'] })}
      />

      {/* Class data overview */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            נתוני כיתות
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Classrooms */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">כיתות ({teacherClassrooms.length})</p>
            {teacherClassrooms.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">לא שויכו כיתות</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {teacherClassrooms.map(c => (
                  <Badge key={c.id} variant="outline" className="text-xs gap-1">
                    <BookOpen className="w-3 h-3" />
                    {c.name}
                    <span className="text-muted-foreground">· {(c.student_ids || []).length} תלמידים</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              icon={Award}
              label="השלמת משימות"
              value={`${completionRate}%`}
              sub={`${doneTasks}/${teacherTasks.length} הושלמו`}
              color="text-amber-600"
              bg="bg-amber-50 dark:bg-amber-950/20"
            />
            <MetricCard
              icon={TrendingUp}
              label="ממוצע ציונים"
              value={avgScore !== null ? `${avgScore}%` : '—'}
              sub={`${teacherGrades.length} ציונים`}
              color="text-emerald-600"
              bg="bg-emerald-50 dark:bg-emerald-950/20"
            />
            <MetricCard
              icon={Award}
              label="אירועים חיוביים"
              value={positiveEvents}
              sub={`${positiveRatio}% מסה"כ`}
              color="text-blue-600"
              bg="bg-blue-50 dark:bg-blue-950/20"
            />
            <MetricCard
              icon={AlertCircle}
              label="אירועים לתשומת לב"
              value={negativeEvents}
              sub={teacherBehavior.length ? `${100 - positiveRatio}% מסה"כ` : '—'}
              color="text-rose-600"
              bg="bg-rose-50 dark:bg-rose-950/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Admin notes */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            הערות אישיות על המורה
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="הערות פנימיות, חוזקות, תחומים לשיפור, דברים שעלו בשיחות קודמות..."
            className="min-h-[100px] text-sm"
          />
          <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm" className="w-full gap-2">
            {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            שמור הערות
          </Button>
        </CardContent>
      </Card>

      {/* Meeting history */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            היסטוריית פגישות ({meetings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {sortedMeetings.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">אין פגישות רשומות</p>
          ) : (
            <div className="space-y-2">
              {sortedMeetings.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {m.meeting_date ? format(parseISO(m.meeting_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '—'}
                    </p>
                    {m.topics && <p className="text-[11px] text-muted-foreground truncate">{m.topics}</p>}
                    {m.summary && <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2">{m.summary}</p>}
                  </div>
                </div>
              ))}
              {sortedMeetings.length > 3 && (
                <p className="text-[11px] text-muted-foreground text-center">+{sortedMeetings.length - 3} פגישות נוספות</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full meeting manager */}
      <div className="border-t border-border/60 pt-3">
        <TeacherMeetingManager teacher={teacher} />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className={`rounded-xl p-3 ${bg} border border-border/40`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}