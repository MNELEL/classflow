import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Eye, EyeOff, MessageSquare, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function SharedLessonsPanel({ studentId, studentName }) {
  const [expanded, setExpanded] = useState(null);
  const qc = useQueryClient();

  const { data: sharedLessons = [] } = useQuery({
    queryKey: ['shared_lessons_student', studentId],
    queryFn: () => base44.entities.SharedLesson.filter({ student_id: studentId }, '-shared_at', 20),
    enabled: !!studentId,
  });

  const { data: allLessons = [] } = useQuery({
    queryKey: ['lesson_analyses'],
    queryFn: () => base44.entities.LibraryItem.filter({ source_type: 'audio_file' }, '-created_date', 30),
  });

  // Lessons that haven't been shared with this student yet
  const sharedIds = new Set(sharedLessons.map(s => s.library_item_id));
  const unshared = allLessons.filter(l => !sharedIds.has(l.id) && (l.ai_summary_sections?.length || l.ai_summary));

  const shareMutation = useMutation({
    mutationFn: (lesson) => base44.entities.SharedLesson.create({
      library_item_id: lesson.id,
      student_id: studentId,
      student_name: studentName,
      lesson_title: lesson.title,
      summary_text: lesson.ai_summary_sections?.map(s => `${s.heading}: ${s.content}`).join('\n') || lesson.ai_summary || '',
      shared_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shared_lessons_student', studentId] });
      toast.success('הסיכום שותף עם ההורה');
    },
  });

  return (
    <div className="space-y-3">
      {/* Share new lesson */}
      {unshared.length > 0 && (
        <div className="bg-card border border-border/70 rounded-2xl p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-primary" />
            שתף סיכום חדש
          </p>
          <div className="space-y-2">
            {unshared.slice(0, 5).map(lesson => (
              <div key={lesson.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <BookOpen className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-xs font-medium truncate">{lesson.title}</span>
                  {lesson.subject && <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] shrink-0">{lesson.subject}</Badge>}
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 shrink-0"
                  onClick={() => shareMutation.mutate(lesson)}
                  disabled={shareMutation.isPending}>
                  <Share2 className="w-3 h-3" /> שתף
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared list */}
      {sharedLessons.length > 0 && (
        <div className="bg-card border border-border/70 rounded-2xl p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-primary" />
            סיכומים ששותפו ({sharedLessons.length})
          </p>
          <div className="space-y-2">
            {sharedLessons.map(s => (
              <div key={s.id} className="rounded-xl border border-border/60 overflow-hidden">
                <button onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-right">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {s.viewed_at
                      ? <Eye className="w-4 h-4 text-green-500 shrink-0" />
                      : <EyeOff className="w-4 h-4 text-amber-500 shrink-0" />}
                    <span className="text-xs font-medium truncate">{s.lesson_title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.viewed_at ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-[9px]">נצפה</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px]">טרם נצפה</Badge>
                    )}
                    {s.parent_comment && <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
                    {expanded === s.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expanded === s.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 space-y-2">
                        <p className="text-[10px] text-muted-foreground">שותף: {new Date(s.shared_at).toLocaleDateString('he-IL')}</p>
                        {s.viewed_at && <p className="text-[10px] text-green-600">נצפה: {new Date(s.viewed_at).toLocaleDateString('he-IL')}</p>}
                        {s.parent_comment && (
                          <div className="rounded-lg bg-blue-50 p-2 flex gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-semibold text-blue-700 mb-0.5">הערת הורה:</p>
                              <p className="text-xs text-blue-700">{s.parent_comment}</p>
                            </div>
                          </div>
                        )}
                        {s.summary_text && (
                          <div className="rounded-lg bg-muted/40 p-2">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1">תוכן ששותף:</p>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{s.summary_text}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {sharedLessons.length === 0 && unshared.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Share2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">אין סיכומים לשיתוף</p>
          <p className="text-xs mt-1">נתח הקלטות שיעור כדי לשתף סיכומים</p>
        </div>
      )}
    </div>
  );
}