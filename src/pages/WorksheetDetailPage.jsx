import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Printer, Star, StarOff, Trash2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';

export default function WorksheetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAnswers, setShowAnswers] = useState({});

  const handleRefresh = async () => { await qc.invalidateQueries({ queryKey: ['worksheet', id] }); };
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const { data: ws, isLoading } = useQuery({
    queryKey: ['worksheet', id],
    queryFn: () => base44.entities.Worksheet.get(id),
    enabled: !!id,
  });

  const favMutation = useMutation({
    mutationFn: ({ id, val }) => base44.entities.Worksheet.update(id, { is_favorite: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['worksheet', id] }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Worksheet.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worksheets'] });
      toast.success('דף העבודה נמחק');
      navigate('/worksheets', { replace: true });
    },
  });

  function printWorksheet() {
    if (!ws) return;
    const qs = ws.questions || [];
    const totalPoints = qs.reduce((s, q) => s + (q.points || 10), 0);
    const w = window.open('', '_blank');
    w.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>${ws.title}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; direction: rtl; }
        h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
        .instructions { background: #f5f5f5; border-right: 4px solid #6366f1; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; }
        .question { margin-bottom: 20px; page-break-inside: avoid; }
        .question-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 6px; }
        .options { list-style: none; padding: 0; }
        .options li { padding: 4px 8px; margin: 3px 0; border: 1px solid #ddd; border-radius: 4px; }
        .answer-line { border-bottom: 1px solid #999; min-height: 28px; margin: 6px 0; }
        .total { text-align: left; font-weight: bold; margin-top: 20px; border-top: 1px solid #333; padding-top: 8px; }
        @media print { .no-print { display: none; } }
      </style></head><body>
      <h1>${ws.title}</h1>
      <div class="meta">מקצוע: ${ws.subject || ''} | נושא: ${ws.topic || ''} | שכבה: ${ws.grade_level || ''} | רמה: ${ws.difficulty || ''}</div>
      ${ws.instructions ? `<div class="instructions">📋 ${ws.instructions}</div>` : ''}
      <div class="meta">שם תלמיד: __________________ כיתה: ________ תאריך: ________</div>
      ${qs.map((q, i) => `
        <div class="question">
          <div class="question-header"><span>שאלה ${i + 1} — ${q.type}</span><span>${q.points || 10} נקודות</span></div>
          <p>${q.question}</p>
          ${q.options?.length ? `<ul class="options">${q.options.map((o, j) => `<li>${['א','ב','ג','ד'][j]}. ${o}</li>`).join('')}</ul>` : ''}
          ${q.type === 'שאלה פתוחה' ? '<div class="answer-line"></div><div class="answer-line"></div>' : ''}
          ${q.type === 'נכון/לא נונק' ? '<p>נכון / לא נכון (הקף)</p>' : ''}
          ${q.type === 'השלמת משפט' ? '<div class="answer-line"></div>' : ''}
        </div>
      `).join('')}
      <div class="total">סה"כ נקודות: ${totalPoints}</div>
      </body></html>`);
    w.document.close();
    w.print();
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div ref={containerRef} className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!ws) {
    return (
      <AppLayout>
        <div ref={containerRef} className="p-5 text-center py-20">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">דף העבודה לא נמצא</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/worksheets')}>
            חזרה למחולל
          </Button>
        </div>
      </AppLayout>
    );
  }

  const qs = ws.questions || [];
  const totalPoints = qs.reduce((s, q) => s + (q.points || 10), 0);

  return (
    <AppLayout>
      <div ref={containerRef} className="p-4 max-w-2xl mx-auto space-y-4" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">{ws.title}</h1>
            <p className="text-xs text-muted-foreground">{ws.subject} • {ws.topic}</p>
          </div>
        </motion.div>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{ws.subject}</Badge>
          <Badge variant="secondary" className="text-xs">{ws.grade_level}</Badge>
          <Badge variant="outline" className="text-xs">{ws.difficulty}</Badge>
          <Badge variant="outline" className="text-xs">{qs.length} שאלות</Badge>
          <Badge variant="outline" className="text-xs">{totalPoints} נקודות</Badge>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={printWorksheet}>
            <Printer className="w-3.5 h-3.5 ml-1" /> הדפס PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => favMutation.mutate({ id: ws.id, val: !ws.is_favorite })}
          >
            {ws.is_favorite ? <Star className="w-3.5 h-3.5 ml-1 fill-yellow-500 text-yellow-500" /> : <StarOff className="w-3.5 h-3.5 ml-1" />}
            {ws.is_favorite ? 'מועדף' : 'הוסף למועדפים'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => { if (confirm('למחוק דף עבודה זה?')) deleteMutation.mutate(); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {ws.instructions && (
          <div className="bg-primary/5 border-r-4 border-primary rounded-lg p-3 text-sm">
            📋 {ws.instructions}
          </div>
        )}

        <div className="space-y-3">
          {qs.map((q, i) => (
            <Card key={q.id || i} className="border-border/60">
              <CardContent className="p-3">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="text-xs text-muted-foreground font-medium">{i + 1}. {q.type} • {q.points || 10} נק'</span>
                </div>
                <p className="text-sm font-medium">{q.question}</p>
                {q.options?.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {q.options.map((o, j) => (
                      <div key={j} className="text-xs bg-muted/30 border border-border rounded-lg px-2.5 py-1.5">
                        {['א','ב','ג','ד'][j]}. {o}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowAnswers(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="mt-2 text-xs text-primary flex items-center gap-1"
                >
                  {showAnswers[i] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAnswers[i] ? 'הסתר תשובה' : 'הצג תשובה'}
                </button>
                {showAnswers[i] && (
                  <div className="mt-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg px-2.5 py-1.5">
                    ✓ {q.answer}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}