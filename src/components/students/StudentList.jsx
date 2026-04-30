import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Plus, Eye, Volume2, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StudentForm from './StudentForm';

const NEED_ICONS = {
  vision: <Eye className="w-3 h-3" />,
  hearing: <Volume2 className="w-3 h-3" />,
  adhd: <Zap className="w-3 h-3" />,
};

export default function StudentList({ students, onSave, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">תלמידים ({students.length})</h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 ml-1" /> הוסף תלמיד
        </Button>
      </div>

      <div className="space-y-2">
        {students.map(student => (
          <div key={student.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium text-sm">{student.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {student.group && <Badge variant="outline" className="text-[10px] py-0">{student.group}</Badge>}
                  {student.learning_group && <Badge className="text-[10px] py-0 bg-primary/10 text-primary border-primary/30">🧩 {student.learning_group}</Badge>}
                  {student.special_needs?.map(n => (
                    <span key={n} className="text-muted-foreground">{NEED_ICONS[n]}</span>
                  ))}
                  {student.friends?.length > 0 && <span className="text-green-500 text-[11px]">💚 {student.friends.length}</span>}
                  {student.avoid?.length > 0 && <span className="text-red-500 text-[11px]">🚫 {student.avoid.length}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setEditing(student)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(student.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {students.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">אין תלמידים עדיין. הוסף תלמיד ראשון!</p>
        )}
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>הוסף תלמיד חדש</DialogTitle>
          </DialogHeader>
          <StudentForm
            students={students}
            onSave={data => { onSave(data); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>עריכת תלמיד</DialogTitle>
          </DialogHeader>
          {editing && (
            <StudentForm
              student={editing}
              students={students}
              onSave={data => { onSave(data); setEditing(null); }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}