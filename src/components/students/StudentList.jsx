import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Plus, Eye, Volume2, Zap, CheckSquare, TrendingUp, FolderOpen, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import StudentForm from './StudentForm';
import TaskManager from './TaskManager';
import GradeManager from './GradeManager';
import StudentPortfolio from '@/components/portfolio/StudentPortfolio';
import PerformanceBadge from '@/components/students/PerformanceBadge';
import { usePerformanceScores } from '@/hooks/usePerformanceScores';
import { motion, AnimatePresence } from 'framer-motion';

const NEED_ICONS = {
  vision: <Eye className="w-3 h-3" />,
  hearing: <Volume2 className="w-3 h-3" />,
  adhd: <Zap className="w-3 h-3" />,
};

const LEVEL_CONFIG = {
  weak: { label: 'חלש', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  below_average: { label: 'מתקשה', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' },
  average: { label: 'בינוני', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  above_average: { label: 'מעל ממוצע', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
  strong: { label: 'חזק', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
  excellent: { label: 'מצטיין', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' },
};

export default function StudentList({ students, onSave, onDelete }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [taskStudent, setTaskStudent] = useState(null);
  const [gradeStudent, setGradeStudent] = useState(null);
  const [portfolioStudent, setPortfolioStudent] = useState(null);

  const { scores, needsAttentionList } = usePerformanceScores(students);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">תלמידים ({students.length})</h2>
          {needsAttentionList.length > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ {needsAttentionList.length} דורשים תשומת לב</span>
          )}
        </div>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4 ml-1" /> הוסף תלמיד
        </Button>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {students.map((student, i) => {
            const lvl = LEVEL_CONFIG[student.academic_level];
            return (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border/70 rounded-xl px-4 py-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{student.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {student.group && <Badge variant="outline" className="text-[11px] py-0 h-4">{student.group}</Badge>}
                        {student.learning_group && <Badge className="text-[11px] py-0 h-4 bg-primary/10 text-primary border-0">🧩 {student.learning_group}</Badge>}
                        {lvl && <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${lvl.color}`}>{lvl.label}</span>}
                        {student.special_needs?.map(n => (
                          <span key={n} className="text-muted-foreground">{NEED_ICONS[n]}</span>
                        ))}
                        {student.friends?.length > 0 && <span className="text-emerald-500 text-[11px] font-medium">💚 {student.friends.length}</span>}
                        {student.avoid?.length > 0 && <span className="text-red-500 text-[11px] font-medium">🚫 {student.avoid.length}</span>}
                        {scores[student.id] && (
                          <PerformanceBadge
                            score={scores[student.id].score}
                            trend={scores[student.id].trend}
                            showTrend
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-60 md:opacity-60 md:group-hover:opacity-100 touch-show transition-opacity shrink-0">
                     <Button size="icon" variant="ghost" className="h-7 w-7 min-h-[44px] min-w-[44px]" aria-label="פרופיל תלמיד" title="פרופיל תלמיד" onClick={() => navigate(`/students/${student.id}`)}>
                       <User className="w-3.5 h-3.5 text-primary" />
                     </Button>
                     <Button size="icon" variant="ghost" className="h-7 w-7 min-h-[44px] min-w-[44px]" aria-label="משימות" title="משימות" onClick={() => setTaskStudent(student)}>
                       <CheckSquare className="w-3.5 h-3.5" />
                     </Button>
                     <Button size="icon" variant="ghost" className="h-7 w-7 min-h-[44px] min-w-[44px]" aria-label="ציונים" title="ציונים" onClick={() => setGradeStudent(student)}>
                       <TrendingUp className="w-3.5 h-3.5" />
                     </Button>
                     <Button size="icon" variant="ghost" className="h-7 w-7 min-h-[44px] min-w-[44px]" aria-label="תיק אישי" title="תיק אישי" onClick={() => setPortfolioStudent(portfolioStudent?.id === student.id ? null : student)}>
                       <FolderOpen className={`w-3.5 h-3.5 ${portfolioStudent?.id === student.id ? 'text-primary' : ''}`} />
                     </Button>
                     <Button size="icon" variant="ghost" className="h-7 w-7 min-h-[44px] min-w-[44px]" aria-label="עריכת תלמיד" onClick={() => setEditing(student)}>
                       <Edit2 className="w-3.5 h-3.5" />
                     </Button>
                     <Button size="icon" variant="ghost" className="h-7 w-7 min-h-[44px] min-w-[44px] text-destructive/60 hover:text-destructive" aria-label="מחיקת תלמיד" onClick={() => onDelete(student.id)}>
                       <Trash2 className="w-3.5 h-3.5" />
                     </Button>
                   </div>
                </div>
                <StudentPortfolio student={student} open={portfolioStudent?.id === student.id} />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {students.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-14 gap-3 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <p className="font-semibold text-muted-foreground">אין תלמידים עדיין</p>
            <p className="text-sm text-muted-foreground/60">לחץ על "הוסף תלמיד" כדי להתחיל</p>
          </motion.div>
        )}
      </div>

      {/* Add dialog / drawer */}
      {isMobile ? (
        <Drawer open={adding} onOpenChange={setAdding}>
          <DrawerContent dir="rtl" className="max-h-[90vh]">
            <DrawerHeader className="pb-2"><DrawerTitle className="text-right text-base">הוסף תלמיד חדש</DrawerTitle></DrawerHeader>
            <div className="overflow-y-auto px-4 pb-[env(safe-area-inset-bottom,16px)]">
              <StudentForm students={students} onSave={data => { onSave(data); setAdding(false); }} onCancel={() => setAdding(false)} />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>הוסף תלמיד חדש</DialogTitle></DialogHeader>
            <StudentForm students={students} onSave={data => { onSave(data); setAdding(false); }} onCancel={() => setAdding(false)} />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit dialog / drawer */}
      {isMobile ? (
        <Drawer open={!!editing} onOpenChange={() => setEditing(null)}>
          <DrawerContent dir="rtl" className="max-h-[90vh]">
            <DrawerHeader className="pb-2"><DrawerTitle className="text-right text-base">עריכת תלמיד</DrawerTitle></DrawerHeader>
            <div className="overflow-y-auto px-4 pb-[env(safe-area-inset-bottom,16px)]">
              {editing && <StudentForm student={editing} students={students} onSave={data => { onSave(data); setEditing(null); }} onCancel={() => setEditing(null)} />}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>עריכת תלמיד</DialogTitle></DialogHeader>
            {editing && <StudentForm student={editing} students={students} onSave={data => { onSave(data); setEditing(null); }} onCancel={() => setEditing(null)} />}
          </DialogContent>
        </Dialog>
      )}

      {/* Tasks manager */}
      <TaskManager student={taskStudent} open={!!taskStudent} onClose={() => setTaskStudent(null)} />

      {/* Grade manager */}
      <GradeManager student={gradeStudent} open={!!gradeStudent} onClose={() => setGradeStudent(null)} />
    </div>
  );
}