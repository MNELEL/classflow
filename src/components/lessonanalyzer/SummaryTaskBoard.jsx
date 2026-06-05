import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Layers, Tag, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

function SummaryChip({ item, pending }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border p-3 space-y-1 ${pending ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10' : 'border-green-200 bg-green-50/50 dark:bg-green-900/10'}`}>
      <div className="flex items-start gap-2">
        {pending
          ? <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          : <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />}
        <p className="text-xs font-semibold leading-snug flex-1">{item.title}</p>
      </div>
      <div className="flex flex-wrap gap-1 pr-5">
        {item.subject && (
          <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] px-1.5">{item.subject}</Badge>
        )}
        {item.category && (
          <Badge className="bg-violet-100 text-violet-700 border-0 text-[9px] px-1.5 flex items-center gap-0.5">
            <Tag className="w-2.5 h-2.5" />{item.category}
          </Badge>
        )}
      </div>
      {!pending && item.lesson_plan_id && (
        <p className="text-[9px] text-green-600 flex items-center gap-1 pr-5">
          <BookOpen className="w-2.5 h-2.5" /> משויך למערך שיעור
        </p>
      )}
      <p className="text-[9px] text-muted-foreground pr-5">{new Date(item.created_date).toLocaleDateString('he-IL')}</p>
    </motion.div>
  );
}

export default function SummaryTaskBoard() {
  const { data: analyses = [] } = useQuery({
    queryKey: ['lesson_analyses'],
    queryFn: () => base44.entities.LibraryItem.filter({ source_type: 'audio_file' }, '-created_date', 50),
  });

  const withAnalysis = analyses.filter(i => i.ai_summary_sections?.length || i.ai_summary);
  const assigned = withAnalysis.filter(i => i.category);
  const pending = withAnalysis.filter(i => !i.category);

  if (withAnalysis.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Layers className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">אין סיכומי שיעור עדיין</p>
        <p className="text-xs mt-1">לאחר ניתוח הקלטות יופיעו כאן</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'סה"כ', value: withAnalysis.length, color: 'text-foreground', bg: 'bg-muted/50' },
          { label: 'ממתינים לטיפול', value: pending.length, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'שויכו לקטגוריה', value: assigned.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Pending column */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold">ממתינים לשיוך ({pending.length})</h3>
          </div>
          <div className="space-y-2">
            {pending.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs rounded-xl border border-dashed border-border">
                🎉 כל הסיכומים שויכו!
              </div>
            ) : (
              pending.map(item => <SummaryChip key={item.id} item={item} pending />)
            )}
          </div>
        </div>

        {/* Assigned column */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-bold">שויכו לקטגוריה ({assigned.length})</h3>
          </div>
          <div className="space-y-2">
            {assigned.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs rounded-xl border border-dashed border-border">
                עדיין לא שויכו סיכומים
              </div>
            ) : (
              assigned.map(item => <SummaryChip key={item.id} item={item} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}