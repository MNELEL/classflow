import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import HomeworkTracker from '@/components/homework/HomeworkTracker';
import AcademicCalendar from '@/components/homework/AcademicCalendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomeworkPage() {
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.filter({ is_active: true }),
  });

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto overflow-y-auto h-full pb-8" dir="rtl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-lg">מטלות ולוח שנה</h1>
            <p className="text-xs text-muted-foreground">מעקב הגשות, תזכורות ולוח שנה לימודי</p>
          </div>
        </motion.div>

        <Tabs defaultValue="homework" dir="rtl">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="homework" className="gap-1.5 text-xs">
              <ClipboardCheck className="w-3.5 h-3.5" /> מטלות
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5" /> לוח שנה
            </TabsTrigger>
          </TabsList>

          <TabsContent value="homework">
            <HomeworkTracker students={students} />
          </TabsContent>

          <TabsContent value="calendar">
            <AcademicCalendar />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}