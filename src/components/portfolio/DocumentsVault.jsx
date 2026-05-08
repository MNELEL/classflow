import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Image, Trash2, ExternalLink, Plus, Loader2, FolderOpen, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  document:      { label: 'מסמך כללי',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',    icon: '📄' },
  diagnosis:     { label: 'אבחון',            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: '🔬' },
  parent_letter: { label: 'מכתב להורים',      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  icon: '✉️' },
  photo:         { label: 'צילום / תמונה',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600', icon: '🖼️' },
  historical:    { label: 'תיעוד היסטורי',    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: '📚' },
  other:         { label: 'אחר',              color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',      icon: '📎' },
};

export default function DocumentsVault({ studentId }) {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ title: '', type: 'document', description: '', academic_year: '', date: format(new Date(), 'yyyy-MM-dd') });
  const [pendingFile, setPendingFile] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['portfolio', studentId],
    queryFn: () => base44.entities.StudentPortfolioItem.filter({ student_id: studentId }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StudentPortfolioItem.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portfolio', studentId] }); toast.success('פריט נמחק'); },
  });

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    if (!form.title) setForm(prev => ({ ...prev, title: file.name.replace(/\.[^.]+$/, '') }));
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('נדרשת כותרת'); return; }
    setUploading(true);
    try {
      let file_url = null, file_name = null;
      if (pendingFile) {
        const res = await base44.integrations.Core.UploadFile({ file: pendingFile });
        file_url = res.file_url;
        file_name = pendingFile.name;
      }
      await base44.entities.StudentPortfolioItem.create({
        student_id: studentId,
        ...form,
        file_url,
        file_name,
      });
      qc.invalidateQueries({ queryKey: ['portfolio', studentId] });
      toast.success('פריט נוסף בהצלחה');
      setShowForm(false);
      setPendingFile(null);
      setForm({ title: '', type: 'document', description: '', academic_year: '', date: format(new Date(), 'yyyy-MM-dd') });
    } catch { toast.error('שגיאה בהעלאה'); }
    setUploading(false);
  }

  const filtered = filterType === 'all' ? items : items.filter(i => i.type === filterType);

  return (
    <div className="space-y-3" dir="rtl">
      {/* Actions bar */}
      <div className="flex gap-2 items-center">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="סנן לפי סוג..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1 text-xs">
          <Upload className="w-3.5 h-3.5" /> העלה קובץ
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" /> הוסף
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-muted/40 border border-border/60 rounded-xl p-3 space-y-2 overflow-hidden">
            {pendingFile && (
              <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="flex-1 truncate">{pendingFile.name}</span>
                <button onClick={() => setPendingFile(null)}><X className="w-3 h-3 text-muted-foreground" /></button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Input placeholder="כותרת *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="h-8 text-sm" />
              </div>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="שנת לימודים" value={form.academic_year} onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="תיאור (אופציונלי)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="h-8 text-xs col-span-2" />
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setPendingFile(null); }} className="h-7 text-xs">ביטול</Button>
              <Button size="sm" onClick={handleSave} disabled={uploading} className="h-7 text-xs gap-1">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : null} שמור
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items list */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">אין מסמכים עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
            return (
              <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-start gap-3 bg-card border border-border/60 rounded-xl px-3 py-2.5">
                <span className="text-lg mt-0.5 shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    {item.academic_year && <span className="text-[10px] text-muted-foreground">{item.academic_year}</span>}
                    {item.date && <span className="text-[10px] text-muted-foreground">{item.date}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {item.file_url && (
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}