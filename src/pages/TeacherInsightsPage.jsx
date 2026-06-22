import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Shield, ChevronRight, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import TeacherInsightsList from '@/components/admin/TeacherInsightsList';
import TeacherInsightsDetail from '@/components/admin/TeacherInsightsDetail';

export default function TeacherInsightsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(null);

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

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

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

  const selectedTeacher = teachers.find(t => t.id === selectedId);

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
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">ניתוח מורים ותדריכי פגישות</h1>
              <p className="text-xs text-muted-foreground">סגנון הוראה, נתוני כיתות והכנה לפגישות אישיות</p>
            </div>
          </div>
        </motion.div>

        {teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4">
            <Shield className="w-12 h-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">אין מורים במערכת</p>
            <Button size="sm" onClick={() => navigate('/admin')}>ניהול מורים</Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4 px-4 pb-8">
            {/* Teacher list — sidebar on desktop, full on mobile when nothing selected */}
            <div className={`w-full md:w-72 md:shrink-0 ${selectedTeacher ? 'hidden md:block' : 'block'}`}>
              <div className="bg-card rounded-2xl border border-border/60 overflow-hidden sticky top-20">
                <TeacherInsightsList
                  teachers={teachers}
                  classrooms={classrooms}
                  allStudents={allStudents}
                  allTasks={allTasks}
                  allGrades={allGrades}
                  allBehavior={allBehavior}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </div>

            {/* Detail — main on desktop, full on mobile when teacher selected */}
            <div className={`flex-1 ${selectedTeacher ? 'block' : 'hidden md:block'}`}>
              {selectedTeacher ? (
                <div>
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground"
                  >
                    <ChevronRight className="w-4 h-4" />
                    חזרה לרשימה
                  </button>
                  <TeacherInsightsDetail
                    teacher={selectedTeacher}
                    classrooms={classrooms}
                    allStudents={allStudents}
                    allTasks={allTasks}
                    allGrades={allGrades}
                    allBehavior={allBehavior}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Brain className="w-12 h-12 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">בחר מורה מהרשימה לצפייה בניתוח ותדריך</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}