import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, ScanText, RefreshCw, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function confidenceColor(c) {
  if (c == null) return 'text-muted-foreground';
  if (c >= 0.85) return 'text-emerald-600';
  if (c >= 0.6) return 'text-amber-600';
  return 'text-red-600';
}

export default function OcrReviewPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [rescanning, setRescanning] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ['library-item', itemId],
    queryFn: () => base44.entities.LibraryItem.get(itemId),
    enabled: !!itemId,
  });

  useEffect(() => {
    if (item) setText(item.original_text || item.transcript || '');
  }, [item]);

  async function handleRescan() {
    if (!item?.file_url) { toast.error('אין קובץ מקור לסריקה חוזרת'); return; }
    setRescanning(true);
    try {
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: item.file_url,
        json_schema: {
          type: 'object',
          properties: {
            full_text: { type: 'string', description: 'כל הטקסט שחולץ מהקובץ' },
            rows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  data: { type: 'string' },
                  confidence: { type: 'number', description: 'רמת ביטחון 0-100' },
                },
              },
            },
          },
        },
      });
      const output = extracted?.output || {};
      const rows = output.rows || [];
      const conf = rows.length ? Math.round(rows.reduce((s, r) => s + (r.confidence || 0), 0) / rows.length) / 100 : null;
      setText(output.full_text || '');
      await base44.entities.LibraryItem.update(itemId, {
        original_text: output.full_text || '',
        ocr_confidence: conf,
        is_edited: false,
      });
      qc.invalidateQueries({ queryKey: ['library-item', itemId] });
      toast.success('הסריקה החוזרת הושלמה');
    } catch (e) {
      toast.error('שגיאה בסריקה חוזרת: ' + e.message);
    }
    setRescanning(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const original = item.original_text || item.transcript || '';
      const wasChanged = text !== original;
      await base44.entities.LibraryItem.update(itemId, {
        original_text: text,
        is_edited: wasChanged,
      });
      if (wasChanged) {
        await base44.entities.IngestAuditLog.create({
          file_name: item.file_name || item.title || '',
          suggested_category: item.category || '',
          final_category: item.category || '',
          material_type: item.material_type || null,
          was_changed: true,
          original_text_length: text.length,
          item_id: itemId,
        }).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ['library-item', itemId] });
      toast.success('הטקסט נשמר');
      navigate(-1);
    } catch (e) {
      toast.error('שגיאה בשמירה: ' + e.message);
    }
    setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-3xl mx-auto pb-8" dir="rtl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 gap-1">
          <ArrowRight className="w-4 h-4" /> חזרה
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <ScanText className="w-6 h-6 text-primary" /> סקירת OCR
        </h1>
        <p className="text-muted-foreground text-sm mb-4">{item?.title || ''}</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : item ? (
          <Card className="border-border/60 mb-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">רמת ודאות:</span>
                  {item.ocr_confidence != null ? (
                    <span className={`text-sm font-bold ${confidenceColor(item.ocr_confidence)}`}>
                      {Math.round(item.ocr_confidence * 100)}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">לא חושבה</span>
                  )}
                  {item.is_edited && <Badge variant="secondary" className="text-[10px]">נערך ידנית</Badge>}
                </div>
                <Button size="sm" variant="outline" onClick={handleRescan} disabled={rescanning || !item.file_url} className="gap-1">
                  {rescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  סרוק מחדש
                </Button>
              </div>

              {!item.file_url && (
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-lg p-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">אין קובץ מקור לפריט זה, לא ניתן לסרוק מחדש. ניתן לערוך את הטקסט ידנית.</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">טקסט שחולץ (ניתן לעריכה)</p>
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  className="min-h-[320px] text-sm leading-relaxed resize-y"
                  dir="rtl"
                  placeholder="אין טקסט שחולץ. לחץ על ״סרוק מחדש״ או הזן טקסט ידנית."
                />
                <p className="text-[10px] text-muted-foreground mt-1">{text.length} תווים</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  שמור טקסט
                </Button>
                <Button variant="outline" onClick={() => navigate(-1)}>ביטול</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-10">פריט לא נמצא</p>
        )}
      </div>
    </AppLayout>
  );
}