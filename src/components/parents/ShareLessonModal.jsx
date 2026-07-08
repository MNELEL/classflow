import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Share2, Eye, EyeOff, MessageSquare, CheckCircle2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareLessonModal({ item, students, open, onClose }) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const qc = useQueryClient();

  const { data: sharedList = [] } = useQuery({
    queryKey: ['shared_lessons', item?.id],
    queryFn: () => base44.entities.SharedLesson.filter({ library_item_id: item?.id }),
    enabled: !!item?.id && open,
  });

  const shareMutation = useMutation({
    mutationFn: async (studentId) => {
      const student = students.find(s => s.id === studentId);
      const summaryText = item.ai_summary_sections?.map(s => `${s.heading}: ${s.content}`).join('\n') || item.ai_summary || '';
      return base44.entities.SharedLesson.create({
        library_item_id: item.id,
        student_id: studentId,
        student_name: student?.name || '',
        lesson_title: item.title,
        summary_text: summaryText,
        shared_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shared_lessons', item?.id] });
      toast.success('הסיכום שותף להורה');
      setSelectedStudentId('');
    },
  });

  const alreadySharedIds = new Set(sharedList.map(s => s.student_id));
  const availableStudents = students.filter(s => !alreadySharedIds.has(s.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="w-4 h-4 text-primary" />
            שיתוף סיכום עם הורים
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{item?.title}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share to new student */}
          {availableStudents.length > 0 && (
            <div className="flex gap-2">
              <MobileSelect value={selectedStudentId} onValueChange={setSelectedStudentId} placeholder="בחר תלמיד לשיתוף..." className="h-9 text-sm flex-1">
                {availableStudents.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </MobileSelect>
              <Button
                size="sm"
                className="h-9 gap-1.5"
                disabled={!selectedStudentId || shareMutation.isPending}
                onClick={() => shareMutation.mutate(selectedStudentId)}
              >
                {shareMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                שתף
              </Button>
            </div>
          )}

          {/* Already shared */}
          {sharedList.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">שותף עם:</p>
              <AnimatePresence>
                {sharedList.map(s => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/60 bg-card p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{s.student_name}</span>
                      {s.viewed_at ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px] gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          נצפה {new Date(s.viewed_at).toLocaleDateString('he-IL')}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] gap-1">
                          <EyeOff className="w-2.5 h-2.5" />
                          טרם נצפה
                        </Badge>
                      )}
                    </div>
                    {s.parent_comment && (
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-2 flex gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700">{s.parent_comment}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">שותף: {new Date(s.shared_at).toLocaleDateString('he-IL')}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {sharedList.length === 0 && availableStudents.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              שותף עם כל התלמידים
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}