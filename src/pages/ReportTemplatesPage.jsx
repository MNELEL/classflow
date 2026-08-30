import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Pencil, X, Check, FileText } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name: '', subject: '', body: '' };

export default function ReportTemplatesPage() {
  const qc = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => base44.entities.ReportTemplate.list('-created_date', 100),
  });
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(EMPTY);

  function startNew() { setEditing('new'); setDraft(EMPTY); }
  function startEdit(t) { setEditing(t.id); setDraft({ name: t.name, subject: t.subject || '', body: t.body }); }
  function cancel() { setEditing(null); setDraft(EMPTY); }

  async function save() {
    if (!draft.name.trim() || !draft.body.trim()) { toast.error('שם ותוכן הם שדות חובה'); return; }
    try {
      if (editing === 'new') {
        await base44.entities.ReportTemplate.create({ ...draft, is_active: true });
        toast.success('התבנית נוצרה');
      } else {
        await base44.entities.ReportTemplate.update(editing, draft);
        toast.success('התבנית עודכנה');
      }
      qc.invalidateQueries({ queryKey: ['report-templates'] });
      cancel();
    } catch {
      toast.error('שמירה נכשלה');
    }
  }

  async function remove(id) {
    if (!window.confirm('למחוק תבנית זו?')) return;
    try {
      await base44.entities.ReportTemplate.delete(id);
      qc.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('התבנית נמחקה');
    } catch {
      toast.error('מחיקה נכשלה');
    }
  }

  const placeholders = Array.from(new Set([...(draft.body || '').matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1])));

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 pb-10 space-y-4" dir="rtl">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">תבניות דוח</h1>
            <p className="text-xs text-muted-foreground">צור תבניות קבועות למילוי ושליחה להורים מתוך פרופיל התלמיד</p>
          </div>
          {editing !== 'new' && (
            <Button size="sm" onClick={startNew}><Plus className="w-4 h-4 ml-1" /> תבנית חדשה</Button>
          )}
        </div>

        {editing !== null && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-xs">שם התבנית</Label>
                <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="לדוגמה: דוח אמצע תקופה" />
              </div>
              <div>
                <Label className="text-xs">נושא המייל</Label>
                <Input value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} placeholder="עדכון לגבי {{student_name}}" dir="rtl" />
              </div>
              <div>
                <Label className="text-xs">תוכן הדוח — השתמש ב-{'{{שדה}}'} למקומות למילוי ידני</Label>
                <Textarea
                  value={draft.body}
                  onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                  rows={7}
                  placeholder={'שלום {{parent_name}},\nדוח עבור {{student_name}} לתאריך {{date}}.\n\nהערכה:\n{{assessment}}'}
                />
                {placeholders.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">שדות למילוי: {placeholders.map(p => `{{${p}}}`).join(', ')}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={save}><Check className="w-4 h-4 ml-1" /> שמור</Button>
                <Button size="sm" variant="ghost" onClick={cancel}><X className="w-4 h-4 ml-1" /> ביטול</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">טוען…</p>
        ) : templates.length === 0 && editing === null ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">אין תבניות עדיין</p>
            <Button size="sm" className="mt-3" onClick={startNew}><Plus className="w-4 h-4 ml-1" /> צור תבנית ראשונה</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map(t => (
              <Card key={t.id}>
                <CardContent className="p-3.5">
                  {editing !== t.id && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{t.name}</p>
                        {t.subject && <p className="text-xs text-muted-foreground">נושא: {t.subject}</p>}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{t.body}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(t)} aria-label="עריכה"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(t.id)} aria-label="מחיקה"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}