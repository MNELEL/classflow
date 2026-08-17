import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { motion } from 'framer-motion';
import {
  LayoutTemplate, Award, MessageSquareText, Upload, Sparkles,
  Loader2, CheckCircle2, AlertCircle, Clock, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ensureTemplateAndAnalyze, analyzeTemplate } from '@/lib/templateAnalysis';

const KIND_CONFIG = {
  certificate: {
    label: 'תבניות תעודות',
    category: 'תבנית תעודה',
    icon: Award,
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  },
  weekly_bulletin: {
    label: 'תבניות חוברת קשר',
    category: 'תבנית חוברת קשר',
    icon: MessageSquareText,
    color: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400',
  },
};

const STATUS_CONFIG = {
  pending:   { icon: Clock, label: 'טרם נותח', color: 'text-muted-foreground' },
  analyzing: { icon: Loader2, label: 'מנתח...', color: 'text-blue-500', spin: true },
  ready:     { icon: CheckCircle2, label: 'מוכן לשימוש', color: 'text-emerald-600' },
  error:     { icon: AlertCircle, label: 'שגיאה בניתוח', color: 'text-destructive' },
};

export default function TemplateLibraryPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [analyzingId, setAnalyzingId] = useState(null);

  const { data: libraryItems = [], isLoading: loadingItems, refetch: refetchItems } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 200),
  });

  const { data: templates = [], isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: () => base44.entities.CertificateTemplate.list('-created_date', 100),
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchItems(), refetchTemplates()]);
  }, [refetchItems, refetchTemplates]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const groups = useMemo(() => {
    const result = {};
    for (const kind of Object.keys(KIND_CONFIG)) {
      const category = KIND_CONFIG[kind].category;
      const items = libraryItems.filter((i) => i.category === category && !i.is_archived);
      result[kind] = items.map((item) => ({
        item,
        template: templates.find((t) => t.library_item_id === item.id),
      }));
    }
    return result;
  }, [libraryItems, templates]);

  async function handleAnalyze(entry, kind) {
    setAnalyzingId(entry.item.id);
    try {
      if (entry.template) {
        await analyzeTemplate(entry.template.id, kind, entry.item.file_url);
      } else {
        await ensureTemplateAndAnalyze(entry.item, kind);
      }
      qc.invalidateQueries({ queryKey: ['certificate-templates'] });
    } finally {
      setAnalyzingId(null);
    }
  }

  const isLoading = loadingItems || loadingTemplates;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div ref={containerRef} className="relative p-5 max-w-2xl mx-auto space-y-6 pb-10" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          <LayoutTemplate className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">תבניות עיצוב</h1>
            <p className="text-muted-foreground text-sm">
              העלה תמונה של תעודה או חוברת קשר קיימת, והמערכת תלמד את הסגנון והנוסח שלה
            </p>
          </div>
        </motion.div>

        {Object.entries(KIND_CONFIG).map(([kind, cfg]) => {
          const Icon = cfg.icon;
          const entries = groups[kind] || [];
          return (
            <motion.div
              key={kind}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-sm">{cfg.label}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8"
                  onClick={() => navigate(`/library?modal=upload&category=${encodeURIComponent(cfg.category)}`)}
                >
                  <Upload className="w-3.5 h-3.5" />
                  העלה תמונה
                </Button>
              </div>

              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  עדיין לא הועלתה תבנית. העלה תמונה של {kind === 'certificate' ? 'תעודה' : 'חוברת קשר'} קיימת כדי להתחיל
                </p>
              ) : (
                <div className="space-y-2">
                  {entries.map(({ item, template }) => {
                    const status = template?.status || 'pending';
                    const statusCfg = STATUS_CONFIG[status];
                    const StatusIcon = statusCfg.icon;
                    const isBusy = analyzingId === item.id;
                    return (
                      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                        {item.file_url && (
                          <img src={item.file_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 border border-border" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <div className={`flex items-center gap-1 text-xs ${statusCfg.color}`}>
                            <StatusIcon className={`w-3 h-3 ${statusCfg.spin ? 'animate-spin' : ''}`} />
                            {statusCfg.label}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={status === 'ready' ? 'ghost' : 'default'}
                          className="shrink-0 h-8 gap-1 px-2.5"
                          disabled={isBusy}
                          onClick={() => handleAnalyze({ item, template }, kind)}
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          {status === 'ready' ? 'נתח מחדש' : 'נתח תבנית'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}

        <Button variant="ghost" className="w-full gap-1.5" onClick={() => navigate('/certificates')}>
          המשך להפקת תעודות
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Button>
      </div>
    </AppLayout>
  );
}
