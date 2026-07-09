import React, { useState, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import StudentList from '@/components/students/StudentList';
import ImportStudentsModal from '@/components/students/ImportStudentsModal';
import FreeTextImport from '@/components/students/FreeTextImport';
import GroupsManager from '@/components/students/GroupsManager';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload, Wand2, Users, FileDown, FileUp, SortAsc, SortDesc, Calendar } from 'lucide-react';
import CsvImportModal, { exportToCSV } from '@/components/data/CsvImportModal';
import { useUrlOverlay } from '@/hooks/useUrlOverlay';

export default function StudentsPage() {
  const qc = useQueryClient();
  const { isOpen, open: openDialog, close: closeDialog } = useUrlOverlay('dialog');
  const [sortMode, setSortMode] = useState('created'); // 'created' | 'firstName' | 'lastName'

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  // Sort students
  const sortedStudents = React.useMemo(() => {
    const sorted = [...students];
    if (sortMode === 'firstName') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    } else if (sortMode === 'lastName') {
      sorted.sort((a, b) => {
        const aLast = a.name.split(' ').slice(-1)[0];
        const bLast = b.name.split(' ').slice(-1)[0];
        return aLast.localeCompare(bLast, 'he');
      });
    } else if (sortMode === 'created') {
      sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
    return sorted;
  }, [students, sortMode]);

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
      toast.success('התלמיד נשמר בהצלחה');
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
      toast.success('התלמיד נמחק');
    },
  });

  /**
   * Import flow:
   * 1. Create all students (without relations) → get their entity IDs
   * 2. Build a map: importId → entityId
   * 3. Update each student with resolved friends / avoid arrays
   */
  async function handleImport(preview, prefsData, isAI = false) {
    toast('מייבאים תלמידים...');
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
      toast.error('שגיאה בייבוא — ' + (err?.message || 'נסו שוב'));
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
            {/* Import buttons above the list */}
            <div className="flex justify-end gap-2 mb-4 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => openDialog('groups')} className="gap-1.5">
                <Users className="w-4 h-4" /> קבוצות
              </Button>
              <Button variant="outline" size="sm" onClick={() => openDialog('free-text')} className="gap-1.5">
                <Wand2 className="w-4 h-4" /> עדכון (AI)
              </Button>
              <Button variant="outline" size="sm" onClick={() => openDialog('import')} className="gap-1.5">
                <Upload className="w-4 h-4" /> ייבוא JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => openDialog('csv-import')} className="gap-1.5">
                <FileUp className="w-4 h-4" /> ייבוא CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(students.map(s=>({name:s.name,gender:s.gender||'',height:s.height||'medium',learning_group:s.learning_group||'',notes:s.notes||'',academic_level:s.academic_level||'average'})), 'students.csv')} className="gap-1.5">
                <FileDown className="w-4 h-4" /> ייצוא CSV
              </Button>
            </div>
            {/* Sort controls */}
            <div className="flex gap-2 mb-4 flex-wrap items-center">
              <p className="text-xs text-muted-foreground shrink-0">מיון:</p>
              <button
                onClick={() => setSortMode('created')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${sortMode === 'created' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
              >
                <Calendar className="w-3.5 h-3.5" /> האחרון שנוסף
              </button>
              <button
                onClick={() => setSortMode('firstName')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${sortMode === 'firstName' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
              >
                <SortAsc className="w-3.5 h-3.5" /> לפי שם פרטי (א-ת)
              </button>
              <button
                onClick={() => setSortMode('lastName')}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${sortMode === 'lastName' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
              >
                <SortDesc className="w-3.5 h-3.5" /> לפי שם משפחה (א-ת)
              </button>
            </div>

            <StudentList
              students={sortedStudents}
              onSave={data => saveMutation.mutate(data)}
              onDelete={id => deleteMutation.mutate(id)}
            />
          </>
        )}
      </div>

      <CsvImportModal
        open={isOpen('csv-import')}
        onClose={closeDialog}
        mode="students"
        students={students}
        onImportStudents={async (rows) => {
          const created = await Promise.all(rows.map(r => base44.entities.Student.create({ name: r.name, gender: r.gender||undefined, height: r.height||'medium', learning_group: r.learning_group||undefined, notes: r.notes||undefined, academic_level: r.academic_level||'average', is_active: true })));
          qc.invalidateQueries({ queryKey: ['students'] });
          toast.success(`יובאו ${created.length} תלמידים`);
        }}
      />

      <ImportStudentsModal
        open={isOpen('import')}
        onClose={closeDialog}
        onImport={handleImport}
      />

      <FreeTextImport
        open={isOpen('free-text')}
        onClose={closeDialog}
        students={students}
        onUpdateStudent={data => saveMutation.mutate(data)}
      />

      <GroupsManager
        open={isOpen('groups')}
        onClose={closeDialog}
        students={students}
      />
    </AppLayout>
  );
}