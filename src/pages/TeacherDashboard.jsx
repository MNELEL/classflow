import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  GraduationCap, 
  ClipboardCheck, 
  TrendingUp, 
  LogOut,
  Calendar,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [teacherId, setTeacherId] = useState(null);
  const [teacherName, setTeacherName] = useState('');

  useEffect(() => {
    const tid = sessionStorage.getItem('classflow_teacher_id');
    const tname = sessionStorage.getItem('classflow_teacher_name');
    if (!tid) {
      navigate('/teacher-login');
      return;
    }
    setTeacherId(tid);
    setTeacherName(tname || 'מורה');
  }, [navigate]);

  const { data: classroom } = useQuery({
    queryKey: ['teacher-classroom', teacherId],
    queryFn: async () => {
      if (!teacherId) return null;
      const classrooms = await base44.entities.Classroom.filter({ teacher_id: teacherId, is_active: true });
      return classrooms?.[0] || null;
    },
    enabled: !!teacherId,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['classroom-students', classroom?.student_ids],
    queryFn: async () => {
      if (!classroom?.student_ids?.length) return [];
      const allStudents = await base44.entities.Student.list();
      return allStudents.filter(s => classroom.student_ids.includes(s.id));
    },
    enabled: !!classroom?.student_ids,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['classroom-attendance', classroom?.student_ids],
    queryFn: async () => {
      if (!classroom?.student_ids?.length) return [];
      return base44.entities.Attendance.list();
    },
    enabled: !!classroom?.student_ids,
  });

  const { data: grades = [] } = useQuery({
    queryKey: ['classroom-grades', classroom?.student_ids],
    queryFn: async () => {
      if (!classroom?.student_ids?.length) return [];
      return base44.entities.Grade.list();
    },
    enabled: !!classroom?.student_ids,
  });

  const handleLogout = () => {
    sessionStorage.removeItem('classflow_teacher_id');
    sessionStorage.removeItem('classflow_teacher_name');
    sessionStorage.removeItem('classflow_user_role');
    toast.success('התנתקת בהצלחה');
    navigate('/teacher-login');
  };

  if (!teacherId || !classroom) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const activeStudents = students.filter(s => s.is_active !== false);
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === today);
  const attendanceRate = activeStudents.length > 0 
    ? Math.round((todayAttendance.filter(a => a.status === 'present').length / activeStudents.length) * 100)
    : 0;

  const avgGrade = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length)
    : null;

  const stats = [
    {
      title: 'תלמידים בכיתה',
      value: activeStudents.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'נוכחות היום',
      value: `${attendanceRate}%`,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: avgGrade !== null ? 'ממוצע ציונים' : 'ללא ציונים',
      value: avgGrade !== null ? avgGrade : '—',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'מטלות פתוחות',
      value: '0',
      icon: ClipboardCheck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  const quickActions = [
    { title: 'סידור ישיבה', icon: Users, path: '/seating', color: 'bg-teal-500' },
    { title: 'נוכחות', icon: Calendar, path: '/attendance', color: 'bg-blue-500' },
    { title: 'ציונים', icon: GraduationCap, path: '/grades', color: 'bg-purple-500' },
    { title: 'מטלות', icon: ClipboardCheck, path: '/homework', color: 'bg-orange-500' },
    { title: 'ספריה', icon: BookOpen, path: '/library', color: 'bg-pink-500' },
    { title: 'משוב להורים', icon: MessageSquare, path: '/parents', color: 'bg-indigo-500' },
  ];

  return (
    <AppLayout>
      <div className="p-4 max-w-5xl mx-auto overflow-y-auto h-full pb-8" dir="rtl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold">הכיתה שלי</h1>
            <p className="text-muted-foreground text-sm">{classroom.name} • {classroom.grade_level || 'לא צוין'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" /> התנתק
          </Button>
        </motion.div>

        {/* Classroom Info */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="w-5 h-5 text-primary" />
                {classroom.name}
                <Badge variant="outline" className="mr-2">שנת לימודים {classroom.year || new Date().getFullYear()}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">מורה אחראי</p>
                  <p className="font-semibold">{classroom.teacher_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">מוסד</p>
                  <p className="font-semibold">{classroom.school || 'לא צוין'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">שכבה</p>
                  <p className="font-semibold">{classroom.grade_level || 'לא צוין'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">תלמידים</p>
                  <p className="font-semibold">{activeStudents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-bold mb-3">פעולות מהירות</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                className="h-24 flex-col gap-2 border-2 hover:border-primary/30"
                onClick={() => navigate(action.path)}
              >
                <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium">{action.title}</span>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity Placeholder */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <h2 className="text-lg font-bold mb-3">פעילות אחרונה</h2>
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>אין פעילות לאחרונה</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}