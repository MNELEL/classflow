import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Plus, Eye, Volume2, Zap, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StudentForm from './StudentForm';
import { motion, AnimatePresence } from 'framer-motion';

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
        <AnimatePresence>
          {students.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border/70 rounded-xl px-4 py-3 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                {/* Avatar circle */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{student.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {student.group && <Badge variant="outline" className="text-[10px] py-0 h-4">{student.group}</Badge>}
                    {student.learning_group && <Badge className="text-[10px] py-0 h-4 bg-primary/10 text-primary border-0">🧩 {student.learning_group}</Badge>}
                    {student.special_needs?.map(n => (
                      <span key={n} className="text-muted-foreground">{NEED_ICONS[n]}</span>
                    ))}
                    {student.friends?.length > 0 && <span className="text-emerald-500 text-[11px] font-medium">💚 {student.friends.length}</span>}
                    {student.avoid?.length > 0 && <span className="text-red-500 text-[11px] font-medium">🚫 {student.avoid.length}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(student)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDelete(student.id)} className="text-destructive/60 hover:text-destructive h-8 w-8">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {students.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-14 gap-3 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="font-semibold text-muted-foreground">אין תלמידים עדיין</p>
            <p className="text-sm text-muted-foreground/60">לחץ על "הוסף תלמיד" כדי להתחיל</p>
          </motion.div>
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