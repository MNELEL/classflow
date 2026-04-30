import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import StudentList from '@/components/students/StudentList';
import ImportStudentsModal from '@/components/students/ImportStudentsModal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export default function StudentsPage() {
  const qc = useQueryClient();
  const [showImport, setShowImport] = useState(false);

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

  /**
   * Import flow:
   * 1. Create all students (without relations) → get their entity IDs
   * 2. Build a map: importId → entityId
   * 3. Update each student with resolved friends / avoid arrays
   */
  async function handleImport(preview) {
    toast('מייבא תלמידים...');
    try {
      // Step 1: create all students
      const created = await Promise.all(
        preview.map(s =>
          base44.entities.Student.create({ name: s.name, is_active: true })
        )
      );

      // Step 2: build importId → entityId map
      const idMap = {};
      preview.forEach((s, i) => {
        idMap[s._importId] = created[i].id;
      });

      // Step 3: update with resolved relations
      await Promise.all(
        preview.map((s, i) => {
          const friends = (s._friendImportIds || [])
            .filter(Boolean)
            .map(iid => idMap[iid])
            .filter(Boolean);
          const avoid = (s._avoidImportIds || [])
            .filter(Boolean)
            .map(iid => idMap[iid])
            .filter(Boolean);

          if (friends.length === 0 && avoid.length === 0) return Promise.resolve();
          return base44.entities.Student.update(created[i].id, { friends, avoid });
        })
      );

      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success(`יובאו ${created.length} תלמידים בהצלחה!`);
    } catch (err) {
      toast.error('שגיאה בייבוא — ' + (err?.message || 'נסה שוב'));
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6" dir="rtl">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Import button above the list */}
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5">
                <Upload className="w-4 h-4" /> ייבוא מקובץ JSON
              </Button>
            </div>
            <StudentList
              students={students}
              onSave={data => saveMutation.mutate(data)}
              onDelete={id => deleteMutation.mutate(id)}
            />
          </>
        )}
      </div>

      <ImportStudentsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />
    </AppLayout>
  );
}