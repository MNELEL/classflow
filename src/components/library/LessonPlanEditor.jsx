import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronRight, Plus, Save, Loader2, Trash2, GripVertical,
  BookOpen, FileText, Target, Sparkles, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import SlidesExportButton from './SlidesExportButton';


const BLOCK_TYPES = ['פתיחה', 'מטרות', 'הוראה ישירה', 'תרגול', 'דיון', 'סיכום', 'הערכה'];

function BlockCard({ block, libraryItems, worksheets, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(true);

  const attachedLibrary = (block.library_item_ids || [])
    .map(id => libraryItems.find(i => i.id === id))
    .filter(Boolean);

  const attachedWorksheets = (block.worksheet_ids || [])
    .map(id => worksheets.find(w => w.id === id))
    .filter(Boolean);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
        <Input
          value={block.title}
          onChange={e => onUpdate({ ...block, title: e.target.value })}
          className="h-7 text-sm font-medium border-0 bg-transparent p-0 focus-visible:ring-0 flex-1"
          placeholder="שם הבלוק..."
        />
        <button onClick={() => setExpanded(v => !v)} className="p-1 rounded hover:bg-accent">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={onRemove} className="p-1 rounded hover:bg-destructive/10 text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          <Textarea
            value={block.description || ''}
            onChange={e => onUpdate({ ...block, description: e.target.value })}
            placeholder="תיאור הבלוק, פעילויות, הנחיות..."
            className="text-sm resize-none min-h-[60px]"
            rows={2}
          />

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">משך:</span>
            <Input
              type="number"
              value={block.duration_minutes || ''}
              onChange={e => onUpdate({ ...block, duration_minutes: Number(e.target.value) })}
              className="h-6 w-16 text-xs px-2"
              placeholder="דק'"
            />
          </div>

          {attachedLibrary.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">📚 חומרי למידה:</p>
              {attachedLibrary.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-accent/30 rounded-lg px-2 py-1">
                  <span className="text-xs truncate">{item.title}</span>
                  <button onClick={() => onUpdate({
                    ...block,
                    library_item_ids: block.library_item_ids.filter(id => id !== item.id)
                  })} className="ml-1 text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {attachedWorksheets.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">📝 דפי עבודה:</p>
              {attachedWorksheets.map(ws => (
                <div key={ws.id} className="flex items-center justify-between bg-accent/30 rounded-lg px-2 py-1">
                  <span className="text-xs truncate">{ws.title}</span>
                  <button onClick={() => onUpdate({
                    ...block,
                    worksheet_ids: block.worksheet_ids.filter(id => id !== ws.id)
                  })} className="ml-1 text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LessonPlanEditor({ planId, onBack }) {
  const queryClient = useQueryClient();
  const isNew = !planId;

  const { data: existing, isLoading: loadingPlan } = useQuery({
    queryKey: ['lesson-plan', planId],
    queryFn: () => base44.entities.LessonPlan.get(planId),
    enabled: !!planId,
  });

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['library'],
    queryFn: () => base44.entities.LibraryItem.list('-created_date', 100),
  });

  const { data: worksheets = [] } = useQuery({
    queryKey: ['worksheets'],
    queryFn: () => base44.entities.Worksheet.list('-created_date', 100),
  });

  const [form, setForm] = useState({
    title: '', subject: '', grade_level: '', description: '',
    learning_objectives: [], blocks: [], is_template: false,
  });
  const [newObjective, setNewObjective] = useState('');
  const [showLibraryPicker, setShowLibraryPicker] = useState(null); // blockId
  const [showWorksheetPicker, setShowWorksheetPicker] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) setForm({ ...form, ...existing });
  }, [existing]);

  const save = async () => {
    if (!form.title || !form.subject) { toast.error('יש למלא כותרת ומקצוע'); return; }
    setSaving(true);
    if (isNew) {
      await base44.entities.LessonPlan.create(form);
    } else {
      await base44.entities.LessonPlan.update(planId, form);
    }
    queryClient.invalidateQueries({ queryKey: ['lesson-plans'] });
    toast.success('מערך השיעור נשמר!');
    setSaving(false);
    onBack();
  };

  const addBlock = (templateTitle) => {
    setForm(f => ({
      ...f,
      blocks: [...(f.blocks || []), {
        id: Math.random().toString(36).slice(2),
        title: templateTitle || 'בלוק חדש',
        description: '', duration_minutes: 10,
        library_item_ids: [], worksheet_ids: [],
      }]
    }));
  };

  const updateBlock = (updated) => {
    setForm(f => ({ ...f, blocks: f.blocks.map(b => b.id === updated.id ? updated : b) }));
  };

  const removeBlock = (id) => {
    setForm(f => ({ ...f, blocks: f.blocks.filter(b => b.id !== id) }));
  };

  const addObjective = () => {
    if (!newObjective.trim()) return;
    setForm(f => ({ ...f, learning_objectives: [...(f.learning_objectives || []), newObjective.trim()] }));
    setNewObjective('');
  };

  const attachToBlock = (blockId, type, itemId) => {
    setForm(f => ({
      ...f,
      blocks: f.blocks.map(b => {
        if (b.id !== blockId) return b;
        const field = type === 'library' ? 'library_item_ids' : 'worksheet_ids';
        const current = b[field] || [];
        if (current.includes(itemId)) return b;
        return { ...b, [field]: [...current, itemId] };
      })
    }));
    if (type === 'library') setShowLibraryPicker(null);
    else setShowWorksheetPicker(null);
  };

  if (loadingPlan) return (
    <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-accent">
          <ChevronRight className="w-5 h-5" />
        </button>
        <h2 className="font-bold flex-1 text-sm">{isNew ? 'מערך שיעור חדש' : 'עריכת מערך שיעור'}</h2>
        <SlidesExportButton plan={form} planId={planId} disabled={isNew} />
        <Button size="sm" onClick={save} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          שמור
        </Button>
      </div>

      {/* Basic info */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="כותרת מערך השיעור *" className="font-semibold" />
        <div className="flex gap-2">
          <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="מקצוע *" className="flex-1" />
          <Input value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))}
            placeholder="כיתה" className="w-24" />
        </div>
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="תיאור קצר של המהלך..." className="text-sm resize-none" rows={2} />
      </div>

      {/* Learning objectives */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Target className="w-4 h-4 text-primary" />
          <p className="font-semibold text-sm">יעדים לימודיים</p>
        </div>
        {(form.learning_objectives || []).map((obj, i) => (
          <div key={i} className="flex items-center gap-2 bg-accent/30 rounded-lg px-2 py-1">
            <span className="text-xs flex-1">• {obj}</span>
            <button onClick={() => setForm(f => ({ ...f, learning_objectives: f.learning_objectives.filter((_, j) => j !== i) }))}>
              <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input value={newObjective} onChange={e => setNewObjective(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addObjective()}
            placeholder="הוסף יעד לימודי..." className="h-8 text-sm flex-1" />
          <Button size="sm" variant="outline" onClick={addObjective} className="h-8">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-primary" />
          <p className="font-semibold text-sm flex-1">מהלך השיעור</p>
        </div>

        {(form.blocks || []).map(block => (
          <div key={block.id}>
            <BlockCard
              block={block}
              libraryItems={libraryItems}
              worksheets={worksheets}
              onUpdate={updateBlock}
              onRemove={() => removeBlock(block.id)}
            />
            {/* Attach buttons */}
            <div className="flex gap-2 mt-1 mr-2">
              <button onClick={() => setShowLibraryPicker(showLibraryPicker === block.id ? null : block.id)}
                className="text-xs text-primary hover:underline flex items-center gap-0.5">
                <BookOpen className="w-3 h-3" /> + חומר למידה
              </button>
              <button onClick={() => setShowWorksheetPicker(showWorksheetPicker === block.id ? null : block.id)}
                className="text-xs text-primary hover:underline flex items-center gap-0.5">
                <FileText className="w-3 h-3" /> + דף עבודה
              </button>
            </div>

            {/* Library picker */}
            {showLibraryPicker === block.id && (
              <div className="mt-1 bg-card border border-border rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                {libraryItems.filter(i => !i.is_archived).map(item => (
                  <button key={item.id} onClick={() => attachToBlock(block.id, 'library', item.id)}
                    className="w-full text-right text-xs px-2 py-1.5 rounded-lg hover:bg-accent flex items-center gap-2">
                    <span className="text-muted-foreground">{item.source_type === 'pdf' ? '📄' : item.source_type === 'youtube_link' ? '▶️' : '📁'}</span>
                    <span className="truncate">{item.title}</span>
                    {item.subject && <span className="text-muted-foreground mr-auto">{item.subject}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Worksheet picker */}
            {showWorksheetPicker === block.id && (
              <div className="mt-1 bg-card border border-border rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                {worksheets.map(ws => (
                  <button key={ws.id} onClick={() => attachToBlock(block.id, 'worksheet', ws.id)}
                    className="w-full text-right text-xs px-2 py-1.5 rounded-lg hover:bg-accent flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate">{ws.title}</span>
                    {ws.subject && <span className="text-muted-foreground mr-auto">{ws.subject}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Add block */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {BLOCK_TYPES.map(t => (
              <button key={t} onClick={() => addBlock(t)}
                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors">
                + {t}
              </button>
            ))}
          </div>
          <button onClick={() => addBlock('')}
            className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> הוסף בלוק מותאם אישית
          </button>
        </div>
      </div>
    </div>
  );
}