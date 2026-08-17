import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { motion } from 'framer-motion';
import { Award, Download, Loader2, Users, User as UserIcon, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CERTIFICATE_TEMPLATES, exportCertificatePDF, exportCertificateBatchPDF } from '@/lib/certificateExport';

export default function CertificatesPage() {
  const qc = useQueryClient();

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const { data: customTemplates = [] } = useQuery({
    queryKey: ['certificate-templates', 'ready'],
    queryFn: () => base44.entities.CertificateTemplate.filter({ kind: 'certificate', status: 'ready' }),
  });

  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const activeStudents = useMemo(
    () => students.filter(s => s.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he')),
    [students]
  );

  const [template, setTemplate] = useState('excellence');
  const [customTemplateId, setCustomTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectFreeText, setSubjectFreeText] = useState('');
  const [signedBy, setSignedBy] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [generatingSingle, setGeneratingSingle] = useState(null);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  const isCustom = template === 'template_based';
  const activeCustomTemplate = customTemplates.find((t) => t.id === customTemplateId);
  const tpl = isCustom
    ? {
        label: activeCustomTemplate?.name || 'תבנית מותאמת אישית',
        defaultTitle: activeCustomTemplate?.detected_title || '',
        defaultBody: activeCustomTemplate?.detected_body_text || '',
      }
    : CERTIFICATE_TEMPLATES[template];

  // When switching to a custom template, pre-fill the subject checkboxes
  // from what the AI detected in the original image.
  useEffect(() => {
    if (isCustom && activeCustomTemplate) {
      setSubjects(activeCustomTemplate.detected_subjects || []);
    }
  }, [isCustom, activeCustomTemplate]);

  const logMutation = useMutation({
    mutationFn: (records) => Promise.all(records.map((r) => base44.entities.Certificate.create(r))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates'] }),
  });

  function buildCert(student, batchId) {
    const allSubjects = subjectFreeText.trim()
      ? [...subjects, subjectFreeText.trim()]
      : subjects;
    return {
      student_id: student.id,
      student_name: student.name,
      template,
      title: title || tpl.defaultTitle,
      body_text: bodyText || tpl.defaultBody,
      subject: allSubjects.join(' ו'),
      subjects: allSubjects,
      signed_by: signedBy,
      date: new Date().toISOString().slice(0, 10),
      source_template_item_id: isCustom ? activeCustomTemplate?.library_item_id : undefined,
      // Not persisted on the entity — only used in-memory to render this export
      templateData: isCustom ? activeCustomTemplate : undefined,
      ...(batchId ? { batch_id: batchId } : {}),
    };
  }

  function stripTransientFields(cert) {
    const { templateData, ...rest } = cert;
    return rest;
  }

  async function handleSingle(student) {
    if (isCustom && !activeCustomTemplate) {
      toast.error('בחר/י תבנית מוכנה');
      return;
    }
    setGeneratingSingle(student.id);
    try {
      const cert = buildCert(student);
      await exportCertificatePDF(cert);
      await logMutation.mutateAsync([stripTransientFields(cert)]);
    } catch (e) {
      toast.error('שגיאה בהפקת התעודה');
    } finally {
      setGeneratingSingle(null);
    }
  }

  async function handleBatch() {
    if (isCustom && !activeCustomTemplate) {
      toast.error('בחר/י תבנית מוכנה');
      return;
    }
    const chosen = activeStudents.filter(s => selectedIds.includes(s.id));
    if (chosen.length === 0) {
      toast.error('בחר/י לפחות תלמיד אחד');
      return;
    }
    setGeneratingBatch(true);
    try {
      const batchId = `batch_${Date.now()}`;
      const certs = chosen.map((s) => buildCert(s, batchId));
      await exportCertificateBatchPDF(certs, tpl.label);
      await logMutation.mutateAsync(certs.map(stripTransientFields));
    } catch (e) {
      toast.error('שגיאה בהפקת התעודות');
    } finally {
      setGeneratingBatch(false);
    }
  }

  function toggleAll() {
    setSelectedIds(selectedIds.length === activeStudents.length ? [] : activeStudents.map(s => s.id));
  }

  function toggleSubject(s) {
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

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
      <div ref={containerRef} className="relative p-5 max-w-2xl mx-auto space-y-5 pb-24" dir="rtl">
        <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          <Award className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">תעודות</h1>
            <p className="text-muted-foreground text-sm">הפקת תעודות PDF להצטיינות, השתתפות וסיום נושא</p>
          </div>
        </motion.div>

        {/* Template + text settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-2xl p-4 space-y-4"
        >
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">סוג תעודה</label>
            <Select value={template} onValueChange={(v) => { setTemplate(v); setTitle(''); setBodyText(''); if (v !== 'template_based') setSubjects([]); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CERTIFICATE_TEMPLATES).map(([key, t]) => (
                  <SelectItem key={key} value={key}>{t.icon} {t.label}</SelectItem>
                ))}
                {customTemplates.length > 0 && (
                  <SelectItem value="template_based">🎖 לפי תבנית אישית שהעליתי</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {isCustom && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">איזו תבנית?</label>
              {customTemplates.length === 0 ? (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 flex items-center gap-2">
                  <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />
                  לא נותחה עדיין תבנית. אפשר להעלות ולנתח אחת
                  <Link to="/templates" className="text-primary font-medium underline shrink-0">כאן</Link>
                </div>
              ) : (
                <Select value={customTemplateId} onValueChange={setCustomTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר/י תבנית" />
                  </SelectTrigger>
                  <SelectContent>
                    {customTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">כותרת (אופציונלי)</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tpl.defaultTitle} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">טקסט התעודה (אופציונלי)</label>
            <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder={tpl.defaultBody} rows={3} />
          </div>

          {isCustom && activeCustomTemplate?.detected_subjects?.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">מקצועות שזוהו בתבנית</label>
              <div className="flex flex-wrap gap-2">
                {activeCustomTemplate.detected_subjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      subjects.includes(s)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {isCustom ? 'מקצוע נוסף (אופציונלי)' : 'מקצוע / נושא'}
              </label>
              <Input value={subjectFreeText} onChange={(e) => setSubjectFreeText(e.target.value)} placeholder="לדוגמה: גמרא" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">שם החותם</label>
              <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="שם המורה" />
            </div>
          </div>
        </motion.div>

        {/* Single-student list with per-row generate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">בחירת תלמידים להפקה מרוכזת</span>
            </div>
            <button onClick={toggleAll} className="text-xs font-medium text-primary">
              {selectedIds.length === activeStudents.length ? 'נקה הכל' : 'בחר הכל'}
            </button>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {activeStudents.map((student) => {
              const checked = selectedIds.includes(student.id);
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
                >
                  <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setSelectedIds((prev) =>
                        checked ? prev.filter((id) => id !== student.id) : [...prev, student.id]
                      )}
                      className="w-4 h-4 rounded border-border accent-primary shrink-0"
                    />
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{student.name}</span>
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-8 px-2.5"
                    disabled={generatingSingle === student.id}
                    onClick={() => handleSingle(student)}
                  >
                    {generatingSingle === student.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              );
            })}
            {activeStudents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">אין תלמידים פעילים</p>
            )}
          </div>
        </motion.div>

        {/* Sticky batch action bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-20 inset-x-0 px-5 z-30">
            <div className="max-w-2xl mx-auto">
              <Button
                className="w-full h-12 rounded-2xl shadow-lg gap-2"
                disabled={generatingBatch}
                onClick={handleBatch}
              >
                {generatingBatch
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />}
                הפק {selectedIds.length} תעודות בקובץ אחד
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
