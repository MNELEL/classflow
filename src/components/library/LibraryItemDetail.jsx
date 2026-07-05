import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { X, Sparkles, Loader2, Plus, Trash2, Printer, Heart, Edit2, Check, BookOpen, Layers, GraduationCap, Star, Copy } from 'lucide-react';
import { toast } from 'sonner';
import ArtifactGenerator from './ArtifactGenerator';
import ArtifactRenderer from './ArtifactRenderer';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const SOURCE_ICONS = {
  audio_recording: '🎙️', audio_file: '🎵', pdf: '📄', word_doc: '📝',
  presentation: '📊', video_file: '🎬', youtube_link: '▶️',
  external_link: '🔗', text_note: '✍️', image: '🖼️',
};

const ARTIFACT_TYPE_LABELS = {
  lesson_summary: 'סיכום שיעור', lesson_plan: 'מערך שיעור',
  review_questions_with: 'שאלות + תשובות', review_questions_without: 'שאלות בלבד',
  worksheet: 'דף עבודה', teacher_guide: 'מדריך למורה',
  parent_summary: 'סיכום להורים', quiz: 'חידון', flashcards: 'כרטיסיות',
};

const ARTIFACT_ICONS = {
  lesson_summary: '📋', lesson_plan: '📐', review_questions_with: '❓',
  review_questions_without: '📝', worksheet: '📓', teacher_guide: '👨‍🏫',
  parent_summary: '📨', quiz: '🏆', flashcards: '🃏',
};

