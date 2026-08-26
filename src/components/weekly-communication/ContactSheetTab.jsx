import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Contact, FileDown, Loader2, Plus, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CONTACT_CATEGORIES, CONTACT_DEFAULTS } from '@/lib/contactDefaults';

export default function ContactSheetTab() {
  const qc = useQueryClient();

  const { data: classes = [] } = useQuery({
    queryKey: ['classrooms'],
    queryFn: () => base44.entities.Classroom.list(),
  });
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['contact-entries'],
    queryFn: () => base44.entities.ContactEntry.list('sort_order'),
  });

  const [classId, setClassId] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [draft, setDraft] = useState({
    category: CONTACT_CATEGORIES[0], name: '', role: '', phone: '', email: '', notes: '',
  });

  const className = classes.find((c) => c.id === classId)?.name ?? '';

  const rows = useMemo(
    () => entries.filter((e) => (classId === 'all' ? !e.class_id : e.class_id === classId)),
    [entries, classId],
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contact-entries'] });

  const add = useMutation({
    mutationFn: () => base44.entities.ContactEntry.create({
      ...draft,
      class_id: classId === 'all' ? null : classId,
      sort_order: entries.length,
    }),
    onSuccess: () => {
      setDraft({ category: draft.category, name: '', role: '', phone: '', email: '', notes: '' });
      invalidate();
      toast.success('איש הקשר נוסף');
    },
    onError: (e) => toast.error(e?.message || 'השמירה נכשלה'),
  });

  const prefill = useMutation({
    mutationFn: () => base44.entities.ContactEntry.bulkCreate(
      CONTACT_DEFAULTS.map((d, i) => ({
        category: d.category,
        name: d.role,
        role: d.role,
        phone: '',
        email: '',
        notes: d.notes,
        class_id: classId === 'all' ? null : classId,
        sort_order: i,
      })),
    ),
    onSuccess: () => { invalidate(); toast.success('התבנית הוזנה — נשאר רק להשלים טלפונים'); },
    onError: (e) => toast.error(e?.message || 'המילוי נכשל'),
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.ContactEntry.delete(id),
    onSuccess: () => { invalidate(); toast.success('נמחק'); },
    onError: (e) => toast.error(e?.message || 'המחיקה נכשלה'),
  });

  async function handleExport() {
    setExporting(true);
    try {
      const { exportContactSheetPdf } = await import('@/lib/contactSheetExport');
      await exportContactSheetPdf(
        rows.map((r) => ({
          category: r.category, name: r.name, role: r.role,
          phone: r.phone, email: r.email, notes: r.notes,
        })),
        { className: className || undefined },
      );
    } catch {
      toast.error('הפקת המסמך נכשלה. נסה שוב.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Contact className="w-5 h-5 text-primary" aria-hidden="true" /> דף קשר
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          כל אנשי הקשר של המוסד במקום אחד — הנהלה, צוות, ספקים, בריאות וחירום. אפשר להזין תבנית מוכנה ולהפיק דף להדפסה.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">שיוך ותבנית</CardTitle>
          <CardDescription>
            בחר אם דף הקשר כללי למוסד או משויך לכיתה מסוימת, ואז מלא את התבנית המומלצת.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="max-w-xs" aria-label="שיוך דף הקשר">
              <SelectValue placeholder="כללי למוסד" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כללי למוסד</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => prefill.mutate()} disabled={prefill.isPending}>
              {prefill.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Wand2 className="h-4 w-4" aria-hidden="true" />}
              הזנה מראש לפי תבנית ({CONTACT_DEFAULTS.length} שורות)
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || rows.length === 0}>
              {exporting
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <FileDown className="h-4 w-4" aria-hidden="true" />}
              ייצוא דף הקשר ל-PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">הוספת איש קשר</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cat">קטגוריה</Label>
            <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
              <SelectTrigger id="cat"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTACT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">שם</Label>
            <Input id="name" maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">תפקיד</Label>
            <Input id="role" maxLength={120} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">טלפון</Label>
            <Input id="phone" inputMode="tel" maxLength={40} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">אימייל</Label>
            <Input id="email" type="email" maxLength={200} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">הערות</Label>
            <Input id="notes" maxLength={500} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" onClick={() => add.mutate()} disabled={add.isPending || draft.name.trim() === ''}>
              {add.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Plus className="h-4 w-4" aria-hidden="true" />}
              הוספה לדף הקשר
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">טוען…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            דף הקשר ריק. לחץ על "הזנה מראש לפי תבנית" כדי לקבל את כל הקטגוריות והספקים המיועדים.
          </CardContent>
        </Card>
      ) : (
        CONTACT_CATEGORIES.filter((c) => rows.some((r) => r.category === c)).map((cat) => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{cat}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {rows.filter((r) => r.category === cat).map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-2 py-2.5 text-sm">
                  <div>
                    <span className="font-medium">{r.name}</span>
                    {r.role && <span className="text-muted-foreground"> · {r.role}</span>}
                    <span className="block text-xs text-muted-foreground">
                      {[r.phone, r.email, r.notes].filter(Boolean).join(' · ') || 'טרם הושלמו פרטים'}
                    </span>
                  </div>
                  <Button
                    variant="ghost" size="icon" aria-label={`מחיקת ${r.name}`}
                    onClick={() => remove.mutate(r.id)} disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}