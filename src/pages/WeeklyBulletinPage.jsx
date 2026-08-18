import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import BulletinList from '@/components/bulletin/BulletinList';
import BulletinEditor from '@/components/bulletin/BulletinEditor';
import { generateWeeklyBulletin, getWeekStart } from '@/lib/bulletinGenerator';
import { exportWeeklyBulletinPDF } from '@/lib/weeklyBulletinExport';
import { toast } from 'sonner';
import { Newspaper, Loader2 } from 'lucide-react';

export default function WeeklyBulletinPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null); // local editable copy of selected bulletin
  const [template, setTemplate] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: bulletins = [], isLoading } = useQuery({
    queryKey: ['weekly-bulletins'],
    queryFn: () => base44.entities.WeeklyBulletin.list('-start_date', 100),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['bulletin-templates'],
    queryFn: () => base44.entities.CertificateTemplate.filter({ kind: 'weekly_bulletin' }),
  });

  // Selected bulletin record (fresh from server)
  const selected = useMemo(
    () => bulletins.find((b) => b.id === selectedId) || null,
    [bulletins, selectedId]
  );

  // Sync local draft when selection changes
  useEffect(() => {
    setDraft(selected ? { ...selected } : null);
    setTemplate(null);
  }, [selectedId, selected]);

  const dirty = useMemo(() => {
    if (!selected || !draft) return false;
    return JSON.stringify(selected) !== JSON.stringify(draft);
  }, [selected, draft]);

  // Fetch template preview image (library item file_url) when template changes
  const { data: templateImage } = useQuery({
    queryKey: ['template-image', template?.id],
    queryFn: async () => {
      if (!template?.library_item_id) return null;
      const items = await base44.entities.LibraryItem.filter({ id: template.library_item_id });
      return items?.[0]?.file_url || null;
    },
    enabled: !!template?.library_item_id,
  });

  async function handleGenerate() {
    setGenerating(true);
    try {
      const created = await generateWeeklyBulletin(new Date());
      await qc.invalidateQueries({ queryKey: ['weekly-bulletins'] });
      setSelectedId(created.id);
      toast.success('חוברת טיוטה נוצרה מההספק ומערכת השעות');
    } catch (e) {
      toast.error('יצירת חוברת נכשלה: ' + (e?.message || ''));
    } finally {
      setGenerating(false);
    }
  }

  function handleChange(partial) {
    setDraft((d) => (d ? { ...d, ...partial } : d));
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      await base44.entities.WeeklyBulletin.update(draft.id, {
        digest_summary: draft.digest_summary,
        study_points: draft.study_points,
        recap_questions: draft.recap_questions,
        activities: draft.activities,
        weekly_riddle: draft.weekly_riddle,
        weekly_riddle_answer: draft.weekly_riddle_answer,
      });
      await qc.invalidateQueries({ queryKey: ['weekly-bulletins'] });
      toast.success('נשמר');
    } catch (e) {
      toast.error('שמירה נכשלה: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!draft) return;
    setSaving(true);
    try {
      await base44.entities.WeeklyBulletin.update(draft.id, { status: 'approved' });
      setDraft((d) => (d ? { ...d, status: 'approved' } : d));
      await qc.invalidateQueries({ queryKey: ['weekly-bulletins'] });
      toast.success('החוברת אושרה');
    } catch (e) {
      toast.error('אישור נכשל: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (!draft) return;
    setExporting(true);
    try {
      await exportWeeklyBulletinPDF(draft, template || null);
    } catch (e) {
      toast.error('הפקת PDF נכשלה: ' + (e?.message || ''));
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-5" dir="rtl">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">חוברת קשר שבועית</h1>
            <p className="text-xs text-muted-foreground">טיוטה אוטומטית לפי ההספק ומערכת השעות</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <BulletinList
                bulletins={bulletins}
                selectedId={selectedId}
                onSelect={setSelectedId}
                generating={generating}
                onGenerate={handleGenerate}
              />
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <BulletinEditor
                bulletin={draft}
                onChange={handleChange}
                template={template}
                templates={templates}
                onTemplateChange={setTemplate}
                templateImageUrl={templateImage}
                onSave={handleSave}
                onExport={handleExport}
                onApprove={handleApprove}
                saving={saving}
                exporting={exporting}
                dirty={dirty}
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}