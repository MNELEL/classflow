import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import StudentList from '@/components/students/StudentList';
import ImportStudentsModal from '@/components/students/ImportStudentsModal';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

export default function StudentsPage() {
  const qc = useQueryClient();
  const [showImport, setShowImport] = useState(false);

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        const { id, created_date, updated_date, created_by, ...rest } = data;
        return base44.entities.Student.update(id, rest);
      } else {
        return base44.entities.Student.create(data);
      }
    },
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['students'] });
      const prev = qc.getQueryData(['students']);
      qc.setQueryData(['students'], (old = []) => {
        if (data.id) {
          return old.map(s => s.id === data.id ? { ...s, ...data } : s);
        }
        return [...old, { ...data, id: `temp-${Date.now()}` }];
      });
      return { prev };
    },
    onError: (_err, _data, ctx) => {
      if (ctx?.prev) qc.setQueryData(['students'], ctx.prev);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast.success('תלמיד נשמר בהצלחה');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Student.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['students'] });
      const prev = qc.getQueryData(['students']);
      qc.setQueryData(['students'], (old = []) => old.filter(s => s.id !== id));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['students'], ctx.prev);
    },
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
  async function handleImport(preview, prefsData, isAI = false) {
    toast('מייבא תלמידים...');
    try {
      if (isAI) {
        // AI import: fields are already resolved by name, need to link by name after creation
        // Step 1: create all students with their direct fields
        const created = await Promise.all(
          preview.map(s =>
            base44.entities.Student.create({
              name: s.name,
              is_active: true,
              row_preference: s.row_preference || 'none',
              side_preference: s.side_preference || 'none',
              height: s.height || 'medium',
              special_needs: s.special_needs || [],
              notes: s.notes || '',
            })
          )
        );

        // Step 2: build name → entityId map
        const nameToId = {};
        preview.forEach((s, i) => { nameToId[s.name] = created[i].id; });

        // Step 3: update with resolved name-based relations
        await Promise.all(
          preview.map((s, i) => {
            const friends = (s.friends_names || []).map(n => nameToId[n]).filter(Boolean);
            const avoid = (s.avoid_names || []).map(n => nameToId[n]).filter(Boolean);
            const separate = (s.separate_names || []).map(n => nameToId[n]).filter(Boolean);
            if (!friends.length && !avoid.length && !separate.length) return Promise.resolve();
            return base44.entities.Student.update(created[i].id, { friends, avoid, separate });
          })
        );

        qc.invalidateQueries({ queryKey: ['students'] });
        toast.success(`יובאו ${created.length} תלמידים בהצלחה!`);
      } else {
        // JSON import: IDs are numeric import IDs
        const created = await Promise.all(
          preview.map(s =>
            base44.entities.Student.create({ name: s.name, is_active: true })
          )
        );

        const idMap = {};
        preview.forEach((s, i) => { idMap[s._importId] = created[i].id; });

        await Promise.all(
          preview.map((s, i) => {
            const friends = (s._friendImportIds || []).filter(Boolean).map(iid => idMap[iid]).filter(Boolean);
            const avoid = (s._avoidImportIds || []).filter(Boolean).map(iid => idMap[iid]).filter(Boolean);
            if (!friends.length && !avoid.length) return Promise.resolve();
            return base44.entities.Student.update(created[i].id, { friends, avoid });
          })
        );

        qc.invalidateQueries({ queryKey: ['students'] });
        toast.success(`יובאו ${created.length} תלמידים בהצלחה!`);
      }
    } catch (err) {
      toast.error('שגיאה בייבוא — ' + (err?.message || 'נסה שוב'));
    }
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="max-w-2xl mx-auto p-6 overflow-y-auto h-full relative" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
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