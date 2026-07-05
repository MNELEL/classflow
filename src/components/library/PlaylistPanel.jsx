import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, GripVertical, ListMusic, BookOpenCheck, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { MobileSelect, SelectItem } from '@/components/ui/MobileSelect';
import { toast } from 'sonner';

const SOURCE_ICON = {
  pdf: '📄', youtube_link: '▶️', audio_recording: '🎙️', audio_file: '🎵',
  video_file: '🎬', text_note: '✍️', image: '🖼️', presentation: '📊',
  word_doc: '📝', external_link: '🔗',
};

export default function PlaylistPanel({ itemIds, allItems, onRemove, onReorder, onClose }) {
  const [linkPlanId, setLinkPlanId] = useState('');
  const [showLinkMenu, setShowLinkMenu] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ['lesson-plans'],
    queryFn: () => base44.entities.LessonPlan.list('-created_date', 50),
  });

  const playlistItems = itemIds
    .map(id => allItems.find(i => i.id === id))
    .filter(Boolean);

  const handleDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const next = [...itemIds];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    onReorder(next);
  };

  const handleLinkToPlan = async () => {
    if (!linkPlanId) return;
    const plan = plans.find(p => p.id === linkPlanId);
    if (!plan) return;
    // Add all playlist items to first block or create new block
    const blocks = plan.blocks || [];
    const newBlock = {
      id: Math.random().toString(36).slice(2),
      title: 'חומרים מרשימת השמעה',
      description: '',
      duration_minutes: 0,
      library_item_ids: [...new Set([...(blocks[0]?.library_item_ids || []), ...itemIds])],
      worksheet_ids: [],
    };
    const updatedBlocks = blocks.length > 0
      ? blocks.map((b, i) => i === 0 ? { ...b, library_item_ids: [...new Set([...(b.library_item_ids || []), ...itemIds])] } : b)
      : [newBlock];
    await base44.entities.LessonPlan.update(linkPlanId, { blocks: updatedBlocks });
    toast.success(`החומרים שויכו למערך "${plan.title}"`);
    setShowLinkMenu(false);
  };

  if (playlistItems.length === 0) return null;

  return (
    <div className="fixed bottom-[72px] inset-x-0 z-40 px-3 pb-2" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-border">
          <ListMusic className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm flex-1">רשימת השמעה ({playlistItems.length})</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowLinkMenu(v => !v)}>
            <BookOpenCheck className="w-3.5 h-3.5" />
            קשר לשיעור
            {showLinkMenu ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Link to plan menu */}
        {showLinkMenu && (
          <div className="px-3 py-2 border-b border-border bg-accent/20 flex gap-2">
            <MobileSelect
              value={linkPlanId}
              onValueChange={v => setLinkPlanId(v)}
              title="בחר מערך שיעור..."
              className="flex-1 text-xs rounded-lg border border-border bg-card px-2 h-8"
            >
              <SelectItem value={null}>בחר מערך שיעור...</SelectItem>
              {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </MobileSelect>
            <Button size="sm" className="h-8 text-xs" onClick={handleLinkToPlan} disabled={!linkPlanId}>
              שייך
            </Button>
          </div>
        )}

        {/* Items list */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="playlist">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="max-h-40 overflow-y-auto divide-y divide-border"
              >
                {playlistItems.map((item, idx) => (
                  <Draggable key={item.id} draggableId={item.id} index={idx}>
                    {(p) => (
                      <div
                        ref={p.innerRef}
                        {...p.draggableProps}
                        className="flex items-center gap-2 px-3 py-1.5 bg-card select-none"
                      >
                        <span {...p.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground">
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-sm">{SOURCE_ICON[item.source_type] || '📁'}</span>
                        <span className="text-xs flex-1 truncate">{item.title}</span>
                        {item.subject && <span className="text-xs text-muted-foreground">{item.subject}</span>}
                        <button onClick={() => onRemove(item.id)} className="p-0.5 hover:text-destructive text-muted-foreground">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}