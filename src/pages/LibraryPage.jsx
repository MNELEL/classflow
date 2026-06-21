import React, { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import LessonPlanningTab from '@/components/library/LessonPlanningTab';
import PlaylistPanel from '@/components/library/PlaylistPanel';
import WeeklyPlannerBoard from '@/components/library/WeeklyPlannerBoard';
import CoverageTracker from '@/components/library/CoverageTracker';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/layout/AppLayout';
import LibraryItemCard from '@/components/library/LibraryItemCard';
import LibraryUploadModal from '@/components/library/LibraryUploadModal';
import LibraryItemDetail from '@/components/library/LibraryItemDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BookOpen, Loader2, Library, Sparkles, BookOpenCheck, ListMusic, CalendarDays, BarChart2, Layers, Settings2, Bot, ExternalLink, Star, HardDrive, Download } from 'lucide-react';
import MultiSourceGenerator from '@/components/library/MultiSourceGenerator';
import AIProviderSettings from '@/components/library/AIProviderSettings';
import LibrarySearch from '@/components/library/LibrarySearch';
import ExternalSourceSearch from '@/components/library/ExternalSourceSearch';
import GoogleDrivePanel from '@/components/library/GoogleDrivePanel';
import ImportFromSourceModal from '@/components/library/ImportFromSourceModal';
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
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTag, setFilterTag] = useState('');
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [playlistIds, setPlaylistIds] = useState([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 100),
    refetchInterval: (query) => query.state.data?.some(i => i.ai_status === 'processing') ? 4000 : false,
  });

  const pendingCount = items.filter(i => i.ai_status === 'pending').length;

  const categories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))], [items]);
  const subjects = useMemo(() => [...new Set(items.map(i => i.subject).filter(Boolean))], [items]);
  const allTags = useMemo(() => {
    const tags = new Set();
    items.forEach(i => (i.ai_suggested_tags || []).forEach(t => tags.add(t)));
    items.forEach(i => (i.tags || []).forEach(t => tags.add(t)));
    return [...tags];
  }, [items]);

  const [filterDifficulty, setFilterDifficulty] = useState('all');

  const filtered = useMemo(() => {
    let result = items.filter(item => {
      if (item.is_archived) return false;
      if (showFavOnly && !item.is_favorite) return false;
      if (filterType !== 'all' && item.source_type !== filterType) return false;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterAI !== 'all' && item.ai_status !== filterAI) return false;
      if (filterSubject !== 'all' && item.subject !== filterSubject) return false;
      if (filterDifficulty !== 'all' && item.difficulty !== filterDifficulty) return false;
      if (filterTag) {
        const allItemTags = [...(item.tags || []), ...(item.ai_suggested_tags || [])];
        if (!allItemTags.includes(filterTag)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (item.title || '').toLowerCase().includes(q) ||
          (item.subject || '').toLowerCase().includes(q) ||
          (item.ai_summary || '').toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q) ||
          (item.ai_suggested_tags || []).some(t => t.toLowerCase().includes(q)) ||
          (item.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (item.transcript || '').toLowerCase().includes(q);
      }
      return true;
    });
    // Favorites first
    result = [...result.filter(i => i.is_favorite), ...result.filter(i => !i.is_favorite)];
    return result;
  }, [items, search, filterType, filterCategory, filterAI, filterSubject, filterTag, filterDifficulty, showFavOnly]);

  const togglePlaylist = (id) => {
    setPlaylistIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setShowPlaylist(true);
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4">
        <Tabs defaultValue="library">
          <TabsList className="w-full mb-2 grid grid-cols-8">
            <TabsTrigger value="library" className="gap-1 text-xs">
              <Library className="w-3.5 h-3.5" /> ספרייה
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1 text-xs">
              <Bot className="w-3.5 h-3.5" /> AI
            </TabsTrigger>
            <TabsTrigger value="external" className="gap-1 text-xs">
              <ExternalLink className="w-3.5 h-3.5" /> מאגרים
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-1 text-xs">
              <Layers className="w-3.5 h-3.5" /> יצירה
            </TabsTrigger>
            <TabsTrigger value="planning" className="gap-1 text-xs">
              <BookOpenCheck className="w-3.5 h-3.5" /> מערכים
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1 text-xs">
              <CalendarDays className="w-3.5 h-3.5" /> שבועי
            </TabsTrigger>
            <TabsTrigger value="coverage" className="gap-1 text-xs">
              <BarChart2 className="w-3.5 h-3.5" /> כיסוי
            </TabsTrigger>
            <TabsTrigger value="drive" className="gap-1 text-xs">
              <HardDrive className="w-3.5 h-3.5" /> Drive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4 mt-0">
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
              <div className="flex gap-2">
                {playlistIds.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setShowPlaylist(v => !v)} className="gap-1">
                    <ListMusic className="w-4 h-4" />
                    <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                      {playlistIds.length}
                    </span>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setShowAISettings(true)} className="gap-1 px-2">
                  <Settings2 className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => setShowUpload(true)} className="gap-1">
                  <Plus className="w-4 h-4" /> העלאה
                </Button>
              </div>
            </div>

            {/* Pending AI alert */}
            {pendingCount > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <p className="text-xs text-purple-700 dark:text-purple-400">{pendingCount} חומרים ממתינים לניתוח AI</p>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="חפש לפי כותרת, נושא, תגיות..." value={search}
                onChange={e => setSearch(e.target.value)} className="pr-9 h-9" />
            </div>

            {/* Filters row 1 */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs min-w-[110px]"><SelectValue placeholder="סוג..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>

              {subjects.length > 0 && (
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="h-8 text-xs min-w-[110px]"><SelectValue placeholder="נושא..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הנושאים</SelectItem>
                    {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {categories.length > 0 && (
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-8 text-xs min-w-[110px]"><SelectValue placeholder="קטגוריה..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הקטגוריות</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="h-8 text-xs min-w-[90px]"><SelectValue placeholder="קושי..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הרמות</SelectItem>
                  <SelectItem value="קל">🟢 קל</SelectItem>
                  <SelectItem value="בינוני">🟡 בינוני</SelectItem>
                  <SelectItem value="קשה">🔴 קשה</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterAI} onValueChange={setFilterAI}>
                <SelectTrigger className="h-8 text-xs min-w-[90px]"><SelectValue placeholder="AI..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="ready">✅ נותחו</SelectItem>
                  <SelectItem value="pending">⏳ ממתינים</SelectItem>
                </SelectContent>
              </Select>

              <button onClick={() => setShowFavOnly(v => !v)}
                className={`h-8 px-3 rounded-lg border text-xs transition-colors whitespace-nowrap flex items-center gap-1 ${showFavOnly ? 'bg-pink-50 border-pink-300 text-pink-600 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-400' : 'border-border text-muted-foreground hover:border-pink-300'}`}>
                <Star className={`w-3 h-3 ${showFavOnly ? 'fill-current' : ''}`} /> מועדפים
              </button>
            </div>

            {/* Tags filter chips */}
            {allTags.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setFilterTag('')}
                  className={`h-6 px-2.5 rounded-full text-xs whitespace-nowrap border transition-colors ${!filterTag ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                >
                  הכל
                </button>
                {allTags.slice(0, 20).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                    className={`h-6 px-2.5 rounded-full text-xs whitespace-nowrap border transition-colors ${filterTag === tag ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

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
                      transition={{ delay: i * 0.04 }} className="relative">
                      <LibraryItemCard item={item} onClick={() => setSelectedItemId(item.id)} />
                      {/* Playlist toggle button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePlaylist(item.id); }}
                        className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors border ${
                          playlistIds.includes(item.id)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border text-muted-foreground hover:border-primary'
                        }`}
                        title="הוסף לרשימת השמעה"
                      >
                        <ListMusic className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="mt-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">שאל AI על הספרייה</h2>
                  <p className="text-xs text-muted-foreground">חפש, סכם ויצור מכל החומרים שלך</p>
                </div>
              </div>
              <LibrarySearch items={items} />
            </div>
          </TabsContent>

          <TabsContent value="external" className="mt-0">
            <div className="space-y-3">
              {/* Import direct button */}
              <div className="flex items-center justify-between bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
                <div>
                  <p className="font-bold text-sm">ייבוא ישיר ממאגרים</p>
                  <p className="text-xs text-muted-foreground">ייבא תכנים מפורטל הדף היומי, קול הלשון ועוד לספריה שלך</p>
                </div>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setShowImportModal(true)}>
                  <Download className="w-4 h-4" /> ייבא
                </Button>
              </div>
              <ExternalSourceSearch />
            </div>
          </TabsContent>

          <TabsContent value="generate" className="mt-0">
            <MultiSourceGenerator />
          </TabsContent>

          <TabsContent value="planning" className="mt-0">
            <LessonPlanningTab />
          </TabsContent>

          <TabsContent value="weekly" className="mt-0">
            <WeeklyPlannerBoard />
          </TabsContent>

          <TabsContent value="coverage" className="mt-0">
            <CoverageTracker />
          </TabsContent>

          <TabsContent value="drive" className="mt-0">
            <GoogleDrivePanel onImported={() => {}} />
          </TabsContent>
        </Tabs>

        <LibraryUploadModal open={showUpload} onClose={() => setShowUpload(false)} />
        <AIProviderSettings open={showAISettings} onClose={() => setShowAISettings(false)} />
        <ImportFromSourceModal open={showImportModal} onClose={() => setShowImportModal(false)} />

        <AnimatePresence>
          {selectedItemId && (
            <LibraryItemDetail itemId={selectedItemId} onClose={() => setSelectedItemId(null)} />
          )}
        </AnimatePresence>
      </div>

      {/* Playlist Panel */}
      <AnimatePresence>
        {showPlaylist && playlistIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <PlaylistPanel
              itemIds={playlistIds}
              allItems={items}
              onRemove={(id) => setPlaylistIds(prev => prev.filter(x => x !== id))}
              onReorder={setPlaylistIds}
              onClose={() => setShowPlaylist(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}