import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TeacherAccountSettings from '@/components/teacher/TeacherAccountSettings';
import { UserCog } from 'lucide-react';

export default function AccountManagement() {
  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: teacher } = useQuery({
    queryKey: ['my-teacher-profile', user?.id],
    queryFn: () => base44.entities.Teacher.filter({ user_id: user.id }).then(res => res?.[0] || null),
    enabled: !!user?.id,
  });

  function handleLogout() {
    base44.auth.logout('/login');
  }

  const teacherData = teacher
    ? teacher
    : user
      ? { id: null, full_name: user.full_name || 'משתמש', email: user.email || '' }
      : { id: null, full_name: '', email: '' };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserCog className="w-4 h-4" /> ניהול חשבון
        </CardTitle>
        <CardDescription>נהל את חשבונך — התנתקות, השבתה או מחיקה לצמיתות</CardDescription>
      </CardHeader>
      <CardContent>
        <TeacherAccountSettings
          teacher={teacherData}
          onLogout={handleLogout}
          triggerLabel="פתח ניהול חשבון"
          triggerVariant="outline"
          triggerSize="default"
        />
      </CardContent>
    </Card>
  );
}