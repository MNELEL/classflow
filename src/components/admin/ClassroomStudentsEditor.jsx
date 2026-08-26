import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Check, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';

// Enrolls existing students into a classroom by writing classroom.student_ids.
// The admin dashboards count enrolled students via that field, so until it's
// populated a class shows "0 תלמידים" even when students exist in the system.
export default function ClassroomStudentsEditor({ classroom, onClose }) {
  const qc = useQueryClient();
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const [selected, setSelected] = useState(() => new Set(classroom?.student_ids || []));
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = allStudents.filter(s => !query.trim() || (s.name || '').includes(query.trim()));

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allStudents.map(s => s.id)));
  }
  function clearAll() {
    setSelected(new Set());
  }

  async function handleSave() {
    setSaving(true);
    try {
      const ids = Array.from(selected);
      await base44.entities.Classroom.update(classroom.id, { student_ids: ids });
      logAudit('update', 'Classroom', classroom.id, classroom.name, `שיוך ${ids.length} תלמידים לכיתה`);
      qc.invalidateQueries(['classrooms']);
      qc.invalidateQueries(['students-overview']);
      toast.success(`עודכנו ${ids.length} תלמידים בכיתה ${classroom.name}`);
      onClose();
    } catch (e) {
      toast.error('שגיאה בשמירה: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm">שיוך תלמידים לכיתה</p>
              <p className="text-xs text-muted-foreground">{classroom?.name} • {selected.size} תלמידים מסומנים</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-accent rounded-lg" aria-label="סגור">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש תלמיד..." className="h-9 text-sm pr-8" />
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={selectAll} className="text-xs text-primary hover:underline">בחר הכל</button>
            <span className="text-muted-foreground">·</span>
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:underline">נקה</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">אין תלמידים במערכת. הוסף תלמידים דרך עמוד התלמידים תחילה.</p>
          ) : (
            filtered.map(s => {
              const on = selected.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-sm transition-colors ${on ? 'bg-primary/10 border-primary' : 'border-border hover:bg-accent'}`}
                >
                  <span className="font-medium truncate">{s.name}</span>
                  {on
                    ? <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-primary-foreground" /></span>
                    : <span className="w-5 h-5 rounded-full border border-border shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>ביטול</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : `שמור שיוך (${selected.size})`}
          </Button>
        </div>
      </div>
    </div>
  );
}