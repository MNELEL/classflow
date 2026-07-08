import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Upload, X, Check, Link2, Globe, FileText, Mic, Video, Image, Music, File, Plus, CloudIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import GoogleDrivePicker from '@/components/library/GoogleDrivePicker';

const CATEGORIES = ['גמרא', 'הלכה', 'חומש', 'נ"ך', 'תפילה', 'מחשבת ישראל', 'מדעים', 'מתמטיקה', 'שפה', 'אחר'];

// Detect source type from file MIME or extension
function detectSourceType(file) {
  const name = file.name.toLowerCase();
  const type = file.type || '';
  if (type.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a') || name.endsWith('.ogg')) return 'audio_file';
  if (type.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi')) return 'video_file';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.doc') || name.endsWith('.docx') || type.includes('word')) return 'word_doc';
  if (name.endsWith('.ppt') || name.endsWith('.pptx') || type.includes('presentation')) return 'presentation';
  if (type.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp')) return 'image';
  return 'pdf';
}

function sourceTypeIcon(type) {
  const map = {
    audio_file: '🎵', audio_recording: '🎙️', pdf: '📄', word_doc: '📝',
    presentation: '📊', video_file: '🎬', image: '🖼️', youtube_link: '▶️',
    external_link: '🔗', text_note: '✍️',
  };
  return map[type] || '📁';
}

async function analyzeItem(item, qc) {
  try {
    await base44.entities.LibraryItem.update(item.id, { ai_status: 'processing' });

    // Auto-transcribe audio files if no transcript exists
    let transcript = item.transcript || '';
    if (!transcript && (item.source_type === 'audio_file' || item.source_type === 'audio_recording' || item.source_type === 'video_file') && item.file_url) {
      try {
        transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: item.file_url });
        await base44.entities.LibraryItem.update(item.id, { transcript });
      } catch {
        // transcription failed - continue without transcript
      }
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `נתח את החומר הלימודי הבא ותחזיר JSON בלבד:
כותרת: "${item.title}"
סוג: "${item.source_type}"
קטגוריה: "${item.category || 'לא ידוע'}"
נושא: "${item.subject || 'לא ידוע'}"
טקסט/תוכן: "${transcript.slice(0, 3000)}"

בצע ניתוח מעמיק:
- זהה את הנושא הלימודי המרכזי
- קבע קטגוריה מתאימה: גמרא/הלכה/חומש/נ"ך/תפילה/מחשבת ישראל/מדעים/מתמטיקה/שפה/אחר
- הצע תגיות רלוונטיות
- קבע רמת קושי מתאימה
- כתוב סיכום פדגוגי קצר
- חלץ נקודות מפתח`,
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
    qc.invalidateQueries({ queryKey: ['library-item', item.id] });
  } catch {
    await base44.entities.LibraryItem.update(item.id, { ai_status: 'error' });
  }
}

