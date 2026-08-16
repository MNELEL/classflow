import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/ui/PullToRefreshIndicator';
import { motion } from 'framer-motion';
import { Award, Download, Loader2, Users, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CERTIFICATE_TEMPLATES, exportCertificatePDF, exportCertificateBatchPDF } from '@/lib/certificateExport';

export default function CertificatesPage() {
  const qc = useQueryClient();

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['students'],
    queryFn: () => base44.entities.Student.list(),
  });

  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const { containerRef, pullY, refreshing } = usePullToRefresh(handleRefresh);

  const activeStudents = useMemo(
    () => students.filter(s => s.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he')),
    [students]
  );

  const [template, setTemplate] = useState('excellence');
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [subject, setSubject] = useState('');
  const [signedBy, setSignedBy] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [generatingSingle, setGeneratingSingle] = useState(null);
  const [generatingBatch, setGeneratingBatch] = useState(false);

  const tpl = CERTIFICATE_TEMPLATES[template];

  const logMutation = useMutation({
    mutationFn: (records) => Promise.all(records.map((r) => base44.entities.Certificate.create(r))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificates'] }),
  });

  function buildCert(student, batchId) {
    return {
      student_id: student.id,
      student_name: student.name,
      template,
      title: title || tpl.defaultTitle,
      body_text: bodyText || tpl.defaultBody,
      subject,
      signed_by: signedBy,
      date: new Date().toISOString().slice(0, 10),
      ...(batchId ? { batch_id: batchId } : {}),
    };
  }

  async function handleSingle(student) {
    setGeneratingSingle(student.id);
    try {
      const cert = buildCert(student);
      await exportCertificatePDF(cert);
      await logMutation.mutateAsync([cert]);
    } catch (e) {
      toast.error('שגיאה בהפקת התעודה');
    } finally {
      setGeneratingSingle(null);
    }
  }

  async function handleBatch() {
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
      await logMutation.mutateAsync(certs);
    } catch (e) {
      toast.error('שגיאה בהפקת התעודות');
    } finally {
      setGeneratingBatch(false);
    }
  }

  function toggleAll() {
    setSelectedIds(selectedIds.length === activeStudents.length ? [] : activeStudents.map(s => s.id));
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
            <Select value={template} onValueChange={(v) => { setTemplate(v); setTitle(''); setBodyText(''); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CERTIFICATE_TEMPLATES).map(([key, t]) => (
                  <SelectItem key={key} value={key}>{t.icon} {t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">כותרת (אופציונלי)</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tpl.defaultTitle} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">טקסט התעודה (אופציונלי)</label>
            <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder={tpl.defaultBody} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">מקצוע / נושא</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="לדוגמה: גמרא" />
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
