import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/ui/MobileSelect';
import { SelectItem } from '@/components/ui/select';
import { Mail, Send, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatDate';

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const TEXT_FIELDS = new Set(['assessment', 'notes', 'summary', 'content', 'remark', 'report']);

function detectPlaceholders(body) {
  const set = new Set();
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  let m;
  while ((m = re.exec(body || '')) !== null) set.add(m[1]);
  return Array.from(set);
}

function renderBody(body, values) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => values[k] ?? '');
}

function findParentEmail(student) {
  const cf = student?.custom_fields || {};
  for (const k of Object.keys(cf)) {
    const m = String(cf[k] || '').match(EMAIL_RE);
    if (m) return m[0];
  }
  return '';
}

export default function ReportTemplateSender({ student }) {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => base44.entities.ReportTemplate.list('-created_date', 50),
  });
  const [selectedId, setSelectedId] = useState('');
  const [values, setValues] = useState({});
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const template = templates.find(t => t.id === selectedId) || null;
  const placeholders = useMemo(() => template ? detectPlaceholders(template.body) : [], [template]);

  const effectiveValues = useMemo(() => {
    const v = { ...values };
    if (!v.student_name) v.student_name = student?.name || '';
    if (!v.date) v.date = formatDate(new Date().toISOString()) || new Date().toLocaleDateString('he-IL');
    return v;
  }, [values, student]);

  const parentEmail = findParentEmail(student);

  function reset() { setSelectedId(''); setValues({}); setLastSent(null); }

  async function handleSend() {
    if (!template) return;
    if (!parentEmail) {
      toast.error('לא נמצא מייל הורה בפרטי התלמיד — הוסף מייל בשדות המותאמים האישיים.');
      return;
    }
    setSending(true);
    setLastSent(null);
    try {
      const body = renderBody(template.body, effectiveValues);
      await base44.integrations.Core.SendEmail({
        to: parentEmail,
        subject: template.subject ? renderBody(template.subject, effectiveValues) : template.name,
        body,
      });
      await base44.entities.StudentPortfolioItem.create({
        student_id: student.id,
        type: 'parent_letter',
        title: `${template.name} — ${student.name}`,
        description: body,
        date: new Date().toISOString().slice(0, 10),
        tags: ['דוח', 'תבנית', 'נשלח להורים'],
      });
      setLastSent({ ok: true, email: parentEmail });
      toast.success(`הדוח נשלח ל-${parentEmail} ונשמר בתיק`);
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      reset();
    } catch (err) {
      setLastSent({ ok: false, error: err?.message || 'שליחה נכשלה' });
      toast.error('שליחת המייל נכשלה — ייתכן שנדרש דומיין מותאם אישי לשליחה לכתובות חיצוניות.');
    } finally {
      setSending(false);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-4 text-center">
        <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
        <p className="text-sm font-medium">אין תבניות דוח עדיין</p>
        <p className="text-xs text-muted-foreground mt-0.5">צור תבנית קבועה (מ״תבניות דוח״ בתפריט עוד) כדי למלא ולשלוח דוחים להורים מכאן</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">שליחת דוח מתבנית להורים</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">בחר תבנית</Label>
        <MobileSelect
          value={selectedId}
          onValueChange={(v) => { setSelectedId(v); setValues({}); setLastSent(null); }}
          placeholder="בחר תבנית דוח"
          title="בחירת תבנית דוח"
        >
          {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
        </MobileSelect>
      </div>

      {template && (
        <>
          {placeholders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">מילוי שדות:</p>
              <div className="grid grid-cols-1 gap-2">
                {placeholders.map(p => {
                  const isText = TEXT_FIELDS.has(p);
                  return (
                    <div key={p}>
                      <Label className="text-[11px] text-muted-foreground">{p}</Label>
                      {isText ? (
                        <Textarea
                          value={effectiveValues[p] || values[p] || ''}
                          onChange={e => setValues(v => ({ ...v, [p]: e.target.value }))}
                          className="text-sm min-h-[56px]"
                          placeholder={`הזן ${p}`}
                        />
                      ) : (
                        <Input
                          value={effectiveValues[p] || values[p] || ''}
                          onChange={e => setValues(v => ({ ...v, [p]: e.target.value }))}
                          className="h-8 text-sm"
                          placeholder={`הזן ${p}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-muted/40 border border-border p-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground mb-1">תצוגה מקדימה</p>
            <p className="text-xs whitespace-pre-wrap leading-relaxed text-foreground">{renderBody(template.body, effectiveValues)}</p>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] text-muted-foreground min-w-0">
              {parentEmail
                ? <>נשלח אל <span dir="ltr" className="font-medium text-foreground break-all">{parentEmail}</span></>
                : <span className="text-amber-600">לא נמצא מייל הורה — הוסף בפרטים האישיים</span>}
            </div>
            <Button size="sm" onClick={handleSend} disabled={sending || !parentEmail}>
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <Send className="w-3.5 h-3.5 ml-1" />}
              שלח ושמור בתיק
            </Button>
          </div>

          {lastSent && (
            lastSent.ok ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> נשלח ונשמר בתיק בהצלחה
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" /> {lastSent.error}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}