import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Upload, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const SOURCE_TYPES = [
  { id: 'audio_recording', icon: '🎙️', label: 'הקלטת שיעור' },
  { id: 'audio_file',      icon: '🎵', label: 'קובץ אודיו' },
  { id: 'pdf',             icon: '📄', label: 'מסמך PDF' },
  { id: 'word_doc',        icon: '📝', label: 'מסמך Word' },
  { id: 'presentation',    icon: '📊', label: 'מצגת PPT' },
  { id: 'video_file',      icon: '🎬', label: 'סרטון' },
  { id: 'youtube_link',    icon: '▶️', label: 'קישור YouTube' },
  { id: 'external_link',   icon: '🔗', label: 'קישור חיצוני' },
  { id: 'text_note',       icon: '✍️', label: 'הקלד/הדבק טקסט' },
  { id: 'image',           icon: '🖼️', label: 'תמונת לוח' },
];

const CATEGORIES = ['גמרא', 'הלכה', 'חומש', 'נ"ך', 'תפילה', 'מחשבת ישראל', 'מדעים', 'מתמטיקה', 'שפה', 'אחר'];

export default function LibraryUploadModal({ open, onClose }) {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [sourceType, setSourceType] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    category: '',
    subject: '',
    difficulty: 'בינוני',
    youtube_url: '',
    external_url: '',
    transcript: '',
    auto_analyze: true,
  });

  const isFileType = ['audio_recording', 'audio_file', 'pdf', 'word_doc', 'presentation', 'video_file', 'image'].includes(sourceType);
  const isLinkType = ['youtube_link', 'external_link'].includes(sourceType);
  const isTextType = sourceType === 'text_note';

  function reset() {
    setStep(1); setSourceType(null); setFile(null);
    setForm({ title: '', category: '', subject: '', difficulty: 'בינוני', youtube_url: '', external_url: '', transcript: '', auto_analyze: true });
  }

  async function handleSave() {
    setUploading(true);
    try {
      let file_url = null, file_name = null, file_size = null;
      if (file) {
        const res = await base44.integrations.Core.UploadFile({ file });
        file_url = res.file_url;
        file_name = file.name;
        file_size = file.size;
      }

      const item = await base44.entities.LibraryItem.create({
        title: form.title || file?.name?.replace(/\.[^.]+$/, '') || 'חומר חדש',
        category: form.category,
        subject: form.subject,
        difficulty: form.difficulty,
        source_type: sourceType,
        file_url, file_name, file_size,
        youtube_url: form.youtube_url || null,
        external_url: form.external_url || null,
        transcript: form.transcript || null,
        ai_status: form.auto_analyze ? 'pending' : 'pending',
        generated_artifacts: [],
        lesson_log: [],
        is_favorite: false,
        is_archived: false,
      });

      if (form.auto_analyze) {
        // Trigger AI analysis in background
        analyzeItem(item);
      }

      qc.invalidateQueries({ queryKey: ['library'] });
      toast.success('חומר נוסף לספרייה!');
      reset();
      onClose();
    } catch (e) {
      toast.error('שגיאה בהעלאה');
    }
    setUploading(false);
  }

  async function analyzeItem(item) {
    try {
      await base44.entities.LibraryItem.update(item.id, { ai_status: 'processing' });
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `נתח את החומר הלימודי הבא ותחזיר JSON בלבד:
חומר: "${item.title}"
קטגוריה: "${item.category || 'לא ידוע'}"
נושא: "${item.subject || 'לא ידוע'}"
טקסט: "${(item.transcript || '').slice(0, 2000)}"

החזר JSON עם המבנה הבא:
{
  "suggestedTitle": "כותרת מוצעת",
  "suggestedCategory": "קטגוריה",
  "suggestedTags": ["תג1", "תג2"],
  "difficulty": "קל/בינוני/קשה",
  "summary": "סיכום 3-5 משפטים",
  "keyPoints": ["נקודה1", "נקודה2", "נקודה3"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestedTitle: { type: "string" },
            suggestedCategory: { type: "string" },
            suggestedTags: { type: "array", items: { type: "string" } },
            difficulty: { type: "string" },
            summary: { type: "string" },
            keyPoints: { type: "array", items: { type: "string" } }
          }
        }
      });
      await base44.entities.LibraryItem.update(item.id, {
        ai_status: 'ready',
        ai_summary: result.summary,
        ai_key_points: result.keyPoints,
        ai_suggested_title: result.suggestedTitle,
        ai_suggested_category: result.suggestedCategory,
        ai_suggested_tags: result.suggestedTags,
      });
      qc.invalidateQueries({ queryKey: ['library'] });
    } catch {
      await base44.entities.LibraryItem.update(item.id, { ai_status: 'error' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>הוסף חומר לספרייה</DialogTitle>
          <div className="flex gap-1 mt-2">
            {[1,2,3].map(s => (
              <div key={s} className={cn("h-1 flex-1 rounded-full transition-colors", step >= s ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">בחר את סוג החומר:</p>
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_TYPES.map(t => (
                <button key={t.id} onClick={() => setSourceType(t.id)}
                  className={cn("flex items-center gap-2 p-3 rounded-xl border text-sm transition-all text-right",
                    sourceType === t.id ? "border-primary bg-primary/5 text-primary font-medium" : "border-border hover:border-primary/40 hover:bg-accent")}>
                  <span className="text-lg">{t.icon}</span>
                  <span>{t.label}</span>
                  {sourceType === t.id && <Check className="w-4 h-4 mr-auto" />}
                </button>
              ))}
            </div>
            <Button className="w-full" disabled={!sourceType} onClick={() => setStep(2)}>
              המשך <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{SOURCE_TYPES.find(t => t.id === sourceType)?.icon} {SOURCE_TYPES.find(t => t.id === sourceType)?.label}</p>
            
            {isFileType && (
              <div>
                <div onClick={() => fileInputRef.current?.click()}
                  className={cn("border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                    file ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}>
                  {file ? (
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">לחץ לבחירת קובץ או גרור לכאן</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
              </div>
            )}

            {isLinkType && (
              <Input
                placeholder={sourceType === 'youtube_link' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                value={sourceType === 'youtube_link' ? form.youtube_url : form.external_url}
                onChange={e => setForm(p => ({ ...p, [sourceType === 'youtube_link' ? 'youtube_url' : 'external_url']: e.target.value }))}
                dir="ltr"
              />
            )}

            {isTextType && (
              <Textarea placeholder="הדבק או הקלד את תוכן השיעור כאן..." value={form.transcript}
                onChange={e => setForm(p => ({ ...p, transcript: e.target.value }))}
                className="min-h-[150px] text-sm" dir="rtl" />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ChevronRight className="w-4 h-4" /> חזור
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}
                disabled={isFileType && !file && isLinkType && !form.youtube_url && !form.external_url}>
                המשך <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">פרטים (ניתן לדלג — AI ימלא):</p>
            <Input placeholder="כותרת" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="קטגוריה..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="נושא ספציפי" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <Select value={form.difficulty} onValueChange={v => setForm(p => ({ ...p, difficulty: v }))}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="קל">קל</SelectItem>
                <SelectItem value="בינוני">בינוני</SelectItem>
                <SelectItem value="קשה">קשה</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.auto_analyze} onChange={e => setForm(p => ({ ...p, auto_analyze: e.target.checked }))} className="rounded" />
              ✨ נתח אוטומטית עם AI
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1">
                <ChevronRight className="w-4 h-4" /> חזור
              </Button>
              <Button className="flex-1 gap-1" onClick={handleSave} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                שמור לספרייה
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}