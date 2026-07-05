import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Brain, BookOpen, Lightbulb, Users, Calendar, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import TeachingStyleOverview from '@/components/admin/TeachingStyleOverview';
import PedagogicalInsightsFeed from '@/components/admin/PedagogicalInsightsFeed';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

export default function TeachingStyleDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('styles');

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });
  const { data: classrooms = [] } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.entities.Classroom.list(),
  });
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.filter({ is_active: true }),
  });
  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks-all'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });
  const { data: allGrades = [] } = useQuery({
    queryKey: ['grades-all'],
    queryFn: () => base44.entities.Grade.list('-created_date', 200),
  });
  const { data: allBehavior = [] } = useQuery({
    queryKey: ['behavior-all'],
    queryFn: () => base44.entities.BehaviorEvent.list('-created_date', 200),
  });
  const { data: meetings = [] } = useQuery({
    queryKey: ['all-meetings'],
    queryFn: () => base44.entities.TeacherMeeting.list('-meeting_date', 50),
  });

  const teacherNameById = useMemo(() => {
    const map = {};
    teachers.forEach(t => { map[t.id] = t.full_name; });
    return map;
  }, [teachers]);

  const upcomingMeetings = useMemo(() => {
    const now = new Date();
    return meetings
      .filter(m => m.meeting_date && new Date(m.meeting_date) >= now)
      .sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date))
      .slice(0, 5);
  }, [meetings]);

  const recentMeetings = useMemo(() => {
    const now = new Date();
    return meetings
      .filter(m => m.meeting_date && new Date(m.meeting_date) < now)
      .sort((a, b) => new Date(b.meeting_date) - new Date(a.meeting_date))
      .slice(0, 5);
  }, [meetings]);

  if (user && user.role !== 'admin') {
    return (
      <AppLayout>
        <div className="p-5 max-w-2xl mx-auto" dir="rtl">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Shield className="w-16 h-16 text-muted-foreground/20" />
            <h2 className="text-xl font-bold">אין הרשאה</h2>
            <p className="text-muted-foreground text-sm">דף זה נגיש למנהלי מערכת בלבד</p>
            <Button onClick={() => navigate('/')}>חזור לדף הבית</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user || isLoading) {
    return (
      <AppLayout>
        <div className="p-5 max-w-2xl mx-auto" dir="rtl">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const TABS = [
    { id: 'styles', label: 'סגנונות הוראה', icon: Users },
    { id: 'insights', label: 'תובנות פדגוגיות', icon: Lightbulb },
    { id: 'meetings', label: 'פגישות', icon: Calendar },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto" dir="rtl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 pb-2"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold">ניתוח מצטבר — סגנונות הוראה</h1>
              <p className="text-xs text-muted-foreground">סקירה כללית להכנת פגישות אישיות עם מורים</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => navigate('/teacher-insights')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              ניתוח פרטני
            </Button>
          </div>
        </motion.div>

        {/* Quick meeting prep banner */}
        {(upcomingMeetings.length > 0 || recentMeetings.length > 0) && (
          <div className="px-4 pb-2">
            <Card className="border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/10">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-violet-600" />
                  <p className="text-sm font-semibold">הכנה לפגישות</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {upcomingMeetings.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">פגישות קרובות</p>
                      <div className="space-y-1">
                        {upcomingMeetings.map(m => (
                          <div key={m.id} className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-violet-600">
                              {format(parseISO(m.meeting_date), 'dd/MM HH:mm', { locale: he })}
                            </span>
                            <span className="text-muted-foreground truncate">
                              {teacherNameById[m.teacher_id] || m.teacher_name || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {recentMeetings.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">פגישות אחרונות</p>
                      <div className="space-y-1">
                        {recentMeetings.slice(0, 3).map(m => (
                          <div key={m.id} className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-muted-foreground">
                              {format(parseISO(m.meeting_date), 'dd/MM', { locale: he })}
                            </span>
                            <span className="text-muted-foreground truncate">
                              {teacherNameById[m.teacher_id] || m.teacher_name || '—'}
                            </span>
                            {m.topics && <span className="text-[10px] text-muted-foreground/70 truncate">· {m.topics}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab bar */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-8">
          {tab === 'styles' && (
            <TeachingStyleOverview
              teachers={teachers}
              classrooms={classrooms}
              allStudents={allStudents}
              allTasks={allTasks}
              allGrades={allGrades}
              allBehavior={allBehavior}
            />
          )}
          {tab === 'insights' && <PedagogicalInsightsFeed />}
          {tab === 'meetings' && (
            <MeetingsTab
              meetings={meetings}
              teacherNameById={teacherNameById}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function MeetingsTab({ meetings, teacherNameById }) {
  const sorted = [...meetings].sort((a, b) =>
    new Date(b.meeting_date || 0) - new Date(a.meeting_date || 0)
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <Calendar className="w-10 h-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">אין פגישות רשומות</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map(m => (
        <Card key={m.id}>
          <CardContent className="p-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold truncate">
                    {teacherNameById[m.teacher_id] || m.teacher_name || '—'}
                  </p>
                  {m.type && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      {m.type === 'one_on_one' ? 'אישית' : m.type === 'staff_meeting' ? 'צוות' : m.type === 'evaluation' ? 'הערכה' : 'משוב'}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mb-1">
                  {m.meeting_date ? format(parseISO(m.meeting_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '—'}
                </p>
                {m.topics && <p className="text-xs font-medium mb-1">{m.topics}</p>}
                {m.summary && <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{m.summary}</p>}
                {m.action_items && (
                  <div className="mt-1.5 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg p-2 border border-amber-100 dark:border-amber-900/30">
                    <p className="text-[10px] text-amber-700 font-semibold mb-0.5">משימות לביצוע</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{m.action_items}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}