export default function LibraryUploadModal({ open, onClose }) {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const [tab, setTab] = useState('files'); // 'files' | 'link' | 'text' | 'search' | 'drive'
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [files, setFiles] = useState([]); // [{file, sourceType, title}]
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState('youtube_link');
  const [textContent, setTextContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]); // [{name, status}]
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setTab('files'); setFiles([]); setLinkUrl(''); setLinkType('youtube_link');
    setTextContent(''); setSearchQuery(''); setSearchResults([]);
    setCategory(''); setSubject(''); setUploadProgress([]);
  }

  // ── File handling ──────────────────────────────────────────────────────────
  const addFiles = useCallback((newFiles) => {
    const fileArray = Array.from(newFiles).map(f => ({
      file: f,
      sourceType: detectSourceType(f),
      title: f.name.replace(/\.[^.]+$/, ''),
      id: Math.random().toString(36).slice(2),
    }));
    setFiles(prev => [...prev, ...fileArray]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  // ── Google search ──────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `חפש מידע לימודי על הנושא: "${searchQuery}". 
        החזר 5 תוצאות עם כותרת, תיאור קצר וקישור (URL אמיתי ומוכר). 
        כל תוצאה תהיה מקור לימודי אמין.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  url: { type: "string" },
                  source: { type: "string" }
                }
              }
            }
          }
        }
      });
      setSearchResults(res.results || []);
    } catch {
      toast.error('שגיאה בחיפוש');
    }
    setSearching(false);
  };

  const addSearchResult = (result) => {
    setSearchResults(prev => prev.map(r =>
      r.url === result.url ? { ...r, added: true } : r
    ));
    // Pre-populate as external link
    setLinkUrl(result.url);
    setTab('link');
    setLinkType('external_link');
  };

  // ── Upload / Save ──────────────────────────────────────────────────────────
  async function handleSave() {
    const hasFiles = files.length > 0;
    const hasLink = linkUrl.trim();
    const hasText = textContent.trim();

    if (!hasFiles && !hasLink && !hasText) {
      toast.error('הוסף קובץ, קישור או טקסט');
      return;
    }

    setUploading(true);
    const progress = [];

    try {
      // Upload files
      for (const fileObj of files) {
        progress.push({ name: fileObj.title, status: 'uploading' });
        setUploadProgress([...progress]);
        try {
          const res = await base44.integrations.Core.UploadFile({ file: fileObj.file });
          const item = await base44.entities.LibraryItem.create({
            title: fileObj.title || 'חומר חדש',
            category: category || null,
            subject: subject || null,
            source_type: fileObj.sourceType,
            file_url: res.file_url,
            file_name: fileObj.file.name,
            file_size: fileObj.file.size,
            ai_status: 'pending',
            generated_artifacts: [],
            lesson_log: [],
            is_favorite: false,
            is_archived: false,
          });
          progress[progress.length - 1].status = 'analyzing';
          setUploadProgress([...progress]);
          analyzeItem(item, qc); // background
          progress[progress.length - 1].status = 'done';
          setUploadProgress([...progress]);
        } catch {
          progress[progress.length - 1].status = 'error';
          setUploadProgress([...progress]);
        }
      }

      // Add link
      if (hasLink) {
        progress.push({ name: linkUrl.slice(0, 40), status: 'uploading' });
        setUploadProgress([...progress]);
        const item = await base44.entities.LibraryItem.create({
          title: subject || linkUrl.slice(0, 60) || 'קישור חדש',
          category: category || null,
          subject: subject || null,
          source_type: linkType,
          youtube_url: linkType === 'youtube_link' ? linkUrl : null,
          external_url: linkType !== 'youtube_link' ? linkUrl : null,
          ai_status: 'pending',
          generated_artifacts: [],
          lesson_log: [],
          is_favorite: false,
          is_archived: false,
        });
        analyzeItem(item, qc);
        progress[progress.length - 1].status = 'done';
        setUploadProgress([...progress]);
      }

      // Add text
      if (hasText) {
        progress.push({ name: subject || 'פתק טקסט', status: 'uploading' });
        setUploadProgress([...progress]);
        const item = await base44.entities.LibraryItem.create({
          title: subject || 'פתק טקסט',
          category: category || null,
          subject: subject || null,
          source_type: 'text_note',
          transcript: textContent,
          ai_status: 'pending',
          generated_artifacts: [],
          lesson_log: [],
          is_favorite: false,
          is_archived: false,
        });
        analyzeItem(item, qc);
        progress[progress.length - 1].status = 'done';
        setUploadProgress([...progress]);
      }

      qc.invalidateQueries({ queryKey: ['library'] });
      const total = progress.length;
      toast.success(`${total} חומרים נוספו לספרייה ✓`);
      reset();
      onClose();
    } catch (e) {
      toast.error('שגיאה בהעלאה');
    }
    setUploading(false);
  }

  const totalItems = files.length + (linkUrl.trim() ? 1 : 0) + (textContent.trim() ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={() => { if (!uploading) { reset(); onClose(); } }}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            העלאת חומרים לספרייה
          </DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div role="tablist" className="flex gap-1 bg-muted rounded-lg p-1">
          {[
            { id: 'files', icon: '📁', label: 'קבצים' },
            { id: 'drive', icon: '☁️', label: 'Drive' },
            { id: 'link', icon: '🔗', label: 'קישור' },
            { id: 'text', icon: '✍️', label: 'טקסט' },
            { id: 'search', icon: '🔍', label: 'חיפוש' },
          ].map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} onClick={() => setTab(t.id)}
              className={cn('flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1',
                tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* FILES TAB */}
        {tab === 'files' && (
          <div className="space-y-3">
            {/* Drop zone */}
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
                dragOver ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-accent/30'
              )}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold text-sm">גרור קבצים לכאן או לחץ לבחירה</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, PPT, תמונות, אודיו, וידאו — כמה קבצים בבת אחת</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
            </div>

            {/* Files list */}
            {files.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {files.map(f => (
                  <div key={f.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-xl border border-border">
                    <span className="text-xl shrink-0">{sourceTypeIcon(f.sourceType)}</span>
                    <div className="flex-1 min-w-0">
                      <input
                        className="w-full text-sm bg-transparent border-none outline-none font-medium"
                        value={f.title}
                        onChange={e => setFiles(prev => prev.map(x => x.id === f.id ? { ...x, title: e.target.value } : x))}
                      />
                      <p className="text-[10px] text-muted-foreground">{(f.file.size / 1024 / 1024).toFixed(2)} MB • {f.sourceType}</p>
                    </div>
                    <MobileSelect value={f.sourceType} onValueChange={v => setFiles(prev => prev.map(x => x.id === f.id ? { ...x, sourceType: v } : x))} className="h-7 text-[10px] w-28">
                      <SelectItem value="pdf">📄 PDF</SelectItem>
                      <SelectItem value="word_doc">📝 Word</SelectItem>
                      <SelectItem value="presentation">📊 PPT</SelectItem>
                      <SelectItem value="audio_file">🎵 אודיו</SelectItem>
                      <SelectItem value="audio_recording">🎙️ הקלטה</SelectItem>
                      <SelectItem value="video_file">🎬 סרטון</SelectItem>
                      <SelectItem value="image">🖼️ תמונה</SelectItem>
                    </MobileSelect>
                    <button onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length === 0 && (
              <div className="grid grid-cols-4 gap-2 text-center">
                {['📄 PDF', '📝 Word', '🎵 אודיו', '🎙️ הקלטה', '🎬 סרטון', '📊 מצגת', '🖼️ תמונה', '📁 אחר'].map(t => (
                  <div key={t} className="p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">{t}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DRIVE TAB */}
        {tab === 'drive' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <CloudIcon className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">ייבוא מ-Google Drive</p>
              <p className="text-sm text-muted-foreground mt-1">בחר קובץ מהדרייב שלך והוסף אותו לספרייה</p>
            </div>
            <Button onClick={() => setDrivePickerOpen(true)} className="gap-2">
              <CloudIcon className="w-4 h-4" /> פתח את Google Drive
            </Button>
            <GoogleDrivePicker
              open={drivePickerOpen}
              onClose={() => setDrivePickerOpen(false)}
              onImport={async (fileData) => {
                const item = await base44.entities.LibraryItem.create({
                  ...fileData,
                  category: category || null,
                  subject: subject || null,
                  ai_status: 'pending',
                  generated_artifacts: [],
                  lesson_log: [],
                  is_favorite: false,
                  is_archived: false,
                });
                analyzeItem(item, qc);
                qc.invalidateQueries({ queryKey: ['library'] });
                reset();
                onClose();
              }}
            />
          </div>
        )}

        {/* LINK TAB */}
        {tab === 'link' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setLinkType('youtube_link')}
                className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                  linkType === 'youtube_link' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-accent')}>
                ▶️ YouTube
              </button>
              <button onClick={() => setLinkType('external_link')}
                className={cn('flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                  linkType === 'external_link' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-accent')}>
                🔗 קישור חיצוני
              </button>
            </div>
            <Input
              placeholder={linkType === 'youtube_link' ? 'https://youtube.com/watch?v=...' : 'https://...'}
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              dir="ltr"
              className="text-sm"
            />
            {linkUrl && (
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate text-muted-foreground">{linkUrl}</span>
                <Badge className="shrink-0">✓ AI ינתח</Badge>
              </div>
            )}
          </div>
        )}

        {/* TEXT TAB */}
        {tab === 'text' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">הדבק טקסט של שיעור, חומר לימוד, רשומות — ה-AI ינתח ויסווג אוטומטית</p>
            <Textarea
              placeholder="הדבק כאן את תוכן השיעור, הרשומות, החומר הלימודי..."
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              className="min-h-[200px] text-sm resize-none"
              dir="rtl"
            />
            {textContent.length > 0 && (
              <p className="text-xs text-muted-foreground">{textContent.length} תווים • AI יסכם, יסווג ויוסיף תגיות</p>
            )}
          </div>
        )}

        {/* SEARCH TAB */}
        {tab === 'search' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">חפש תכנים לימודיים מהאינטרנט והוסף ישירות לספרייה</p>
            <div className="flex gap-2">
              <Input
                placeholder="חפש נושא לימודי... (למשל: פרשת בשלח, הנדסה גאומטרית)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="flex-1 text-sm"
              />
              <Button size="sm" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <div key={i} className="p-3 border border-border rounded-xl space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                        {r.source && <p className="text-[10px] text-primary mt-0.5">{r.source}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={r.added ? 'secondary' : 'outline'}
                        className="shrink-0 text-xs"
                        onClick={() => addSearchResult(r)}
                        disabled={r.added}
                      >
                        {r.added ? '✓' : <Plus className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    {r.url && (
                      <p className="text-[10px] text-muted-foreground truncate dir-ltr">{r.url}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shared metadata */}
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">פרטים משותפים (ה-AI ימלא אוטומטית אם תשאיר ריק)</p>
          <div className="grid grid-cols-2 gap-2">
            <MobileSelect value={category} onValueChange={setCategory} placeholder="קטגוריה (אוטומטי)" className="h-8 text-xs">
              <SelectItem value={null}>אוטומטי</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </MobileSelect>
            <Input
              placeholder="נושא (אוטומטי)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Upload progress */}
        {uploadProgress.length > 0 && (
          <div className="space-y-1.5">
            {uploadProgress.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {p.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                {p.status === 'analyzing' && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />}
                {p.status === 'done' && <Check className="w-3.5 h-3.5 text-green-500" />}
                {p.status === 'error' && <X className="w-3.5 h-3.5 text-destructive" />}
                <span className="truncate">{p.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {p.status === 'uploading' ? 'מעלה...' : p.status === 'analyzing' ? 'AI מנתח...' : p.status === 'done' ? 'הושלם ✓' : 'שגיאה'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }} disabled={uploading}>
            ביטול
          </Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={uploading || totalItems === 0}>
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> מעלה...</>
              : <><Upload className="w-4 h-4" /> העלה {totalItems > 0 ? `(${totalItems})` : ''} + ניתוח AI</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}