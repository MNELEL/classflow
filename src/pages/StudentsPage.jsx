import React, { useState, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import StudentList from '@/components/students/StudentList';
import FreeTextImport from '@/components/students/FreeTextImport';
import GroupsManager from '@/components/students/GroupsManager';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Wand2, Users, FileDown, FileText, SortAsc, SortDesc, Calendar, Cake, Merge, ChevronDown, Copy, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToCSV } from '@/components/data/CsvImportModal';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import FileImportStudents from '@/components/students/FileImportStudents';
import MergeDuplicatesModal from '@/components/students/MergeDuplicatesModal';
import { useUrlOverlay } from '@/hooks/useUrlOverlay';

export default function StudentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isOpen, open: openDialog, close: closeDialog } = useUrlOverlay('dialog');
  const [sortMode, setSortMode] = useState('created'); // 'created' | 'firstName' | 'lastName' | 'birthday'

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
    } else if (sortMode === 'birthday') {
      // Sort by next upcoming birthday (month/day) extracted from custom_fields.birth_date
      const today = new Date();
      const nowMonth = today.getMonth(); // 0-11
      const nowDay = today.getDate();
      const dayOfYear = (m, d) => m * 31 + d;
      const keyOf = (s) => {
        const raw = s?.custom_fields?.birth_date;
        if (!raw) return Infinity;
        let m = -1, d = -1;
        const iso = String(raw).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        const dmy = String(raw).match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/);
        if (iso) { m = +iso[2] - 1; d = +iso[3]; }
        else if (dmy) { d = +dmy[1]; m = +dmy[2] - 1; }
        if (m < 0 || d < 1) return Infinity;
        const todayKey = dayOfYear(nowMonth, nowDay);
        let k = dayOfYear(m, d);
        if (k < todayKey) k += 400; // wrap to next year
        return k;
      };
      sorted.sort((a, b) => keyOf(a) - keyOf(b));
    }
    return sorted;
  }, [students, sortMode]);

  const activeNames = students.filter(s => s.is_active !== false).map(s => s.name);
  const copyNames = () => { try { navigator.clipboard.writeText(activeNames.join('\n')); toast.success('השמות הועתקו'); } catch { toast.error('העתקה נכשלה'); } };
  const downloadNames = () => {
    const blob = new Blob([activeNames.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'רשימת_תלמידים.txt'; a.click();
    URL.revokeObjectURL(url);
  };
  const printNames = () => {
    const w = window.open('', '_blank', 'width=420,height=640');
    if (!w) { toast.error('חסימת חלון קובץ'); return; }
    const safe = activeNames.map(n => n.replace(/[<>]/g, ''));
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>רשימת תלמידים</title><style>body{font-family:Heebo,sans-serif;padding:28px;color:#111}h2{margin:0 0 14px;font-size:18px}ol{padding-right:22px;font-size:16px;line-height:2}</style></head><body><h2>רשימת תלמידים</h2><ol>${safe.map(n => `<li>${n}</li>`).join('')}</ol><script>window.onload=function(){window.print();}</script></body></html>`);
    w.document.close();
  };
  const doExportCSV = () => exportToCSV(students.map(s => ({ name: s.name, gender: s.gender || '', height: s.height || 'medium', learning_group: s.learning_group || '', notes: s.notes || '', academic_level: s.academic_level || 'average' })), 'students.csv');
  const sortOptions = [
    { key: 'created', label: 'האחרון שנוסף', icon: Calendar },
    { key: 'firstName', label: 'שם פרטי (א-ת)', icon: SortAsc },
    { key: 'lastName', label: 'שם משפחה (א-ת)', icon: SortDesc },
    { key: 'birthday', label: 'ימי הולדת קרובים', icon: Cake },
  ];
  const currentSort = sortOptions.find(o => o.key === sortMode) || sortOptions[0];
  const SortIcon = currentSort.icon;

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
      <div ref={containerRef} data-pull-to-refresh className="max-w-2xl mx-auto p-6 relative" dir="rtl" style={{ touchAction: 'pan-y' }}>
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Wand2 className="w-4 h-4" /> פעולות <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="text-xs">כלים</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => openDialog('groups')}><Users className="w-4 h-4 ml-2" /> קבוצות</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openDialog('free-text')}><Wand2 className="w-4 h-4 ml-2" /> עדכון (AI)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openDialog('file-import')}><FileText className="w-4 h-4 ml-2" /> ייבוא מקובץ</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openDialog('merge')}><Merge className="w-4 h-4 ml-2" /> מיזוג כפילויות</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/birthdays-report')}><Cake className="w-4 h-4 ml-2" /> דוח ימי הולדת</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs">רשימת שמות בלבד</DropdownMenuLabel>
                  <DropdownMenuItem onClick={copyNames}><Copy className="w-4 h-4 ml-2" /> העתקת שמות</DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadNames}><FileDown className="w-4 h-4 ml-2" /> הורדת רשימה (טקסט)</DropdownMenuItem>
                  <DropdownMenuItem onClick={printNames}><Printer className="w-4 h-4 ml-2" /> הדפסת רשימה</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={doExportCSV}><FileDown className="w-4 h-4 ml-2" /> ייצוא CSV מלא</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <SortIcon className="w-3.5 h-3.5" /> {currentSort.label} <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="text-xs">מיון לפי</DropdownMenuLabel>
                  {sortOptions.map(o => (
                    <DropdownMenuItem key={o.key} onClick={() => setSortMode(o.key)} className={sortMode === o.key ? 'bg-primary/10 font-semibold' : ''}>
                      <o.icon className="w-4 h-4 ml-2" /> {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <span className="mr-auto text-xs text-muted-foreground">{sortedStudents.length} תלמידים</span>
            </div>

            <StudentList
              students={sortedStudents}
              onSave={data => saveMutation.mutate(data)}
              onDelete={id => deleteMutation.mutate(id)}
            />
          </>
        )}
      </div>

      <FileImportStudents
        open={isOpen('file-import')}
        onClose={closeDialog}
        students={students}
        onDone={() => qc.invalidateQueries({ queryKey: ['students'] })}
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

      <MergeDuplicatesModal
        open={isOpen('merge')}
        onClose={closeDialog}
        students={students}
        onMerged={() => qc.invalidateQueries({ queryKey: ['students'] })}
      />
    </AppLayout>
  );
}