import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight, Users, BookOpen, Brain, Mail, Phone, Key,
  ClipboardList, GraduationCap, School, UserCheck, UserX,
  Sparkles, Target, MessageSquare, Quote, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

const STATUS_LABELS = {
  pending: 'ממתין',
  in_progress: 'בביצוע',
  done: 'הושלם',
};

const PRIORITY_LABELS = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
};

function ProfileField({ label, value }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 text-xs py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground leading-relaxed">{value}</span>
    </div>
  );
}

function StyleProfileSection({ icon: Icon, title, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </div>
  );
}

function StyleProfileView({ profile }) {
  if (!profile) return null;

  return (
    <div className="space-y-4">
      {/* Writing Style */}
      <StyleProfileSection icon={MessageSquare} title="סגנון כתיבה ושפה">
        <div className="bg-muted/30 rounded-lg p-3 space-y-0.5">
          <ProfileField label="שפה" value={profile.language_style} />
          <ProfileField label="משפטים" value={profile.sentence_patterns} />
          <ProfileField label="הסברים" value={profile.explanation_style} />
          <ProfileField label="מבנה" value={profile.structure_preference} />
          <ProfileField label="פורמט" value={profile.formatting_habits} />
          <ProfileField label="טון" value={profile.tone} />
        </div>
        {profile.sample_sentences?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">משפטים לדוגמה:</p>
            {profile.sample_sentences.slice(0, 3).map((s, i) => (
              <div key={i} className="text-xs italic bg-muted/30 rounded-lg p-2 border-r-2 border-primary/40">
                "{s}"
              </div>
            ))}
          </div>
        )}
      </StyleProfileSection>

      <Separator />

      {/* Questions */}
      <StyleProfileSection icon={Quote} title="סגנון שאלות">
        <div className="bg-muted/30 rounded-lg p-3 space-y-0.5">
          <ProfileField label="אופי" value={profile.question_style} />
          <ProfileField label="מבחנים" value={profile.assessment_style} />
        </div>
        {profile.question_openings?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.question_openings.map((q, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{q}</Badge>
            ))}
          </div>
        )}
      </StyleProfileSection>

      <Separator />

      {/* Pedagogy */}
      <StyleProfileSection icon={Target} title="גישה פדגוגית">
        <div className="bg-muted/30 rounded-lg p-3 space-y-0.5">
          <ProfileField label="גישה" value={profile.pedagogical_approach} />
          <ProfileField label="רמת קושי" value={profile.difficulty_calibration} />
          <ProfileField label="הדגשים" value={profile.emphasis_patterns} />
          <ProfileField label="דרגתיות" value={profile.learning_progression} />
          <ProfileField label="מוטיבציה" value={profile.motivational_elements} />
        </div>
        {profile.teaching_methods?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.teaching_methods.map((m, i) => (
              <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
            ))}
          </div>
        )}
      </StyleProfileSection>

      <Separator />

      {/* Vocabulary */}
      {profile.key_vocabulary?.length > 0 && (
        <StyleProfileSection icon={Zap} title="אוצר מילים ייחודי">
          <div className="flex flex-wrap gap-1.5">
            {profile.key_vocabulary.slice(0, 15).map((v, i) => (
              <Badge key={i} className="text-xs bg-primary/10 text-primary border-primary/20">{v}</Badge>
            ))}
          </div>
        </StyleProfileSection>
      )}
    </div>
  );
}

