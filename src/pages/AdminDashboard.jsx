import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users, BookOpen, Plus, Copy, Check, Trash2, Edit,
  Shield, Key, School, Mail, Phone, UserCheck, UserX
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const generateAccessCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showClassroomForm, setShowClassroomForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [newTeacher, setNewTeacher] = useState({
    full_name: '', email: '', phone: '', subject: ''
  });
  const [newClassroom, setNewClassroom] = useState({
    name: '', grade_level: '', school: '', year: new Date().getFullYear().toString(), notes: ''
  });

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => base44.entities.Teacher.list(),
  });

  const { data: classrooms = [], isLoading: loadingClassrooms } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.entities.Classroom.list(),
  });

  const createTeacherMutation = useMutation({
    mutationFn: async (teacherData) => {
      const accessCode = generateAccessCode();
      const teacher = await base44.entities.Teacher.create({
        ...teacherData,
        access_code: accessCode,
        is_active: true,
      });
      return teacher;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      setShowTeacherForm(false);
      setNewTeacher({ full_name: '', email: '', phone: '', subject: '' });
      toast.success('המורה נוצר בהצלחה!');
    },
    onError: (error) => {
      toast.error('שגיאה ביצירת המורה: ' + error.message);
    },
  });

  const createClassroomMutation = useMutation({
    mutationFn: async (classroomData) => {
      const classroom = await base44.entities.Classroom.create({
        ...classroomData,
        is_active: true,
      });
      return classroom;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classrooms']);
      setShowClassroomForm(false);
      setNewClassroom({ name: '', grade_level: '', school: '', year: new Date().getFullYear().toString(), notes: '' });
      toast.success('הכיתה נוצרה בהצלחה!');
    },
    onError: (error) => {
      toast.error('שגיאה ביצירת הכיתה: ' + error.message);
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (teacherId) => {
      await base44.entities.Teacher.delete(teacherId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      toast.success('המורה נמחק בהצלחה');
    },
  });

  const deleteClassroomMutation = useMutation({
    mutationFn: async (classroomId) => {
      await base44.entities.Classroom.delete(classroomId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['classrooms']);
      toast.success('הכיתה נמחקה בהצלחה');
    },
  });

  const toggleTeacherStatusMutation = useMutation({
    mutationFn: async ({ teacherId, currentStatus }) => {
      await base44.entities.Teacher.update(teacherId, { is_active: !currentStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers']);
      toast.success('סטטוס המורה עודכן');
    },
  });

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('הקוד הועתק!');
  };

  const handleSubmitTeacher = (e) => {
    e.preventDefault();
    createTeacherMutation.mutate(newTeacher);
  };

  const handleSubmitClassroom = (e) => {
    e.preventDefault();
    createClassroomMutation.mutate(newClassroom);
  };

  const activeTeachers = teachers.filter(t => t.is_active !== false);
  const activeClassrooms = classrooms.filter(c => c.is_active !== false);

  return (
    <AppLayout>
      <div className="p-5 max-w-6xl mx-auto" dir="rtl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">לוח בקרה - מנהל מערכת</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">ניהול כיתות ומורים במערכת</p>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">סה"כ מורים</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{teachers.length}</p>
              <p className="text-xs text-muted-foreground">{activeTeachers.length} פעילים</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">סה"כ כיתות</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{classrooms.length}</p>
              <p className="text-xs text-muted-foreground">{activeClassrooms.length} פעילות</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <School className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground">כיתות משויכות</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {classrooms.filter(c => c.teacher_id).length}
              </p>
              <p className="text-xs text-muted-foreground">מתוך {classrooms.length}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-muted-foreground">קודי גישה פעילים</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{activeTeachers.length}</p>
              <p className="text-xs text-muted-foreground">לכל מורה קוד ייחודי</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <Button onClick={() => setShowTeacherForm(true)} className="flex-1">
            <Plus className="w-4 h-4 ml-1" /> הוסף מורה חדש
          </Button>
          <Button onClick={() => setShowClassroomForm(true)} variant="outline" className="flex-1">
            <BookOpen className="w-4 h-4 ml-1" /> צור כיתה חדשה
          </Button>
        </div>

        {/* Teachers Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-border/60">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                ניהול מורים ({teachers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loadingTeachers ? (
                <div className="text-center py-8 text-muted-foreground">טוען מורים...</div>
              ) : teachers.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">אין מורים במערכת</p>
                  <Button size="sm" onClick={() => setShowTeacherForm(true)}>
                    הוסף מורה ראשון
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center justify-between bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${teacher.is_active !== false ? 'bg-primary/10' : 'bg-muted'}`}>
                          {teacher.is_active !== false ? (
                            <UserCheck className="w-5 h-5 text-primary" />
                          ) : (
                            <UserX className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">{teacher.full_name}</p>
                            <Badge variant={teacher.is_active !== false ? 'default' : 'secondary'} className="text-[10px] h-5">
                              {teacher.is_active !== false ? 'פעיל' : 'לא פעיל'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {teacher.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {teacher.email}
                              </span>
                            )}
                            {teacher.subject && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {teacher.subject}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Access Code */}
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                            <code className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                              {teacher.access_code}
                            </code>
                            <button
                              onClick={() => handleCopyCode(teacher.access_code, teacher.id)}
                              className="hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded p-0.5"
                            >
                              {copiedId === teacher.id ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-amber-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleTeacherStatusMutation.mutate({
                            teacherId: teacher.id,
                            currentStatus: teacher.is_active !== false
                          })}
                          className="h-8 text-xs"
                        >
                          {teacher.is_active !== false ? 'השבת' : 'הפעל'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteTeacherMutation.mutate(teacher.id)}
                          className="h-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Classrooms Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/60">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                ניהול כיתות ({classrooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loadingClassrooms ? (
                <div className="text-center py-8 text-muted-foreground">טוען כיתות...</div>
              ) : classrooms.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">אין כיתות במערכת</p>
                  <Button size="sm" onClick={() => setShowClassroomForm(true)}>
                    צור כיתה ראשונה
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {classrooms.map((classroom) => {
                    const assignedTeacher = teachers.find(t => t.id === classroom.teacher_id);
                    return (
                      <div
                        key={classroom.id}
                        className="flex items-center justify-between bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${classroom.is_active !== false ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-muted'}`}>
                            <BookOpen className={`w-5 h-5 ${classroom.is_active !== false ? 'text-purple-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-sm">{classroom.name}</p>
                              <Badge variant={classroom.is_active !== false ? 'default' : 'secondary'} className="text-[10px] h-5">
                                {classroom.is_active !== false ? 'פעילה' : 'לא פעילה'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {classroom.grade_level && <span>כיתה {classroom.grade_level}</span>}
                              {classroom.school && <span>{classroom.school}</span>}
                              {classroom.year && <span>{classroom.year}</span>}
                              {assignedTeacher ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <UserCheck className="w-3 h-3" />
                                  {assignedTeacher.full_name}
                                </span>
                              ) : (
                                <span className="text-amber-600">ללא מורה אחראי</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/classroom/${classroom.id}`)}
                            className="h-8 text-xs"
                          >
                            ערוך
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteClassroomMutation.mutate(classroom.id)}
                            className="h-8 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Teacher Form Modal */}
        {showTeacherForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-xl border border-border w-full max-w-md p-6"
            >
              <h2 className="text-lg font-bold mb-4">הוסף מורה חדש</h2>
              <form onSubmit={handleSubmitTeacher} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">שם מלא *</label>
                  <Input
                    value={newTeacher.full_name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, full_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">אימייל</label>
                  <Input
                    type="email"
                    value={newTeacher.email}
                    onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">טלפון</label>
                  <Input
                    value={newTeacher.phone}
                    onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">מקצוע עיקרי</label>
                  <Input
                    value={newTeacher.subject}
                    onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1">
                    <Plus className="w-4 h-4 ml-1" /> צור מורה
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowTeacherForm(false)} className="flex-1">
                    ביטול
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Classroom Form Modal */}
        {showClassroomForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-xl border border-border w-full max-w-md p-6"
            >
              <h2 className="text-lg font-bold mb-4">צור כיתה חדשה</h2>
              <form onSubmit={handleSubmitClassroom} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">שם הכיתה *</label>
                  <Input
                    value={newClassroom.name}
                    onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                    required
                    placeholder="למשל: כיתה ז׳1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">שכבת גיל</label>
                  <Input
                    value={newClassroom.grade_level}
                    onChange={(e) => setNewClassroom({ ...newClassroom, grade_level: e.target.value })}
                    placeholder="למשל: ז׳"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">שם המוסד</label>
                  <Input
                    value={newClassroom.school}
                    onChange={(e) => setNewClassroom({ ...newClassroom, school: e.target.value })}
                    placeholder="למשל: תיכון שלום"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">שנת לימודים</label>
                  <Input
                    value={newClassroom.year}
                    onChange={(e) => setNewClassroom({ ...newClassroom, year: e.target.value })}
                    placeholder="למשל: 2024"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">הערות</label>
                  <Input
                    value={newClassroom.notes}
                    onChange={(e) => setNewClassroom({ ...newClassroom, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1">
                    <Plus className="w-4 h-4 ml-1" /> צור כיתה
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowClassroomForm(false)} className="flex-1">
                    ביטול
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}