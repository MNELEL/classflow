import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Users, Sparkles } from 'lucide-react';

export default function StudentViewPage() {
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.filter({ is_active: true }),
  });

  // Only show name - no sensitive data
  const displayNames = students.map(s => ({
    id: s.id,
    name: s.name.split(' ')[0], // First name only
  }));

  return (
    <AppLayout>
      <div className="p-4 space-y-4" dir="rtl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-xl">🌟</div>
          <div>
            <h1 className="font-bold text-base">התלמידים שלנו</h1>
            <p className="text-xs text-muted-foreground">כיתה יקרה ומיוחדת</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {displayNames.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center justify-center min-h-[100px] shadow-sm"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-center">{student.name}</p>
            </motion.div>
          ))}
        </div>

        {displayNames.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">אין תלמידים להצגה</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}