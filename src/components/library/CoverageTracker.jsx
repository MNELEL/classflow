import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Search, CheckCircle2, Clock, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  not_started: {
    label: 'לא נלמד',
    icon: Circle,
    className: 'text-muted-foreground',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    next: 'in_progress',
  },
  in_progress: {
    label: 'בתהליך',
    icon: Clock,
    className: 'text-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
    next: 'completed',
  },
  completed: {
    label: 'הושלם',
    icon: CheckCircle2,
    className: 'text-green-500',
    badgeClass: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    next: 'not_started',
  },
};

const SOURCE_ICON = {
  pdf: '📄', youtube_link: '▶️', audio_recording: '🎙️', audio_file: '🎵',
  video_file: '🎬', text_note: '✍️', image: '🖼️', presentation: '📊',
  word_doc: '📝', external_link: '🔗',
};

function SubjectGroup({ subject, items, onStatusChange }) {
  const [open, setOpen] = useState(true);

  const completed = items.filter(i => i.coverage_status === 'completed').length;
  const inProgress = items.filter(i => i.coverage_status === 'in_progress').length;
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors"
      >
        <span className="font-semibold text-sm flex-1 text-right">{subject || 'ללא נושא'}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-green-600 font-medium">{completed}</span>
          <span>/</span>
          <span>{items.length}</span>
        </div>
        <div className="w-20">
          <Progress value={pct} className="h-1.5" />
        </div>
        <span className="text-xs font-semibold w-8 text-left">{pct}%</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="divide-y divide-border">
          {items.map(item => {
            const status = item.coverage_status || 'not_started';
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/20 transition-colors">
                <span className="text-base">{SOURCE_ICON[item.source_type] || '📁'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.title}</div>
                  {item.tags?.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {item.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] bg-accent text-accent-foreground px-1.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onStatusChange(item.id, cfg.next)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${cfg.badgeClass}`}
                >
                  <Icon className={`w-3 h-3 ${cfg.className}`} />
                  {cfg.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CoverageTracker() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 200),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LibraryItem.update(id, { coverage_status: status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['library'] });
      queryClient.setQueryData(['library'], old =>
        (old || []).map(i => i.id === id ? { ...i, coverage_status: status } : i)
      );
    },
    onSuccess: (_, { status }) => {
      toast.success(STATUS_CONFIG[status]?.label + ' ✓');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['library'] }),
  });

  const activeItems = useMemo(() =>
    items.filter(i => !i.is_archived && (
      !search || (i.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.subject || '').toLowerCase().includes(search.toLowerCase())
    )), [items, search]
  );

  const bySubject = useMemo(() => {
    const groups = {};
    activeItems.forEach(item => {
      const key = item.subject || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'he'));
  }, [activeItems]);

  const totalCompleted = activeItems.filter(i => i.coverage_status === 'completed').length;
  const totalInProgress = activeItems.filter(i => i.coverage_status === 'in_progress').length;
  const totalPct = activeItems.length ? Math.round((totalCompleted / activeItems.length) * 100) : 0;

  if (isLoading) return <div className="py-10 text-center text-muted-foreground text-sm">טוען...</div>;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">כיסוי חומר לימודי</span>
          <span className="text-muted-foreground">{totalCompleted} / {activeItems.length} הושלמו</span>
        </div>
        <Progress value={totalPct} className="h-2.5" />
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-3 h-3" /> {totalCompleted} הושלם
          </span>
          <span className="flex items-center gap-1 text-amber-600">
            <Clock className="w-3 h-3" /> {totalInProgress} בתהליך
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Circle className="w-3 h-3" /> {activeItems.length - totalCompleted - totalInProgress} לא התחיל
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="חפש לפי שם או נושא..." value={search}
          onChange={e => setSearch(e.target.value)} className="pr-9 h-9" />
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {bySubject.map(([subject, subItems]) => (
          <SubjectGroup
            key={subject}
            subject={subject}
            items={subItems}
            onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
          />
        ))}
        {bySubject.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm">אין חומרים בספרייה</div>
        )}
      </div>
    </div>
  );
}