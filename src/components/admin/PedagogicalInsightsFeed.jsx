import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, FileText, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

const SOURCE_ICON = {
  pdf: '📄', youtube_link: '▶️', audio_recording: '🎙️', audio_file: '🎵',
  video_file: '🎬', text_note: '✍️', image: '🖼️', presentation: '📊',
  word_doc: '📝', external_link: '🔗',
};

export default function PedagogicalInsightsFeed() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['library-pedagogical'],
    queryFn: () => base44.entities.LibraryItem.filter({ ai_status: 'ready' }, '-created_date', 100),
  });

  const filtered = useMemo(() => {
    const withContent = items.filter(i =>
      (i.ai_summary || i.transcript || (i.ai_key_points && i.ai_key_points.length > 0))
    );
    if (!search.trim()) return withContent;
    const q = search.toLowerCase();
    return withContent.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.subject || '').toLowerCase().includes(q) ||
      (i.ai_summary || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const bySubject = useMemo(() => {
    const groups = {};
    filtered.forEach(item => {
      const key = item.subject || 'ללא נושא';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'he'));
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
        <Lightbulb className="w-10 h-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">
          {search ? 'לא נמצאו תוצאות לחיפוש' : 'אין עדיין חומרים מנותחים בספרייה'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי נושא, כותרת או תוכן..."
          className="pr-9 h-9 text-sm"
        />
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
        <FileText className="w-3.5 h-3.5" />
        <span>{filtered.length} חומרים מנותחים · {bySubject.length} נושאים</span>
      </div>

      {/* Grouped by subject */}
      {bySubject.map(([subject, subItems]) => (
        <div key={subject}>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <p className="text-sm font-semibold">{subject}</p>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{subItems.length}</Badge>
          </div>
          <div className="space-y-2">
            {subItems.map(item => (
              <InsightCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightCard({ item, expanded, onToggle }) {
  const keyPoints = item.ai_key_points || [];
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <button
          onClick={onToggle}
          className="w-full text-right"
          aria-label={expanded ? 'סגור פרטים' : 'פתח פרטים'}
        >
          <div className="flex items-start gap-2.5">
            <span className="text-lg shrink-0">{SOURCE_ICON[item.source_type] || '📁'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{item.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.category && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">{item.category}</Badge>
                )}
                {item.created_date && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(item.created_date), 'dd/MM/yyyy', { locale: he })}
                  </span>
                )}
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 mt-2 border-t border-border/40 space-y-2">
                {item.ai_summary && (
                  <div>
                    <p className="text-[10px] font-semibold text-blue-600 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> סיכום פדגוגי
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{item.ai_summary}</p>
                  </div>
                )}
                {keyPoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-violet-600 mb-1 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> נקודות מפתח
                    </p>
                    <ul className="space-y-1">
                      {keyPoints.map((kp, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <span className="text-violet-500 mt-0.5">•</span>
                          <span>{kp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((t, i) => (
                      <span key={i} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}