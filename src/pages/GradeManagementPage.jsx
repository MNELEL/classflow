import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CsvImportModal, { exportToCSV } from '@/components/data/CsvImportModal';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import AIGradeInput from '@/components/grades/AIGradeInput';
import AIGradeQuery from '@/components/grades/AIGradeQuery';
import GradeReportPanel from '@/components/grades/GradeReportPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, MessageSquare, FileBarChart2, GraduationCap, FileUp, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function GradeManagementPage() {
  const qc = useQueryClient();
  const [showCsvImport, setShowCsvImport] = useState(false);
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: grades = [], refetch: refetchGrades } = useQuery({
    queryKey: ['grades'],
    queryFn: () => base44.entities.Grade.list(),
  });

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto overflow-y-auto h-full" dir="rtl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">ניהול ציונים</h1>
          </div>
          <p className="text-muted-foreground text-sm">הזנת ציונים חכמה, שאילתות AI, ודוחות מפורטים</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setShowCsvImport(true)} className="gap-1.5 text-xs">
              <FileUp className="w-3.5 h-3.5" /> ייבוא CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportToCSV(grades.map(g => ({ student_id: g.student_id, subject: g.subject, test_name: g.test_name || '', score: g.score, max_score: g.max_score || 100, date: g.date || '', period: g.period || 'exam' })), 'grades.csv')} className="gap-1.5 text-xs">
              <FileDown className="w-3.5 h-3.5" /> ייצוא CSV
            </Button>
          </div>
        </motion.div>

        <CsvImportModal
          open={showCsvImport}
          onClose={() => setShowCsvImport(false)}
          mode="grades"
          students={students}
          onImportGrades={async (rows) => {
            await Promise.all(rows.map(r => base44.entities.Grade.create(r)));
            qc.invalidateQueries({ queryKey: ['grades'] });
            toast.success(`יובאו ${rows.length} ציונים`);
          }}
        />

        <Tabs defaultValue="input" dir="rtl">
          <TabsList className="w-full mb-5 grid grid-cols-3">
            <TabsTrigger value="input" className="gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5" /> הזנת ציונים AI
            </TabsTrigger>
            <TabsTrigger value="query" className="gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5" /> שאילתות חופשיות
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs">
              <FileBarChart2 className="w-3.5 h-3.5" /> דוחות וסיכומים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input">
            <AIGradeInput students={students} grades={grades} onGradesSaved={refetchGrades} />
          </TabsContent>

          <TabsContent value="query">
            <AIGradeQuery students={students} grades={grades} />
          </TabsContent>

          <TabsContent value="reports">
            <GradeReportPanel students={students} grades={grades} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}