export default function TeacherProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher-profile', id],
    queryFn: () => base44.entities.Teacher.get(id),
    enabled: !!id && isAdmin,
  });

  const { data: styleProfiles = [] } = useQuery({
    queryKey: ['teacher-style-profile', teacher?.user_id],
    queryFn: () => base44.entities.TeacherStyleProfile.filter({ created_by_id: teacher.user_id }),
    enabled: !!teacher?.user_id && isAdmin,
  });

  const { data: classrooms = [] } = useQuery({
    queryKey: ['teacher-profile-classrooms', teacher?.id],
    queryFn: () => base44.entities.Classroom.filter({ teacher_id: teacher.id }),
    enabled: !!teacher?.id && isAdmin,
  });

  const studentIds = classrooms.flatMap(c => c.student_ids || []);

  const { data: students = [] } = useQuery({
    queryKey: ['teacher-profile-students', studentIds.join(',')],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const all = await base44.entities.Student.list();
      return all.filter(s => studentIds.includes(s.id));
    },
    enabled: studentIds.length > 0 && isAdmin,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['teacher-profile-tasks', teacher?.id],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const all = await base44.entities.Task.list('-created_date', 100);
      return all.filter(t => studentIds.includes(t.student_id));
    },
    enabled: studentIds.length > 0 && isAdmin,
  });

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-5 max-w-4xl mx-auto" dir="rtl">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-xl font-bold">אין הרשאה</p>
            <Button onClick={() => navigate('/')}>חזור לדף הבית</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading || !teacher) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const styleProfile = styleProfiles?.[0];
  let parsedProfile = null;
  if (styleProfile?.profile) {
    try {
      parsedProfile = JSON.parse(styleProfile.profile);
    } catch {
      parsedProfile = null;
    }
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-4xl mx-auto pb-8" dir="rtl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="mb-2 gap-1">
            <ArrowRight className="w-4 h-4" /> חזרה ללוח בקרה
          </Button>
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${teacher.is_active !== false ? 'bg-primary/10' : 'bg-muted'}`}>
              {teacher.is_active !== false ? (
                <UserCheck className="w-7 h-7 text-primary" />
              ) : (
                <UserX className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{teacher.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={teacher.is_active !== false ? 'default' : 'secondary'}>
                  {teacher.is_active !== false ? 'פעיל' : 'לא פעיל'}
                </Badge>
                {teacher.subject && (
                  <Badge variant="outline">{teacher.subject}</Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Teacher Details */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-4 h-4 text-primary" />
                פרטי מורה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teacher.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{teacher.email}</span>
                  </div>
                )}
                {teacher.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{teacher.phone}</span>
                  </div>
                )}
                {teacher.access_code && (
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-600" />
                    <code className="text-sm font-mono font-bold text-amber-700 dark:text-amber-400">{teacher.access_code}</code>
                  </div>
                )}
                {teacher.subject && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{teacher.subject}</span>
                  </div>
                )}
              </div>
              {teacher.admin_notes && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">הערות פנימיות:</p>
                  <p className="text-sm">{teacher.admin_notes}</p>
                </div>
              )}
              {teacher.style_summary && (
                <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">סיכום סגנון:</p>
                  <p className="text-sm">{teacher.style_summary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Teaching Style Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="w-4 h-4 text-primary" />
                פרופיל סגנון הוראה המנותח
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parsedProfile ? (
                <StyleProfileView profile={parsedProfile} />
              ) : (
                <div className="flex flex-col items-center py-6 gap-2 text-center">
                  <Sparkles className="w-10 h-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">טרם נותח פרופיל סגנון עבור זה</p>
                  {teacher.user_id && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/teacher-style')}>
                      נתח סגנון הוראה
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Classrooms */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <School className="w-4 h-4 text-primary" />
                כיתות משויכות ({classrooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classrooms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">אין כיתות משויכות</p>
              ) : (
                <div className="space-y-2">
                  {classrooms.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{c.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {c.grade_level && <span>שכבה {c.grade_level}</span>}
                            {c.school && <span>• {c.school}</span>}
                            {c.year && <span>• {c.year}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {(c.student_ids || []).length} תלמידים
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="w-4 h-4 text-primary" />
                משימות ({tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">אין משימות להצגה</p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 20).map(task => (
                    <div key={task.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {studentMap[task.student_id] && (
                            <span>{studentMap[task.student_id].full_name || studentMap[task.student_id].name}</span>
                          )}
                          {task.due_date && <span>• יעד: {task.due_date}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.priority && (
                          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                            {PRIORITY_LABELS[task.priority] || task.priority}
                          </Badge>
                        )}
                        <Badge variant={task.status === 'done' ? 'default' : 'outline'} className="text-xs">
                          {STATUS_LABELS[task.status] || task.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {tasks.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">+{tasks.length - 20} משימות נוספות</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}