import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import StudentList from '@/components/students/StudentList';
import { toast } from 'sonner';

export default function StudentsPage() {
  const qc = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        const { id, created_date, updated_date, created_by, ...rest } = data;
        return base44.entities.Student.update(id, rest);
      } else {
        return base44.entities.Student.create(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('תלמיד נשמר בהצלחה');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('תלמיד נמחק');
    },
  });

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6" dir="rtl">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <StudentList
            students={students}
            onSave={data => saveMutation.mutate(data)}
            onDelete={id => deleteMutation.mutate(id)}
          />
        )}
      </div>
    </AppLayout>
  );
}