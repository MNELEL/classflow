import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import LibraryItemCard from '@/components/library/LibraryItemCard';
import LibraryUploadModal from '@/components/library/LibraryUploadModal';
import LibraryItemDetail from '@/components/library/LibraryItemDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BookOpen, Loader2, Library, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SOURCE_LABELS = {
  audio_recording: '🎙️ הקלטות', audio_file: '🎵 אודיו', pdf: '📄 PDF',
  word_doc: '📝 Word', presentation: '📊 מצגות', video_file: '🎬 סרטונים',
  youtube_link: '▶️ YouTube', external_link: '🔗 קישורים', text_note: '✍️ פתקים', image: '🖼️ תמונות',
};

export default function LibraryPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAI, setFilterAI] = useState('all');
  const [showFavOnly, setShowFavOnly] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 100),
    refetchInterval: (data) => data?.some(i => i.ai_status === 'processing') ? 4000 : false,
  });

  const pendingCount = items.filter(i => i.ai_status === 'pending').length;

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category).filter(Boolean))];
    return cats;
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (item.is_archived) return false;
      if (showFavOnly && !item.is_favorite) return false;
      if (filterType !== 'all' && item.source_type !== filterType) return false;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterAI !== 'all' && item.ai_status !== filterAI) return false;
      if (search) {
        const q = search.toLowerCase();
        return (item.title || '').toLowerCase().includes(q) ||
          (item.subject || '').toLowerCase().includes(q) ||
          (item.ai_summary || '').toLowerCase().includes(q) ||
          (item.ai_suggested_tags || []).some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [items, search, filterType, filterCategory, filterAI, showFavOnly]);

  return (
    <AppLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-base">ספריית חומרים</h1>
              <p className="text-xs text-muted-foreground">{items.length} חומרים</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1">
            <Plus className="w-4 h-4" /> הוסף חומר
          </Button>
        </div>

        {/* Pending AI alert */}
        {pendingCount > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-purple-700 dark:text-purple-400">{pendingCount} חומרים ממתינים לניתוח AI</p>
          </div>
        )}

        {/* Search + Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="חפש לפי כותרת, נושא, תגיות..." value={search}
              onChange={e => setSearch(e.target.value)} className="pr-9 h-9" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs min-w-[120px]"><SelectValue placeholder="סוג..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {categories.length > 0 && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-8 text-xs min-w-[110px]"><SelectValue placeholder="קטגוריה..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הקטגוריות</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterAI} onValueChange={setFilterAI}>
              <SelectTrigger className="h-8 text-xs min-w-[110px]"><SelectValue placeholder="סטטוס AI..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="ready">✅ נותחו</SelectItem>
                <SelectItem value="pending">⏳ ממתינים</SelectItem>
                <SelectItem value="processing">🔄 מנותחים</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={() => setShowFavOnly(v => !v)}
              className={`h-8 px-3 rounded-lg border text-xs transition-colors whitespace-nowrap ${showFavOnly ? 'bg-pink-50 border-pink-300 text-pink-600 dark:bg-pink-900/20' : 'border-border text-muted-foreground'}`}>
              ♡ מועדפים
            </button>
          </div>
        </div>

        {/* Items grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">הספרייה ריקה</p>
            <p className="text-sm mt-1">הוסף את החומר הלימודי הראשון שלך</p>
            <Button size="sm" className="mt-4 gap-1" onClick={() => setShowUpload(true)}>
              <Plus className="w-3.5 h-3.5" /> הוסף חומר
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {filtered.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <LibraryItemCard item={item} onClick={() => setSelectedItemId(item.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <LibraryUploadModal open={showUpload} onClose={() => setShowUpload(false)} />

      <AnimatePresence>
        {selectedItemId && (
          <LibraryItemDetail itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />
        )}
      </AnimatePresence>
    </AppLayout>
  );
}