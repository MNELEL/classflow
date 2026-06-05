import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronUp, CheckCircle2, Circle, Library, ArrowLeft, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function WeekGoalCard({ goal, onToggleComplete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library_items_mini'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 100),
    staleTime: 60000,
  });

  const matchedItems = libraryItems.filter(i => goal.library_item_ids?.includes(i.id));

  return (
    <div className={`rounded-xl border ${goal.is_completed ? 'border-green-200 bg-green-50/40' : 'border-border bg-card'} overflow-hidden transition-colors`}>
      <div className="flex items-start gap-3 p-3">
        <button
          onClick={() => onToggleComplete(goal.id)}
          className="mt-0.5 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-green-100 transition-colors"
        >
          {goal.is_completed
            ? <CheckCircle2 className="w-5 h-5 text-green-600" />
            : <Circle className="w-5 h-5 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${goal.is_completed ? 'line-through text-muted-foreground' : ''}`}>
            {goal.description}
          </p>
          {goal.suggested_next && (
            <p className="text-[11px] text-violet-600 flex items-center gap-1 mt-0.5">
              <ArrowLeft className="w-3 h-3" />
              המשך מוצע: {goal.suggested_next}
            </p>
          )}
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {goal.external_links?.length > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">
                <ExternalLink className="w-2.5 h-2.5 mr-1" />{goal.external_links.length} קישורים
              </Badge>
            )}
            {matchedItems.length > 0 && (
              <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px]">
                <Library className="w-2.5 h-2.5 mr-1" />{matchedItems.length} מהספרייה
              </Badge>
            )}
          </div>
        </div>
        {(goal.external_links?.length > 0 || matchedItems.length > 0) && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 space-y-3">
              {goal.external_links?.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground mb-1.5">קישורים חיצוניים</p>
                  <div className="space-y-1.5">
                    {goal.external_links.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-xs text-blue-800 font-medium truncate">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {matchedItems.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground mb-1.5">מהספרייה שלך</p>
                  <div className="space-y-1.5">
                    {matchedItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-violet-200 bg-violet-50">
                        <FileText className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                        <span className="text-xs text-violet-800 font-medium truncate">{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}