export default function LibraryItemDetail({ itemId, onClose }) {
  const qc = useQueryClient();
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [activeTab, setActiveTab] = useState('ai');

  const { data: item, isLoading } = useQuery({
    queryKey: ['library-item', itemId],
    queryFn: () => base44.entities.LibraryItem.get(itemId),
    enabled: !!itemId,
    refetchInterval: (data) => data?.ai_status === 'processing' ? 3000 : false,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.LibraryItem.update(itemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['library-item', itemId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.LibraryItem.delete(itemId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['library'] }); onClose(); toast.success('חומר נמחק'); },
  });

  function applyAiSuggestion(field, value) {
    updateMutation.mutate({ [field]: value });
    toast.success('עודכן!');
  }

  function deleteArtifact(artifactId) {
    const updated = (item.generated_artifacts || []).filter(a => a.id !== artifactId);
    updateMutation.mutate({ generated_artifacts: updated });
    if (selectedArtifact?.id === artifactId) setSelectedArtifact(null);
  }

  if (!itemId) return null;

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
      className="fixed inset-y-0 left-0 w-full md:w-[560px] bg-background border-r border-border shadow-2xl z-50 flex flex-col"
      dir="rtl">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        {isLoading ? <div className="h-5 w-32 bg-muted animate-pulse rounded" /> : (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xl">{SOURCE_ICONS[item?.source_type] || '📎'}</span>
            {editingTitle ? (
              <div className="flex gap-1 flex-1">
                <Input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} className="h-8 text-sm flex-1" autoFocus />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { applyAiSuggestion('title', titleDraft); setEditingTitle(false); }}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <p className="font-semibold text-sm flex-1 line-clamp-1">{item?.ai_suggested_title || item?.title}</p>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setTitleDraft(item?.title || ''); setEditingTitle(true); }}>
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : item ? (
        <>
        {/* Quick action buttons */}
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex gap-2 overflow-x-auto">
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 whitespace-nowrap"
            onClick={() => { setActiveTab('artifacts'); setShowGenerator(true); }}>
            <BookOpen className="w-3 h-3" /> מערך שיעור
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 whitespace-nowrap"
            onClick={() => { setActiveTab('artifacts'); setShowGenerator(true); }}>
            <GraduationCap className="w-3 h-3" /> דף עבודה
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7 whitespace-nowrap"
            onClick={() => setActiveTab('artifacts')}>
            <Layers className="w-3 h-3" /> שלב חומרים
          </Button>
          <button
            onClick={() => updateMutation.mutate({ is_favorite: !item.is_favorite })}
            className={`h-7 px-2.5 rounded-md border text-xs flex items-center gap-1 transition-colors whitespace-nowrap ${
              item.is_favorite
                ? 'bg-pink-50 border-pink-300 text-pink-600 dark:bg-pink-900/20 dark:border-pink-700 dark:text-pink-400'
                : 'border-border text-muted-foreground hover:border-pink-300'
            }`}>
            <Star className={`w-3 h-3 ${item.is_favorite ? 'fill-current' : ''}`} />
            {item.is_favorite ? 'מועדף' : 'הוסף למועדפים'}
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full grid grid-cols-3 mx-4 mt-2 w-[calc(100%-2rem)]">
            <TabsTrigger value="content" className="text-xs">🎧 תוכן</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">🤖 AI</TabsTrigger>
            <TabsTrigger value="artifacts" className="text-xs">
              📄 חומרים {item.generated_artifacts?.length > 0 && `(${item.generated_artifacts.length})`}
            </TabsTrigger>
          </TabsList>

          {/* CONTENT TAB */}
          <TabsContent value="content" className="flex-1 overflow-y-auto p-4 space-y-4">
            {item.file_url && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">קובץ מצורף</p>
                {(item.source_type === 'audio_recording' || item.source_type === 'audio_file') && (
                  <audio controls className="w-full rounded-xl" src={item.file_url} />
                )}
                {item.source_type === 'video_file' && (
                  <video controls className="w-full rounded-xl" src={item.file_url} />
                )}
                {(item.source_type === 'pdf' || item.source_type === 'word_doc' || item.source_type === 'presentation') && (
                  <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full gap-2">
                      <span>{SOURCE_ICONS[item.source_type]}</span> פתח {item.file_name}
                    </Button>
                  </a>
                )}
                {item.source_type === 'image' && (
                  <img src={item.file_url} alt={item.title} className="w-full rounded-xl border border-border" />
                )}
              </div>
            )}
            {item.youtube_url && (
              <div className="rounded-xl overflow-hidden">
                <iframe className="w-full aspect-video" src={item.youtube_url.replace('watch?v=', 'embed/')} allowFullScreen />
              </div>
            )}
            {item.external_url && (
              <a href={item.external_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full">🔗 פתח קישור חיצוני</Button>
              </a>
            )}
            {item.transcript && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">תוכן / תמלול מלא</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(item.transcript); toast.success('התמלול הועתק!'); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> העתק
                  </button>
                </div>
                <div className="bg-muted/40 rounded-xl p-3 text-sm leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap">{item.transcript}</div>
              </div>
            )}
          </TabsContent>

          {/* AI TAB */}
          <TabsContent value="ai" className="flex-1 overflow-y-auto p-4 space-y-4">
            {item.ai_status === 'processing' && (
              <div className="flex items-center gap-2 text-blue-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> מנתח עם AI...
              </div>
            )}
            {item.ai_status === 'ready' && (
              <>
                {item.ai_suggested_title && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">כותרת מוצעת</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm flex-1 bg-muted/40 rounded-lg px-3 py-2">{item.ai_suggested_title}</p>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => applyAiSuggestion('title', item.ai_suggested_title)}>
                        אמץ
                      </Button>
                    </div>
                  </div>
                )}
                {item.ai_summary && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">סיכום</p>
                    <p className="text-sm bg-muted/40 rounded-xl px-3 py-2 leading-relaxed">{item.ai_summary}</p>
                  </div>
                )}
                {item.ai_key_points?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">נקודות מפתח</p>
                    <ul className="space-y-1.5">
                      {item.ai_key_points.map((pt, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-primary font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.ai_suggested_tags?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">תגיות מוצעות</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.ai_suggested_tags.map((tag, i) => (
                        <span key={i} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {item.ai_status === 'pending' && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">ניתוח AI טרם בוצע</p>
                <Button size="sm" className="mt-3 gap-1" onClick={() => {
                  updateMutation.mutate({ ai_status: 'processing' });
                }}>
                  <Sparkles className="w-3.5 h-3.5" /> נתח עכשיו
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ARTIFACTS TAB */}
          <TabsContent value="artifacts" className="flex-1 overflow-y-auto p-4 flex gap-3">
            <div className="w-48 shrink-0 space-y-2">
              <Button size="sm" className="w-full gap-1 text-xs" onClick={() => setShowGenerator(true)}>
                <Plus className="w-3.5 h-3.5" /> צור חומר חדש
              </Button>
              {(item.generated_artifacts || []).map(art => (
                <div key={art.id}
                  onClick={() => setSelectedArtifact(art)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${selectedArtifact?.id === art.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                  <div className="flex items-center justify-between">
                    <span>{ARTIFACT_ICONS[art.type] || '📄'}</span>
                    <button onClick={e => { e.stopPropagation(); deleteArtifact(art.id); }}
                      className="text-destructive/50 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="font-medium mt-1 line-clamp-2">{ARTIFACT_TYPE_LABELS[art.type] || art.type}</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{art.created_at}</p>
                </div>
              ))}
              {!item.generated_artifacts?.length && (
                <p className="text-xs text-muted-foreground text-center py-4">אין חומרים עדיין</p>
              )}
            </div>

            {selectedArtifact ? (
              <div className="flex-1 overflow-y-auto">
                <div className="flex justify-end mb-2 gap-1">
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5" /> הדפס
                  </Button>
                </div>
                <div id="classpro-a4-canvas" className="bg-white dark:bg-card border border-border/40 rounded-xl p-6 print-area">
                  <ArtifactRenderer artifact={selectedArtifact} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                בחר חומר להצגה
              </div>
            )}
          </TabsContent>
        </Tabs>
        </>
      ) : null}

      {/* Bottom delete */}
      {item && (
        <div className="p-4 border-t border-border">
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive text-xs gap-1"
            onClick={() => deleteMutation.mutate()}>
            <Trash2 className="w-3.5 h-3.5" /> מחק חומר
          </Button>
        </div>
      )}

      {item && showGenerator && (
        <ArtifactGenerator open={showGenerator} item={item}
          onClose={(newArt) => { setShowGenerator(false); if (newArt) setSelectedArtifact(newArt); }} />
      )}
    </motion.div>
  );
}